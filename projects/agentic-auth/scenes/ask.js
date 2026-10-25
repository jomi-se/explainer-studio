// 7 · In the wild: OpenClaw (2/3) — the `secrets` tool. The agent asks you, mid-run, for an API key it
// lacks. On a chat channel the value is never accepted: the bot posts a link → Gateway sign-in →
// masked "API key" card (reason, allowed hosts). The value lands in OpenClaw's local store (not your
// vault); the agent only gets a store reference. MCP URL mode is the same idea.
// Facts: research/openclaw-flows.md §B.
import { h, tf, css, draw } from '/studio/dom.js';
import { Agent, Badge, Phone, Pill, Wires, wire, place, blinkAt } from '../lib/cast.js';
import { headline, showAt, captions, rich, interpolate, ease, progress, springAt, springs, clamp } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const AG = [300, 500];
const PH = [1040, 585];
const ST = [1610, 520];

export function mount(root) {
  root.classList.add('gr-glow');
  const hl = headline(root, { eyebrow: 'OpenClaw · the secrets tool', text: 'Asking for a secret, **privately**.', cls: 'sm' });

  const agent = Agent({ size: 110, label: false });
  const agentW = place(h('div', { class: 'agent-wrap' }, agent.el, Badge({ id: 'openclaw agent', sub: 'acting for you' })), AG[0], AG[1]);

  // phone: chat message with a link → Gateway sign-in → masked card
  const phone = Phone({ w: 420, h: 600 });
  const chat = h('div', { class: 'ph-chat' },
    h('div', { class: 'ph-msg' }, icon('key', { size: 24, width: 2 }), ' Agent requests ', h('b', {}, 'SHOP_API_KEY')),
    h('div', { class: 'ph-note' }, 'Reply is disabled for secrets.'),
    h('div', { class: 'ph-link' }, icon('link', { size: 28, width: 2 }), h('div', {}, h('b', {}, 'Open to provide it'), h('span', {}, 'gateway/ask/7c2…'))));
  const gate = h('div', { class: 'ph-form' },
    h('small', {}, 'OpenClaw Control'),
    h('b', { class: 'ph-title' }, 'Sign in to your Gateway'),
    h('div', { class: 'ph-ok' }, icon('check', { size: 26, width: 2.4 }), 'paired device'));
  const masked = h('div', { class: 'ph-form' },
    h('small', {}, 'API key'),
    h('b', {}, 'SHOP_API_KEY'),
    h('div', { class: 'ph-kv' }, h('span', {}, 'why'), 'watch the restock'),
    h('div', { class: 'ph-kv' }, h('span', {}, 'allowed hosts'), 'api.shop.example'),
    h('div', { class: 'ph-input' }, h('span', { class: 'ph-dots' }, ''), h('i', { class: 'caret' })),
    h('div', { class: 'gr-btn ph-save' }, 'Submit'));
  phone.screen.append(chat, gate, masked);
  const phoneW = place(phone.el, PH[0], PH[1]);

  // OpenClaw's local store (not your vault)
  const store = h('div', { class: 'store gr-panel' }, icon('list', { size: 40, width: 1.6 }), h('b', {}, 'local store'), h('code', {}, 'openclaw.sqlite'), h('span', { class: 'store-row' }, 'SHOP_API_KEY  ••••'));
  const storeW = place(store, ST[0], ST[1]);
  const notVault = place(Pill('not your vault · unencrypted', 'warm'), ST[0] - 80, ST[1] + 200);

  const svg = Wires();
  const wReq = wire(svg, `M ${AG[0] + 170} ${AG[1] - 60} C ${AG[0] + 330} ${AG[1] - 160}, ${PH[0] - 400} ${PH[1] - 200}, ${PH[0] - 230} ${PH[1] - 140}`, { cls: 'ag' });
  const wSave = wire(svg, `M ${PH[0] + 230} ${PH[1] + 60} L ${ST[0] - 170} ${ST[1] + 10}`, { cls: 'ok' });
  const wRef = wire(svg, `M ${ST[0] - 60} ${ST[1] + 130} C ${ST[0] - 300} ${860}, ${AG[0] + 420} ${860}, ${AG[0] + 20} ${AG[1] + 200}`, { cls: 'ok' });
  const reqChip = place(h('div', { class: 'req-chip' }, icon('key', { size: 26, width: 2 }), 'request SHOP_API_KEY'), 0, 0);
  const valChip = place(h('div', { class: 'pw-chip ok-chip' }, '••••••••'), 0, 0);
  const refChip = place(h('div', { class: 'ref-chip' }, h('div', {}, 'source: "store"'), h('div', {}, 'id: "SHOP_API_KEY"')), 0, 0);
  const mcp = place(Pill('MCP · URL mode', 'ag'), ST[0] - 80, ST[1] + 200);

  root.append(svg, phoneW, storeW, notVault, agentW, reqChip, valChip, refChip, mcp);
  const cap = captions(root, [
    { at: 1.8, out: 6.4, text: 'Missing a key? The agent **asks you** for one.' },
    { at: 6.6, out: 11.2, text: 'Chat never takes the value. You get a **link**.' },
    { at: 11.4, out: 16.0, text: 'Sign in, then type it into a **masked form**.' },
    { at: 16.2, out: 21.4, text: 'It lands in a **local store**. The agent gets a **reference**.' },
    { at: 21.6, out: 26.6, text: '__MCP__ URL mode does the same: the agent never sees the page.' },
  ]);

  // screens slide sideways; u is in screen widths (+60px gutter)
  const shift = (el, u) => { el.style.transform = `translateX(calc(${u * 100}% + ${u * 60}px))`; };
  const along = (el, path, t, at, dur, fade = 0.25) => {
    const p = ease.inOutCubic(progress(t, at, dur));
    const L = path.getTotalLength(), q = path.getPointAtLength(L * p);
    tf(el, { x: q.x, y: q.y, opacity: interpolate(t, [at - 0.1, at + 0.1, at + dur, at + dur + fade], [0, 1, 1, 0]) });
  };

  return {
    update(t) {
      hl.update(t, 0.2);
      showAt(agentW, t, 0.6, Infinity, { dy: 30, scale0: 0.85 });
      showAt(phoneW, t, 1.0, Infinity, { dy: 80, scale0: 0.94 });
      showAt(storeW, t, 1.4, Infinity, { dy: 30 });
      store.style.opacity = String(0.35 + 0.65 * clamp((t - 15.2) * 2));

      // the request travels to you
      draw(wReq, ease.inOutCubic(progress(t, 2.2, 0.6)));
      along(reqChip, wReq, t, 2.4, 1.3, 0.3);

      // chat: the bot posts a link; replies are disabled
      showAt(chat.children[0], t, 3.6, Infinity, { dy: 16 });
      showAt(chat.children[1], t, 6.8, Infinity, { dy: 10 });
      showAt(chat.children[2], t, 7.6, Infinity, { dy: 16, spring: springs.bouncy });
      const tap = springAt(t, 10.4, springs.snappy) - springAt(t, 10.6, springs.snappy);
      chat.children[2].style.transform = `scale(${1 - 0.06 * tap})`;
      const p1 = ease.inOutCubic(progress(t, 11.0, 0.5)), p2 = ease.inOutCubic(progress(t, 12.8, 0.5));
      shift(chat, -p1); shift(gate, 1 - p1 - p2); shift(masked, 1 - p2);
      showAt(gate.children[2], t, 11.8, Infinity, { dy: 10, scale0: 0.9 });
      chat.style.visibility = p1 > 0.99 ? 'hidden' : '';
      gate.style.visibility = p1 < 0.01 || p2 > 0.99 ? 'hidden' : '';
      masked.style.visibility = p2 < 0.01 ? 'hidden' : '';
      const pf = interpolate(t, [10.8, 11.4, 15.0, 15.6], [0, 1, 1, 0], { easing: ease.inOutCubic });
      phone.el.style.transform = `scale(${1 + 0.05 * pf})`;
      agentW.style.opacity = String(Number(agentW.style.opacity || 1) * (1 - 0.6 * pf));

      // typing, submit
      const typed = Math.max(0, Math.min(10, Math.floor((t - 13.6) / 0.09)));
      masked.querySelector('.ph-dots').textContent = '•'.repeat(typed);
      masked.querySelector('.caret').style.opacity = t > 13.4 && t < 14.7 && Math.floor(t * 3) % 2 === 0 ? '1' : '0';
      const sub = springAt(t, 14.8, springs.snappy) - springAt(t, 15.0, springs.snappy);
      masked.querySelector('.ph-save').style.transform = `scale(${1 - 0.08 * sub})`;

      // value → store; only a reference → agent
      draw(wSave, ease.inOutCubic(progress(t, 15.0, 0.4)));
      along(valChip, wSave, t, 15.2, 0.9);
      showAt(store.querySelector('.store-row'), t, 16.0, Infinity, { dy: 0, scale0: 0.9 });
      showAt(notVault, t, 16.6, 21.4, { dy: 14 });
      draw(wRef, ease.inOutCubic(progress(t, 17.4, 0.7)));
      const pr = ease.inOutCubic(progress(t, 17.6, 1.4));
      const L = wRef.getTotalLength(), q = wRef.getPointAtLength(L * pr);
      tf(refChip, { x: q.x, y: q.y, opacity: clamp((t - 17.5) * 5) });
      showAt(mcp, t, 21.8, Infinity, { dy: 14 });

      agent.face({ look: t < 4 ? [1, -0.3] : t < 17.6 ? [1, 0] : [0.6, 0.8], blink: blinkAt(t, [1.6, 6.0, 9.8, 13.0, 19.6, 24.4]) });
      cap.update(t);
    },
  };
}
