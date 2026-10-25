// Render still frames + paginated contact sheets for visual review.
//
//   node scripts/stills.mjs <project>                       3 frames per scene (20/55/90%)
//   node scripts/stills.mjs <project> --at 0.5              1 frame per scene at 50%
//   node scripts/stills.mjs <project> --scene intro --every 0.25   film strip of one scene
//   node scripts/stills.mjs <project> --times 1.5,8,12.25   specific global times
//   node scripts/stills.mjs <project> --scene-times intro@2,intro@6.5   times within scenes
//   options: --scale 0.5 (frame size) · --per-sheet 12 · --out <name>
//
// Writes out/<project>/stills/<name>/NNN_<scene>_<t>.png and contact-NN.png.

import { writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, parseArgs, requireProject, outDir, launch, startServer, openProject, seek } from './lib.mjs';

const args = parseArgs();
const project = requireProject(args);
const scale = Number(args.scale ?? 0.5);
const perSheet = Number(args['per-sheet'] ?? 12);

const { server, url } = await startServer();
const browser = await launch();
try {
  const { page, meta, consoleErrors } = await openProject(browser, url, project, { scale });

  let shots = []; // { t, label }
  let name;
  if (args.times) {
    name = args.out ?? 'times';
    shots = String(args.times).split(',').map(Number).map((t) => ({ t }));
  } else if (args['scene-times']) {
    // scene-relative: id@seconds, resolved against the timeline the page loaded (immune to edits elsewhere)
    name = args.out ?? 'scene-times';
    shots = String(args['scene-times']).split(',').map((x) => {
      const [id, t] = x.split('@');
      const sc = meta.scenes.find((s) => s.id === id);
      if (!sc) throw new Error(`no scene "${id}"`);
      return { t: sc.start + Number(t) };
    });
  } else if (args.scene) {
    const sc = meta.scenes.find((s) => s.id === args.scene);
    if (!sc) throw new Error(`no scene "${args.scene}" (have: ${meta.scenes.map((s) => s.id).join(', ')})`);
    name = args.out ?? `strip-${sc.id}`;
    const every = Number(args.every ?? 0.25);
    for (let t = 0; t <= sc.duration + 1e-9; t += every) shots.push({ t: Math.min(sc.start + t, meta.duration) });
  } else {
    name = args.out ?? 'scenes';
    const at = String(args.at ?? '0.2,0.55,0.9').split(',').map(Number);
    for (const sc of meta.scenes) for (const f of at) shots.push({ t: sc.start + sc.duration * f });
  }

  const dir = outDir(project, 'stills', name);
  rmSync(dir, { recursive: true, force: true });
  outDir(project, 'stills', name);

  const files = [];
  for (const [i, s] of shots.entries()) {
    await seek(page, s.t);
    const sc = meta.scenes.findLast((x) => s.t >= x.start);
    const label = `${sc.id} @ ${s.t.toFixed(2)}s (+${(s.t - sc.start).toFixed(2)})`;
    const file = join(dir, `${String(i).padStart(3, '0')}_${sc.id}_${s.t.toFixed(2)}.png`);
    writeFileSync(file, await page.screenshot({ type: 'png' }));
    files.push({ file, label });
  }

  // Contact sheets: 4 columns of 480px thumbnails, `perSheet` frames per page.
  const sheet = await (await browser.newContext({ viewport: { width: 1960, height: 400 } })).newPage();
  const sheets = [];
  for (let p = 0; p * perSheet < files.length; p++) {
    const chunk = files.slice(p * perSheet, (p + 1) * perSheet);
    const cells = chunk
      .map(({ file, label }) => `<figure><img src="data:image/png;base64,${readFileSync(file).toString('base64')}"><figcaption>${label}</figcaption></figure>`)
      .join('');
    await sheet.setContent(`<style>body{margin:0;padding:10px;background:#1a1a1a;font:15px ui-monospace,monospace;color:#ddd;display:grid;grid-template-columns:repeat(4,480px);gap:10px}figure{margin:0}img{width:480px;height:${Math.round((480 * meta.height) / meta.width)}px;display:block;outline:1px solid #444}figcaption{padding:4px 2px}</style>${cells}`);
    await sheet.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
    const out = join(dir, `contact-${String(p + 1).padStart(2, '0')}.png`);
    await sheet.screenshot({ path: out, fullPage: true });
    sheets.push(out);
  }

  const errs = [...consoleErrors, ...(await page.evaluate(() => window.__studio.errors))];
  if (errs.length) console.error(`page errors:\n  ${errs.join('\n  ')}`);
  console.log(`${files.length} frames → ${relative(ROOT, dir)}`);
  for (const s of sheets) console.log(`contact sheet: ${relative(ROOT, s)}`);
} finally {
  await browser.close();
  server.close();
}
