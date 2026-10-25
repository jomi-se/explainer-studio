// Title, as a Droste picture: the title card holds a screen that shows the title card, which
// holds a screen… The camera zooms into the screen by exactly one level, so the last frame
// matches the first: an endless zoom into the film's own making.
import { h, tf } from '/studio/dom.js';
import { ease, progress, clamp } from '/studio/motion.js';
import { richWords, wordsAt, showAt } from '../lib/fx.js';

const S = 0.3; // each screen shows the card at 30%
const MON = { x: 672, y: 560, w: 1920 * S, h: 1080 * S };
const F = { x: MON.x / (1 - S), y: MON.y / (1 - S) }; // the zoom's fixed point
const LEVELS = 4;

function card(depth) {
  const el = h('div', { class: 'abs', style: { left: '0', top: '0', width: '1920px', height: '1080px' } });
  if (depth > 0) {
    el.dataset.lintIgnore = '';
    el.append(h('div', { class: 'bg gr-glow' }));
  }
  const eyebrow = h('div', { class: 'anchor gr-pill eyebrow', style: { left: '960px', top: '190px' } }, 'explainer-studio');
  const { nodes, words } = richWords('How **this video** was made');
  const title = h('h1', { class: 'anchor big', style: { left: '960px', top: '330px' } }, nodes);
  const sub = h('p', { class: 'anchor sub', style: { left: '960px', top: '460px' } }, 'A film that explains its own making');
  const mon = h('div', { class: 'abs', style: { left: `${MON.x}px`, top: `${MON.y}px`, width: `${MON.w}px`, height: `${MON.h}px`, overflow: 'hidden',
    borderRadius: '18px', outline: '5px solid var(--accent-2)', background: 'var(--bg)' } });
  el.append(eyebrow, title, sub, mon);
  if (depth < LEVELS) {
    const inner = card(depth + 1);
    inner.el.style.transformOrigin = '0 0';
    inner.el.style.transform = `scale(${S})`;
    mon.append(inner.el);
  }
  return { el, eyebrow, title, sub, mon, words };
}

export function mount(root) {
  root.append(h('div', { class: 'bg gr-glow' }));
  const world = h('div', { class: 'abs', style: { left: '0', top: '0', width: '1920px', height: '1080px', transformOrigin: `${F.x}px ${F.y}px` } });
  root.append(world);
  const top = card(0);
  world.append(top.el);
  return {
    update(t) {
      showAt(top.eyebrow, t, 0.15, Infinity, { dy: 12 });
      wordsAt(top.words, t, 0.3, { each: 0.09, dy: 40, blur: 10 });
      showAt(top.sub, t, 0.85, Infinity, { dy: 20 });
      // the screen opens, then the camera falls into it, one level deep
      const pm = ease.outCubic(progress(t, 0.6, 0.6));
      tf(top.mon, { scale: 0.85 + 0.15 * pm, opacity: pm });
      const pz = ease.inOutCubic(progress(t, 2.1, 2.1));
      world.style.transform = `scale(${S ** -pz})`;
      world.toggleAttribute('data-lint-ignore', pz > 0);
      void clamp;
    },
  };
}
