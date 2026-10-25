// Pre-renders the film's static textures into assets/ (cheap to composite per frame):
//   grain.png    — 256² seeded monochrome noise tile (alpha only), offset per frame by the grain layer
//   vignette.png — soft edge darkening
//   night.png    — cool, darker atmosphere for the 3 a.m. scenes
//   dawn.png     — warmer morning atmosphere
//   node projects/agentic-auth/make-textures.mjs
import { fileURLToPath } from 'node:url';
import { launch } from '../../scripts/lib.mjs';

const out = (f) => fileURLToPath(new URL(`assets/${f}`, import.meta.url));
const b = await launch();
const page = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage();

async function shot(w, hgt, html, file, { omitBackground = false } = {}) {
  await page.setViewportSize({ width: w, height: hgt });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${html}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out(file), omitBackground });
}

// grain: canvas noise with a fixed seed
await page.setViewportSize({ width: 256, height: 256 });
await page.setContent('<style>html,body{margin:0;background:transparent}</style><canvas width=256 height=256></canvas>');
await page.evaluate(() => {
  let a = 1337;
  const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const c = document.querySelector('canvas').getContext('2d');
  const img = c.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd() < 0.5 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.round(rnd() * 255);
  }
  c.putImageData(img, 0, 0);
});
await page.locator('canvas').screenshot({ path: out('grain.png'), omitBackground: true });

await shot(480, 270, `<div style="width:480px;height:270px;background:radial-gradient(75% 75% at 50% 45%, transparent 55%, rgb(2 4 10 / .55) 100%)"></div>`, 'vignette.png', { omitBackground: true });
await shot(480, 270, `<div style="width:480px;height:270px;background:
  radial-gradient(55% 60% at 72% 28%, color-mix(in srgb, #74b0ff 12%, transparent), transparent 70%),
  radial-gradient(60% 60% at 15% 90%, color-mix(in srgb, #2c4f8a 14%, transparent), transparent 70%), #070a12"></div>`, 'night.png');
await shot(480, 270, `<div style="width:480px;height:270px;background:
  radial-gradient(70% 65% at 30% 20%, color-mix(in srgb, #efc77e 9%, transparent), transparent 70%),
  radial-gradient(50% 50% at 85% 85%, color-mix(in srgb, #b5f07a 6%, transparent), transparent 70%), #14120e"></div>`, 'dawn.png');
await b.close();
console.log('textures → projects/agentic-auth/assets/');
