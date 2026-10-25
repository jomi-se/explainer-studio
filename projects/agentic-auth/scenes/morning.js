// 11 · Who's keeping score? — morning: the activity log replays the night (every row is something
// the viewer saw), rights re-checked per action, one-tap revoke.
import { h, tf, css } from '/studio/dom.js';
import { Agent, Badge, TokenChip, place, blinkAt } from '../lib/cast.js';
import { headline, showAt, captions, rich, interpolate, ease, progress, springAt, springs, clamp, stagger } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const ROWS = [
  ['Fri 21:04', 'user', 'You allowed __Restock agent__: 1 item ≤ €120', 'ok'],
  ['03:12', 'lock', 'Signed in to shop.example via your vault', 'ok'],
  ['03:12', 'ban', 'Denied: 5 × gift card (outside your rules)', 'bad'],
  ['03:13', 'fingerprint', 'Paid €118, approved with your passkey', 'ok'],
];

export function mount(root) {
  root.classList.add('atm-dawn');
  const hl = headline(root, { eyebrow: '4 · Who’s keeping score?', text: 'Every grant, every action, **on the record**.', cls: 'sm' });

  const rows = ROWS.map(([time, g, text, kind]) => h('div', { class: `log-r ${kind}` }, h('span', { class: 'log-t' }, time), icon(g, { size: 34, width: 1.8 }), h('span', { class: 'log-x' }, rich(text)), h('i', { class: 'log-chk' })));
  const log = h('div', { class: 'log gr-panel' }, h('div', { class: 'log-h' }, icon('list', { size: 30, width: 1.8 }), 'Activity · Restock agent'), ...rows);
  const logW = place(log, 780, 560);

  const agent = Agent({ size: 100, label: false });
  const keyA = TokenChip({ text: 'pay.example' }), keyB = TokenChip({ text: 'shop session' });
  const keys = h('div', { class: 'revoke-keys' }, keyA, keyB);
  const revoke = h('div', { class: 'gr-btn revoke' }, 'Revoke access');
  const side = h('div', { class: 'agent-wrap side-panel' }, agent.el, Badge(), keys, revoke);
  const sideW = place(side, 1620, 560);
  const gone = place(h('div', { class: 'denied' }, icon('ban', { size: 26, width: 2.2 }), 'revoked everywhere'), 1590, 900);

  root.append(logW, sideW, gone);
  const cap = captions(root, [
    { at: 3.4, out: 7.6, text: 'The log replays the night, row by row.' },
    { at: 7.8, out: 12.0, text: 'Rights are re-checked on **every action**, not just once.' },
    { at: 12.4, out: 17.4, text: 'One tap revokes it. Its keys ~~stop working~~.' },
  ]);

  return {
    update(t) {
      hl.update(t, 0.2);
      showAt(logW, t, 0.6, Infinity, { dy: 40 });
      rows.forEach((r, i) => showAt(r, t, stagger(i, 0.55, 1.2), Infinity, { dx: -24, dy: 0 }));
      // continuous checks: a pulse runs down the rows
      rows.forEach((r, i) => {
        const at = 8.2 + i * 0.35;
        const p = interpolate(t, [at, at + 0.15, at + 0.8], [0, 1, 0]);
        r.style.background = p > 0.01 ? `color-mix(in srgb, var(--accent) ${Math.round(p * 14)}%, transparent)` : '';
        r.querySelector('.log-chk').style.opacity = String(clamp((t - at) * 4));
      });
      showAt(sideW, t, 1.0, Infinity, { dx: 40, dy: 0 });
      // revoke
      const press = springAt(t, 12.8, springs.snappy) - springAt(t, 13.0, springs.snappy);
      revoke.style.transform = `scale(${1 - 0.08 * press})`;
      const off = ease.inOutCubic(progress(t, 13.1, 0.7));
      for (const k of [keyA, keyB]) { k.style.opacity = String(1 - 0.75 * off); k.style.filter = off > 0.01 ? `grayscale(${off})` : 'none'; k.style.textDecoration = off > 0.5 ? 'line-through' : 'none'; }
      agent.body.style.filter = off > 0.01 ? `grayscale(${0.8 * off})` : 'none';
      showAt(gone, t, 13.6, Infinity, { dy: 10, scale0: 0.8 });
      agent.face({ look: t < 12.6 ? [-1, 0.2] : [0, 0.6], blink: interpolate(t, [13.2, 13.6], [0, 0.85]) || blinkAt(t, [2.6, 6.8, 10.4]) });
      cap.update(t);
    },
  };
}
