// 8 · The pattern: a credential broker that injects at egress. The agent's shell holds only a
// placeholder (OpenClaw: an `oc-sent-v2…end` sentinel); every outbound call goes through a local
// proxy that pulls the real key (store / vault) and swaps it in at the last moment — only for the
// secret's allowed host. Wrong host → 403, no swap. Caveats + the same pattern elsewhere.
// Facts: research/openclaw-flows.md §"Credential broker".
import { h, tf, css, draw } from '/studio/dom.js';
import { Agent, Vault, Pill, Wires, wire, place, blinkAt } from '../lib/cast.js';
import { headline, showAt, captions, rich, interpolate, ease, progress, springAt, springs, clamp, stagger } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const SH = [400, 560];   // agent's shell
const BR = [1080, 560];  // broker
const VL = [1080, 300];  // secret source above the broker
const OK = [1600, 430];  // allowed host
const EV = [1600, 700];  // any other host
const SH_R = SH[0] + 280, BR_L = BR[0] - 150, BR_R = BR[0] + 150, H_L = OK[0] - 190;

export function mount(root) {
  root.classList.add('gr-glow');
  const hl = headline(root, { eyebrow: 'The pattern · credential broker', text: 'Inject the key **at the door out**.', cls: 'sm' });

  // the agent's shell: a placeholder in the env
  const agent = Agent({ size: 64, label: false });
  const sh = h('div', { class: 'win gr-panel', style: { width: '560px', height: '330px' } },
    h('div', { class: 'win-bar' }, agent.el, h('span', {}, 'agent’s shell')),
    h('div', { class: 'win-body' }, h('div', { class: 'term' },
      h('div', { class: 'tl dim' }, '$ echo $SHOP_API_KEY'),
      h('div', { class: 'tl sent' }, 'oc-sent-v2.Xk9q…end'),
      h('div', { class: 'tl dim' }, '$ curl api.shop.example'),
      h('div', { class: 'tl dim' }, '$ curl evil.example'))));
  const shW = place(sh, SH[0], SH[1]);

  const broker = h('div', { class: 'gw gr-panel' }, icon('shield', { size: 46, width: 1.6 }), h('b', {}, 'broker'), h('span', {}, 'local egress proxy'));
  const brW = place(broker, BR[0], BR[1]);
  const src = place(h('div', { class: 'use-chip src' }, icon('key', { size: 28, width: 1.8 }), 'store / vault'), VL[0], VL[1]);
  const host = (url, glyph) => h('div', { class: 'host gr-panel' }, h('div', { class: 'host-bar' }, icon(glyph, { size: 26, width: 1.8 }), url), h('div', { class: 'host-st' }, ''));
  const okH = host('api.shop.example', 'globe'), evH = host('evil.example', 'globe');
  const okW = place(okH, OK[0], OK[1]), evW = place(evH, EV[0], EV[1]);
  const allow = place(h('div', { class: 'tun-lab' }, 'allowed host for SHOP_API_KEY'), OK[0] - 50, OK[1] - 100);

  const svg = Wires();
  const wIn = wire(svg, `M ${SH_R} ${SH[1]} L ${BR_L} ${BR[1]}`, { cls: 'ag' });
  const wSrc = wire(svg, `M ${VL[0]} ${VL[1] + 40} L ${BR[0]} ${BR[1] - 110}`, { cls: 'ok' });
  const wOk = wire(svg, `M ${BR_R} ${BR[1] - 30} C ${BR_R + 120} ${BR[1] - 30}, ${H_L - 140} ${OK[1]}, ${H_L} ${OK[1]}`, { cls: 'ok' });
  const wEv = wire(svg, `M ${BR_R} ${BR[1] + 30} C ${BR_R + 120} ${BR[1] + 30}, ${H_L - 140} ${EV[1]}, ${H_L} ${EV[1]}`, { cls: 'bad', dash: true });

  // flying chips pass through the boxes on purpose (lint-ignored)
  const chip = (cls, txt, g) => place(h('div', { class: `req-chip ${cls}`, 'data-lint-ignore': '' }, icon(g, { size: 24, width: 2.2 }), h('span', {}, txt)), 0, 0);
  const ph1 = chip('', 'oc-sent…', 'arrow');
  const real = chip('real', 'sk_live_••••', 'key');
  const ph2 = chip('', 'oc-sent…', 'arrow');
  const deny = place(h('div', { class: 'denied' }, icon('ban', { size: 26, width: 2.2 }), '403 · not allowed for this host'), BR[0], BR[1] + 170);

  const caveats = h('div', { class: 'caveats' },
    Pill('opt-in', 'warm'), Pill('only traffic through it', 'warm'), Pill('allowed host can echo it', 'warm'));
  const cavW = place(caveats, 960, 820);
  const same = place(h('div', { class: 'same' }, h('span', {}, 'Same pattern:'), Pill('OneCLI'), Pill('Infisical Agent Proxy'), Pill('Docker Sandboxes')), 960, 820);

  root.append(svg, shW, brW, src, okW, evW, allow, deny, cavW, same, ph1, real, ph2);
  const cap = captions(root, [
    { at: 1.6, out: 6.2, text: 'The agent’s shell holds a **placeholder**, not the key.' },
    { at: 6.4, out: 10.6, text: 'Every outbound call goes through a **broker**.' },
    { at: 10.8, out: 16.0, text: 'At the door out, it **swaps in the real key**.' },
    { at: 16.2, out: 21.0, text: 'Any other host? ~~No swap~~. The placeholder is worthless.' },
    { at: 21.2, out: 25.6, text: 'It only guards traffic that **goes through it**.' },
    { at: 25.8, out: 30.4, text: 'Same idea in agent sandboxes and credential proxies.' },
  ]);

  const seg = (el, path, t, at, dur, p0 = 0, p1 = 1) => {
    const p = p0 + (p1 - p0) * ease.inOutCubic(progress(t, at, dur));
    const L = path.getTotalLength(), q = path.getPointAtLength(L * p);
    tf(el, { x: q.x, y: q.y });
  };

  return {
    update(t) {
      hl.update(t, 0.2);
      showAt(shW, t, 0.6, Infinity, { dy: 40, scale0: 0.96 });
      const lines = [...sh.querySelectorAll('.tl')];
      showAt(lines[0], t, 1.2, Infinity, { dx: -10, dy: 0 });
      showAt(lines[1], t, 1.8, Infinity, { dx: -10, dy: 0, spring: springs.bouncy });
      showAt(lines[2], t, 6.6, Infinity, { dx: -10, dy: 0 });
      showAt(lines[3], t, 16.4, Infinity, { dx: -10, dy: 0 });
      lines[1].style.boxShadow = `0 0 0 ${3 * interpolate(t, [2.2, 2.5, 5.4, 5.8], [0, 1, 1, 0])}px color-mix(in srgb, var(--accent-2) 55%, transparent)`;

      showAt(brW, t, 6.4, Infinity, { scale0: 0.8, dy: 0 });
      draw(wIn, ease.inOutCubic(progress(t, 6.8, 0.5)));
      showAt(okW, t, 7.0, Infinity, { dx: 30, dy: 0 });
      showAt(evW, t, 7.2, Infinity, { dx: 30, dy: 0 });
      showAt(allow, t, 7.6, 21.0, { dy: 10 });

      // call 1: placeholder → broker; pull the real key; swap; on to the allowed host
      seg(ph1, wIn, t, 7.8, 1.2, 0, 0.5);
      ph1.style.opacity = String(interpolate(t, [7.7, 7.9, 11.6, 11.9], [0, 1, 1, 0]));
      showAt(src, t, 10.8, Infinity, { dy: -16 });
      draw(wSrc, ease.inOutCubic(progress(t, 11.0, 0.5)));
      const swap = interpolate(t, [11.6, 11.9, 12.2, 12.6], [0, 1, 1, 0]);
      broker.style.boxShadow = swap > 0.01 ? `0 0 0 ${5 * swap}px color-mix(in srgb, var(--accent) 50%, transparent)` : '';
      draw(wOk, ease.inOutCubic(progress(t, 12.2, 0.5)));
      // the real key appears inside the broker, then leaves for the allowed host
      seg(real, wOk, t, 12.4, 1.2, 0.18, 0.62);
      if (t < 12.4) real.style.transform += ` scale(${0.6 + 0.4 * ease.outCubic(progress(t, 11.8, 0.4))})`;
      real.style.opacity = String(interpolate(t, [11.8, 12.0, 13.6, 13.9], [0, 1, 1, 0]));
      okH.querySelector('.host-st').textContent = t > 13.7 ? '200 OK ✓' : '';
      okH.classList.toggle('lit', t > 13.7);

      // call 2: wrong host → no swap, refused at the broker
      const bounce = interpolate(t, [17.8, 18.0, 18.4], [0, 1, 0]);
      seg(ph2, wIn, t, 16.6, 1.2, 0, 0.5);
      ph2.style.transform += ` translateX(${-50 * bounce}px)`;
      ph2.style.opacity = String(interpolate(t, [16.5, 16.7, 18.6, 19.0], [0, 1, 1, 0]));
      draw(wEv, ease.inOutCubic(progress(t, 17.0, 0.6)));
      wEv.style.opacity = String(1 - 0.6 * progress(t, 18.2, 0.4));
      showAt(deny, t, 18.0, 25.6, { dy: 10, scale0: 0.8 });
      evH.style.opacity = String(1 - 0.5 * progress(t, 18.2, 0.4));

      // caveats, then the same pattern elsewhere
      showAt(cavW, t, 21.4, 25.6, { dy: 16 });
      [...caveats.children].forEach((p, i) => showAt(p, t, stagger(i, 0.12, 21.5), Infinity, { dy: 14 }));
      showAt(same, t, 26.0, Infinity, { dy: 16 });
      [...same.children].forEach((p, i) => showAt(p, t, stagger(i, 0.12, 26.1), Infinity, { dy: 14 }));

      agent.face({ look: t < 7.6 ? [0.3, 0.6] : [1, 0], blink: blinkAt(t, [3.2, 9.8, 15.0, 20.4, 27.0]), alarm: 0 });
      cap.update(t);
    },
  };
}
