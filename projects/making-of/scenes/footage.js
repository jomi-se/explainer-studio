// Real recordings: a real edit list from another film (its "setup" clip) cuts 30 s of screen
// recording into ~10 s — speeding up the dull parts, dropping one — and a blur rectangle is burned
// over a secret. The terminal here is drawn, and its "secret" is random characters.
import { h, tf, css } from '/studio/dom.js';
import { springAt, springs, ease, progress, clamp, stagger, rng } from '/studio/motion.js';
import { captions, showAt } from '../lib/fx.js';
import { icon } from '../lib/cast.js';

const PARTS = [[21.7, 24.3, 1.3], [24.3, 29.1, 6.5], [32.0, 35.6, 6.5], [35.6, 43.3, 2.4], [43.3, 45.6, 3], [45.6, 48.9, 1.25]];
const T0 = 20, T1 = 50, BX = 200, BW = 1520, PXS = BW / (T1 - T0);
const SRC_Y = 230, OUT_Y = 340;
const r = rng(7);
const SECRET = Array.from({ length: 28 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[Math.floor(r() * 57)]).join('');

export function mount(root) {
  root.append(h('div', { class: 'bg gr-glow' }));
  const L = h('div', { class: 'bg' });
  root.append(L);

  const srcLbl = h('div', { class: 'abs label', style: { left: `${BX}px`, top: `${SRC_Y - 62}px` } }, 'recording.mov · 0:20 – 0:50');
  const src = h('div', { class: 'abs', style: { left: `${BX}px`, top: `${SRC_Y}px`, width: `${BW}px`, height: '44px', borderRadius: '10px', background: 'var(--surface-2)' } });
  const segs = PARTS.map(([a, b, sp], i) => {
    const el = h('div', { class: 'abs', style: { left: `${BX + (a - T0) * PXS}px`, top: `${SRC_Y}px`, width: `${(b - a) * PXS - 4}px`, height: '44px', borderRadius: '10px',
      background: sp > 2 ? 'var(--accent-2)' : 'var(--accent)' } });
    const tag = h('div', { class: 'anchor mono', style: { left: `${BX + ((a + b) / 2 - T0) * PXS}px`, top: `${SRC_Y + 22}px`, fontSize: '28px', fontWeight: '600', color: 'var(--gr-ink-900)' } }, sp === 1 ? '' : `${sp}×`);
    return { el, tag, a, b, sp, i };
  });
  const skip = h('div', { class: 'abs', style: { left: `${BX + (29.1 - T0) * PXS}px`, top: `${SRC_Y - 6}px`, width: `${2.9 * PXS}px`, height: '56px', borderRadius: '10px',
    border: '3px dashed var(--danger)' } });
  const outLbl = h('div', { class: 'abs label', style: { left: `${BX}px`, top: `${OUT_Y + 58}px`, color: 'var(--ink)' } }, '');
  let x = 0;
  const outs = PARTS.map(([a, b, sp]) => {
    const w = ((b - a) / sp) * PXS;
    const el = h('div', { class: 'abs', style: { left: `${BX + x}px`, top: `${OUT_Y}px`, width: `${w - 3}px`, height: '44px', borderRadius: '8px', background: sp > 2 ? 'var(--accent-2)' : 'var(--accent)' } });
    x += w;
    return el;
  });
  const cutLen = PARTS.reduce((s, [a, b, sp]) => s + (b - a) / sp, 0);
  outLbl.textContent = `the cut: ${cutLen.toFixed(1)} s`;

  const code = h('div', { class: 'abs card', style: { left: '200px', top: '560px', width: '700px', height: '330px' } },
    h('div', { class: 'label', style: { position: 'absolute', left: '32px', top: '-50px' } }, 'footage.js'),
    h('div', { class: 'codebox', style: { fontSize: '30px' }, html: [
      '<span class="k">parts</span>: [',
      '  [<span class="n">21.7, 24.3, 1.3</span>],',
      '  [<span class="n">24.3, 29.1, 6.5</span>], <span class="c">…</span>',
      '],',
      '<span data-bl><span class="k">blur</span>: [<span class="n">x, y, w, h</span>]</span>',
    ].join('\n') }));
  const blurLine = code.querySelector('[data-bl]');

  const term = h('div', { class: 'abs card', style: { left: '1000px', top: '560px', width: '720px', height: '330px', overflow: 'hidden' } },
    h('div', { class: 'win-bar' }, h('i'), h('i'), h('i'), h('div', { class: 'url' }, 'Terminal')),
    h('div', { class: 'codebox', style: { fontSize: '30px', lineHeight: '1.6', paddingTop: '18px' }, html: [
      '<span class="n">$</span> cli-login',
      'Paste the value:',
      `<span data-secret>${SECRET}</span>`,
      '<span class="n">✓</span> Logged in',
    ].join('\n') }));
  const secret = term.querySelector('[data-secret]');
  const blur = h('div', { class: 'abs', style: { left: '1022px', top: '731px', width: '560px', height: '48px', borderRadius: '10px',
    background: 'rgb(181 240 122 / 0.06)', border: '3px solid var(--accent)', transformOrigin: '0 50%' } });
  const shield = h('div', { class: 'anchor', style: { left: '1640px', top: '755px', color: 'var(--accent)' } }, icon('check', { size: 44, width: 2.6 }));
  L.append(srcLbl, src, ...segs.flatMap((s) => [s.el, s.tag]), skip, ...outs, outLbl, code, term, blur, shield);

  const cap = captions(L, [
    { at: 0.3, out: 5.0, text: 'Real screen recordings? An edit list cuts and speeds them up' },
    { at: 5.0, out: 9.05, text: 'Secrets are **blurred into the frames** before they’re used' },
  ]);

  return {
    update(t) {
      showAt(srcLbl, t, 0.1, Infinity, { dy: 10 });
      showAt(src, t, 0.15, Infinity, { dy: 10 });
      for (const s of segs) {
        const p = springAt(t, stagger(s.i, 0.08, 0.6), springs.snappy);
        tf(s.el, { opacity: clamp(p * 1.6), y: (1 - p) * -20 });
        s.tag.style.opacity = String(clamp((t - 1.3 - s.i * 0.08) / 0.2));
      }
      showAt(skip, t, 1.4, Infinity, { scale0: 1.15, dy: 0 });
      // the parts drop into the cut, squeezed by their speed
      outs.forEach((el, i) => {
        const p = springAt(t, stagger(i, 0.1, 2.2), springs.snappy);
        tf(el, { opacity: clamp(p * 1.6), y: (1 - p) * -60 });
      });
      showAt(outLbl, t, 2.9, Infinity, { dy: 10 });
      showAt(code, t, 1.0, Infinity, { dx: -30, dy: 0 });
      showAt(term, t, 1.3, Infinity, { dx: 30, dy: 0 });
      // the dull timeline dims when the secret beat starts
      const dim = 1 - 0.6 * ease.inOutCubic(progress(t, 4.9, 0.4));
      for (const e of [src, skip, ...segs.map((s) => s.el), ...outs]) e.style.opacity = String(Number(e.style.opacity) * dim);
      // blur wipes across the secret line
      const pb = ease.inOutCubic(progress(t, 5.6, 0.6));
      blur.style.transform = `scaleX(${pb})`;
      blur.style.visibility = pb <= 0 ? 'hidden' : '';
      secret.style.filter = pb > 0.98 ? 'blur(5px)' : 'none';
      secret.style.opacity = pb > 0.98 ? '0.85' : '1';
      blurLine.style.background = t > 5.5 ? 'rgb(181 240 122 / 0.14)' : '';
      blurLine.style.borderRadius = '6px';
      const ps = springAt(t, 6.4, springs.bouncy);
      tf(shield, { scale: Math.max(0, Math.min(ps, 1.15)), opacity: clamp(ps * 2) });
      shield.style.visibility = t < 6.4 ? 'hidden' : '';
      void css;
      cap.update(t);
    },
  };
}
