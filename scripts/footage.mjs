// Cut a screen recording into film-time frame sequences for scenes to play back.
//
//   node scripts/footage.mjs <project> [--clip id[,id]] [--force]
//
// projects/<p>/footage.js describes the edit (example in README.md, "Screen recordings"):
//   source   path of the recording, relative to the project (gitignored symlink is fine)
//   sources  optional { key: path } for several recordings; a clip picks one with `src: key`
//   size     [w, h] of the source in pixels (crops, blurs and scenes use these coordinates); a recording of
//            another size (e.g. a lower-res capture of the same phone) is scaled to it first
//   tonemap  true for HDR (PQ/HLG) recordings, e.g. macOS screen captures of an HDR display; leave it out for SDR
//   scale    output size factor (1 = full source resolution)
//   clips    { id: { src?, parts: [[from, to, speed], …] } }  — source seconds; the parts play back to back
//   blur     [{ src?, from, to, x, y, w, h }] — source seconds/pixels; burned into every clip of that
//            source that covers them (no `src` = every source)
//
// Each clip becomes projects/<p>/footage/<id>/00001.jpg… at the film's fps: frame n shows the
// recording at film time n/fps of that clip, so a scene simply shows frame round(t * fps).
// Output is gitignored; a clip is rebuilt only when its own parts or blurs change (or --force).

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, parseArgs, requireProject, ffmpegPath, fmtTime } from './lib.mjs';

const args = parseArgs();
const project = requireProject(args);
const projDir = join(ROOT, 'projects', project);
const defFile = join(projDir, 'footage.js');
if (!existsSync(defFile)) { console.error(`no ${relative(ROOT, defFile)}`); process.exit(2); }
const def = await import(pathToFileURL(defFile).href + `?t=${Date.now()}`);
const comp = (await import(pathToFileURL(join(projDir, 'composition.js')).href)).default;
const fps = comp.fps ?? 30;
const ffmpeg = await ffmpegPath();
const sourceOf = (clip) => join(projDir, clip.src ? def.sources[clip.src] : def.source);
for (const clip of Object.values(def.clips)) {
  const src = sourceOf(clip);
  if (!existsSync(src)) { console.error(`footage source missing: ${relative(ROOT, src)}`); process.exit(2); }
}
const blursOf = (clip) => (def.blur ?? []).filter((b) => !b.src || b.src === clip.src);
const [SW, SH] = def.size;
const scale = def.scale ?? 1;
const even = (n) => Math.round(n / 2) * 2;
const OW = even(SW * scale), OH = even(SH * scale);

// Pixel size of a recording, from ffmpeg's stream line ("Video: h264 …, 576x1280, …").
const dims = (file) => String(spawnSync(ffmpeg, ['-hide_banner', '-i', file]).stderr).match(/Video:.*?, (\d{2,5})x(\d{2,5})/).slice(1).map(Number);

const want = args.clip ? String(args.clip).split(',') : Object.keys(def.clips);
const run = (argv) => new Promise((ok, bad) => {
  const p = spawn(ffmpeg, argv, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
  p.on('close', (code) => (code === 0 ? ok() : bad(new Error(`ffmpeg exited ${code}\n${err}`))));
});

const TONEMAP = 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=clip:desat=0,zscale=t=bt709:m=bt709:r=pc';

// One part = one ffmpeg run: seek, drop to the frames we keep (setpts+fps before the
// expensive filters), burn the blurs that overlap it, tone-map, scale, write JPEGs.
function partFilter([from, to, speed], blurs, [w, h]) {
  const fit = w !== SW || h !== SH ? [`scale=${SW}:${SH}:flags=lanczos`] : [];
  const chain = [`setpts=(PTS-STARTPTS)/${speed}`, `fps=${fps}`, ...fit, ...(def.tonemap ? [TONEMAP] : []), 'format=rgb24'];
  let graph = `[0:v]${chain.join(',')}[v0]`;
  let last = 'v0';
  blurs.filter((b) => b.to > from && b.from < to).forEach((b, i) => {
    // enable window in this part's output time
    const a = Math.max(0, (b.from - from) / speed), z = (Math.min(to, b.to) - from) / speed;
    const x = even(b.x), y = even(b.y), w = even(b.w), h = even(b.h);
    const k = Math.max(4, Math.round(Math.min(w, h) / 6));
    graph += `;[${last}]split[s${i}a][s${i}b];[s${i}b]crop=${w}:${h}:${x}:${y},boxblur=${Math.min(k, Math.floor(Math.min(w, h) / 2) - 1)}:4,eq=brightness=-0.04[s${i}c];[s${i}a][s${i}c]overlay=${x}:${y}:enable='between(t,${a.toFixed(3)},${z.toFixed(3)})'[v${i + 1}]`;
    last = `v${i + 1}`;
  });
  if (scale !== 1) { graph += `;[${last}]scale=${OW}:${OH}:flags=lanczos[vs]`; last = 'vs'; }
  return { graph, last };
}

export const clipFrames = (parts) => parts.reduce((n, [a, b, s]) => n + Math.round(((b - a) / s) * fps), 0);

const started = Date.now();
for (const id of want) {
  const clip = def.clips[id];
  if (!clip) { console.error(`no clip ${id}`); process.exit(2); }
  const dir = join(projDir, 'footage', id);
  const total = clipFrames(clip.parts);
  // Rebuild only when this clip's own edit (parts, overlapping blurs, size) changed.
  const blurs = blursOf(clip);
  const src = sourceOf(clip);
  const key = JSON.stringify({ src: clip.src, parts: clip.parts, blur: blurs.filter((b) => clip.parts.some(([a, z]) => b.to > a && b.from < z)), scale, fps, v: 1, ...(def.tonemap ? {} : { sdr: true }) });
  const fresh = existsSync(join(dir, 'done.json')) && JSON.parse(readFileSync(join(dir, 'done.json'), 'utf8')).key === key;
  if (fresh && !args.force) { console.log(`${id}: up to date (${total} frames)`); continue; }
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  let n = 0;
  const srcDims = dims(src);
  await Promise.all(clip.parts.map(async (part, pi) => {
    const tmp = join(dir, `part-${pi}`);
    mkdirSync(tmp);
    const frames = Math.round(((part[1] - part[0]) / part[2]) * fps);
    const { graph, last } = partFilter(part, blurs, srcDims);
    await run(['-y', '-loglevel', 'error', '-ss', String(part[0]), '-t', String(part[1] - part[0] + 1), '-i', src,
      '-filter_complex', graph, '-map', `[${last}]`, '-frames:v', String(frames), '-q:v', '3', join(tmp, '%05d.jpg')]);
  }));
  // Renumber parts into one contiguous sequence; pad a short part with its last frame.
  clip.parts.forEach((part, pi) => {
    const tmp = join(dir, `part-${pi}`);
    const files = readdirSync(tmp).sort();
    const frames = Math.round(((part[1] - part[0]) / part[2]) * fps);
    for (let i = 0; i < frames; i++) {
      const f = files[Math.min(i, files.length - 1)];
      const dst = join(dir, `${String(++n).padStart(5, '0')}.jpg`);
      if (i < files.length) renameSync(join(tmp, f), dst);
      else copyFileSync(join(dir, `${String(n - 1).padStart(5, '0')}.jpg`), dst);
    }
    rmSync(tmp, { recursive: true, force: true });
  });
  writeFileSync(join(dir, 'done.json'), JSON.stringify({ key, frames: n, fps, size: [OW, OH] }));
  console.log(`${id}: ${n} frames (${(n / fps).toFixed(2)} s) in ${fmtTime((Date.now() - t0) / 1000)}`);
}
console.log(`footage done in ${fmtTime((Date.now() - started) / 1000)}`);
