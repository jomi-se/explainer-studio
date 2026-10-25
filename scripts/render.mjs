// Render a project to MP4: N browser workers each seek()+screenshot a slice of
// the frames into their own ffmpeg, then the slices are concatenated and the
// composition's audio tracks are mixed in.
//
//   node scripts/render.mjs <project> [--draft] [--workers N] [--from s] [--to s] [--fps n] [--out file.mp4]
//   --draft: half resolution, jpeg capture, faster x264 preset — for checking motion, not for shipping.
// A composition with a full-frame texture can set `capture: 'jpeg'`: the final render then captures JPEG at q95
// instead of PNG. PNG-encoding a textured frame costs ~10× more than painting it (one textured film: 415 vs 37 ms).

import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, parseArgs, requireProject, outDir, launch, startServer, openProject, seek, ffmpegPath, ensureScore, defaultWorkers, fmtTime, LOUDNORM, linearGain } from './lib.mjs';

const args = parseArgs();
const project = requireProject(args);
const draft = !!args.draft;
const ffmpeg = await ffmpegPath();
ensureScore(project);

function run(cmd, argv, { input } = {}) {
  return new Promise((ok, bad) => {
    const p = spawn(cmd, argv, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
    p.on('error', bad);
    p.on('close', (code) => (code === 0 ? ok() : bad(new Error(`${cmd} exited ${code}\n${err}`))));
    if (input) input(p.stdin);
  });
}

const { server, url } = await startServer();
const browser = await launch();
const started = Date.now();
try {
  // Probe once for metadata.
  const probe = await openProject(browser, url, project);
  const meta = probe.meta;
  await probe.page.context().close();

  const fps = Number(args.fps ?? meta.fps);
  const from = Number(args.from ?? 0);
  const to = Math.min(Number(args.to ?? meta.duration), meta.duration);
  const first = Math.round(from * fps);
  const total = Math.max(1, Math.round(to * fps) - first);
  const workers = Math.min(Number(args.workers ?? defaultWorkers()), total);
  const scale = draft ? 0.5 : 1;
  const jpeg = draft || meta.capture === 'jpeg';
  const tmp = outDir(project, 'render-tmp');
  console.log(`rendering ${project}: ${total} frames @ ${fps}fps (${fmtTime(from)}–${fmtTime(to)}), ${workers} worker(s)${draft ? ', DRAFT' : ''}`);

  let done = 0;
  const tick = setInterval(() => {
    const el = (Date.now() - started) / 1000;
    process.stdout.write(`\r  ${done}/${total} frames  ${(done / el).toFixed(1)} fps  eta ${fmtTime(((total - done) * el) / Math.max(done, 1))}   `);
  }, 1000);

  const per = Math.ceil(total / workers);
  const segments = [];
  const pageErrors = [];
  await Promise.all(
    Array.from({ length: workers }, async (_, w) => {
      const a = first + w * per;
      const b = Math.min(first + total, a + per);
      if (a >= b) return;
      const seg = join(tmp, `seg-${String(w).padStart(2, '0')}.mp4`);
      segments[w] = seg;
      const { page, consoleErrors } = await openProject(browser, url, project, { scale });
      await run(
        ffmpeg,
        ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', jpeg ? 'mjpeg' : 'png', '-i', '-',
          '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'slow', '-crf', draft ? '23' : '16', '-pix_fmt', 'yuv420p',
          '-r', String(fps), '-video_track_timescale', String(fps * 1000), seg],
        {
          input: async (stdin) => {
            for (let f = a; f < b; f++) {
              await seek(page, f / fps);
              const buf = await page.screenshot(jpeg ? { type: 'jpeg', quality: draft ? 85 : 95 } : { type: 'png' });
              if (!stdin.write(buf)) await new Promise((r) => stdin.once('drain', r));
              done++;
            }
            stdin.end();
          },
        },
      );
      pageErrors.push(...consoleErrors, ...(await page.evaluate(() => window.__studio.errors)));
      await page.context().close();
    }),
  );
  clearInterval(tick);
  process.stdout.write('\n');

  const list = join(tmp, 'segments.txt');
  writeFileSync(list, segments.filter(Boolean).map((s) => `file '${s}'`).join('\n'));
  const video = join(tmp, 'video.mp4');
  await run(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);

  const out = args.out ? join(ROOT, args.out) : join(outDir(project), `${project}${draft ? '-draft' : ''}.mp4`);
  const tracks = meta.audio.filter((t) => existsSync(join(ROOT, t.path)));
  if (tracks.length) {
    // Each track: delay to its start (relative to the render window), gain in dB; mix, then
    // loudness-normalise the whole bed to -16 LUFS / -1.5 dBTP (web video norm). When every track asks
    // for linear loudness, each gets its measured constant gain and the mix is left as it is.
    const linear = tracks.every((t) => t.loudness === 'linear');
    const inputs = tracks.flatMap((t) => ['-i', join(ROOT, t.path)]);
    const chains = tracks.map((t, i) => {
      const startMs = Math.round(((t.start ?? 0) - from) * 1000);
      const trim = startMs < 0 ? `atrim=start=${-startMs / 1000},asetpts=PTS-STARTPTS,` : '';
      const gain = (t.gain ?? 0) + (linear ? linearGain(ffmpeg, join(ROOT, t.path)) : 0);
      return `[${i + 1}:a]${trim}adelay=${Math.max(0, startMs)}:all=1,volume=${gain.toFixed(2)}dB[a${i}]`;
    });
    const filter = `${chains.join(';')};${tracks.map((_, i) => `[a${i}]`).join('')}amix=inputs=${tracks.length}:normalize=0:duration=longest${linear ? '' : `,${LOUDNORM}`},aresample=48000[aout]`;
    await run(ffmpeg, ['-y', '-loglevel', 'error', '-i', video, ...inputs, '-filter_complex', filter, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(to - from), '-movflags', '+faststart', out]);
  } else {
    await run(ffmpeg, ['-y', '-loglevel', 'error', '-i', video, '-c', 'copy', '-movflags', '+faststart', out]);
  }
  const missing = meta.audio.filter((t) => !existsSync(join(ROOT, t.path)));
  if (missing.length) console.warn(`audio tracks missing (skipped): ${missing.map((t) => t.path).join(', ')}`);
  if (pageErrors.length) console.error(`page errors:\n  ${[...new Set(pageErrors)].join('\n  ')}`);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`done in ${fmtTime((Date.now() - started) / 1000)} → ${relative(ROOT, out)}`);
} finally {
  await browser.close();
  server.close();
}
