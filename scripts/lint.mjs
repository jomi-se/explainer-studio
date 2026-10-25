// Layout + determinism lint. Samples the timeline and flags, per text element:
//   unsafe   — visible text outside the title-safe area
//   small    — effective (on-screen) font size below --t-min
//   overflow — text overflowing its own box
//   overlap  — two visible text elements intersecting
// plus page errors and Web Animations (which would bypass seek()).
// Issues shorter than --min-dur seconds are ignored (transitions pass through).
//
//   node scripts/lint.mjs <project> [--step 0.2] [--min-dur 0.4] [--scene id] [--determinism]
// Exit code 1 when anything is reported. JSON at out/<project>/lint.json.

import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { ROOT, parseArgs, requireProject, outDir, launch, startServer, openProject, seek } from './lib.mjs';

const args = parseArgs();
const project = requireProject(args);
const step = Number(args.step ?? 0.2);
const minDur = Number(args['min-dur'] ?? 0.4);

// Runs in the page. Returns the issues visible at the current frame.
function inspect() {
  const stage = document.getElementById('stage');
  const root = getComputedStyle(document.documentElement);
  const px = (v) => parseFloat(root.getPropertyValue(v)) || 0;
  const safeX = px('--safe-x'), safeY = px('--safe-y'), tMin = px('--t-min') || 28;
  const S = stage.getBoundingClientRect();
  const safe = { l: S.left + safeX - 2, t: S.top + safeY - 2, r: S.right - safeX + 2, b: S.bottom - safeY + 2 };

  const visibleOpacity = (el) => {
    let o = 1;
    for (let e = el; e && e !== stage; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      o *= Number(cs.opacity);
    }
    return o;
  };
  const name = (el) => {
    const host = el.closest('[data-scene],[data-layer]');
    const scope = host ? host.dataset.scene ?? `layer:${host.dataset.layer}` : '?';
    const parts = [];
    for (let e = el; e && e !== host && parts.length < 3; e = e.parentElement) {
      const cls = typeof e.className === 'string' ? e.className : e.className?.baseVal ?? '';
      parts.unshift(e.id ? `#${e.id}` : e.tagName.toLowerCase() + (cls ? '.' + cls.trim().split(/\s+/).join('.') : ''));
    }
    return `${scope} › ${parts.join(' > ')}`;
  };
  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

  const texts = [];
  for (const el of stage.querySelectorAll('*')) {
    if (!hasOwnText(el) || el.closest('[data-lint-ignore]')) continue;
    const op = visibleOpacity(el);
    if (op < 0.15) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    let scale = 1;
    if (el instanceof SVGElement) scale = el.getScreenCTM()?.a ?? 1;
    else if (el.offsetWidth) scale = r.width / el.offsetWidth;
    // an inline element that wraps has one box per line: compare those, not their union
    const boxes = !(el instanceof SVGElement) && getComputedStyle(el).display === 'inline' ? [...el.getClientRects()] : [r];
    texts.push({ el, op, r, boxes, size: fs * scale, id: name(el), text: el.textContent.trim().slice(0, 48) });
  }

  const issues = [];
  for (const x of texts) {
    const { r } = x;
    if (r.left < safe.l || r.top < safe.t || r.right > safe.r || r.bottom > safe.b)
      issues.push({ kind: 'unsafe', id: x.id, text: x.text, detail: `box ${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)}` });
    if (x.op > 0.5 && x.size < tMin - 0.5) issues.push({ kind: 'small', id: x.id, text: x.text, detail: `${x.size.toFixed(1)}px < ${tMin}px` });
    const el = x.el;
    // Vertical slack of a quarter em: tight line-heights let ascenders/descenders poke out harmlessly.
    const slackY = parseFloat(getComputedStyle(el).fontSize) * 0.25;
    if (!(el instanceof SVGElement) && getComputedStyle(el).display !== 'inline' && el.clientWidth > 0 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + slackY))
      issues.push({ kind: 'overflow', id: x.id, text: x.text, detail: `content ${el.scrollWidth}×${el.scrollHeight} in box ${el.clientWidth}×${el.clientHeight}` });
  }
  const strong = texts.filter((x) => x.op > 0.5);
  for (let i = 0; i < strong.length; i++)
    for (let j = i + 1; j < strong.length; j++) {
      const a = strong[i], b = strong[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      let worst = 0;
      for (const ra of a.boxes) for (const rb of b.boxes) {
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (w <= 0 || h <= 0) continue;
        worst = Math.max(worst, (w * h) / Math.min(ra.width * ra.height, rb.width * rb.height));
      }
      if (worst > 0.1) issues.push({ kind: 'overlap', id: `${a.id}  ✕  ${b.id}`, text: `${a.text} ✕ ${b.text}`, detail: `${Math.round(100 * worst)}% of smaller box` });
    }
  const anims = document.getAnimations().filter((a) => a.playState === 'running');
  if (anims.length) issues.push({ kind: 'animation', id: 'document', text: '', detail: `${anims.length} running Web/CSS animation(s) — these ignore seek()` });
  return issues;
}

const { server, url } = await startServer();
const browser = await launch();
let failed = false;
try {
  const { page, meta, consoleErrors } = await openProject(browser, url, project);
  let from = 0, to = meta.duration;
  if (args.scene) {
    const sc = meta.scenes.find((s) => s.id === args.scene);
    if (!sc) throw new Error(`no scene "${args.scene}"`);
    [from, to] = [sc.start, sc.start + sc.duration];
  }

  const seen = new Map(); // kind|id → { kind, id, text, detail, times: [] }
  for (let t = from; t <= to + 1e-9; t += step) {
    await seek(page, t);
    for (const is of await page.evaluate(inspect)) {
      const key = `${is.kind}|${is.id}`;
      if (!seen.has(key)) seen.set(key, { ...is, times: [] });
      seen.get(key).times.push(t);
    }
  }

  // Merge sample times into ranges and drop the transient ones.
  const report = [];
  for (const v of seen.values()) {
    const ranges = [];
    for (const t of v.times) {
      const last = ranges.at(-1);
      if (last && t - last[1] <= step * 1.5) last[1] = t;
      else ranges.push([t, t]);
    }
    const kept = ranges.filter(([a, b]) => v.kind === 'animation' || b - a + step >= minDur);
    if (kept.length) report.push({ kind: v.kind, id: v.id, text: v.text, detail: v.detail, ranges: kept.map(([a, b]) => [+a.toFixed(2), +b.toFixed(2)]) });
  }

  if (args.determinism) {
    const times = [0.1, 0.33, 0.5, 0.71, 0.9].map((f) => from + (to - from) * f);
    const hash = async (t) => (await seek(page, t), createHash('sha1').update(await page.screenshot()).digest('hex'));
    const fwd = [];
    for (const t of times) fwd.push(await hash(t));
    for (const [i, t] of [...times.entries()].reverse()) {
      if ((await hash(t)) !== fwd[i]) report.push({ kind: 'nondeterministic', id: `t=${t.toFixed(2)}`, text: '', detail: 'frame differs depending on seek order (state leaking between frames, randomness, or clocks)', ranges: [[+t.toFixed(2), +t.toFixed(2)]] });
    }
  }

  const errs = [...consoleErrors, ...(await page.evaluate(() => window.__studio.errors))];
  for (const e of errs) report.push({ kind: 'error', id: 'page', text: '', detail: e, ranges: [] });

  const order = ['error', 'nondeterministic', 'animation', 'overflow', 'unsafe', 'overlap', 'small'];
  report.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.ranges[0]?.[0] - b.ranges[0]?.[0]);
  const file = join(outDir(project), 'lint.json');
  writeFileSync(file, JSON.stringify(report, null, 2));

  if (!report.length) console.log(`lint clean: ${project} ${from.toFixed(1)}–${to.toFixed(1)}s, step ${step}s`);
  for (const r of report) {
    const when = r.ranges.map(([a, b]) => (a === b ? `${a}s` : `${a}–${b}s`)).join(', ');
    console.log(`${r.kind.padEnd(16)} ${r.id}\n${''.padEnd(17)}"${r.text}" ${r.detail}${when ? `  @ ${when}` : ''}`);
  }
  if (report.length) console.log(`\n${report.length} issue(s) → ${relative(ROOT, file)}`);
  failed = report.length > 0;
} finally {
  await browser.close();
  server.close();
}
process.exit(failed ? 1 : 0);
