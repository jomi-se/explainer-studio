// 8 · Approve ≠ hide — a 2×2 that turns the product tour into a mental model:
// x = does a human approve each use? · y = can the model see the secret?
import { h, tf, css } from '/studio/dom.js';
import { place } from '../lib/cast.js';
import { headline, showAt, captions, interpolate, ease, progress, springAt, springs, clamp, stagger } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const P = { l: 560, r: 1720, t: 220, b: 840 }; // plot box
const MX = (P.l + P.r) / 2, MY = (P.t + P.b) / 2;

const DOTS = [
  { text: 'Plaintext config', x: 760, y: 320, bad: true },
  { text: 'Password pasted in chat', x: 900, y: 440, bad: true },
  { text: 'aac --output json', x: 1440, y: 380, bad: true, mono: true },
  { text: 'SecretRefs', x: 760, y: 640 },
  { text: 'Egress broker', x: 900, y: 760 },
  { text: 'secrets tool', x: 1040, y: 640, mono: true },
  { text: 'aac run', x: 1330, y: 720, mono: true },
  { text: 'Vault fills the field', x: 1500, y: 790, star: true },
];
const STAR = DOTS.findIndex((d) => d.star);

export function mount(root) {
  root.classList.add('gr-glow');
  const hl = headline(root, { eyebrow: 'Approve ≠ hide', text: 'Two different questions.', cls: 'sm' });

  const glow = css(h('div', { class: 'quad-glow' }), { left: MX, top: MY, width: P.r - MX, height: P.b - MY });
  const axes = h('svg', { class: 'wires', width: 1920, height: 1080, viewBox: '0 0 1920 1080' },
    h('rect', { x: P.l, y: P.t, width: P.r - P.l, height: P.b - P.t, rx: 14, class: 'plot-box' }),
    h('line', { x1: MX, y1: P.t, x2: MX, y2: P.b, class: 'plot-axis' }),
    h('line', { x1: P.l, y1: MY, x2: P.r, y2: MY, class: 'plot-axis' }));
  const yTop = css(h('div', { class: 'axis-lab rk' }, icon('eye', { size: 34, width: 1.8 }), h('span', {}, 'Model can see the secret')), { left: 110, top: P.t + 40, width: 420 });
  const yBot = css(h('div', { class: 'axis-lab em' }, icon('shield', { size: 34, width: 1.8 }), h('span', {}, 'Model never sees it')), { left: 110, top: MY + 40, width: 420 });
  const xL = css(h('div', { class: 'axis-x' }, 'No per-use approval'), { left: P.l, top: P.b + 14, width: MX - P.l });
  const xR = css(h('div', { class: 'axis-x' }, 'A human approves each use'), { left: MX, top: P.b + 14, width: P.r - MX });
  const aim = place(h('div', { class: 'aim' }, 'aim here'), P.r - 120, MY + 44);

  const dots = DOTS.map((d) => place(h('div', { class: `dot ${d.bad ? 'bad' : 'ok'} ${d.star ? 'star' : ''} ${d.mono ? 'mono' : ''}` }, h('i'), h('span', {}, d.text)), d.x, d.y));

  root.append(glow, axes, yTop, yBot, xL, xR, ...dots, aim);
  const cap = captions(root, [
    { at: 1.2, out: 6.2, text: 'Who says **yes**, and who **sees the secret**? Independent answers.' },
    { at: 12.0, out: 17.4, text: 'Aim for both: a human says yes, and the model never sees it.' },
  ]);

  return {
    update(t) {
      hl.update(t, 0.2);
      const pa = ease.inOutCubic(progress(t, 0.6, 0.8));
      axes.style.opacity = String(pa);
      showAt(yTop, t, 1.6, Infinity, { dx: -20, dy: 0 });
      showAt(yBot, t, 2.0, Infinity, { dx: -20, dy: 0 });
      showAt(xL, t, 2.6, Infinity, { dy: 14 });
      showAt(xR, t, 3.0, Infinity, { dy: 14 });
      dots.forEach((el, i) => showAt(el, t, i === STAR ? 11.0 : stagger(i, 0.62, 6.4), Infinity, { dy: -50, scale0: i === STAR ? 0.3 : 0.6, spring: i === STAR ? springs.bouncy : springs.snappy }));
      const halo = interpolate(t, [11.2, 11.6, 16.0, 17.0], [0, 1, 1, 0.4]);
      dots[STAR].firstChild.style.boxShadow = halo > 0.01 ? `0 0 0 ${10 * halo}px rgb(181 240 122 / ${0.25 * halo})` : 'none';
      const g = ease.inOutCubic(progress(t, 12.0, 0.8));
      glow.style.opacity = String(g);
      showAt(aim, t, 12.6, Infinity, { dy: 10, scale0: 0.8, spring: springs.bouncy });
      // the rest of the plot steps back when we aim
      dots.forEach((el, i) => {
        if (DOTS[i].x > MX && DOTS[i].y > MY) return;
        el.style.opacity = String(Number(el.style.opacity || 1) * (1 - 0.6 * g));
      });
      cap.update(t);
    },
  };
}
