// The film's own frame counter, top-right for the whole film. It is computed from T like
// everything else, which is the point the seek scene makes about it (and it lights up then).
import { h } from '/studio/dom.js';
import { clamp } from '/studio/motion.js';
import { pad } from '../lib/cast.js';
import { HUD_CALLOUT } from '../lib/beats.js';

export function mount(root, { duration, fps, scenes }) {
  const total = Math.round(duration * fps);
  const seek = scenes.find((s) => s.id === 'seek');
  const [c0, c1] = HUD_CALLOUT.map((x) => seek.start + x);
  const bow = scenes.find((s) => s.id === 'end').start + 4.9; // the end card takes over the frame number
  const frame = h('b', {}, '');
  const time = h('b', {}, '');
  const el = h('div', { class: 'hud' }, h('span', {}, 'frame ', frame, ` / ${pad(total)}`), h('span', {}, 't = ', time, ' s'));
  root.append(el);
  return {
    update(t, { T, frame: n }) {
      frame.textContent = pad(Math.min(n + 1, total)); // 1-based, like the flipbook's cards
      time.textContent = T.toFixed(2);
      const lit = T >= c0 && T < c1;
      el.style.opacity = String(clamp((T - 1.2) / 0.5) * (lit ? 1 : 0.8) * (1 - clamp((T - bow) / 0.4)));
      el.classList.toggle('lit', lit);
    },
  };
}
