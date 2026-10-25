// Export a project as ONE self-contained HTML file that plays the film live in
// the browser (vector-sharp at any size, chapters, pause/step, fullscreen).
// Runtime + scenes are bundled by esbuild; CSS, fonts, images (projects/<p>/assets/**)
// and audio (re-encoded to AAC) are inlined as data URLs.
//
//   node scripts/export.mjs <project> [--out file.html]
//
// Scenes must reference images through ctx.asset('assets/…') so they resolve in both
// dev and export. Composition may set `title` (overlay) and per-scene `title` (chapter names).
// Screen-recording clips (scripts/footage.mjs) are too big to inline as frames, so each clip is
// encoded once more as a small H.264 video, `footage/<clip>.mp4`, that the scene plays in viewer mode.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, relative, extname, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { ROOT, parseArgs, requireProject, outDir, ffmpegPath, ensureScore, LOUDNORM, linearGain } from './lib.mjs';

const args = parseArgs();
const project = requireProject(args);
const projDir = join(ROOT, 'projects', project);

let esbuild;
try {
  esbuild = await import('esbuild');
} catch {
  console.error('esbuild is not installed — run: npm install');
  process.exit(2);
}

ensureScore(project);
const comp = (await import(pathToFileURL(join(projDir, 'composition.js')).href)).default;
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.json': 'application/json' };
const dataUrl = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

// 1. Assets: everything under projects/<p>/assets, keyed by project-relative path.
const assets = {};
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
if (existsSync(join(projDir, 'assets'))) {
  for (const f of walk(join(projDir, 'assets'))) {
    const mime = MIME[extname(f).toLowerCase()];
    if (mime) assets[relative(projDir, f)] = dataUrl(readFileSync(f), mime);
    else console.warn(`skipping asset with unknown type: ${relative(ROOT, f)}`);
  }
}

const footDir = join(projDir, 'footage');
const clips = existsSync(footDir) ? readdirSync(footDir).filter((d) => existsSync(join(footDir, d, 'done.json'))) : [];
const ffmpeg = (comp.audio ?? []).length || clips.length ? await ffmpegPath() : null;
const tmp = mkdtempSync(join(tmpdir(), 'studio-export-'));

// 1b. Footage: each clip's film-time frames → 720-px-wide H.264 (a keyframe every half second keeps seeks quick).
for (const clip of clips) {
  const { fps } = JSON.parse(readFileSync(join(footDir, clip, 'done.json'), 'utf8'));
  const mp4 = join(tmp, `footage-${clip}.mp4`);
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(footDir, clip, '%05d.jpg'), '-vf', 'scale=720:-2',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '32', '-g', String(Math.round(fps / 2)), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
  if (r.status !== 0) throw new Error(`ffmpeg failed on footage/${clip}: ${r.stderr}`);
  assets[`footage/${clip}.mp4`] = dataUrl(readFileSync(mp4), 'video/mp4');
}
if (clips.length) console.log(`footage: ${clips.length} clip(s) as video, ${kb(clips.reduce((n, c) => n + assets[`footage/${c}.mp4`].length, 0))}`);

// 2. Audio: re-encode each track to AAC so a 3-minute WAV doesn't become 30 MB of base64. A track may set
//    `bitrate` (default 160k); long, quiet scores can go lower to keep the file small.
for (const a of comp.audio ?? []) {
  const src = join(projDir, a.src);
  if (!existsSync(src)) { console.warn(`audio missing (skipped): ${a.src}`); continue; }
  const m4a = join(tmp, `${Object.keys(assets).length}.m4a`);
  const norm = a.loudness === 'linear' ? `volume=${linearGain(ffmpeg, src).toFixed(2)}dB` : LOUDNORM;
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-c:a', 'aac', '-b:a', a.bitrate ?? '160k', '-af', norm, '-ar', '48000', m4a]);
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${a.src}: ${r.stderr}`);
  assets[a.src.replace(/^\.\//, '')] = dataUrl(readFileSync(m4a), 'audio/mp4');
}
rmSync(tmp, { recursive: true, force: true });

// 3. CSS: base tokens + the composition's styles, fonts inlined.
const resolveStyle = (href) => (href.startsWith('/') ? join(ROOT, href) : isAbsolute(href) ? href : join(projDir, href));
const fileLoaders = Object.fromEntries(['.woff2', '.woff', '.ttf', '.otf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].map((e) => [e, 'dataurl']));
const cssEntry = [join(ROOT, 'studio/base.css'), ...(comp.styles ?? []).map(resolveStyle)].map((f) => `@import ${JSON.stringify(f)};`).join('\n');
const css = await esbuild.build({ stdin: { contents: cssEntry, loader: 'css', resolveDir: ROOT }, bundle: true, minify: true, write: false, loader: fileLoaders, logLevel: 'error' });

// 4. JS: runtime + composition + scenes in one IIFE. Scenes import '/studio/…' (server-root
//    paths in dev); map those onto the repo's studio/ folder.
const rootPaths = {
  name: 'root-paths',
  setup(b) {
    b.onResolve({ filter: /^\/(studio|projects|brands|node_modules)\// }, (a) => ({ path: join(ROOT, a.path) }));
  },
};
const jsEntry = `
import comp from ${JSON.stringify(join(projDir, 'composition.js'))};
import { boot } from ${JSON.stringify(join(ROOT, 'studio/runtime.js'))};
const assets = JSON.parse(document.getElementById('studio-assets').textContent);
boot({ comp, project: ${JSON.stringify(project)}, mode: 'viewer', inlineStyles: true, resolve: (p) => assets[p.replace(/^\\.\\//, '')] ?? p });
`;
const js = await esbuild.build({ stdin: { contents: jsEntry, loader: 'js', resolveDir: projDir }, bundle: true, minify: true, format: 'iife', target: 'es2022', write: false, plugins: [rootPaths], logLevel: 'error' });

// 5. One HTML file. Escape closing tags inside inline script/JSON.
const esc = (s) => s.replace(/<\/(script)/gi, '<\\/$1');
const title = comp.title ?? project;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/</g, '&lt;')}</title>
<style>${css.outputFiles[0].text}</style>
</head>
<body>
<div id="viewport"><div id="stage"></div></div>
<div id="transport" hidden><button id="play" title="space">▶</button><input id="scrub" type="range" min="0" value="0"><span id="time"></span><div id="scenes"></div></div>
<script type="application/json" id="studio-assets">${esc(JSON.stringify(assets))}</script>
<script>${esc(js.outputFiles[0].text)}</script>
</body>
</html>
`;
const out = args.out ? join(ROOT, args.out) : join(outDir(project), `${project}.html`);
writeFileSync(out, html);
const assetBytes = Object.values(assets).reduce((n, v) => n + v.length, 0);
console.log(`exported → ${relative(ROOT, out)}  ${kb(html.length)} (js ${kb(js.outputFiles[0].text.length)}, css+fonts ${kb(css.outputFiles[0].text.length)}, assets ${kb(assetBytes)})`);
