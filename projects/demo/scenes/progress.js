import { h } from '/studio/dom.js';

export function mount(root, { width }) {
  const bar = h('div', { class: 'progress', style: { width: `${width}px` } });
  root.append(bar);
  return { update: (t, { p }) => (bar.style.transform = `scaleX(${p})`) };
}
