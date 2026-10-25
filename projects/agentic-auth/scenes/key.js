// 4 · What may you do, and until when? — the valet key. The token from the previous scene grows
// into a key card; each beat illustrates one property on the right, then engraves it on the card.
import { h, tf, css, draw } from '/studio/dom.js';
import { Agent, Badge, KeyCard, TokenChip, Win, Pill, Wires, wire, place, blinkAt } from '../lib/cast.js';
import { headline, showAt, captions, arc, interpolate, ease, progress, springAt, springs, clamp } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const AG = [330, 610];
const CARD = [880, 600];
const Z = [1520, 610]; // illustration zone
// beat windows [in, out]
const B = { scope: [2.6, 8.4], rules: [8.6, 14.0], time: [14.2, 18.6], aud: [18.8, 23.4], bound: [23.6, 30] };

export function mount(root) {
  root.classList.add('gr-glow');
  const hl = headline(root, { eyebrow: '3 · What may you do, and until when?', text: 'A valet key, **not your keys.**', cls: 'sm' });

  const agent = Agent({ size: 128, label: false });
  const agentKey = h('div', { class: 'agent-key' }, icon('key', { size: 28, width: 2 }), 'agent key');
  const agentW = place(h('div', { class: 'agent-wrap' }, agent.el, Badge(), agentKey), AG[0], AG[1]);

  const card = KeyCard({
    title: 'Access token', w: 600,
    rows: [['Scope', 'purchase'], ['Limit', '1 item · ≤ €120'], ['At', 'shop.example'], ['Until', 'Sun 23:59'], ['Expires', '15 min'], ['For', 'pay.example'], ['Bound to', '__agent key__']],
  });
  const cardW = place(card.el, CARD[0], CARD[1] + 20);
  const chip = place(TokenChip({ text: 'token' }), 0, 0); // the chip we cut from

  // 1 · scope Venn
  const vsvg = h('svg', { width: 600, height: 420, viewBox: '0 0 600 420' },
    h('defs', {}, h('clipPath', { id: 'vclip' }, h('circle', { cx: 210, cy: 230, r: 150 }))),
    h('circle', { class: 'venn-a', cx: 210, cy: 230, r: 150 }),
    h('circle', { class: 'venn-b', cx: 390, cy: 230, r: 150 }),
    h('circle', { class: 'venn-ov', cx: 390, cy: 230, r: 150, 'clip-path': 'url(#vclip)' }));
  const vlabA = h('div', { class: 'venn-lab' }, 'What you can do');
  const vlabB = h('div', { class: 'venn-lab ag' }, 'What its job needs');
  const vlabO = h('div', { class: 'venn-ov-lab' }, 'scope');
  const venn = h('div', { class: 'zone' }, vsvg, css(vlabA, { left: 40, top: 0 }), css(vlabB, { left: 300, top: 0 }), css(vlabO, { left: 300, top: 230 }));
  const vennW = place(venn, Z[0], Z[1]);

  // 2 · your rules, signed
  const seal = h('div', { class: 'seal' }, icon('fingerprint', { size: 40, width: 1.6 }), h('span', {}, 'signed by you'));
  const rules = h('div', { class: 'rules gr-panel' }, h('div', { class: 'rules-h' }, 'Your rules'),
    ...['1 item', 'up to €120', 'at shop.example', 'until Sunday'].map((r) => h('div', { class: 'rules-r' }, icon('check', { size: 30, width: 2.2 }), r)), seal);
  const rulesW = place(rules, Z[0], Z[1]);

  // 3 · short-lived
  const R = 120, C = 2 * Math.PI * R;
  const ring = h('circle', { cx: 150, cy: 150, r: R, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-dasharray': `${C} ${C}`, transform: 'rotate(-90 150 150)' });
  const clockTxt = h('div', { class: 'clock-txt' }, '15:00');
  const clock = h('div', { class: 'zone clock' }, h('svg', { width: 300, height: 300, viewBox: '0 0 300 300' }, h('circle', { cx: 150, cy: 150, r: R, fill: 'none', stroke: 'var(--line)', 'stroke-width': 3 }), ring), clockTxt, h('div', { class: 'clock-sub' }, 'then a fresh one'));
  const clockW = place(clock, Z[0], Z[1]);

  // 4 · audience: two doors
  const pay = Win({ url: 'pay.example', w: 420, h: 150, glyph: 'card' });
  const mail = Win({ url: 'mail.example', w: 420, h: 150, glyph: 'mail' });
  const payW = place(pay.el, Z[0] + 30, 470), mailW = place(mail.el, Z[0] + 30, 760);
  const okPay = place(h('div', { class: 'granted' }, icon('check', { size: 26, width: 2.4 }), 'accepted'), Z[0] + 30, 572);
  const noMail = place(h('div', { class: 'denied' }, icon('ban', { size: 26, width: 2.2 }), 'wrong audience'), Z[0] + 30, 862);
  const k1 = place(TokenChip({ text: 'token' }), 0, 0), k2 = place(TokenChip({ text: 'token' }), 0, 0);

  // 5 · bound: a stolen copy without the agent's key
  const ghost = place(TokenChip({ text: 'stolen copy', cls: 'ghost' }), 0, 0);
  const noProof = place(h('div', { class: 'denied' }, icon('ban', { size: 26, width: 2.2 }), 'no proof of key'), Z[0] + 30, 572);
  const tether = Wires();
  const teth = wire(tether, `M ${AG[0] + 70} ${AG[1] + 210} C ${AG[0] + 260} ${AG[1] + 300}, ${CARD[0] - 200} ${CARD[1] + 330}, ${CARD[0] - 60} ${CARD[1] + 250}`, { cls: 'ag' });
  const dpop = place(Pill('DPoP', 'ag'), Z[0] + 30, 330);
  const aud = place(Pill('Audience · RFC 8707'), Z[0] + 30, 330);

  root.append(tether, vennW, rulesW, clockW, payW, mailW, okPay, noMail, noProof, cardW, agentW, chip, k1, k2, ghost, dpop, aud);
  const cap = captions(root, [
    { at: 3.0, out: 8.2, text: 'Only the **overlap**: what you can do, and what its job needs.' },
    { at: 9.0, out: 13.8, text: 'Your rules, signed by you, travel with the key.' },
    { at: 14.4, out: 18.4, text: 'Short-lived: **minutes**, not months.' },
    { at: 19.0, out: 23.2, text: 'Addressed to one service. Useless anywhere else.' },
    { at: 24.0, out: 29.6, text: 'Tied to the agent’s key: a stolen copy ~~doesn’t work~~.' },
  ]);

  // which rows engrave when
  const ENGRAVE = [7.4, 12.6, 12.8, 13.0, 17.4, 22.2, 28.4];

  const zoneShow = (el, [a, b], opts) => showAt(el, t0, a, b, { dy: 30, ...opts });
  let t0 = 0;

  return {
    update(t) {
      t0 = t;
      hl.update(t, 0.2);
      showAt(agentW, t, -1, Infinity); // already on screen (match cut from delegate)
      showAt(agentKey, t, B.bound[0] + 0.4, Infinity, { dy: 14, scale0: 0.7 });

      // chip → card
      const grow = springAt(t, 0.5, springs.slow);
      tf(chip, { x: AG[0] + 200 + (CARD[0] - AG[0] - 200) * clamp(grow * 1.4), y: AG[1] - 16 + (CARD[1] - AG[1] + 16) * clamp(grow * 1.4), scale: 1 + grow * 0.6, opacity: 1 - clamp((grow - 0.25) * 3) });
      tf(cardW, { scale: 0.4 + 0.6 * grow, opacity: clamp((grow - 0.2) * 2.5) });
      card.rows.forEach((r, i) => {
        const p = springAt(t, ENGRAVE[i], springs.snappy);
        r.style.opacity = String(t < ENGRAVE[i] ? 0.4 : 0.4 + 0.6 * clamp(p * 1.4));
        const flash = interpolate(t, [ENGRAVE[i], ENGRAVE[i] + 0.12, ENGRAVE[i] + 0.9], [0, 1, 0]);
        r.style.background = flash > 0.01 ? `color-mix(in srgb, var(--accent) ${Math.round(flash * 24)}%, transparent)` : '';
        r.querySelector('.kc-v').style.visibility = t < ENGRAVE[i] ? 'hidden' : '';
      });

      zoneShow(vennW, B.scope);
      const ov = ease.inOutCubic(progress(t, 5.0, 0.6));
      vsvg.querySelector('.venn-ov').style.opacity = String(ov);
      vlabO.style.opacity = String(ov);
      zoneShow(rulesW, B.rules);
      showAt(seal, t, 11.4, Infinity, { dy: 0, scale0: 1.6, spring: springs.bouncy });
      zoneShow(clockW, B.time);
      const left = 15 * 60 * (1 - ease.inQuad(progress(t, B.time[0] + 0.8, 2.6)));
      const fresh = t > B.time[0] + 3.5;
      const secs = fresh ? 900 : Math.round(left);
      clockTxt.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
      ring.setAttribute('stroke-dashoffset', String(C * (1 - (fresh ? springAt(t, B.time[0] + 3.5, springs.snappy) : left / 900))));

      for (const el of [payW, mailW]) zoneShow(el, [B.aud[0], B.bound[1]]);
      // a copy of the key tries both doors
      const p1 = ease.inOutCubic(progress(t, B.aud[0] + 0.8, 0.8));
      const [x1, y1] = arc(p1, [CARD[0] + 200, CARD[1] - 160], [Z[0] - 170, 470], 60);
      tf(k1, { x: x1, y: y1, opacity: t > B.aud[0] + 0.8 && t < B.aud[1] ? 1 : 0 });
      const p2 = ease.inOutCubic(progress(t, B.aud[0] + 1.4, 0.8));
      const bounce = springAt(t, B.aud[0] + 2.2, springs.bouncy);
      const [x2, y2] = arc(p2, [CARD[0] + 200, CARD[1] + 100], [Z[0] - 170, 760], 40);
      tf(k2, { x: x2 - 70 * clamp(bounce), y: y2, opacity: t > B.aud[0] + 1.4 && t < B.aud[1] ? 1 : 0 });
      showAt(okPay, t, B.aud[0] + 1.7, B.aud[1], { dy: 10, scale0: 0.8 });
      showAt(noMail, t, B.aud[0] + 2.25, B.aud[1], { dy: 10, scale0: 0.8 });
      mail.el.style.borderColor = t > B.aud[0] + 2.2 && t < B.aud[1] ? 'var(--danger)' : '';
      showAt(aud, t, B.aud[0] + 0.2, B.aud[1], { dy: 12 });

      // bound: tether to the agent key; a red stolen copy can't prove the key
      draw(teth, ease.inOutCubic(progress(t, B.bound[0] + 0.5, 0.8)));
      const pg = ease.inOutCubic(progress(t, B.bound[0] + 1.6, 1.1));
      const gb = springAt(t, B.bound[0] + 2.7, springs.bouncy);
      const [gx, gy] = arc(pg, [Z[0] + 120, 880], [Z[0] - 170, 470], -60);
      tf(ghost, { x: gx - 80 * clamp(gb), y: gy + 20 * clamp(gb), opacity: t > B.bound[0] + 1.4 ? 1 : 0 });
      showAt(noProof, t, B.bound[0] + 2.75, Infinity, { dy: 10, scale0: 0.8 });
      pay.el.style.borderColor = t > B.bound[0] + 2.7 ? 'var(--danger)' : '';
      showAt(dpop, t, B.bound[0] + 0.3, Infinity, { dy: 12 });

      agent.face({ look: t < B.bound[0] ? [1, 0] : [0.6, 0.6], blink: blinkAt(t, [1.6, 6.2, 11.0, 16.3, 21.7, 26.9]) });
      cap.update(t);
    },
  };
}
