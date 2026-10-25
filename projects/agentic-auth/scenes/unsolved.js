// 13 · Still unsolved — four honest open problems, then the bookend line typed into a login field.
import { h, tf, css } from '/studio/dom.js';
import { place } from '../lib/cast.js';
import { headline, showAt, richWords, wordsAt, rich, interpolate, ease, progress, springAt, springs, clamp, stagger } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const CARDS = [
  ['chat', 'Consent fatigue', 'Too many prompts, and nobody reads them.'],
  ['lock', 'Password-only sites', 'Most of the web can’t delegate yet.'],
  ['user', 'Which agent is this?', 'Verifiable agent identity is still a draft.'],
  ['shield', 'Signed ≠ wise', 'Limits cap the damage, not bad choices.'],
];
const END = 12.6;

export function mount(root) {
  root.classList.add('gr-glow');
  const hl = headline(root, { eyebrow: 'Still unsolved', text: 'Open questions.', cls: 'sm' });
  const cards = CARDS.map(([g, t, s], i) => {
    const el = h('div', { class: 'open gr-panel' }, icon(g, { size: 48, width: 1.5 }), h('b', {}, t), h('span', {}, rich(s)));
    return place(el, 560 + (i % 2) * 800, 470 + Math.floor(i / 2) * 260);
  });

  const { nodes, words } = richWords('Every agent ends up at a');
  const typed = h('span', { class: 'tok', style: { display: 'inline-block' } }, '');
  const caret = h('i', { class: 'caret' });
  const field = h('span', { class: 'title-field' }, typed, caret);
  const line = h('h2', { class: 'gr-headline end-line' }, nodes, ' ', field);
  const end = h('div', { class: 'fill', style: { display: 'grid', placeContent: 'center', textAlign: 'center' } }, line);
  root.append(...cards, end);

  return {
    update(t) {
      hl.update(t, 0.2, END);
      cards.forEach((el, i) => {
        const s = showAt(el, t, stagger(i, 2.2, 1.0), END, { dy: 30 });
        // the newest card is the focal one
        const next = stagger(i + 1, 2.2, 1.0);
        el.style.opacity = String(s.o * (i < 3 && t > next ? 0.55 : 1));
      });
      end.style.visibility = t < END + 0.3 ? 'hidden' : '';
      wordsAt(words, t, END + 0.4, { each: 0.09, dy: 40, blur: 10 });
      const fp = springAt(t, END + 1.0, springs.snappy);
      tf(field, { y: (1 - fp) * 40, opacity: clamp(fp * 1.5) });
      const txt = 'login screen.';
      typed.textContent = txt.slice(0, Math.max(0, Math.min(txt.length, Math.floor((t - END - 1.3) / 0.07) + 1)));
      caret.style.opacity = t < END + 1.3 || Math.floor((t - END) * 1.8) % 2 === 0 ? '1' : '0';
      // fade to black at the very end
      root.style.opacity = String(Number(root.style.opacity || 1) * (1 - progress(t, END + 5.6, 0.9)));
    },
  };
}
