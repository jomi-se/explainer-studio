// No animation library: a bounce is the spring formula from studio/motion.js. Its curve draws
// itself while a square pops with the very same number; then the curve morphs into a sound
// wave — the soundtrack is computed from t the same way.
import { h, tf, pointAt } from '/studio/dom.js';
import { spring, springs, ease, progress, clamp, lerp } from '/studio/motion.js';
import { captions, showAt } from '../lib/fx.js';
import { icon } from '../lib/cast.js';

const G = { x: 180, y: 230, w: 980, h: 520 }; // graph box
const SPAN = 1.6, REL = 1.0, PTS = 160; // seconds shown; spring released at t = REL
const SP = springs.bouncy;
const gx = (s) => G.x + (s / SPAN) * G.w;
const gy = (v) => G.y + G.h - 70 - v * 330;
const springPts = Array.from({ length: PTS + 1 }, (_, i) => { const s = (i / PTS) * SPAN; return [gx(s), gy(spring(s, SP))]; });
// a synth-like wave: two sines under an attack/decay envelope
const wavePts = Array.from({ length: PTS + 1 }, (_, i) => {
  const u = i / PTS, env = Math.min(1, u * 8) * Math.exp(-u * 1.6);
  return [G.x + u * G.w, G.y + G.h / 2 - 20 - env * 210 * (Math.sin(u * 2 * Math.PI * 9) * 0.75 + Math.sin(u * 2 * Math.PI * 23) * 0.25)];
});
const pathOf = (pts) => 'M ' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ');

export function mount(root) {
  root.append(h('div', { class: 'bg gr-glow' }));
  const L = h('div', { class: 'bg' });
  root.append(L);

  const svg = h('svg', { class: 'abs', width: 1920, height: 1080, style: { left: '0', top: '0', overflow: 'visible' } });
  const axes = h('path', { d: `M ${G.x} ${G.y} V ${G.y + G.h} H ${G.x + G.w}`, fill: 'none', stroke: 'var(--line)', 'stroke-width': 3 });
  const one = h('path', { d: `M ${G.x} ${gy(1)} H ${G.x + G.w}`, fill: 'none', stroke: 'var(--gr-graphite-60)', 'stroke-width': 2, 'stroke-dasharray': '10 10' });
  const curve = h('path', { d: pathOf(springPts), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const dot = h('circle', { r: 14, fill: 'var(--accent)' });
  svg.append(axes, one, curve, dot);
  const fn = h('div', { class: 'abs chip em', style: { left: `${G.x}px`, top: `${G.y - 80}px`, fontSize: '32px' } }, 'springAt(t, 1.0)');
  const fn2 = h('div', { class: 'abs chip ag', style: { left: `${G.x}px`, top: `${G.y - 80}px`, fontSize: '32px' } }, "kit.pluck(t, 'A4')");
  const file = h('div', { class: 'abs label', style: { left: `${G.x + 440}px`, top: `${G.y - 66}px`, color: 'var(--ink-3)' } }, 'studio/motion.js');
  const tAxis = h('div', { class: 'abs label', style: { left: `${G.x + G.w - 30}px`, top: `${G.y + G.h + 14}px`, fontSize: '32px', textTransform: 'none' } }, 't');
  const oneLbl = h('div', { class: 'abs label', style: { left: `${G.x - 50}px`, top: `${gy(1) - 20}px`, fontSize: '32px' } }, '1');
  const square = h('div', { class: 'anchor badge', style: { left: '1530px', top: '470px', width: '220px', height: '220px', borderRadius: '48px', background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--gr-ink-900)' } }, icon('sparkle', { size: 120, width: 1.6 }));
  const sqLbl = h('div', { class: 'anchor label', style: { left: '1530px', top: '650px' } }, 'scale = that number');
  const note = h('div', { class: 'anchor', style: { left: '1530px', top: '470px', color: 'var(--accent)' } }, icon('music', { size: 170, width: 1.5 }));
  const noteLbl = h('div', { class: 'anchor label', style: { left: '1530px', top: '650px' } }, 'studio/sound.js');
  L.append(svg, fn, fn2, file, tAxis, oneLbl, square, sqLbl, note, noteLbl);

  const cap = captions(L, [
    { at: 0.3, out: 4.6, text: 'No animation library. A bounce is a **spring formula**' },
    { at: 4.6, out: 9.7, text: 'Even the music is computed: **sound waves from t**' },
  ]);

  return {
    update(t) {
      for (const [i, e] of [axes, one].entries()) e.style.opacity = String(clamp((t - 0.2 - i * 0.1) / 0.3));
      showAt(fn, t, 0.4, 4.8, { dy: 12 });
      showAt(fn2, t, 5.0, Infinity, { dy: 12 });
      showAt(file, t, 0.6, 4.7, { dy: 10 });
      showAt(tAxis, t, 0.3, 4.7, { dy: 0 }); showAt(oneLbl, t, 0.4, 4.7, { dy: 0 });
      one.style.opacity = String(Number(one.style.opacity) * (1 - clamp((t - 4.4) / 0.3)));
      axes.style.opacity = String(Number(axes.style.opacity) * (1 - 0.6 * clamp((t - 4.4) / 0.3)));

      // the spring plays out between 1.0 s and 2.6 s of scene time (local s = t - REL)
      const s = clamp(t - REL, 0, SPAN);
      const pd = s / SPAN;
      // morph to the wave from 4.7 s
      const pm = ease.inOutCubic(progress(t, 4.7, 1.0));
      const pts = springPts.map(([x, y], i) => [lerp(x, wavePts[i][0], pm), lerp(y, wavePts[i][1], pm)]);
      curve.setAttribute('d', pathOf(pts));
      curve.setAttribute('pathLength', '1');
      curve.style.strokeDasharray = '1 1';
      curve.style.strokeDashoffset = String(1 - Math.max(pd, pm));
      curve.style.stroke = pm > 0.5 ? 'var(--accent-2)' : 'var(--accent)';
      const tip = pointAt(curve, Math.max(pd, 0.0001));
      dot.setAttribute('cx', tip.x); dot.setAttribute('cy', tip.y);
      dot.style.opacity = String(clamp((t - 0.8) / 0.2) * (1 - clamp((t - 4.4) / 0.3)));

      // the square uses the same value as its scale
      const v = spring(s, SP);
      const so = 1 - clamp((t - 4.5) / 0.3);
      tf(square, { scale: t < REL ? 0 : v, opacity: so });
      square.style.visibility = t < REL || so <= 0 ? 'hidden' : '';
      sqLbl.style.opacity = String(clamp((t - 2.2) / 0.3) * so);
      // …and becomes the music
      const pn = spring(t - 5.2, springs.snappy);
      tf(note, { scale: t < 5.2 ? 0.6 : 0.6 + 0.4 * pn, opacity: clamp(pn * 1.6) });
      note.style.visibility = t < 5.2 ? 'hidden' : '';
      noteLbl.style.opacity = String(clamp((t - 5.6) / 0.3));
      cap.update(t);
    },
  };
}
