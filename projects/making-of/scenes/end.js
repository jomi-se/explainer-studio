// Recap in three rows and a footer of facts; then the card shrinks into a frame card — it was
// one picture of the flipbook all along — labelled with this film's real last frame number.
import { h, tf } from '/studio/dom.js';
import { springAt, springs, ease, progress, clamp } from '/studio/motion.js';
import { richWords, wordsAt, showAt } from '../lib/fx.js';
import { icon, pad } from '../lib/cast.js';

export function mount(root, { duration, fps }) {
  const total = Math.round(duration * fps);
  root.append(h('div', { class: 'bg gr-glow' }));
  const card = h('div', { class: 'abs', style: { left: '0', top: '0', width: '1920px', height: '1080px', borderRadius: '40px', overflow: 'hidden' } });
  const L = h('div', { class: 'bg gr-glow' });
  card.append(L);
  root.append(card);
  const head = h('div', { class: 'abs gr-pill eyebrow', style: { left: '230px', top: '140px' } }, 'Recap');
  L.append(head);
  const rows = [
    ['film', 'Every frame: a web page at time `t`'],
    ['camera', '`seek`, screenshot, repeat → **MP4**'],
    ['sparkle', '__Claude__ writes it, then **looks** at it'],
  ].map(([ic, text], i) => {
    const { nodes, words } = richWords(text);
    const badge = h('div', { class: 'badge', style: { color: i === 2 ? 'var(--accent-2)' : 'var(--accent)' } }, icon(ic, { size: 52, width: 2 }));
    const el = h('div', { class: 'abs row', style: { left: '230px', top: `${250 + i * 175}px` } }, badge, h('p', { class: 'h2', style: { fontSize: '62px' } }, nodes));
    L.append(el);
    return { el, badge, words, at: 0.25 + i * 0.6 };
  });
  const foot = h('p', { class: 'abs sub', style: { left: '230px', top: '820px', fontSize: '36px' } },
    h('span', { class: 'mono em' }, 'explainer-studio'), ' · 5 dependencies · ~34 KB engine · no animation library');
  L.append(foot);
  const outline = h('div', { class: 'abs', style: { inset: '0', borderRadius: '40px', border: '6px solid var(--accent-2)' } });
  card.append(outline);
  const label = h('div', { class: 'anchor', style: { left: '960px', top: '860px', display: 'flex', alignItems: 'baseline', gap: '18px' } },
    h('span', { class: 'mono', style: { fontSize: '64px', fontWeight: '500', color: 'var(--accent)' } }, `frame ${pad(total)}`),
    h('span', { class: 'sub' }, 'the last picture. That’s a wrap.'));
  root.append(label);

  return {
    update(t) {
      showAt(head, t, 0.05, Infinity, { dy: 12 });
      for (const r of rows) {
        const p = springAt(t, r.at, springs.bouncy);
        tf(r.badge, { scale: Math.max(0, Math.min(p, 1.12)), rotate: (1 - Math.min(p, 1)) * -30 });
        r.badge.style.visibility = t < r.at ? 'hidden' : '';
        wordsAt(r.words, t, r.at + 0.1, { each: 0.05, dy: 24 });
      }
      showAt(foot, t, 2.2, Infinity, { dy: 12 });
      // the card shrinks into a frame of the flipbook
      const ps = ease.inOutCubic(progress(t, 4.9, 0.9));
      card.style.transform = `translate(${-ps * 0}px, ${-ps * 150}px) scale(${1 - 0.55 * ps})`;
      card.style.transformOrigin = '960px 540px';
      outline.style.opacity = String(ps);
      card.toggleAttribute('data-lint-ignore', ps > 0);
      showAt(label, t, 5.7, Infinity, { dy: 16 });
    },
  };
}
