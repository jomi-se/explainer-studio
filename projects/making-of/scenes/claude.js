// How Claude makes a film: the gates, each leaving a file; then the loop (write → lint → stills →
// look → fix); then "look" opens a real contact sheet of this very film (assets/contact.jpg).
import { h, tf, draw } from '/studio/dom.js';
import { springAt, springs, ease, progress, clamp, stagger } from '/studio/motion.js';
import { captions, showAt } from '../lib/fx.js';
import { icon } from '../lib/cast.js';

const FILES = ['SOURCE_NOTES.md', 'BRIEF.md', 'SCRIPT.md', 'scenes/*.js', 'REVIEW.md', 'audio.js'];
const LOOP = ['write', 'lint', 'stills', 'look', 'fix'];
const C = { x: 470, y: 660, r: 170 };
const LOOK = 3;
const ang = (i) => ((i - LOOK) / LOOP.length) * 2 * Math.PI; // "look" sits on the right, facing the sheet

export function mount(root, { asset }) {
  root.append(h('div', { class: 'bg gr-glow' }));
  const L = h('div', { class: 'bg' });
  root.append(L);

  const who = h('div', { class: 'abs row', style: { left: '150px', top: '130px', gap: '24px' } },
    h('div', { class: 'badge', style: { color: 'var(--accent-2)', width: '84px', height: '84px', borderRadius: '50%' } }, icon('sparkle', { size: 50, width: 1.8 })),
    h('div', { class: 'h2', style: { fontSize: '56px' } }, 'Claude Code'));
  const files = FILES.map((f, i) => h('div', { class: 'file', style: { fontSize: '30px' } },
    h('span', { class: 'mono', style: { color: 'var(--ink-3)', fontSize: '28px' } }, String(i + 1)), icon('file', { size: 32 }), f));
  const shelf = h('div', { class: 'abs', style: { left: '150px', top: '262px', width: '1300px', display: 'flex', flexWrap: 'wrap', gap: '22px 26px' } }, files);

  const ring = h('svg', { class: 'abs', width: 1920, height: 1080, style: { left: '0', top: '0', overflow: 'visible' } },
    h('circle', { cx: C.x, cy: C.y, r: C.r, fill: 'none', stroke: 'var(--line)', 'stroke-width': 4 }),
    h('circle', { r: 13, fill: 'var(--accent-2)' }),
    h('path', { d: '', fill: 'none', stroke: 'var(--accent)', 'stroke-width': 4, 'stroke-dasharray': '1 1' }));
  const [circle, runner, beam] = ring.children;
  const nodes = LOOP.map((n, i) => {
    const x = C.x + Math.cos(ang(i)) * C.r, y = C.y + Math.sin(ang(i)) * C.r;
    return h('div', { class: 'anchor chip', style: { left: `${x}px`, top: `${y}px`, fontSize: '30px' } }, i === LOOK ? icon('eye', { size: 32 }) : null, n);
  });

  const sheet = h('div', { class: 'abs', style: { left: '960px', top: '440px', width: '800px' } },
    h('div', { class: 'label', style: { marginBottom: '14px', color: 'var(--ink-3)' } }, 'out/making-of/stills/…/contact-01.png'),
    h('img', { src: asset('assets/contact.jpg'), style: { width: '800px', borderRadius: '12px', outline: '3px solid var(--accent)', display: 'block' }, 'data-lint-ignore': '' }));
  L.append(who, shelf, ring, ...nodes, sheet);

  const cap = captions(L, [
    { at: 0.3, out: 4.6, text: 'How __Claude__ makes one: each step leaves a **file**' },
    { at: 4.6, out: 9.0, text: 'Then a loop: write, lint, render stills, **look**, fix' },
    { at: 9.0, out: 13.75, text: 'Claude checks its work by reading stills. These are **this film’s**.' },
  ]);

  return {
    update(t) {
      showAt(who, t, 0.1, Infinity, { dx: -30, dy: 0 });
      const dimF = 1 - 0.7 * ease.inOutCubic(progress(t, 4.6, 0.5));
      files.forEach((el, i) => {
        showAt(el, t, stagger(i, 0.45, 0.9), Infinity, { dy: 20 });
        el.style.opacity = String(Number(el.style.opacity) * dimF);
      });

      // the loop: ring draws, nodes pop, a runner goes round (one lap per 1.6 s)
      draw(circle, ease.inOutCubic(progress(t, 4.7, 0.7)));
      nodes.forEach((el, i) => showAt(el, t, stagger(i, 0.1, 5.0), Infinity, { dy: 16 }));
      const lap = Math.max(0, t - 5.6) / 1.6;
      const a = ang(0) + lap * 2 * Math.PI;
      // after 9.0 the runner parks on "look"
      const park = t >= 9.0;
      const ar = park ? ang(LOOK) : a;
      runner.setAttribute('cx', C.x + Math.cos(ar) * C.r);
      runner.setAttribute('cy', C.y + Math.sin(ar) * C.r);
      runner.style.opacity = String(clamp((t - 5.6) / 0.2));
      const near = park ? LOOK : Math.round((((lap % 1) + 1) % 1) * LOOP.length) % LOOP.length;
      nodes.forEach((el, i) => {
        const on = t >= 5.6 && i === near;
        el.style.color = on ? 'var(--accent)' : '';
        el.style.borderColor = on ? 'var(--gr-lime-glow)' : '';
      });

      // "look" opens the contact sheet of this film
      const lx = C.x + Math.cos(ang(LOOK)) * C.r, ly = C.y + Math.sin(ang(LOOK)) * C.r;
      beam.setAttribute('d', `M ${lx + 80} ${ly} C ${lx + 140} ${ly} 880 ${ly} 950 ${ly}`);
      draw(beam, ease.outCubic(progress(t, 9.1, 0.5)));
      const ps = springAt(t, 9.4, springs.snappy);
      tf(sheet, { scale: 0.85 + 0.15 * clamp(ps), opacity: clamp(ps * 1.6) });
      sheet.style.transformOrigin = '0 50%';
      sheet.style.visibility = t < 9.4 ? 'hidden' : '';
      cap.update(t);
    },
  };
}
