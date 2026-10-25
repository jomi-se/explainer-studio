// 10 · A fresh yes — the real purchase is within the rules but it's a big moment: CIBA-style
// approval on your phone, the same binding code on both screens, a passkey tap.
import { h, tf, css, draw } from '/studio/dom.js';
import { Agent, Badge, Phone, Passkey, Pill, Wires, wire, place, blinkAt } from '../lib/cast.js';
import { headline, showAt, captions, interpolate, ease, progress, springAt, springs, clamp } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const AG = [300, 470];
const PH = [1380, 560];

export function mount(root) {
  root.classList.add('atm-night');
  const hl = headline(root, { eyebrow: '3:13 a.m. · a fresh yes', text: 'Big moments get a **fresh yes**.', cls: 'sm' });

  const agent = Agent({ size: 110, label: false });
  const agentW = place(h('div', { class: 'agent-wrap' }, agent.el, Badge()), AG[0], AG[1]);
  const order = h('div', { class: 'order gr-panel' },
    h('small', {}, 'ready to pay'),
    h('div', { class: 'order-r' }, icon('shoe', { size: 40, width: 1.5 }), h('span', {}, '1 × Trail runner')),
    h('div', { class: 'order-r' }, icon('card', { size: 40, width: 1.5 }), h('span', {}, '€118 · shop.example')),
    h('div', { class: 'bind' }, 'TRAIL-42'));
  const orderW = place(order, AG[0] + 30, 790);
  const done = place(h('div', { class: 'granted big-ok' }, icon('check', { size: 30, width: 2.4 }), 'purchased'), 760, 790);

  const phone = Phone({ w: 400, h: 640 });
  const pk = Passkey({ size: 150, label: false });
  const card = h('div', { class: 'ph-approve' },
    h('small', {}, 'approve purchase?'),
    h('b', {}, 'Restock agent wants to pay €118 at shop.example'),
    h('div', { class: 'bind' }, 'TRAIL-42'),
    pk.el);
  const clock = h('div', { class: 'ph-clock' }, '3:13');
  phone.screen.append(clock, card);
  const phoneW = place(phone.el, PH[0], PH[1]);
  const stand = css(h('div', { class: 'stand' }), { left: PH[0] - 330, top: PH[1] + 330, width: 660 });

  const svg = Wires();
  const ping = wire(svg, `M ${AG[0] + 120} ${AG[1] - 30} C ${AG[0] + 500} ${AG[1] - 240}, ${PH[0] - 520} ${PH[1] - 260}, ${PH[0] - 220} ${PH[1] - 120}`, { cls: 'ag dash' });
  const pills = [Pill('CIBA', 'ag'), Pill('step-up')].map((p, i) => place(p, 700 + i * 180, 300));

  root.append(svg, stand, phoneW, agentW, orderW, done, ...pills);
  const cap = captions(root, [
    { at: 2.0, out: 6.4, text: 'No browser needed: the request comes to **your phone**.' },
    { at: 6.6, out: 10.8, text: 'Same code on both screens: it’s the same request.' },
    { at: 11.0, out: 14.6, text: 'One tap. One purchase. Back to sleep.' },
  ]);

  return {
    update(t) {
      hl.update(t, 0.2);
      showAt(agentW, t, 0.4, Infinity, { dy: 30, scale0: 0.85 });
      showAt(orderW, t, 1.0, Infinity, { dy: 30 });
      showAt(stand, t, 0.8, Infinity, { dy: 0 });
      showAt(phoneW, t, 0.9, Infinity, { dy: 40 });
      draw(ping, ease.inOutCubic(progress(t, 2.2, 0.9)));
      // phone wakes: screen lights, buzz
      const wake = ease.outCubic(progress(t, 3.0, 0.4));
      phone.screen.style.background = wake > 0.01 ? `color-mix(in srgb, var(--gr-slate-100) ${Math.round(wake * 100)}%, var(--bg-2))` : '';
      const buzz = t > 3.0 && t < 3.8 ? Math.sin(t * 90) * 5 * (1 - progress(t, 3.0, 0.8)) : 0;
      tf(phoneW, { x: buzz, opacity: clamp(springAt(t, 0.9, springs.snappy) * 1.6) });
      showAt(clock, t, 3.0, Infinity, { dy: 10 });
      showAt(card, t, 3.4, Infinity, { dy: 40, spring: springs.bouncy });
      // matching codes highlight
      const match = interpolate(t, [6.8, 7.2, 10.2, 10.8], [0, 1, 1, 0]);
      for (const b of [order.querySelector('.bind'), card.querySelector('.bind')]) b.style.boxShadow = match > 0.01 ? `0 0 0 ${4 * match}px rgb(227 204 192 / ${0.35 * match})` : 'none';
      pk.set(ease.inOutCubic(progress(t, 11.2, 1.0)), clamp(springAt(t, 12.3, springs.snappy)));
      showAt(done, t, 12.6, Infinity, { dy: 10, scale0: 0.8, spring: springs.bouncy });
      pills.forEach((p, i) => showAt(p, t, 2.6 + i * 0.3, Infinity, { dy: 12 }));
      agent.face({ look: t < 6.6 ? [1, -0.6] : t < 10.8 ? [0.6, 0.9] : [1, -0.3], blink: blinkAt(t, [1.8, 5.6, 9.4, 13.4]) });
      cap.update(t);
    },
  };
}
