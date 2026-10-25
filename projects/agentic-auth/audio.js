// Score: a warm pad bed (one chord per chapter, darker at 3 a.m., brighter in the morning),
// a soft pulse under the mechanism chapters, and SFX cued from each scene's own beat times.
// Cues are scene-relative, so retiming a scene moves its sounds with it.
export default async function score(kit, { scenes, duration }) {
  const S = Object.fromEntries(scenes.map((s) => [s.id, s]));
  const at = (id, t) => S[id].start + t;
  const end = (id) => S[id].start + S[id].duration;

  // ── bed ────────────────────────────────────────────
  const CHORDS = {
    hook: [['D3', 'A3', 'F#4', 'C#5'], {}],
    actor: [['B2', 'F#3', 'D4', 'A4'], {}],
    delegate: [['G2', 'D3', 'B3', 'F#4'], {}],
    key: [['A2', 'E3', 'C#4', 'E4'], {}],
    vault: [['D3', 'A3', 'F#4', 'A4'], {}],
    claw: [['E2', 'B2', 'G3', 'D4'], { cutoff: 750 }],
    ask: [['A2', 'E3', 'C4', 'G4'], { cutoff: 750 }],
    broker: [['D3', 'A3', 'F#4', 'B4'], { cutoff: 850 }],
    bw: [['C3', 'G3', 'E4', 'B4'], { cutoff: 750 }],
    matrix: [['D3', 'A3', 'F#4', 'E5'], {}],
    night: [['B2', 'F#3', 'D4', 'F#4'], { cutoff: 520, gain: -23 }],
    confirm: [['G2', 'D3', 'B3', 'D4'], { cutoff: 600 }],
    morning: [['D3', 'A3', 'F#4', 'A4'], { cutoff: 1400 }],
    recap: [['G2', 'D3', 'B3', 'F#4'], { cutoff: 1200 }],
    unsolved: [['D3', 'A3', 'E4', 'F#4'], { cutoff: 1000 }],
  };
  for (const s of scenes) {
    const [notes, o] = CHORDS[s.id] ?? CHORDS.hook;
    kit.pad(s.start, s.duration + 0.4, notes, { gain: o.gain ?? -25, attack: 1.6, release: 2.2, cutoff: o.cutoff ?? 900 });
  }
  // a low root drone holds the film together
  kit.pad(0, duration - 2, ['D2'], { gain: -30, attack: 3, release: 3, type: 'triangle', cutoff: 300, wet: 0.2 });
  // pulse under the mechanisms, slower at night
  kit.pulse(at('delegate', 2.6), end('vault'), 96, { gain: -31, note: 'D2' });
  kit.pulse(at('night', 0.5), end('confirm') - 1, 64, { gain: -32, note: 'B1' });
  kit.pulse(at('morning', 1.0), end('morning') - 1, 96, { gain: -32, note: 'D2' });

  const ticks = (id, times, o = {}) => times.forEach((t, i) => kit.tick(at(id, t), { freq: (o.freq ?? 1500) + (o.step ?? 0) * i, gain: o.gain ?? -22 }));
  const plucks = (id, times, notes, o = {}) => times.forEach((t, i) => kit.pluck(at(id, t), notes[i % notes.length], { gain: o.gain ?? -19, decay: o.decay ?? 0.7 }));
  const PENTA = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6'];

  // ── hook ───────────────────────────────────────────
  ticks('hook', [0.4, 2.0, 4.6, 7.0], { freq: 1300, step: 80 });
  kit.whoosh(at('hook', 3.2), { dur: 0.6, gain: -22 });
  kit.pluck(at('hook', 8.4), 'A4', { gain: -18 });
  kit.thump(at('hook', 9.0), { gain: -16 });
  kit.grant(at('hook', 9.85), { gain: -20 });
  [0, 1, 2, 3].forEach((i) => kit.tick(at('hook', 10.1 + i * 0.12), { freq: 520 - i * 40, gain: -18, decay: 0.12 }));
  kit.deny(at('hook', 10.4), { gain: -24 });
  kit.whoosh(at('hook', 13.0), { dur: 1.0, from: 5000, to: 200, gain: -16 });
  kit.thump(at('hook', 14.0), { gain: -9, freq: 55, decay: 0.6 });
  ticks('hook', [14.75, 14.87, 14.99], { freq: 2200, gain: -26 });

  // ── actor ──────────────────────────────────────────
  ticks('actor', [1.3, 1.42, 1.54], { freq: 1200, step: 120 });
  [2.6, 4.3, 6.0].forEach((r, i) => ticks('actor', [0, 1, 2].map((j) => r + 0.35 + j * 0.14), { freq: 1500 + i * 150, gain: -24 }));
  kit.deny(at('actor', 6.63), { gain: -26 });
  plucks('actor', [14.2, 14.34, 14.48, 14.62], ['D5', 'F#5', 'A5', 'D6'], { gain: -21 });
  kit.thump(at('actor', 19.9), { gain: -14 });

  // ── delegate ───────────────────────────────────────
  kit.whoosh(at('delegate', 3.0), { dur: 1.1, gain: -22 });
  kit.grant(at('delegate', 10.1));
  ticks('delegate', [12.6, 12.76, 12.92, 13.08], { freq: 1700, gain: -25 });
  kit.tick(at('delegate', 16.6), { freq: 900, gain: -18 });
  kit.grant(at('delegate', 19.0), { root: 'A5' });
  kit.whoosh(at('delegate', 20.6), { dur: 1.0, from: 2000, to: 400, gain: -24 });
  kit.pluck(at('delegate', 21.6), 'D5', { gain: -18 });

  // ── key ────────────────────────────────────────────
  kit.whoosh(at('key', 0.4), { dur: 0.9, from: 200, to: 2500, gain: -22 });
  kit.pluck(at('key', 5.0), 'F#5', { gain: -19 });
  plucks('key', [7.4, 12.6, 12.8, 13.0, 17.4, 22.2, 28.4], PENTA, { gain: -21, decay: 0.5 });
  kit.thump(at('key', 11.4), { gain: -15 });
  for (let t = 15.0; t < 17.6; t += 0.25) kit.tick(at('key', t), { freq: 2400, gain: -30, decay: 0.03 });
  kit.grant(at('key', 17.8), { gain: -21 });
  kit.grant(at('key', 20.5), { gain: -22 });
  kit.deny(at('key', 20.9), { gain: -21 });
  kit.deny(at('key', 26.3), { gain: -20 });

  // ── vault ──────────────────────────────────────────
  kit.whoosh(at('vault', 3.8), { dur: 1.2, gain: -23 });
  kit.grant(at('vault', 11.0));
  kit.thump(at('vault', 11.2), { gain: -16, freq: 90 });
  kit.whoosh(at('vault', 13.2), { dur: 1.6, from: 300, to: 3000, gain: -22 });
  kit.grant(at('vault', 15.3), { root: 'A5' });
  plucks('vault', [18.6, 18.75, 18.9, 19.05], ['D5', 'F#5', 'A5', 'D6'], { gain: -20 });

  // ── claw ───────────────────────────────────────────
  kit.deny(at('claw', 3.4), { gain: -21 });
  kit.deny(at('claw', 3.9), { gain: -22 });
  kit.whoosh(at('claw', 8.4), { dur: 0.8, gain: -21 });
  ticks('claw', [9.4, 11.4], { freq: 1600 });
  kit.whoosh(at('claw', 13.8), { dur: 0.8, from: 2000, to: 500, gain: -25 });
  kit.pluck(at('claw', 14.4), 'D5', { gain: -19 });
  kit.whoosh(at('claw', 16.6), { dur: 1.3, from: 400, to: 2400, gain: -24 });
  plucks('claw', [17.9, 18.05, 18.2], ['A5', 'B5', 'D6'], { gain: -22, decay: 0.4 });
  ticks('claw', [20.5, 20.7], { freq: 1800, gain: -24 });
  kit.grant(at('claw', 21.4), { gain: -21 });

  // ── ask ────────────────────────────────────────────
  kit.whoosh(at('ask', 2.4), { dur: 1.2, from: 800, to: 2600, gain: -24 });
  kit.pluck(at('ask', 3.6), 'F#5', { gain: -19 });
  kit.deny(at('ask', 6.8), { gain: -27 });
  kit.pluck(at('ask', 7.6), 'A5', { gain: -19 });
  kit.tick(at('ask', 10.4), { freq: 1700, gain: -19 });
  kit.whoosh(at('ask', 11.0), { dur: 0.5, gain: -26 });
  kit.grant(at('ask', 11.8), { gain: -23 });
  kit.whoosh(at('ask', 12.8), { dur: 0.5, gain: -26 });
  for (let i = 0; i < 10; i++) kit.tick(at('ask', 13.6 + i * 0.09), { freq: 3000, gain: -32, decay: 0.02 });
  kit.tick(at('ask', 14.8), { freq: 900, gain: -18 });
  kit.whoosh(at('ask', 15.2), { dur: 0.9, from: 1500, to: 600, gain: -24 });
  kit.thump(at('ask', 16.0), { gain: -18, freq: 80 });
  kit.whoosh(at('ask', 17.6), { dur: 1.4, from: 2500, to: 500, gain: -25 });
  kit.grant(at('ask', 19.0));

  // ── broker ─────────────────────────────────────────
  kit.pluck(at('broker', 1.8), 'B4', { gain: -18 });
  kit.thump(at('broker', 6.4), { gain: -17, freq: 70 });
  kit.whoosh(at('broker', 7.8), { dur: 0.7, gain: -24 });
  kit.whoosh(at('broker', 11.0), { dur: 0.5, from: 300, to: 1800, gain: -25 });
  plucks('broker', [11.7, 11.85, 12.0], ['D5', 'F#5', 'A5'], { gain: -19, decay: 0.5 });
  kit.whoosh(at('broker', 12.4), { dur: 1.2, from: 1200, to: 3000, gain: -24 });
  kit.grant(at('broker', 13.7), { root: 'A5' });
  kit.whoosh(at('broker', 16.6), { dur: 0.7, gain: -24 });
  kit.deny(at('broker', 17.9), { gain: -18 });
  ticks('broker', [21.5, 21.62, 21.74], { freq: 1300, gain: -26 });
  plucks('broker', [26.1, 26.22, 26.34, 26.46], ['D5', 'E5', 'F#5', 'A5'], { gain: -22 });

  // ── bw ─────────────────────────────────────────────
  kit.pluck(at('bw', 1.6), 'E5', { gain: -19 });
  kit.whoosh(at('bw', 2.2), { dur: 0.7, from: 300, to: 1500, gain: -26 });
  kit.whoosh(at('bw', 2.5), { dur: 0.6, from: 300, to: 1500, gain: -26 });
  kit.tick(at('bw', 7.8), { freq: 1500, gain: -21 });
  kit.whoosh(at('bw', 8.6), { dur: 1.6, from: 600, to: 1800, gain: -25 });
  kit.pluck(at('bw', 10.6), 'B4', { gain: -19 });
  kit.pluck(at('bw', 10.9), 'B4', { gain: -21 });
  kit.grant(at('bw', 12.2), { gain: -21 });
  kit.whoosh(at('bw', 17.0), { dur: 0.8, gain: -25 });
  ticks('bw', [17.85, 18.0, 18.15], { freq: 2600, gain: -30 });
  kit.whoosh(at('bw', 18.5), { dur: 0.8, gain: -25 });
  kit.tick(at('bw', 22.8), { freq: 1000, gain: -18 });
  kit.whoosh(at('bw', 23.2), { dur: 0.8, from: 2500, to: 800, gain: -25 });
  kit.whoosh(at('bw', 24.7), { dur: 0.8, from: 2500, to: 400, gain: -25 });
  kit.grant(at('bw', 25.2));
  kit.grant(at('bw', 26.8), { gain: -22 });
  kit.deny(at('bw', 31.2), { gain: -19 });
  kit.thump(at('bw', 35.9), { gain: -10, freq: 60, decay: 0.5 });

  // ── matrix ─────────────────────────────────────────
  const dotNotes = ['A3', 'B3', 'G3', 'D5', 'E5', 'F#5', 'A5'];
  dotNotes.forEach((n, i) => kit.pluck(at('matrix', 6.4 + i * 0.62), n, { gain: -20, decay: 0.5 }));
  kit.pluck(at('matrix', 11.0), 'D6', { gain: -19, decay: 0.8 });
  kit.grant(at('matrix', 12.6), { root: 'D6', gain: -19 });

  // ── night ──────────────────────────────────────────
  kit.pluck(at('night', 1.7), 'F#5', { gain: -17 });
  kit.whoosh(at('night', 4.0), { dur: 1.2, from: 3000, to: 6000, gain: -26 });
  kit.deny(at('night', 4.9), { gain: -25 });
  kit.whoosh(at('night', 7.2), { dur: 0.9, gain: -23 });
  kit.deny(at('night', 8.1), { gain: -17 });
  [0, 1, 2].forEach((i) => kit.thump(at('night', 13.6 + i * 0.25), { gain: -14 - i * 2, freq: 50 }));
  kit.grant(at('night', 14.8), { gain: -20 });

  // ── confirm ────────────────────────────────────────
  kit.whoosh(at('confirm', 2.2), { dur: 0.9, gain: -24 });
  for (let t = 3.0; t < 3.8; t += 0.06) kit.tick(at('confirm', t), { freq: 140, gain: -20, decay: 0.05 });
  kit.tick(at('confirm', 3.4), { freq: 1800, gain: -20 });
  kit.pluck(at('confirm', 6.8), 'B4', { gain: -19 });
  kit.grant(at('confirm', 12.3));

  // ── morning ────────────────────────────────────────
  ticks('morning', [1.2, 1.75, 2.3, 2.85], { freq: 1300, step: 100, gain: -22 });
  ticks('morning', [8.2, 8.55, 8.9, 9.25], { freq: 2200, step: 150, gain: -26 });
  kit.thump(at('morning', 12.8), { gain: -12 });
  kit.deny(at('morning', 13.1), { gain: -20 });

  // ── recap / unsolved ───────────────────────────────
  plucks('recap', [2.2, 3.1, 4.0, 4.9, 5.8], ['D5', 'E5', 'F#5', 'A5', 'D6'], { gain: -18, decay: 0.9 });
  plucks('unsolved', [1.0, 3.2, 5.4, 7.6], ['A4', 'F#4', 'E4', 'D4'], { gain: -20, decay: 1.2 });
  for (let i = 0; i < 13; i++) kit.tick(at('unsolved', 12.6 + 1.3 + i * 0.07), { freq: 2600, gain: -30, decay: 0.02 });
  kit.pad(at('unsolved', 13.8), 5, ['D3', 'A3', 'D4', 'E4', 'F#4', 'A4'], { gain: -21, attack: 0.4, release: 3, cutoff: 1600 });
  kit.pluck(at('unsolved', 13.8), 'D6', { gain: -17, decay: 2.5 });
}
