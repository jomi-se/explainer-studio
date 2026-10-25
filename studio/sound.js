// Sound kit for OfflineAudioContext scores (see scripts/audio.mjs). Everything is
// scheduled at absolute times, and noise comes from a seeded PRNG, so the
// rendered WAV is identical on every run.
//
// A project's audio.js exports `default async function score(kit, meta)` and calls
// these on `kit` — e.g. kit.pad(0, 8, ['C3','G3','E4']); kit.tick(2.4); kit.whoosh(5.9).

import { rng } from './motion.js';

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export const hz = (n) => {
  if (typeof n === 'number') return n;
  const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`bad note ${n}`);
  return 440 * 2 ** ((NOTE[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12);
};
const db = (x) => 10 ** (x / 20);

export function makeKit(ctx, { seed = 7 } = {}) {
  const rand = rng(seed);
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -14;
  master.ratio.value = 3;
  master.connect(ctx.destination);

  // Shared plate-ish reverb (decaying seeded noise impulse).
  const verb = ctx.createConvolver();
  const len = ctx.sampleRate * 2.4;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * (1 - i / len) ** 3;
  }
  verb.buffer = ir;
  const verbGain = ctx.createGain();
  verbGain.gain.value = 0.35;
  verb.connect(verbGain).connect(master);

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; }

  const out = (gainDb, wet = 0.2) => {
    const g = ctx.createGain();
    g.gain.value = db(gainDb);
    g.connect(master);
    if (wet > 0) { const s = ctx.createGain(); s.gain.value = wet; g.connect(s).connect(verb); }
    return g;
  };
  const env = (param, t, { a = 0.005, d = 0.1, s = 0, r = 0.1, hold = 0, peak = 1 }) => {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.exponentialRampToValueAtTime(Math.max(1e-4, peak * s || 1e-4), t + a + d);
    if (s > 0) { param.setValueAtTime(peak * s, t + a + d + hold); param.exponentialRampToValueAtTime(1e-4, t + a + d + hold + r); }
  };

  return {
    ctx,
    // Sustained chord pad with slow attack; notes like 'C3' or Hz.
    pad(t, dur, notes, { gain = -22, attack = 1.2, release = 1.5, type = 'sawtooth', cutoff = 900, wet = 0.5 } = {}) {
      const bus = out(gain, wet);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.4;
      lp.connect(bus);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1 / notes.length, t + attack);
      g.gain.setValueAtTime(1 / notes.length, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + release);
      g.connect(lp);
      for (const n of notes) for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = type; o.frequency.value = hz(n); o.detune.value = det;
        o.connect(g); o.start(t); o.stop(t + dur + release + 0.1);
      }
    },
    // Soft plucked/bell note.
    pluck(t, note, { gain = -16, decay = 0.6, type = 'triangle', wet = 0.3 } = {}) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(note);
      const g = ctx.createGain(); env(g.gain, t, { a: 0.004, d: decay });
      o.connect(g).connect(out(gain, wet)); o.start(t); o.stop(t + decay + 0.1);
    },
    // UI tick / pop for small elements appearing.
    tick(t, { gain = -20, freq = 1800, decay = 0.05 } = {}) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + decay);
      const g = ctx.createGain(); env(g.gain, t, { a: 0.001, d: decay });
      o.connect(g).connect(out(gain, 0.1)); o.start(t); o.stop(t + decay + 0.05);
    },
    // Filtered-noise sweep for transitions; `dur` is the whole swell.
    whoosh(t, { dur = 0.6, gain = -18, from = 300, to = 4000, wet = 0.3 } = {}) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
      src.connect(bp).connect(g).connect(out(gain, wet)); src.start(t); src.stop(t + dur + 0.05);
    },
    // Low thump for emphasis / big reveals.
    thump(t, { gain = -10, freq = 70, decay = 0.35 } = {}) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(freq * 2.2, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
      const g = ctx.createGain(); env(g.gain, t, { a: 0.002, d: decay });
      o.connect(g).connect(out(gain, 0.05)); o.start(t); o.stop(t + decay + 0.05);
    },
    // Error/denied buzz (for "access denied" beats).
    deny(t, { gain = -20 } = {}) {
      for (const [i, f] of [220, 185].entries()) {
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
        const g = ctx.createGain(); env(g.gain, t + i * 0.11, { a: 0.003, d: 0.1 });
        const lp = ctx.createBiquadFilter(); lp.frequency.value = 1400;
        o.connect(lp).connect(g).connect(out(gain, 0.1)); o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.15);
      }
    },
    // Positive confirm chime (for "access granted" beats).
    grant(t, { gain = -18, root = 'E5' } = {}) {
      const r = hz(root);
      this.pluck(t, r, { gain, decay: 0.4, type: 'sine' });
      this.pluck(t + 0.09, r * 1.5, { gain, decay: 0.6, type: 'sine' });
    },
    // Quiet pulse on every beat between t0 and t1 — gives a bed some momentum.
    pulse(t0, t1, bpm, { gain = -26, note = 'C2' } = {}) {
      for (let t = t0; t < t1; t += 60 / bpm) this.pluck(t, note, { gain, decay: 0.25, type: 'sine', wet: 0 });
    },
  };
}
