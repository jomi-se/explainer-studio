// 6 · In the wild: OpenClaw (1/3) — plaintext keys → incidents → SecretRefs → who resolves them:
// the Gateway pulls each ref from your vault at startup and uses the values itself; the model
// is not involved. (Asking the human for a new secret is a separate flow: scenes/ask.js.)
// Facts: research/openclaw-flows.md §A, research/openclaw-bitwarden.md §A.
import { h, tf, css, draw } from '/studio/dom.js';
import { Vault, Pill, Wires, wire, place } from '../lib/cast.js';
import { headline, showAt, captions, rich, interpolate, ease, progress, springAt, springs, clamp, stagger } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const ED = [760, 530];
const ED2 = [420, 520]; // editor after it steps aside
const GW = [1000, 500];
const VLT = [1580, 470];
const RIGHT = 1590;

const code = (lines) => lines.map(([txt, cls = '']) => h('div', { class: `ln ${cls}` }, rich(txt)));

export function mount(root) {
  root.classList.add('gr-glow');
  const hl = headline(root, { eyebrow: 'In the wild · 2026', text: 'OpenClaw learned this **in public**.', cls: 'sm' });

  // editor: plaintext → SecretRefs
  const plain = h('div', { class: 'code' }, code([
    ['{'],
    ['  apiKey: `"sk-live-8f2c…"`,', 'bad'],
    ['  botToken: `"7413:AAHq…"`,', 'bad'],
    ['  gatewayToken: `"c91e07…"`,', 'bad'],
    ['}'],
  ]));
  const refs = h('div', { class: 'code' }, code([
    ['{'],
    ['  apiKey: {', 'ok'],
    ['    source: "exec", provider: "vault",', 'ok'],
    ['    id: "providers/openai/apiKey"', 'ok'],
    ['  },', 'ok'],
    ['  botToken: "${TELEGRAM_BOT_TOKEN}",', 'ok'],
    ['  gatewayToken: { source: "file", … },', 'ok'],
    ['}'],
  ]));
  const editor = h('div', { class: 'editor gr-panel' }, h('div', { class: 'ed-bar' }, icon('file', { size: 28, width: 1.8 }), 'openclaw.json'), h('div', { class: 'ed-body' }, plain, refs));
  const edW = place(editor, ED[0], ED[1]);
  const refPill = place(Pill('SecretRefs · v2026.2.26'), ED[0] - 290, 830);
  const optPill = place(Pill('opt-in · plaintext still works', 'warm'), ED[0] + 300, 830);

  // incidents
  const inc = [
    ['Feb 2026', 'An infostealer grabs OpenClaw’s config, gateway token and device key.'],
    ['Feb 2026', '341 malicious skills found on ClawHub, the skills registry.'],
  ].map(([d, txt], i) => place(h('div', { class: 'incident' }, h('small', {}, d), h('p', {}, txt)), RIGHT, 430 + i * 250));

  // who resolves the refs: the Gateway, at startup, from your vault
  const gw = h('div', { class: 'gw gr-panel' }, icon('server', { size: 46, width: 1.6 }), h('b', {}, 'Gateway'), h('span', {}, 'resolves at startup'), h('div', { class: 'gw-mem' }, h('i'), h('i'), h('i')));
  const gwW = place(gw, GW[0], GW[1]);
  const vault = Vault({ size: 150, label: 'Your vault' });
  const vaultW = place(vault.el, VLT[0], VLT[1]);
  const execLab = place(h('div', { class: 'tun-lab' }, 'exec · pulled, never pushed'), (GW[0] + VLT[0]) / 2 + 30, VLT[1] - 150);
  const svg = Wires();
  const wRead = wire(svg, `M ${ED2[0] + 230} ${GW[1]} L ${GW[0] - 150} ${GW[1]}`, { cls: 'ok', dash: true });
  const wPull = wire(svg, `M ${VLT[0] - 100} ${VLT[1] - 20} C ${VLT[0] - 220} ${VLT[1] - 80}, ${GW[0] + 260} ${GW[1] - 80}, ${GW[0] + 150} ${GW[1] - 10}`, { cls: 'ok' });
  const cfg = place(h('div', { class: 'use-chip' }, icon('file', { size: 28, width: 1.8 }), 'openclaw.json · refs'), ED2[0] + 60, GW[1]);
  const pullChip = place(h('div', { class: 'token-chip' }, icon('key', { size: 26, width: 2 }), 'apiKey'), 0, 0);
  // …and uses them itself
  const outs = [['bolt', 'model API'], ['chat', 'Telegram bot']].map(([g, t], i) => place(h('div', { class: 'use-chip' }, icon(g, { size: 28, width: 1.8 }), t), GW[0] - 170 + i * 340, 760));
  const wOut = outs.map((_, i) => wire(svg, `M ${GW[0] + (i ? 40 : -40)} ${GW[1] + 120} L ${GW[0] - 170 + i * 340} ${730}`, { cls: 'ok' }));
  const never = place(h('div', { class: 'never' }, icon('eye', { size: 30, width: 1.8 }), 'the model never sees these'), VLT[0], 760);

  root.append(svg, edW, refPill, optPill, ...inc, cfg, gwW, vaultW, execLab, ...outs, never, pullChip);
  const cap = captions(root, [
    { at: 2.8, out: 8.2, text: 'Early 2026: keys sat in plain text, and ~~malware came for them~~.' },
    { at: 8.6, out: 13.6, text: '**SecretRefs**: the config points to a secret instead of containing it.' },
    { at: 14.0, out: 19.8, text: 'Set up once. The **Gateway** pulls each secret from your vault at startup.' },
    { at: 20.0, out: 24.8, text: 'It uses them itself. **The model never sees them.**' },
  ]);

  return {
    update(t) {
      hl.update(t, 0.2);
      showAt(edW, t, 1.0, Infinity, { dy: 50, scale0: 0.96 });
      [...plain.children].forEach((ln, i) => showAt(ln, t, 1.4 + i * 0.12, Infinity, { dx: -16, dy: 0 }));
      inc.forEach((el, i) => showAt(el, t, stagger(i, 0.5, 3.4), 8.4, { dx: 40, dy: 0 }));

      // plaintext → refs
      const m = ease.inOutCubic(progress(t, 8.4, 0.7));
      plain.style.opacity = String(1 - m);
      plain.style.filter = m > 0.01 && m < 0.99 ? `blur(${m * 6}px)` : 'none';
      refs.style.opacity = String(m);
      [...refs.children].forEach((ln, i) => showAt(ln, t, 8.6 + i * 0.08, Infinity, { dx: 16, dy: 0 }));
      showAt(refPill, t, 9.4, 13.8, { dy: 14 });
      showAt(optPill, t, 11.4, 13.8, { dy: 14 });

      // the editor steps aside; the Gateway reads it and pulls from the vault
      const aside = ease.inOutCubic(progress(t, 13.8, 0.8));
      tf(edW, { x: (ED2[0] - ED[0]) * aside, y: (ED2[1] - ED[1]) * aside, opacity: (1 - aside) * clamp(springAt(t, 1.0, springs.snappy) * 1.6) });
      edW.style.visibility = aside > 0.99 ? 'hidden' : '';
      showAt(cfg, t, 14.3, Infinity, { dx: -20, dy: 0 });
      showAt(gwW, t, 14.4, Infinity, { scale0: 0.8, dy: 0 });
      draw(wRead, ease.inOutCubic(progress(t, 14.8, 0.5)));
      showAt(vaultW, t, 15.2, Infinity, { dy: 30 });
      draw(wPull, ease.inOutCubic(progress(t, 15.8, 0.6)));
      showAt(execLab, t, 16.0, 19.8, { dy: 10 });
      const pp = ease.inOutCubic(progress(t, 16.6, 1.3));
      const L = wPull.getTotalLength(), q = wPull.getPointAtLength(L * pp);
      tf(pullChip, { x: q.x, y: q.y, opacity: interpolate(t, [16.5, 16.7, 17.8, 18.1], [0, 1, 1, 0]) });
      const mem = [...gw.querySelector('.gw-mem').children];
      mem.forEach((d, i) => { d.style.opacity = String(clamp((t - 17.9 - i * 0.15) * 4)); });
      gw.style.boxShadow = `0 0 0 ${4 * interpolate(t, [17.8, 18.0, 18.6, 19.0], [0, 1, 1, 0])}px color-mix(in srgb, var(--accent) 45%, transparent)`;

      // uses
      wOut.forEach((w, i) => draw(w, ease.inOutCubic(progress(t, 20.2 + i * 0.2, 0.5))));
      outs.forEach((el, i) => showAt(el, t, 20.5 + i * 0.2, Infinity, { dy: 16 }));
      showAt(never, t, 21.4, Infinity, { dy: 16 });

      cap.update(t);
    },
  };
}
