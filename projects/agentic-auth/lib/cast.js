// The recurring cast. One look per role for the whole film:
//   You — sand-ringed avatar · Agent — blue squircle with eyes + ID badge
//   Service — flat slate window with a URL bar · Token — lime key card
//   Vault — lime safe · Passkey — fingerprint with a filling ring
//   Password — sand ••• chip (turns red when it leaks)
import { h, css } from '/studio/dom.js';
import { icon } from './icons.js';
import { rich } from './fx.js';

export const at = (el, x, y) => css(el, { left: x, top: y });

// Absolutely positioned wrapper centred on (x, y) — cast members are placed by their centre.
export function place(el, x, y, cls = '') {
  const w = h('div', { class: `anchor ${cls}` }, el);
  at(w, x, y);
  return w;
}

export function Agent({ size = 150, name = 'Restock agent', label = true } = {}) {
  const eyeL = h('i', { class: 'eye' });
  const eyeR = h('i', { class: 'eye' });
  const face = h('div', { class: 'agent-face' }, eyeL, eyeR);
  const body = h('div', { class: 'agent-body' }, face);
  const lab = label ? h('div', { class: 'cast-label' }, name) : null;
  const el = h('div', { class: 'agent', style: { '--s': `${size}px` } }, body, lab);
  return {
    el, body, label: lab,
    // look: [-1..1, -1..1] · blink: 0..1 (1 = closed) · alarm: 0..1 tints eyes red
    face({ look = [0, 0], blink = 0, alarm = 0 } = {}) {
      const s = size;
      face.style.transform = `translate(${look[0] * s * 0.09}px, ${look[1] * s * 0.07}px)`;
      for (const e of [eyeL, eyeR]) {
        e.style.transform = `scaleY(${Math.max(0.08, 1 - blink)})`;
        e.style.background = alarm > 0.01 ? `color-mix(in srgb, var(--danger) ${Math.round(alarm * 100)}%, var(--gr-ink-900))` : '';
      }
    },
  };
}

// Blink pattern for idle life: returns 0..1 closed-ness at time t (deterministic).
export function blinkAt(t, times) {
  for (const b of times) {
    const d = t - b;
    if (d >= 0 && d < 0.22) return Math.sin((d / 0.22) * Math.PI);
  }
  return 0;
}

export function Badge({ id = 'agent:restock-7f3', sub = 'acting for you' } = {}) {
  return h('div', { class: 'badge' }, h('div', { class: 'badge-clip' }), h('b', {}, id), h('span', {}, sub));
}

export function You({ size = 130, label = 'You' } = {}) {
  const disc = h('div', { class: 'you-disc' }, icon('user', { size: size * 0.5, width: 1.5 }));
  const el = h('div', { class: 'you', style: { '--s': `${size}px` } }, disc, label ? h('div', { class: 'cast-label' }, label) : null);
  return { el, disc };
}

// Service window: URL bar + body. kind sets the little site glyph.
export function Win({ url = 'shop.example', w = 560, h: H = 420, glyph = 'bag', cls = '' } = {}) {
  const body = h('div', { class: 'win-body' });
  const bar = h('div', { class: 'win-bar' }, icon('lock', { size: 26, width: 2 }), h('span', {}, url));
  const el = h('div', { class: `win gr-panel ${cls}`, style: { width: `${w}px`, height: `${H}px` } }, bar, body);
  if (glyph) body.append(h('div', { class: 'win-glyph' }, icon(glyph, { size: 64, width: 1.4 })));
  return { el, body, bar };
}

export function Field({ label, value = '', kind = '' } = {}) {
  const val = h('span', { class: 'field-val' }, value);
  const el = h('div', { class: `field ${kind}` }, h('label', {}, label), h('div', { class: 'field-box' }, val, h('i', { class: 'caret' })));
  return { el, val };
}

export function LoginForm({ title = 'Sign in', email = 'you@mail.example', password = '' } = {}) {
  const em = Field({ label: 'Email', value: email });
  const pw = Field({ label: 'Password', value: password, kind: 'pw' });
  const btn = h('div', { class: 'gr-btn form-btn' }, title);
  const el = h('div', { class: 'form' }, em.el, pw.el, btn);
  return { el, email: em, password: pw, btn };
}

export function PwChip({ text = '••••••••••', cls = '' } = {}) {
  // dots aren't text to read: exempt from the min-size lint while they fly scaled down
  return h('div', { class: `pw-chip ${cls}`, 'data-lint-ignore': '' }, icon('key', { size: 30, width: 2 }), h('span', {}, text));
}

// The valet key: an lime key card whose engraved rows appear one by one.
export function KeyCard({ title = 'Access token', rows = [], w = 520 } = {}) {
  const rowEls = rows.map((r) => h('div', { class: 'kc-row' }, h('span', { class: 'kc-k' }, r[0]), h('span', { class: 'kc-v' }, rich(r[1]))));
  const head = h('div', { class: 'kc-head' }, icon('key', { size: 44, width: 1.8 }), h('span', {}, title), h('i', { class: 'kc-hole' }));
  const el = h('div', { class: 'keycard', style: { width: `${w}px` } }, head, h('div', { class: 'kc-rows' }, rowEls));
  return { el, head, rows: rowEls };
}

// A small token chip (the key card at rest, travelling along arrows).
export function TokenChip({ text = 'token', cls = '' } = {}) {
  return h('div', { class: `token-chip ${cls}` }, icon('key', { size: 30, width: 2 }), h('span', {}, text));
}

export function Vault({ size = 200, label = 'Your vault' } = {}) {
  const dial = h('div', { class: 'vault-dial' }, h('i'), h('i'), h('i'), h('i'));
  const box = h('div', { class: 'vault-box' }, dial, h('div', { class: 'vault-hinge' }));
  const el = h('div', { class: 'vault', style: { '--s': `${size}px` } }, box, label ? h('div', { class: 'cast-label' }, label) : null);
  return { el, box, dial };
}

// Passkey: fingerprint inside a ring that fills as you approve. set(p, done)
export function Passkey({ size = 150, label = 'Passkey' } = {}) {
  const R = 46, C = 2 * Math.PI * R;
  const ring = h('circle', { cx: 50, cy: 50, r: R, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': `${C} ${C}`, 'stroke-dashoffset': C, transform: 'rotate(-90 50 50)' });
  const track = h('circle', { cx: 50, cy: 50, r: R, fill: 'none', stroke: 'var(--line)', 'stroke-width': 2 });
  const svg = h('svg', { class: 'pk-ring', viewBox: '0 0 100 100', width: size, height: size }, track, ring);
  const fp = h('div', { class: 'pk-fp' }, icon('fingerprint', { size: size * 0.5, width: 1.5 }));
  const ok = h('div', { class: 'pk-ok' }, icon('check', { size: size * 0.42, width: 2.2 }));
  const lab = label ? h('div', { class: 'cast-label' }, label) : null;
  const el = h('div', { class: 'passkey', style: { '--s': `${size}px` } }, h('div', { class: 'pk-core' }, svg, fp, ok), lab);
  return {
    el, label: lab,
    set(p, done = 0) {
      ring.setAttribute('stroke-dashoffset', String(C * (1 - Math.min(1, Math.max(0, p)))));
      fp.style.opacity = String(1 - done);
      fp.style.color = p > 0.01 ? 'var(--accent)' : '';
      ok.style.opacity = String(done);
      ok.style.transform = `scale(${0.6 + 0.4 * done})`;
    },
  };
}

export function Phone({ w = 340, h: H = 660 } = {}) {
  const screen = h('div', { class: 'phone-screen' });
  const el = h('div', { class: 'phone', style: { width: `${w}px`, height: `${H}px` } }, h('i', { class: 'phone-notch' }), screen);
  return { el, screen };
}

export function Bubble({ who = 'you', text = '' } = {}) {
  return h('div', { class: `bubble b-${who}` }, h('p', {}, rich(text)));
}

export function Pill(text, cls = '') {
  return h('div', { class: `gr-pill pill ${cls}` }, text);
}

// A labelled box (used for "places a password can end up", log rows, rules…)
export function Tile({ glyph, title, sub, cls = '' } = {}) {
  return h('div', { class: `tile gr-panel ${cls}` }, glyph ? icon(glyph, { size: 44, width: 1.6 }) : null, h('div', { class: 'tile-txt' }, h('b', {}, rich(title)), sub ? h('span', {}, rich(sub)) : null));
}

// SVG overlay sized to the stage for connectors.
export function Wires({ w = 1920, h: H = 1080 } = {}) {
  return h('svg', { class: 'wires', width: w, height: H, viewBox: `0 0 ${w} ${H}` });
}
export function wire(svg, d, { cls = '', dash = false } = {}) {
  const p = h('path', { d, class: `wire ${cls} ${dash ? 'dash' : ''}` });
  svg.append(p);
  return p;
}

// PKCE as a torn ticket: the agent keeps one half and sends the other with the request;
// only the matching half collects the token. side: 'l' | 'r'
const ZIG = 'L 38 52 L 28 42 L 38 32 L 28 22 L 38 12 Z';
export function TicketHalf(side = 'l', { size = 72 } = {}) {
  const d = side === 'l' ? `M 33 2 A 30 30 0 0 0 33 62 ${ZIG}` : `M 33 2 A 30 30 0 0 1 33 62 ${ZIG}`;
  return h('svg', { class: `ticket ticket-${side}`, width: size, height: size, viewBox: '0 0 66 64' }, h('path', { d }));
}

export function Consent({ agent = 'Restock agent', rows = [], id = 'agent:restock-7f3' } = {}) {
  const items = rows.map(([g, text]) => h('div', { class: 'cs-row' }, icon(g, { size: 36, width: 1.8 }), h('span', {}, rich(text))));
  const allow = h('div', { class: 'gr-btn cs-allow' }, 'Allow');
  const deny = h('div', { class: 'gr-btn gr-btn-ghost cs-deny' }, 'Deny');
  const el = h('div', { class: 'consent' },
    h('div', { class: 'cs-who' }, h('b', { class: 'ag' }, agent), h('span', {}, ' wants to:')),
    h('div', { class: 'cs-rows' }, items),
    h('div', { class: 'cs-id' }, id),
    h('div', { class: 'cs-btns' }, deny, allow));
  return { el, rows: items, allow, deny };
}
