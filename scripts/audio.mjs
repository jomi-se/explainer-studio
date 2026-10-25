// Render projects/<project>/audio.js (a synthesized score + SFX) to
// projects/<project>/audio/score.wav via OfflineAudioContext in Chromium.
//
//   node scripts/audio.mjs <project> [--sample-rate 48000]
//
// audio.js: `export default async function score(kit, meta) { kit.pad(...); kit.tick(...); }`
// meta has the composition timing (meta.scenes[i].start etc.), so cues can follow scene edits.
// Reference the result in composition.js:  audio: [{ src: 'audio/score.wav', start: 0, gain: 0 }]

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, parseArgs, requireProject, launch, startServer, openProject } from './lib.mjs';

const args = parseArgs();
const project = requireProject(args);
const rate = Number(args['sample-rate'] ?? 48000);
if (!existsSync(join(ROOT, 'projects', project, 'audio.js'))) {
  console.error(`no projects/${project}/audio.js`);
  process.exit(2);
}

const { server, url } = await startServer();
const browser = await launch();
try {
  const { page, meta } = await openProject(browser, url, project);
  // Render in the page, then pull the samples out in chunks (as 16-bit PCM) and build the WAV here,
  // so the page never holds whole-file copies and no single message is huge.
  const { n, ch } = await page.evaluate(
    async ({ project, rate, meta }) => {
      const { makeKit } = await import('/studio/sound.js');
      const score = (await import(`/projects/${project}/audio.js`)).default;
      const ctx = new OfflineAudioContext(2, Math.ceil((meta.duration + 1) * rate), rate);
      await score(makeKit(ctx), meta);
      const buf = await ctx.startRendering();
      window.__score = [...Array(buf.numberOfChannels)].map((_, c) => buf.getChannelData(c));
      return { n: buf.length, ch: buf.numberOfChannels };
    },
    { project, rate, meta },
  );
  const CHUNK = 1 << 18; // frames per round trip (~1 MB of PCM)
  const pcm = [];
  let peak = 0;
  for (let from = 0; from < n; from += CHUNK) {
    const part = await page.evaluate(
      async ({ from, len }) => {
        const data = window.__score, ch = data.length;
        const out = new DataView(new ArrayBuffer(len * ch * 2));
        let peak = 0;
        for (let i = 0, o = 0; i < len; i++) for (let c = 0; c < ch; c++, o += 2) {
          const v = Math.max(-1, Math.min(1, data[c][from + i]));
          peak = Math.max(peak, Math.abs(v));
          out.setInt16(o, v * 0x7fff, true);
        }
        // Base64 natively: String.fromCharCode(...bigChunk) overflowed the renderer's real stack on
        // Alpine (musl), which crashes the tab instead of throwing a RangeError.
        const url = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = () => reject(r.error);
          r.readAsDataURL(new Blob([out.buffer]));
        });
        return { b64: url.slice(url.indexOf(',') + 1), peak };
      },
      { from, len: Math.min(CHUNK, n - from) },
    );
    pcm.push(Buffer.from(part.b64, 'base64'));
    peak = Math.max(peak, part.peak);
  }
  // 16-bit PCM WAV header
  const size = n * ch * 2;
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + size, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(ch, 22);
  head.writeUInt32LE(rate, 24); head.writeUInt32LE(rate * ch * 2, 28); head.writeUInt16LE(ch * 2, 32);
  head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(size, 40);
  const dir = join(ROOT, 'projects', project, 'audio');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'score.wav');
  writeFileSync(file, Buffer.concat([head, ...pcm]));
  console.log(`score → ${relative(ROOT, file)}  (peak ${(20 * Math.log10(peak || 1e-9)).toFixed(1)} dBFS${peak >= 0.999 ? ' — CLIPPING, lower gains' : ''})`);
} finally {
  await browser.close();
  server.close();
}
