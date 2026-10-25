// Deterministic motion helpers. Every function here is a pure function of its
// arguments — no clocks, no randomness, no DOM state — so any frame can be
// rendered in any order and come out identical.

export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a, b, p) => a + (b - a) * p;

// 0→1 progress of `t` through the window [start, start + dur].
export const progress = (t, start, dur) => (dur <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / dur));

// Easing curves, all mapping 0→0 and 1→1.
export const ease = {
  linear: (p) => p,
  inQuad: (p) => p * p,
  outQuad: (p) => 1 - (1 - p) * (1 - p),
  inOutQuad: (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2),
  inCubic: (p) => p ** 3,
  outCubic: (p) => 1 - (1 - p) ** 3,
  inOutCubic: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  outQuart: (p) => 1 - (1 - p) ** 4,
  inOutQuart: (p) => (p < 0.5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2),
  outExpo: (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p)),
  inOutExpo: (p) =>
    p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 2 ** (20 * p - 10) / 2 : (2 - 2 ** (-20 * p + 10)) / 2,
  outBack: (p, s = 1.70158) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2,
  // Cubic-bezier easing, same semantics as CSS cubic-bezier(x1, y1, x2, y2).
  bezier: (x1, y1, x2, y2) => {
    const bx = (u) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
    const by = (u) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
    return (p) => {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      let lo = 0, hi = 1, u = p;
      for (let i = 0; i < 30; i++) {
        u = (lo + hi) / 2;
        if (bx(u) < p) lo = u;
        else hi = u;
      }
      return by(u);
    };
  },
};

// Piecewise keyframe interpolation.
//   interpolate(t, [0, 1, 2], [0, 100, 50], { easing: ease.outCubic })
// `easing` may be one function or an array with one function per segment.
export function interpolate(t, input, output, { easing = ease.linear, extrapolate = 'clamp' } = {}) {
  const n = input.length;
  if (n !== output.length || n < 2) throw new Error('interpolate: input/output must be equal-length arrays (>= 2)');
  if (extrapolate === 'clamp') {
    if (t <= input[0]) return output[0];
    if (t >= input[n - 1]) return output[n - 1];
  }
  let i = 0;
  while (i < n - 2 && t > input[i + 1]) i++;
  const span = input[i + 1] - input[i];
  const raw = span === 0 ? 1 : (t - input[i]) / span;
  const fn = Array.isArray(easing) ? easing[i] ?? ease.linear : easing;
  return lerp(output[i], output[i + 1], fn(raw));
}

// Closed-form damped spring (no simulation, so it is exact at any t).
// Returns the value at `t` seconds after release. t < 0 returns `from`.
// Presets below; stiffness/damping/mass follow the usual physical meaning.
export function spring(t, { from = 0, to = 1, stiffness = 170, damping = 26, mass = 1, velocity = 0 } = {}) {
  if (t <= 0) return from;
  const x0 = from - to;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  let x;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = Math.exp(-zeta * w0 * t) * (x0 * Math.cos(wd * t) + ((velocity + zeta * w0 * x0) / wd) * Math.sin(wd * t));
  } else if (zeta === 1) {
    x = Math.exp(-w0 * t) * (x0 + (velocity + w0 * x0) * t);
  } else {
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - s);
    const r2 = -w0 * (zeta + s);
    const c2 = (velocity - r1 * x0) / (r2 - r1);
    const c1 = x0 - c2;
    x = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
  }
  return to + x;
}

export const springs = {
  gentle: { stiffness: 120, damping: 20 }, // settles softly, ~no overshoot
  snappy: { stiffness: 260, damping: 26 }, // fast UI-like, slight overshoot
  bouncy: { stiffness: 220, damping: 14 }, // visible overshoot — use sparingly
  slow: { stiffness: 60, damping: 16 }, // big, weighty moves (camera)
};

// Spring that starts at `start` seconds: springAt(t, 1.2, { ...springs.snappy, from: 40, to: 0 }).
export const springAt = (t, start, opts) => spring(t - start, opts);

// A value that springs to a sequence of targets: [{ at, to }, ...], each new
// target starting from wherever the previous spring had got to (velocity carried
// over), so re-targeting mid-flight stays continuous.
export function springTrack(t, initial, changes, opts = springs.snappy) {
  let value = initial, vel = 0, at = -Infinity, from = initial, to = initial;
  for (const c of changes) {
    if (t < c.at) break;
    if (at > -Infinity) {
      const dt = c.at - at;
      value = spring(dt, { ...opts, from, to, velocity: vel });
      const h = 1e-3;
      vel = (spring(dt + h, { ...opts, from, to, velocity: vel }) - value) / h;
    }
    from = value; to = c.to; at = c.at;
  }
  return at === -Infinity ? initial : spring(t - at, { ...opts, from, to, velocity: vel });
}

// Start time of the i-th item in a staggered group.
export const stagger = (i, each = 0.07, start = 0) => start + i * each;

// Seeded PRNG (mulberry32). Never use Math.random in scenes.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic smooth noise in [-1, 1] (sum of incommensurate sines), for idle drift.
export const wobble = (t, seed = 0) =>
  (Math.sin(t * 1.3 + seed * 12.9898) + Math.sin(t * 2.1 + seed * 78.233) * 0.5 + Math.sin(t * 3.7 + seed * 37.719) * 0.25) / 1.75;

// Seconds a viewer needs to read `text` on screen (~3 words/s plus 1s to find it).
export const readTime = (text, wps = 3) => 1 + text.trim().split(/\s+/).length / wps;

// Typewriter: the visible prefix of `text` at progress p.
export const typewriter = (text, p) => text.slice(0, Math.round(clamp(p) * text.length));
