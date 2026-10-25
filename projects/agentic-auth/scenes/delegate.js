// 3 · Who sent you? — delegate, don't share. OAuth: the agent sends you to the wallet's own
// sign-in; you approve with a passkey; a consent card spells out the grant; PKCE (torn ticket)
// makes sure only the agent that started the flow can collect the token.
import { h, tf, css } from '/studio/dom.js';
import { Agent, Badge, You, Win, Passkey, Consent, TicketHalf, TokenChip, Pill, Wires, wire, place, blinkAt } from '../lib/cast.js';
import { headline, showAt, captions, arc, interpolate, ease, progress, springAt, springs, clamp } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const AG = [330, 560];
const WIN = { x: 1190, y: 590, w: 760, h: 620 };
const EDGE = [WIN.x - WIN.w / 2, 560];

export function mount(root) {
  root.classList.add('gr-glow');
  const hl = headline(root, { eyebrow: '2 · Who sent you?', text: 'Delegate. **Don’t share.**', cls: 'sm' });

  const agent = Agent({ size: 128, label: false });
  const agentW = place(h('div', { class: 'agent-wrap' }, agent.el, Badge()), AG[0], AG[1] + 50);

  const svg = Wires();
  const path = wire(svg, `M ${AG[0] + 90} ${AG[1]} L ${EDGE[0] - 6} ${EDGE[1]}`, { cls: 'ag' });
  const back = wire(svg, `M ${EDGE[0] - 6} ${EDGE[1] + 34} L ${AG[0] + 90} ${AG[1] + 34}`, { cls: 'ok' });

  const win = Win({ url: 'pay.example/authorize', w: WIN.w, h: WIN.h, glyph: null });
  const pk = Passkey({ size: 180, label: false });
  const paneA = h('div', { class: 'pane pane-center' },
    h('h2', { class: 'win-title', style: { margin: 0 } }, 'Sign in to Pay'), pk.el,
    h('div', { class: 'gr-btn gr-btn-ghost pk-btn' }, icon('fingerprint', { size: 34, width: 1.8 }), 'Sign in with a passkey'));
  const consent = Consent({ rows: [['bag', 'Make **1 purchase**'], ['card', 'Up to **€120**'], ['pin', 'Only at **shop.example**'], ['clock', 'Until **Sunday**']] });
  const paneB = h('div', { class: 'pane' }, consent.el);
  win.body.append(paneA, paneB);
  const winW = place(win.el, WIN.x, WIN.y);

  const you = You({ size: 104 });
  const youW = place(you.el, 1700, 760);

  // PKCE ticket: right half rides the request, left half stays with the agent
  const req = h('div', { class: 'req-chip' }, icon('arrow', { size: 28, width: 2 }), 'sign-in request');
  const reqW = place(req, 0, 0);
  const tR = place(TicketHalf('r', { size: 92 }), 0, 0);
  const tL = place(TicketHalf('l', { size: 92 }), 0, 0);
  const token = TokenChip({ text: 'token' });
  const tokW = place(token, 0, 0);
  const match = h('div', { class: 'granted' }, icon('check', { size: 26, width: 2.4 }), 'match');
  const matchW = place(match, EDGE[0] - 44, 370);

  const pills = [Pill('OAuth 2.1'), Pill('PKCE'), Pill('MCP', 'ag')].map((p, i) => place(p, 640, 668 + i * 76));

  root.append(svg, winW, youW, agentW, reqW, tR, tL, tokW, matchW, ...pills);
  const cap = captions(root, [
    { at: 2.8, out: 7.2, text: 'The agent sends you to the wallet’s **own** sign-in page.' },
    { at: 7.4, out: 12.4, text: 'You sign in there, with a passkey. The agent never sees it.' },
    { at: 12.6, out: 17.4, text: 'Consent names the agent and spells out what it may do.' },
    { at: 17.6, out: 22.0, text: 'PKCE: only whoever **started** the sign-in can finish it.' },
    { at: 22.2, out: 26.0, text: 'The agent gets a **token**, never your password.' },
    { at: 26.2, out: 30.6, text: 'Agent tools that speak __MCP__ use this same flow.' },
  ]);

  const RQ = [3.0, 4.1]; // request travels
  const MT = [18.2, 19.0]; // agent's half travels to match
  const TK = [20.6, 21.6]; // token travels back

  return {
    update(t) {
      hl.update(t, 0.2);
      showAt(agentW, t, 0.9, Infinity, { dy: 30, scale0: 0.85 });
      showAt(winW, t, 1.3, Infinity, { dy: 60, scale0: 0.96 });
      showAt(youW, t, 5.2, Infinity, { dx: 40, dy: 0 });
      css(svg, {}).style.opacity = '1';
      import_draw(path, ease.inOutCubic(progress(t, 2.6, 0.5)));
      import_draw(back, ease.inOutCubic(progress(t, TK[0] - 0.3, 0.5)));

      // request with the right half of the ticket
      const pr = ease.inOutCubic(progress(t, RQ[0], RQ[1] - RQ[0]));
      const rx = AG[0] + 130 + (EDGE[0] - 140 - AG[0] - 130) * pr;
      tf(reqW, { x: rx, y: AG[1] - 54, opacity: interpolate(t, [RQ[0], RQ[0] + 0.2, RQ[1] + 0.2, RQ[1] + 0.5], [0, 1, 1, 0]) });
      // ticket halves: tear at the agent, right half rides along and parks at the window edge
      const tear = springAt(t, 2.9, springs.snappy);
      const parkR = [EDGE[0] - 44, 450];
      const homeL = [AG[0] + 150, 430];
      const rPos = t < RQ[0] ? [homeL[0] + 12 * tear, homeL[1]] : [lerp2(homeL[0] + 12, parkR[0], pr), lerp2(homeL[1], parkR[1], pr) - Math.sin(pr * Math.PI) * 50];
      const focus = interpolate(t, [17.6, 18.2, 20.4, 21.0], [0, 1, 1, 0], { easing: ease.inOutCubic });
      const big = 1 + 0.45 * focus;
      tf(tR, { x: rPos[0], y: rPos[1], scale: big, opacity: clamp(tear * 2) });
      // left half: stays home until the match, then flies to the right half and snaps
      const pm = ease.inOutCubic(progress(t, MT[0], MT[1] - MT[0]));
      const [lx, ly] = arc(pm, [homeL[0] - 12 * tear, homeL[1]], [parkR[0] - 2, parkR[1]], 80);
      tf(tL, { x: lx, y: ly, scale: big, opacity: clamp(tear * 2) * (1 - progress(t, TK[0] + 1.2, 0.4)) });
      tR.style.opacity = String(Number(tR.style.opacity) * (1 - progress(t, TK[0] + 1.2, 0.4)));
      const snap = springAt(t, MT[1], springs.bouncy) - springAt(t, MT[1] + 0.25, springs.gentle);
      tL.style.filter = tR.style.filter = snap > 0.02 ? `drop-shadow(0 0 ${14 * snap}px rgb(181 240 122 / 0.9))` : 'none';
      showAt(matchW, t, MT[1] + 0.1, TK[0] + 1.4, { dy: 14, scale0: 0.8 });

      // window: passkey sign-in → consent
      const pkP = ease.inOutCubic(progress(t, 8.6, 1.4));
      pk.set(pkP, clamp(springAt(t, 10.1, springs.snappy)));
      const toB = ease.inOutCubic(progress(t, 12.2, 0.5));
      paneA.style.opacity = String(1 - toB);
      paneB.style.opacity = String(toB);
      paneB.style.transform = `translateY(${(1 - toB) * 30}px)`;
      consent.rows.forEach((r, i) => showAt(r, t, 12.6 + i * 0.16, Infinity, { dx: -20, dy: 0 }));
      const press = springAt(t, 16.6, springs.snappy) - springAt(t, 16.8, springs.snappy);
      consent.allow.style.transform = `scale(${1 - 0.08 * press})`;
      consent.allow.style.boxShadow = t > 16.7 ? '0 0 0 4px rgb(181 240 122 / 0.25)' : 'none';
      win.el.style.opacity = String(interpolate(t, [21.8, 22.4], [1, 0.55]) * (1 - 0.6 * focus));
      for (const el of [youW, agentW]) el.style.opacity = String(Number(el.style.opacity || 1) * (1 - 0.5 * focus));

      // token travels back to the agent
      const pt = ease.inOutCubic(progress(t, TK[0], TK[1] - TK[0]));
      tf(tokW, { x: EDGE[0] - 80 - (EDGE[0] - 80 - AG[0] - 200) * pt, y: AG[1] + 34 + Math.sin(pt * Math.PI) * -30, opacity: interpolate(t, [TK[0] - 0.1, TK[0] + 0.1], [0, 1]), scale: 1 + 0.15 * (springAt(t, TK[1], springs.bouncy) - springAt(t, TK[1] + 0.2, springs.gentle)) });

      // pills arrive with their caption
      showAt(pills[0], t, 4.2, Infinity, { dy: 16 });
      showAt(pills[1], t, 17.8, Infinity, { dy: 16 });
      showAt(pills[2], t, 26.4, Infinity, { dy: 16 });

      // hand-off to the key scene (hard cut): everything but the agent and its token clears
      const clear = 1 - ease.inOutCubic(progress(t, 29.9, 0.8));
      if (clear < 1) for (const el of [winW, youW, svg, matchW, ...pills]) el.style.opacity = String(Number(el.style.opacity || 1) * clear);
      hl.el.style.opacity = String(clear);
      const look = t < 5 ? [1, 0] : t < 18 ? [1, 0.1] : t < 20.5 ? [1, -0.5] : [0.7, 0.2];
      agent.face({ look, blink: blinkAt(t, [2.0, 6.8, 11.3, 15.9, 24.4, 28.8]) });
      cap.update(t);
    },
  };
}

const lerp2 = (a, b, p) => a + (b - a) * p;
import { draw as import_draw } from '/studio/dom.js';
