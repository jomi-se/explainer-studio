// 12 · Recap — the key card returns fully engraved; the five rules stack beside it.
import { h, tf, css } from '/studio/dom.js';
import { KeyCard, place } from '../lib/cast.js';
import { showAt, richWords, wordsAt, rich, ease, progress, springAt, springs, clamp, stagger } from '../lib/fx.js';

const RULES = ['Delegate, **don’t share**.', 'Scope it to the job.', 'Short-lived and bound.', 'Secrets stay in the vault.', 'Confirm, log, revoke.'];

export function mount(root) {
  root.classList.add('gr-glow');
  const { nodes, words } = richWords('Give agents a valet key, **not your keys**.');
  const title = h('h1', { class: 'gr-headline recap-h' }, nodes);
  root.append(title);
  const card = KeyCard({
    title: 'Access token', w: 560,
    rows: [['Scope', 'purchase'], ['Limit', '1 item · ≤ €120'], ['At', 'shop.example'], ['Until', 'Sun 23:59'], ['Expires', '15 min'], ['For', 'pay.example'], ['Bound to', '__agent key__']],
  });
  const cardW = place(card.el, 520, 640);
  const rules = RULES.map((r, i) => {
    const el = h('div', { class: 'rule' }, h('span', { class: 'q-n' }, String(i + 1)), h('span', {}, rich(r)));
    return css(el, { left: 960, top: 380 + i * 112 });
  });
  root.append(cardW, ...rules);

  return {
    update(t) {
      wordsAt(words, t, 0.3, { each: 0.08, dy: 40, blur: 10 });
      showAt(cardW, t, 1.0, Infinity, { dy: 40, scale0: 0.9, spring: springs.gentle });
      card.rows.forEach((r, i) => showAt(r, t, 1.3 + i * 0.07, Infinity, { dx: -12, dy: 0 }));
      rules.forEach((el, i) => showAt(el, t, stagger(i, 0.9, 2.2), Infinity, { dx: 40, dy: 0 }));
    },
  };
}
