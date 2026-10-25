// 2 · A new kind of actor — agent vs you vs app; the four questions; Q1 = its own identity.
import { h, tf, css } from '/studio/dom.js';
import { Agent, You, Badge, place, blinkAt } from '../lib/cast.js';
import { headline, showAt, captions, rich, interpolate, ease, progress, springAt, springs, clamp, stagger } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const COLS = [860, 1200, 1540];
const ROWS = [
  { y: 590, text: 'Decides what to do next', marks: ['y', 'n', 'y'] },
  { y: 720, text: 'Works 24/7, at machine speed', marks: ['n', 'y', 'y'] },
  { y: 850, text: 'Obeys text from strangers', marks: ['n', 'n', 'r'] },
];
const ROW_AT = [2.6, 4.3, 6.0];
const QS = ['Who are you?', 'Who sent you?', 'What may you do, and until when?', 'Who’s keeping score?'];

export function mount(root) {
  root.classList.add('gr-glow');
  const hl = headline(root, { eyebrow: 'A new kind of actor', text: 'Agents aren’t you. They aren’t apps either.', cls: 'sm' });

  const you = You({ size: 110 });
  const app = h('div', { class: 'you' }, h('div', { class: 'app-tile' }, icon('bag', { size: 56, width: 1.5 })), h('div', { class: 'cast-label' }, 'App'));
  const agent = Agent({ size: 116, name: 'Agent' });
  const heads = [place(you.el, COLS[0], 400), place(app, COLS[1], 400), place(agent.el, COLS[2], 400)];

  const rows = ROWS.map((r) => {
    const label = place(h('div', { class: 'row-label' }, r.text), 0, 0);
    css(label, { left: 120, top: r.y, translate: '0 -50%' });
    const line = css(h('div', { class: 'row-line' }), { top: r.y + 60 });
    const marks = r.marks.map((m, i) => place(h('div', { class: `mark mark-${m}` }, icon(m === 'n' ? 'x' : m === 'r' ? 'bolt' : 'check', { size: 44, width: 2.2 })), COLS[i], r.y));
    return { label, line, marks };
  });

  // the four questions (right) and the agent's own ID
  const qs = QS.map((q, i) => {
    const el = h('div', { class: 'q' }, h('span', { class: 'q-n' }, String(i + 1)), h('span', { class: 'q-t' }, q));
    css(el, { left: 860, top: 330 + i * 120 });
    return el;
  });
  const badge = Badge({ id: 'agent:restock-7f3', sub: 'acting for you' });
  const badgeW = place(badge, 470, 735);

  root.append(...heads, ...rows.flatMap((r) => [r.line, r.label, ...r.marks]), ...qs, badgeW);
  const cap = captions(root, [
    { at: 8.2, out: 13.2, text: 'Your judgment, a machine’s speed, and it ~~believes what it reads~~.' },
    { at: 15.4, out: 19.3, text: 'Every service should ask an agent __four questions__.' },
    { at: 19.6, out: 24.6, text: 'First: who are you? Its **own identity**, not a copy of yours.' },
  ]);

  const TABLE_OUT = 13.4;
  return {
    update(t) {
      hl.update(t, 0.2, TABLE_OUT + 0.3);
      const out = ease.inOutCubic(progress(t, TABLE_OUT, 0.6)); // table leaves
      heads.forEach((el, i) => {
        if (i === 2) return;
        const s = showAt(el, t, stagger(i, 0.12, 1.3), TABLE_OUT + 0.5, { dy: 30, scale0: 0.8 });
      });
      // the agent stays: it moves to the left and grows
      const pa = springAt(t, 1.54, springs.snappy);
      const mv = springAt(t, TABLE_OUT + 0.1, springs.slow);
      tf(heads[2], {
        x: (470 - COLS[2]) * mv, y: (520 - 400) * mv + (1 - pa) * 30,
        scale: (0.8 + 0.2 * pa) * (1 + 0.55 * mv), opacity: clamp(pa * 1.6),
      });
      rows.forEach((r, i) => {
        const at = ROW_AT[i];
        showAt(r.label, t, at, TABLE_OUT + 0.4, { dx: -30, dy: 0 });
        const lp = ease.outCubic(progress(t, at, 0.6)) * (1 - out);
        r.line.style.transform = `scaleX(${lp})`;
        r.marks.forEach((m, j) => {
          const s = showAt(m, t, at + 0.35 + j * 0.14, TABLE_OUT + 0.4, { dy: 0, scale0: 0.4, spring: ROWS[i].marks[j] === 'r' ? springs.bouncy : springs.snappy });
        });
      });
      // agent reacts to the third row
      const alarm = interpolate(t, [6.7, 7.0, 12.6, 13.2], [0, 1, 1, 0]);
      agent.label.style.opacity = String(1 - progress(t, TABLE_OUT, 0.4));
      agent.face({ look: t < TABLE_OUT ? [-0.8, 0.5] : [0.9, -0.2], blink: blinkAt(t, [3.4, 9.6, 15.2, 21.3]), alarm });

      // questions
      qs.forEach((q, i) => {
        const s = showAt(q, t, stagger(i, 0.14, 14.2), Infinity, { dx: 40, dy: 0 });
        const focus = t < 19.2 ? 1 : i === 0 ? 1 : 0.32;
        q.style.opacity = String(s.o * (t < 19.2 ? 1 : interpolate(t, [19.2, 19.6], [1, focus])));
        q.classList.toggle('on', i === 0 && t >= 19.3);
      });
      // badge drops on
      const bp = springAt(t, 19.9, springs.bouncy);
      tf(badgeW, { y: (1 - bp) * -80, opacity: clamp(bp * 2), rotate: (1 - clamp(bp)) * -8 });
      badgeW.style.visibility = t < 19.9 ? 'hidden' : '';
      cap.update(t);
    },
  };
}
