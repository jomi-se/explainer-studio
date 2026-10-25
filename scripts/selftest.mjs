// Sanity checks for the pure motion maths (no browser needed): node scripts/selftest.mjs

import assert from 'node:assert/strict';
import { spring, springs, springTrack, interpolate, ease, rng, progress } from '../studio/motion.js';

const near = (a, b, eps = 1e-3, msg) => assert.ok(Math.abs(a - b) < eps, `${msg ?? ''} ${a} !≈ ${b}`);

// springs start at `from`, end at `to`, for every damping regime
for (const [name, o] of Object.entries({ ...springs, critical: { stiffness: 100, damping: 20 }, over: { stiffness: 100, damping: 40 } })) {
  near(spring(0, { ...o, from: 3, to: 9 }), 3, 1e-9, `${name} start`);
  near(spring(10, { ...o, from: 3, to: 9 }), 9, 1e-3, `${name} settle`);
}
// under-damped overshoots, over-damped does not
const peak = (o) => Math.max(...Array.from({ length: 300 }, (_, i) => spring(i / 100, o)));
assert.ok(peak(springs.bouncy) > 1.05, 'bouncy overshoots');
assert.ok(peak({ stiffness: 100, damping: 40 }) <= 1 + 1e-9, 'overdamped does not overshoot');
// continuity of the analytic solution near t=0 (velocity term)
near(spring(1e-6, { velocity: 5 }), 5e-6, 1e-6, 'initial velocity');

// springTrack is continuous across re-targets
const tr = (t) => springTrack(t, 0, [{ at: 0, to: 100 }, { at: 0.3, to: -50 }]);
near(tr(0.3 - 1e-6), tr(0.3 + 1e-6), 0.05, 'track continuity');
near(tr(20), -50, 1e-3, 'track settles at last target');
assert.equal(tr(-1), 0);

// interpolate: clamping, multi-segment, per-segment easing
assert.equal(interpolate(-1, [0, 1], [10, 20]), 10);
assert.equal(interpolate(2, [0, 1], [10, 20]), 20);
near(interpolate(1.5, [0, 1, 2], [0, 100, 50]), 75);
near(interpolate(0.5, [0, 1], [0, 1], { easing: ease.outCubic }), 0.875);
near(ease.bezier(0.25, 0.1, 0.25, 1)(0.5), 0.8024, 2e-3, 'css ease');
for (const [k, f] of Object.entries(ease)) if (k !== 'bezier') { near(f(0), 0, 1e-9, k); near(f(1), 1, 1e-9, k); }

// rng is seeded and stable
const r1 = rng(42), r2 = rng(42);
assert.deepEqual([r1(), r1(), r1()], [r2(), r2(), r2()]);
assert.equal(progress(5, 4, 2), 0.5);

console.log('selftest ok');
