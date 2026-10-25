// Pre-renders the .gr-glow atmosphere to glow.png. Big CSS radial gradients are
// re-rasterised on every frame (the renderer repaints from scratch for determinism)
// and cost ~5x render speed; a small cached bitmap scaled up is ~free and smooth.
//   node brands/graphite/make-glow.mjs
import { fileURLToPath } from 'node:url';
import { launch } from '../../scripts/lib.mjs';

const W = 480, H = 270;
const b = await launch();
const page = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await page.setContent(`<style>html,body{margin:0}div{width:${W}px;height:${H}px;background:
  radial-gradient(60% 55% at 70% 40%, color-mix(in srgb, #74b0ff 12%, transparent), transparent 70%),
  radial-gradient(50% 50% at 20% 80%, color-mix(in srgb, #b5f07a 6%, transparent), transparent 70%), #0d1117}</style><div></div>`);
await page.screenshot({ path: fileURLToPath(new URL('glow.png', import.meta.url)) });
await b.close();
