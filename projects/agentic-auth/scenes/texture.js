// Persistent overlay: soft vignette + static film grain (pre-rendered tiles; static so the
// encoder doesn't spend bits on noise, and it breaks up banding in the glows), plus a hairline
// progress bar along the bottom edge with a notch at every chapter.
import { h, css } from '/studio/dom.js';

export function mount(root, { width, duration, scenes }) {
  root.style.pointerEvents = 'none';
  const fill = h('div', { class: 'prog-fill' });
  const notches = scenes.slice(1).map((s) => css(h('i', { class: 'prog-notch' }), { left: (s.start / duration) * width }));
  root.append(h('div', { class: 'vignette' }), h('div', { class: 'grain' }), h('div', { class: 'prog' }, fill, ...notches));
  return {
    update(t, { p, T }) {
      fill.style.transform = `scaleX(${p})`;
      notches.forEach((n, i) => (n.style.opacity = T >= scenes[i + 1].start ? '0.9' : '0.35'));
    },
  };
}
