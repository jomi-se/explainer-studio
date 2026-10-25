// Shared plumbing for the CLI scripts: static server, browser/page setup, args.

import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync, mkdirSync, readdirSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { availableParallelism } from 'node:os';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

export function startServer({ port = 0, host = '127.0.0.1' } = {}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path === '/' || path === '') path = '/studio/index.html';
    let file = join(ROOT, path);
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return res.writeHead(404).end(`404 ${path}`);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, host, () => ok({ server, url: `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${server.address().port}` })));
}

// --flag value / --flag / positional
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const [k, inline] = a.slice(2).split('=');
    if (inline !== undefined) out[k] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[k] = argv[++i];
    else out[k] = true;
  }
  return out;
}

export function requireProject(args) {
  const project = args._[0];
  if (!project || !existsSync(join(ROOT, 'projects', project, 'composition.js'))) {
    console.error(`usage: <script> <project> [...]  (no projects/${project ?? '<project>'}/composition.js)`);
    process.exit(2);
  }
  return project;
}

export function outDir(project, ...sub) {
  const d = join(ROOT, 'out', project, ...sub);
  mkdirSync(d, { recursive: true });
  return d;
}

export async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error('playwright is not installed — run: npm install && npx playwright install chromium');
    process.exit(2);
  }
}

export async function ffmpegPath() {
  try {
    const p = (await import('ffmpeg-static')).default;
    if (p && existsSync(p)) return p;
  } catch {}
  console.error('ffmpeg-static is not installed — run: npm install');
  process.exit(2);
}

export async function launch() {
  const { chromium } = await loadPlaywright();
  // GPU rasterization off + fixed color profile keeps frames byte-stable across runs.
  const extra = process.env.STUDIO_CHROME_ARGS ? process.env.STUDIO_CHROME_ARGS.split(' ') : [];
  // CHROMIUM_PATH: use a system Chromium instead of Playwright's build (CI on Alpine, where Playwright's don't run).
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--force-color-profile=srgb', '--disable-gpu-rasterization', '--font-render-hinting=none', '--hide-scrollbars', ...extra],
  });
}

// Open a project in render mode at native size; resolves to { page, meta }.
export async function openProject(browser, baseUrl, project, { scale = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e.stack ?? e)));
  await page.goto(`${baseUrl}/studio/index.html?project=${encodeURIComponent(project)}&render`);
  try {
    await page.waitForFunction(() => window.__studioReady, null, { timeout: 30_000 });
    await page.evaluate(() => window.__studioReady);
  } catch (e) {
    const errs = await page.evaluate(() => window.__studio?.errors ?? []).catch(() => []);
    throw new Error(`project failed to load:\n${[...consoleErrors, ...errs].join('\n') || e.message}`);
  }
  const meta = await page.evaluate(() => window.__studio.meta);
  if (meta.width !== 1920 || meta.height !== 1080) await page.setViewportSize({ width: meta.width, height: meta.height });
  return { page, meta, consoleErrors };
}

// The score is generated, not committed: (re)build projects/<p>/audio/score.wav with audio.mjs
// when it is missing or older than what it is made from. A score may read its cue times from the
// project's scenes and libs, so every .js file in the project counts (footage frames don't).
const projectJs = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (['footage', 'audio', 'assets', 'node_modules'].includes(e.name) ? [] : projectJs(join(dir, e.name))) : e.name.endsWith('.js') ? [join(dir, e.name)] : []);
export function ensureScore(project) {
  const src = join(ROOT, 'projects', project, 'audio.js');
  if (!existsSync(src)) return;
  const wav = join(ROOT, 'projects', project, 'audio', 'score.wav');
  const inputs = [...projectJs(join(ROOT, 'projects', project)), join(ROOT, 'studio', 'sound.js')];
  if (existsSync(wav) && inputs.every((f) => !existsSync(f) || statSync(f).mtimeMs <= statSync(wav).mtimeMs)) return;
  console.log(`score ${existsSync(wav) ? 'is stale' : 'is missing'} — generating it`);
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'audio.mjs'), project], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Loudness to -16 LUFS / -1.5 dBTP. The default, single-pass loudnorm, rides the gain toward -16 all the
// time: it lifts quiet scores, but it also flattens a mixed loudness arc and pushes the transients of a
// lifted quiet passage into its limiter. A track with `loudness: 'linear'` is measured once and gets one
// constant gain instead, capped so its true peak stays under -1.5 dBTP.
export const LOUDNORM = 'loudnorm=I=-16:TP=-1.5:LRA=11';
export function linearGain(ffmpeg, file) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-af', `${LOUDNORM}:print_format=json`, '-f', 'null', '-']);
  const m = JSON.parse(String(r.stderr).match(/\{[^{}]*"input_i"[^{}]*\}/)[0]);
  return Math.min(-16 - Number(m.input_i), -1.5 - Number(m.input_tp));
}

export const seek = (page, t) => page.evaluate((x) => window.__studio.seek(x), t);

export const defaultWorkers = () => Math.max(1, Math.min(6, Math.floor(availableParallelism() / 2)));

export const fmtTime = (t) => `${Math.floor(t / 60)}m${(t % 60).toFixed(2).padStart(5, '0')}s`;
