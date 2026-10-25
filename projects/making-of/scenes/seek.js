// seek(t): a playhead over t ∈ [0, 2] s, and the ball whose x is a formula of t, drawn on the
// same scale, so the ball always sits right above the playhead. Then the counter-example: a
// ball that moves "a bit every tick" is lost when the playhead jumps. Finally, a pointer to the
// frame counter in the corner, which is a formula of t too.
import { h, tf, css, draw } from '/studio/dom.js';
import { springAt, springs, springTrack, ease, progress, clamp } from '/studio/motion.js';
import { captions, showAt } from '../lib/fx.js';
import { SEEK_JUMPS, HUD_CALLOUT } from '../lib/beats.js';

const X0 = 420, X1 = 1500; // t = 0 … 2 s maps to this span, and so does x = 100 … 700
const tx = (tt) => X0 + (tt / 2) * (X1 - X0);
const LANE_A = 330, LANE_B = 560, BAR = 790;

function lane(y, cls, codeHtml, note) {
  const track = h('div', { class: 'abs', style: { left: `${X0}px`, width: `${X1 - X0}px`, top: `${y}px`, height: '3px', background: 'var(--line)' } });
  const code = h('div', { class: `abs mono ${cls}`, style: { left: `${X0}px`, top: `${y - 120}px`, fontSize: '40px' }, html: codeHtml });
  const tag = h('div', { class: 'abs label', style: { left: `${X0 + 2}px`, top: `${y - 166}px` } }, note);
  const ball = h('div', { class: `ball ${cls}`, style: { top: `${y}px` } });
  const readout = h('div', { class: `anchor mono ${cls}`, style: { top: `${y + 74}px`, fontSize: '30px' } }, '');
  return { track, code, tag, ball, readout, els: [track, code, tag, ball, readout] };
}

export function mount(root) {
  root.append(h('div', { class: 'bg gr-glow' }));
  const L = h('div', { class: 'bg' });
  root.append(L);

  const A = lane(LANE_A, 'rk', 'x = x + 5', 'every tick, move a bit');
  const B = lane(LANE_B, 'em', 'x = 100 + 300 · t', 'a formula of t');
  const lost = h('div', { class: 'anchor badge', style: { width: '76px', height: '76px', borderRadius: '50%', color: 'var(--danger)', fontSize: '46px', fontWeight: '600', top: `${LANE_A - 70}px` } }, '?');
  const lostNote = h('div', { class: 'abs mono rk', style: { left: '1540px', top: `${LANE_A - 20}px`, fontSize: '30px' } }, 'where?');

  const bar = h('div', { class: 'abs', style: { left: `${X0}px`, width: `${X1 - X0}px`, top: `${BAR}px`, height: '10px', borderRadius: '5px', background: 'var(--surface-2)' } });
  const fill = h('div', { class: 'abs', style: { left: '0', top: '0', bottom: '0', borderRadius: '5px', background: 'var(--accent-2)' } });
  bar.append(fill);
  const knob = h('div', { class: 'abs', style: { width: '34px', height: '34px', marginLeft: '-17px', top: `${BAR - 12}px`, borderRadius: '50%', background: 'var(--ink)', boxShadow: '0 0 0 8px rgb(116 176 255 / 0.35)' } });
  const knobLine = h('div', { class: 'abs', style: { width: '2px', marginLeft: '-1px', top: `${LANE_B + 40}px`, height: `${BAR - LANE_B - 52}px`, background: 'color-mix(in srgb, var(--accent-2) 55%, transparent)' } });
  const tLabel = h('div', { class: 'anchor mono', style: { top: `${BAR + 62}px`, fontSize: '34px', color: 'var(--accent-2)' } }, '');
  const ends = [['0 s', X0], ['2 s', X1]].map(([s, x]) => h('div', { class: 'anchor label', style: { left: `${x}px`, top: `${BAR + 62}px` } }, s));
  const seekChip = h('div', { class: 'abs chip ag', style: { left: '150px', top: `${BAR - 22}px` } }, 'seek(t)');
  const pointer = h('svg', { class: 'abs', width: 1920, height: 1080, style: { left: '0', top: '0', overflow: 'visible' } },
    h('path', { d: 'M 1560 200 C 1600 170 1620 150 1640 140', fill: 'none', stroke: 'var(--accent)', 'stroke-width': 5, 'stroke-linecap': 'round' }),
    h('path', { d: 'M 1618 134 L 1644 137 L 1634 160', fill: 'none', stroke: 'var(--accent)', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  L.append(...A.els, ...B.els, lost, lostNote, bar, knobLine, knob, tLabel, ...ends, seekChip, pointer);

  const cap = captions(L, [
    { at: 0.3, out: 4.3, text: '`seek(t)`: jump straight to any moment' },
    { at: 4.3, out: 9.0, text: 'Not ~~“move a bit every tick”~~, but a **formula of t**' },
    { at: HUD_CALLOUT[0], out: HUD_CALLOUT[1], text: 'Same **t**, same picture. Even the counter up there ↗' },
  ]);

  return {
    update(t) {
      // the playhead: dragged to each jump target on a snappy spring
      const pt = clamp(springTrack(t, 0.9, SEEK_JUMPS.map((j) => ({ at: j.at, to: j.t })), springs.snappy), 0, 2);
      const kx = tx(pt);
      showAt(bar, t, 0.15, Infinity, { dy: 14 });
      for (const e of ends) showAt(e, t, 0.25, Infinity, { dy: 8 });
      showAt(seekChip, t, 0.35, Infinity, { dx: -20, dy: 0 });
      css(knob, { left: kx }); css(knobLine, { left: kx }); css(tLabel, { left: kx });
      fill.style.width = `${kx - X0}px`;
      tLabel.textContent = `t = ${pt.toFixed(2)}`;
      const ko = clamp(springAt(t, 0.4, springs.snappy) * 1.6);
      for (const e of [knob, tLabel]) e.style.opacity = String(ko);
      knobLine.style.opacity = String(clamp((t - 0.9) / 0.3));

      // lane B: x = 100 + 300·t — always right above the playhead
      for (const e of [B.track, B.code, B.tag]) showAt(e, t, 0.6, Infinity, { dy: 14 });
      const bx = 100 + 300 * pt;
      css(B.ball, { left: tx(pt) }); css(B.readout, { left: tx(pt) });
      B.readout.textContent = `x = ${Math.round(bx)}`;
      tf(B.ball, { scale: clamp(springAt(t, 0.75, springs.snappy)) });
      B.readout.style.opacity = String(clamp((t - 0.9) / 0.3));

      // lane A appears at 4.3: it only knows how to take the next step, so after a jump it's lost
      for (const e of [A.track, A.code, A.tag]) showAt(e, t, 4.5, Infinity, { dy: 14 });
      const jumped = t >= SEEK_JUMPS[3].at;
      const ax = tx(1.1); // where it was when the playhead last moved smoothly
      css(A.ball, { left: ax }); css(A.readout, { left: ax });
      A.readout.textContent = jumped ? 'x = ?' : 'x = 430';
      const pa = springAt(t, 4.7, springs.snappy);
      const dimA = 1 - 0.7 * ease.inOutCubic(progress(t, HUD_CALLOUT[0], 0.5));
      tf(A.ball, { scale: clamp(pa), opacity: dimA });
      A.readout.style.opacity = String(clamp((t - 4.9) / 0.3) * dimA);
      for (const e of [A.track, A.code, A.tag]) e.style.opacity = String(Number(e.style.opacity) * dimA);
      const pl = springAt(t, SEEK_JUMPS[3].at + 0.35, springs.bouncy);
      css(lost, { left: ax });
      tf(lost, { scale: Math.max(0, Math.min(pl, 1.15)), opacity: clamp(pl * 2) * dimA });
      lost.style.visibility = t < SEEK_JUMPS[3].at + 0.35 ? 'hidden' : '';
      showAt(lostNote, t, SEEK_JUMPS[3].at + 0.6, HUD_CALLOUT[0] + 0.4, { dx: 20, dy: 0 });

      // pointer to the hud
      const pp = ease.outCubic(progress(t, HUD_CALLOUT[0] + 0.4, 0.5));
      draw(pointer.children[0], pp);
      pointer.children[1].style.opacity = String(clamp((t - HUD_CALLOUT[0] - 0.85) / 0.15) * (1 - clamp((t - HUD_CALLOUT[1] + 0.3) / 0.3)));
      pointer.children[0].style.opacity = String(1 - clamp((t - HUD_CALLOUT[1] + 0.3) / 0.3));
      cap.update(t);
    },
  };
}
