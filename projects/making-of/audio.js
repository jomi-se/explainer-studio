// Score: a light 104 bpm groove (D – Bm – G – A) under the middle of the film, with SFX cued
// from each scene's beats (they mirror the scene modules and lib/beats.js).
import { stagger } from '/studio/motion.js';
import { SEEK_JUMPS, HUD_CALLOUT } from './lib/beats.js';

export default async function score(kit, { scenes }) {
  const S = Object.fromEntries(scenes.map((s) => [s.id, s]));
  const at = (id, t) => S[id].start + t;

  const BPM = 104, B = 60 / BPM, BAR = 4 * B;
  const PROG = [
    { bass: ['D2', 'D3'], chord: ['F#3', 'A3', 'D4'] },
    { bass: ['B1', 'B2'], chord: ['F#3', 'B3', 'D4'] },
    { bass: ['G1', 'G2'], chord: ['G3', 'B3', 'D4'] },
    { bass: ['A1', 'A2'], chord: ['E3', 'A3', 'C#4'] },
  ];
  const kick = (t, g = 0) => kit.thump(t, { gain: -14 + g, freq: 52, decay: 0.3 });
  const hat = (t, g = 0) => kit.whoosh(t, { dur: 0.05, from: 7000, to: 9000, gain: -34 + g, wet: 0 });
  function groove(t0, t1, level = 0) {
    for (let i = Math.ceil(t0 / B - 1e-6); (i + 1) * B <= t1 + 1e-6; i++) {
      const t = i * B, beat = i % 4, P = PROG[Math.floor(i / 4) % 4];
      if (beat === 0 || beat === 2) kick(t, level);
      hat(t + B / 2, level);
      kit.pluck(t, P.bass[beat % 2], { gain: -18 + level, decay: 0.26, type: 'triangle', wet: 0 });
      if (beat === 1 || beat === 3) for (const n of P.chord) kit.pluck(t + B / 2, n, { gain: -31 + level, decay: 0.2, type: 'sawtooth', wet: 0.35 });
    }
    for (let b = Math.ceil(t0 / BAR - 1e-6); (b + 1) * BAR <= t1 + 1e-6; b++) kit.pad(b * BAR, BAR, PROG[b % 4].chord, { gain: -34 + level, attack: 0.4, release: 0.6, cutoff: 1100 });
  }
  const pop = (t, n = 'E6', g = -21) => { kit.tick(t, { freq: 2200, gain: g - 2 }); kit.pluck(t + 0.02, n, { gain: g, decay: 0.25, type: 'sine' }); };
  const hit = (t, g = 0) => { kit.thump(t, { gain: -8 + g, freq: 45, decay: 0.8 }); kit.whoosh(t, { dur: 0.8, from: 9000, to: 2500, gain: -19 + g, wet: 0.6 }); };

  // title: the words land, then the fall into the screen
  kit.whoosh(at('title', 0), { dur: 0.3, from: 300, to: 4000, gain: -20 });
  hit(at('title', 0.3), -4);
  ['D5', 'F#5', 'A5'].forEach((n, i) => kit.pluck(at('title', 0.35 + i * 0.1), n, { gain: -19, decay: 0.6 }));
  kit.pad(at('title', 0.3), 3.9, ['D2', 'A2', 'D3', 'F#3', 'A3'], { gain: -27, attack: 0.3, release: 1, cutoff: 1400 });
  kit.whoosh(at('title', 2.1), { dur: 2.1, from: 200, to: 6000, gain: -21, wet: 0.5 });

  groove(at('flipbook', 0), at('end', 4.9));

  // flipbook: a tick per card, a flick rattle, the counter lands
  for (let i = 0; i < 8; i++) kit.tick(at('flipbook', stagger(i, 0.09, 0.15)), { freq: 1600 + i * 120, gain: -24 });
  kit.whoosh(at('flipbook', 3.0), { dur: 0.4, from: 2500, to: 600, gain: -24 });
  for (let k = 0; k < 24; k++) kit.tick(at('flipbook', 3.6 + k / 30), { freq: 3200, gain: -33 + (k % 2) * 2, decay: 0.02 });
  pop(at('flipbook', 7.0), 'A6', -18);

  // browser
  pop(at('browser', 0.2), 'D6', -22);
  pop(at('browser', 0.55), 'F#6', -22);
  kit.whoosh(at('browser', 2.4), { dur: 0.6, from: 3000, to: 400, gain: -24 });
  kit.thump(at('browser', 4.85), { gain: -8, freq: 80, decay: 0.3 });
  kit.tick(at('browser', 4.85), { freq: 1200, gain: -20 });

  // seek: a tick per jump; the red ball is lost, the lime one lands
  for (const j of SEEK_JUMPS) kit.tick(at('seek', j.at), { freq: 1500, gain: -20 });
  kit.deny(at('seek', SEEK_JUMPS[3].at + 0.35), { gain: -16 });
  kit.pluck(at('seek', SEEK_JUMPS[3].at + 0.1), 'A5', { gain: -20, decay: 0.3, type: 'sine' });
  pop(at('seek', HUD_CALLOUT[0] + 0.5), 'D7', -18);

  // render: lane 1's shutter, then all four, then the file
  for (let k = 0; k < 10; k++) kit.tick(at('render', 0.9 + k * 0.3 + 0.15), { freq: 2600, gain: -25, decay: 0.03 });
  for (let k = 0; k < 14; k++) for (let w = 0; w < 4; w++) kit.tick(at('render', 4.0 + w * 0.15 + k * 0.3 + 0.15), { freq: 2300 + w * 250, gain: -31, decay: 0.03 });
  kit.grant(at('render', 8.4), { gain: -14, root: 'D6' });

  // motion: the pop is the spring, then the wave becomes music
  kit.thump(at('motion', 1.0), { gain: -9, freq: 60, decay: 0.4 });
  pop(at('motion', 1.02), 'A6', -17);
  kit.whoosh(at('motion', 4.7), { dur: 1.0, from: 500, to: 3500, gain: -23 });
  ['A4', 'D5', 'F#5', 'A5', 'D6'].forEach((n, i) => kit.pluck(at('motion', 5.0 + i * 0.16), n, { gain: -16, decay: 0.7, wet: 0.45 }));

  // footage
  for (let i = 0; i < 6; i++) kit.tick(at('footage', stagger(i, 0.08, 0.6)), { freq: 1400 + i * 150, gain: -24 });
  kit.whoosh(at('footage', 2.2), { dur: 0.5, from: 2500, to: 700, gain: -25 });
  kit.whoosh(at('footage', 5.6), { dur: 0.6, from: 800, to: 5000, gain: -22 });
  kit.grant(at('footage', 6.4), { gain: -16, root: 'A5' });

  // claude: a pop per file, the loop ticking round, the contact sheet opens
  for (let i = 0; i < 6; i++) pop(at('claude', stagger(i, 0.45, 0.9)), ['D6', 'E6', 'F#6', 'A6', 'B6', 'D7'][i], -22);
  for (let k = 0; k < 11; k++) kit.tick(at('claude', 5.6 + k * 0.32), { freq: 1700 + (k % 5) * 180, gain: -25 });
  kit.whoosh(at('claude', 9.1), { dur: 0.5, from: 600, to: 3000, gain: -23 });
  pop(at('claude', 9.4), 'A6', -18);

  // end: rows pop, the card shrinks into a frame, final chord
  [0.25, 0.85, 1.45].forEach((t, i) => pop(at('end', t), ['D6', 'F#6', 'A6'][i], -18));
  kit.whoosh(at('end', 4.9), { dur: 0.9, from: 3000, to: 300, gain: -21 });
  kit.pad(at('end', 5.6), 2.4, ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], { gain: -23, attack: 0.2, release: 1.4, cutoff: 1500 });
  ['F#6', 'A6', 'D7'].forEach((n, i) => kit.pluck(at('end', 5.7 + i * 0.1), n, { gain: -19, decay: 1.2 }));
}
