import { h, tf, splitText } from '/studio/dom.js';
import { springAt, springs, stagger, interpolate, ease } from '/studio/motion.js';

export function mount(root) {
  const words = splitText('Who let the agent in?');
  words.filter((w) => w.textContent === 'agent').forEach((w) => w.classList.add('gr-em'));
  const rule = h('div', { class: 'rule' });
  const sub = h('p', {}, 'Explainer Studio · harness smoke test');
  root.classList.add('gr-glow');
  root.append(h('div', { class: 'demo-title' }, h('h1', { class: 'gr-headline' }, words), rule, sub));
  const toks = words.filter((w) => w.nodeType === 1);

  return {
    update(t, { exit }) {
      toks.forEach((w, i) => {
        const p = springAt(t, stagger(i, 0.08, 0.2), springs.snappy);
        tf(w, { y: (1 - p) * 60, opacity: Math.min(1, p * 1.4), blur: (1 - Math.min(1, p)) * 8 });
      });
      rule.style.transform = `scaleX(${springAt(t, 0.9, springs.gentle)})`;
      tf(sub, { y: interpolate(t, [1.1, 1.7], [24, 0], { easing: ease.outCubic }), opacity: interpolate(t, [1.1, 1.7], [0, 1]) });
      // push away as the next scene fades in over it
      root.style.transform = `scale(${1 + exit * 0.06})`;
    },
  };
}
