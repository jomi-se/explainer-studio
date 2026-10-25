// Shared motion vocabulary for the film: entrances/exits, rich text, captions,
// headlines and a camera. Everything is a pure function of t.
import { h, tf, splitText } from '/studio/dom.js';
import { springAt, springs, springTrack, interpolate, ease, progress, readTime, clamp, stagger } from '/studio/motion.js';

// Rich text: **lime emphasis** · __blue (agent)__ · ~~red (risk)~~ · `mono`
export function rich(text) {
  const out = [];
  const re = /(\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`(.+?)`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2]) out.push(h('span', { class: 'em' }, m[2]));
    else if (m[3]) out.push(h('span', { class: 'ag' }, m[3]));
    else if (m[4]) out.push(h('span', { class: 'rk' }, m[4]));
    else out.push(h('code', {}, m[5]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
export const plain = (text) => text.replace(/\*\*|__|~~|`/g, '');

// Rich text split into word spans (inline-block) so words can stagger in.
export function richWords(text) {
  const nodes = rich(text);
  const words = [];
  const out = [];
  for (const n of nodes) {
    if (typeof n === 'string') {
      for (const part of splitText(n)) {
        out.push(part);
        if (part.nodeType === 1) words.push(part);
      }
    } else {
      // keep styled spans whole, but split their words too
      const inner = splitText(n.textContent);
      n.textContent = '';
      n.append(...inner);
      inner.forEach((p) => p.nodeType === 1 && words.push(p));
      out.push(n);
    }
  }
  return { nodes: out, words };
}

// Standard entrance: spring in from below with a little blur. Returns p (0→1+).
export function enterAt(el, t, at, { dy = 36, dx = 0, scale0 = 1, blur = 6, spring = springs.snappy } = {}) {
  const p = springAt(t, at, spring);
  const o = clamp(p * 1.6);
  tf(el, { x: (1 - p) * dx, y: (1 - p) * dy, scale: scale0 + (1 - scale0) * p, opacity: o, blur: blur * (1 - clamp(p)) });
  return p;
}

// Visible window [at, out): springs in at `at`, eases out over `dur` ending at `out`.
export function showAt(el, t, at, out = Infinity, { dy = 36, dx = 0, scale0 = 1, blur = 6, spring = springs.snappy, outDur = 0.4, outDy = -16 } = {}) {
  const pin = springAt(t, at, spring);
  const pout = out === Infinity ? 0 : ease.inCubic(progress(t, out - outDur, outDur));
  const o = clamp(pin * 1.6) * (1 - pout);
  tf(el, {
    x: (1 - pin) * dx,
    y: (1 - pin) * dy + pout * outDy,
    scale: scale0 + (1 - scale0) * pin,
    opacity: o,
    blur: blur * (1 - clamp(pin)) + pout * 4,
  });
  el.style.visibility = o < 0.002 ? 'hidden' : '';
  return { pin, pout, o };
}

// Words of a richWords() block staggering in (and the whole block out).
export function wordsAt(words, t, at, { each = 0.06, dy = 28, blur = 8, spring = springs.snappy } = {}) {
  words.forEach((w, i) => {
    const p = springAt(t, stagger(i, each, at), spring);
    tf(w, { y: (1 - p) * dy, opacity: clamp(p * 1.5), blur: blur * (1 - clamp(p)) });
  });
}

// A headline block: eyebrow pill + headline, top-left of the safe area.
export function headline(root, { eyebrow, text, cls = '' }) {
  const eb = eyebrow ? h('div', { class: 'eyebrow gr-pill' }, eyebrow) : null;
  const { nodes, words } = richWords(text);
  const hl = h('h1', { class: 'hl gr-headline' }, nodes);
  const el = h('div', { class: `headline ${cls}` }, eb, hl);
  root.append(el);
  return {
    el,
    update(t, at = 0.2, out = Infinity) {
      if (eb) showAt(eb, t, at, out, { dy: 14 });
      wordsAt(words, t, at + 0.15);
      const pout = out === Infinity ? 0 : ease.inCubic(progress(t, out - 0.4, 0.4));
      hl.style.opacity = String(1 - pout);
      el.style.visibility = t < at || pout >= 1 ? 'hidden' : '';
    },
  };
}

// Caption track: one line at a time at the bottom of the frame. Items: { at, out, text }.
// Each must be on screen ≥ readTime(text) — violations surface as page errors in lint.
export function captions(root, items, { cls = '' } = {}) {
  const els = items.map((it) => {
    const { nodes, words } = richWords(it.text);
    const el = h('div', { class: `caption ${cls}` }, h('p', {}, nodes));
    root.append(el);
    const need = readTime(plain(it.text));
    if (it.out - it.at < need - 0.05) console.error(`caption too short (${(it.out - it.at).toFixed(1)}s < ${need.toFixed(1)}s): "${plain(it.text)}"`);
    return { ...it, el, words };
  });
  return {
    update(t) {
      for (const c of els) {
        const vis = t >= c.at - 0.05 && t < c.out;
        c.el.style.visibility = vis ? '' : 'hidden';
        if (!vis) continue;
        wordsAt(c.words, t, c.at, { each: 0.045, dy: 18, blur: 6 });
        const pout = ease.inCubic(progress(t, c.out - 0.35, 0.35));
        c.el.style.opacity = String(1 - pout);
        c.el.style.transform = `translateY(${-10 * pout}px)`;
      }
    },
  };
}

// Camera: a world container moved by keyframed { at, x, y, z } shots on a slow spring.
// x/y are the world point placed at frame centre; z is zoom.
export function camera(world, shots, { w = 1920, h: H = 1080, spring = springs.slow } = {}) {
  const ax = [], ay = [], az = [];
  for (const s of shots) { ax.push({ at: s.at, to: s.x }); ay.push({ at: s.at, to: s.y }); az.push({ at: s.at, to: s.z ?? 1 }); }
  const first = shots[0];
  // re-targeting springs carry velocity, so a new shot can start before the last one settles
  const track = (t, init, ch) => springTrack(t, init, ch.slice(1), spring);
  return {
    update(t) {
      const x = track(t, first.x, ax), y = track(t, first.y, ay), z = track(t, first.z ?? 1, az);
      world.style.transform = `translate(${w / 2}px, ${H / 2}px) scale(${z}) translate(${-x}px, ${-y}px)`;
      return { x, y, z };
    },
  };
}

export { interpolate, ease, progress, springAt, springs, springTrack, clamp, stagger };

// Point along a lifted quadratic arc from a to b (lift > 0 bows upward).
export function arc(p, a, b, lift = 120) {
  const cx = (a[0] + b[0]) / 2, cy = Math.min(a[1], b[1]) - lift;
  const u = 1 - p;
  return [u * u * a[0] + 2 * u * p * cx + p * p * b[0], u * u * a[1] + 2 * u * p * cy + p * p * b[1]];
}
export const arcPath = (a, b, lift = 120) => {
  const cx = (a[0] + b[0]) / 2, cy = Math.min(a[1], b[1]) - lift;
  return `M ${a[0]} ${a[1]} Q ${cx} ${cy} ${b[0]} ${b[1]}`;
};
