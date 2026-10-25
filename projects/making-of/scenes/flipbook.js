// A video is a flipbook: a strip of frame cards (the ball a little further in each) gathers into a
// stack that flicks through 30 frames a second; then the count runs up to this film's real total.
import { h, tf } from '/studio/dom.js';
import { springAt, springs, ease, progress, clamp, interpolate, stagger } from '/studio/motion.js';
import { captions, showAt } from '../lib/fx.js';
import { frameCard, pad } from '../lib/cast.js';

const N = 8, W = 180, H = 118, BIG = 3.3, GAP = 205;
const STACK = { x: 960, y: 470 };
// ball path across a card: left → right with a hop, 0→1 per second of film
const ballX = (k) => (k % 30) / 29;
const STRIP_Y = 500;

export function mount(root, { duration, fps }) {
  const total = Math.round(duration * fps);
  root.append(h('div', { class: 'bg gr-glow' }));
  const L = h('div', { class: 'bg' });
  root.append(L);

  const back = [2, 1].map((i) => {
    const c = frameCard({ w: W, h: H, num: '', ballX: 0 });
    c.el.style.left = `${STACK.x - W / 2}px`; c.el.style.top = `${STACK.y - H / 2}px`;
    c.ball.style.visibility = 'hidden';
    L.append(c.el);
    return { ...c, i };
  });
  const cards = Array.from({ length: N }, (_, i) => {
    const c = frameCard({ w: W, h: H, num: pad(i + 1), ballX: ballX(i * 4) });
    c.el.style.left = `${960 + (i - (N - 1) / 2) * GAP - W / 2}px`;
    c.el.style.top = `${STRIP_Y - H / 2}px`;
    L.append(c.el);
    return c;
  });
  const front = cards[0];
  const ruler = h('div', { class: 'anchor chip em', style: { left: '960px', top: `${STRIP_Y - 150}px` } }, '1 second = 30 of these');
  const count = h('div', { class: 'anchor', style: { left: '960px', top: '790px', display: 'flex', alignItems: 'baseline', gap: '22px' } },
    h('span', { class: 'mono', style: { fontSize: '96px', fontWeight: '500', color: 'var(--accent)' } }, ''), h('span', { class: 'sub' }, 'frames'));
  L.append(ruler, count);
  const num = count.firstChild;

  const cap = captions(L, [
    { at: 0.3, out: 4.4, text: 'A video is a flipbook: **30 pictures** every second' },
    { at: 4.4, out: 8.3, text: `This film: **${total.toLocaleString('en')} pictures**, each drawn on purpose` },
  ]);

  return {
    update(t) {
      // strip pops in, card by card
      cards.forEach((c, i) => {
        const pin = springAt(t, stagger(i, 0.09, 0.15), springs.snappy);
        // then gathers into the stack (front card = frame 1, scaled up)
        const pg = springAt(t, stagger(N - 1 - i, 0.05, 3.0), springs.snappy);
        const x0 = 960 + (i - (N - 1) / 2) * GAP;
        const x = x0 + (STACK.x - x0) * pg, y = STRIP_Y + (STACK.y - STRIP_Y) * pg;
        const s = 1 + (i === 0 ? BIG - 1 : 0.4) * clamp(pg);
        tf(c.el, { x: x - x0, y: y - STRIP_Y + (1 - pin) * 30, scale: s, opacity: clamp(pin * 1.6) * (i === 0 ? 1 : 1 - clamp((pg - 0.15) / 0.4)) });
      });
      showAt(ruler, t, 0.9, 3.0, { dy: 10 });

      // the stack behind the front card
      back.forEach((b) => {
        const p = clamp(springAt(t, 3.25, springs.snappy));
        tf(b.el, { x: b.i * 22, y: b.i * -22, scale: 1 + (BIG - 1) * p, opacity: p * (0.5 - b.i * 0.12) });
      });

      // flick: from 3.6 s the front card shows frame k, 30 per second (exactly one per film frame)
      const flick = t >= 3.6;
      const k = flick ? Math.floor((t - 3.6) * 30) : 0;
      front.setNum(pad(k + 1));
      front.setBall(ballX(flick ? k : 0));
      front.ball.style.top = `${H * 0.68 - (flick ? Math.sin(Math.PI * ballX(k)) * 18 : 0)}px`;

      // counter runs from 30 to the film's total
      const pc = ease.inOutCubic(progress(t, 4.6, 2.4));
      showAt(count, t, 4.4, Infinity, { dy: 16 });
      num.textContent = Math.round(interpolate(pc, [0, 1], [30, total])).toLocaleString('en');
      cap.update(t);
    },
  };
}
