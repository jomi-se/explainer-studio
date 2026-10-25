// Rendering: browsers seek and screenshot, frames fly into ffmpeg, an MP4 comes out. Lane 1 starts
// alone (seek → screenshot → repeat); lanes 2–4 join, each with its own quarter of this film's
// real frame numbers; ffmpeg packs them into the file.
import { h, tf } from '/studio/dom.js';
import { springAt, springs, ease, progress, clamp } from '/studio/motion.js';
import { captions, showAt } from '../lib/fx.js';
import { icon, frameCard, pad } from '../lib/cast.js';

const LANES = [270, 410, 550, 690];
const SRC_X = 330, FF_X = 1290, TRAVEL = 1.5, EVERY = 0.3;

export function mount(root, { duration, fps }) {
  const total = Math.round(duration * fps);
  const per = Math.ceil(total / 4);
  root.append(h('div', { class: 'bg gr-glow' }));
  const L = h('div', { class: 'bg' });
  root.append(L);

  const lanes = LANES.map((y, w) => {
    const badge = h('div', { class: 'anchor badge', style: { left: '230px', top: `${y}px`, color: 'var(--accent-2)', width: '96px', height: '96px' } }, icon('browser', { size: 54, width: 1.8 }));
    const flash = h('div', { class: 'anchor', style: { left: '230px', top: `${y}px`, width: '96px', height: '96px', borderRadius: '24px', background: 'var(--ink)' } });
    const rail = h('div', { class: 'abs', style: { left: `${SRC_X}px`, width: `${FF_X - SRC_X - 90}px`, top: `${y}px`, height: '2px', background: 'color-mix(in srgb, var(--line) 60%, transparent)' } });
    const range = h('div', { class: 'abs label', style: { left: `${SRC_X}px`, top: `${y - 66}px`, color: 'var(--ink-3)' } }, `frames ${pad(w * per + 1)}–${pad(Math.min(total, (w + 1) * per))}`);
    const cards = Array.from({ length: 6 }, () => {
      const c = frameCard({ w: 110, h: 74, num: '' });
      c.el.style.left = '0px'; c.el.style.top = `${y - 37}px`;
      c.el.querySelector('.num').style.left = '10px';
      c.ball.style.width = c.ball.style.height = '20px'; c.ball.style.margin = '-10px 0 0 -10px';
      return c;
    });
    L.append(rail, range, ...cards.map((c) => c.el), flash, badge);
    return { y, w, badge, flash, rail, range, cards, start: w === 0 ? 0.9 : 4.0 + w * 0.15 };
  });
  const step = h('div', { class: 'abs chip ag', style: { left: '150px', top: '130px', minWidth: '320px', justifyContent: 'center' } }, '');

  const ff = h('div', { class: 'abs card', style: { left: `${FF_X - 90}px`, top: '200px', width: '200px', height: '560px', display: 'grid', placeItems: 'center', borderColor: 'var(--accent-2)' } },
    h('div', { class: 'mono', style: { fontSize: '36px', color: 'var(--accent-2)', writingMode: 'vertical-rl', letterSpacing: '0.2em' } }, 'ffmpeg'));
  const out = h('div', { class: 'anchor file', style: { left: '1640px', top: '480px', fontSize: '40px', padding: '22px 30px', borderColor: 'var(--accent)', color: 'var(--accent)' } },
    icon('film', { size: 46 }), 'film.mp4');
  const outArrow = h('div', { class: 'abs', style: { left: `${FF_X + 120}px`, top: '479px', width: '80px', height: '3px', background: 'var(--accent)' } });
  L.append(step, ff, outArrow, out);

  const cap = captions(L, [
    { at: 0.3, out: 3.8, text: 'Rendering: **seek, screenshot, repeat**' },
    { at: 3.8, out: 8.2, text: '4 browsers split the frames. None needs the one before.' },
    { at: 8.2, out: 11.3, text: '__ffmpeg__ packs them into an **MP4**' },
  ]);

  return {
    update(t) {
      showAt(ff, t, 0.5, Infinity, { dx: 30, dy: 0 });
      showAt(step, t, 0.9, 3.9, { dy: 10 });
      // lane 1 narrates its loop: one shot every EVERY seconds
      const k1 = Math.max(0, Math.floor((t - 0.9) / EVERY));
      const ph = ((t - 0.9) % EVERY) / EVERY;
      step.textContent = ph < 0.4 ? `seek(${k1 + 1} / 30)` : ph < 0.7 ? `screenshot #${k1 + 1}` : 'next frame';

      for (const ln of lanes) {
        const pin = showAt(ln.badge, t, ln.start - 0.3, Infinity, { dx: -30, dy: 0 }).o;
        ln.rail.style.opacity = String(pin);
        showAt(ln.range, t, ln.start - 0.1, Infinity, { dy: 8 });
        // shutter flash at each shot
        const since = t - ln.start;
        const fphase = since >= 0 ? (since % EVERY) / EVERY : 1;
        ln.flash.style.opacity = String(since >= 0 && fphase > 0.4 && fphase < 0.6 ? 0.3 * (1 - Math.abs(fphase - 0.5) / 0.1) : 0);
        // up to 6 frames in flight; shot j leaves at ln.start + j*EVERY and reaches ffmpeg TRAVEL later
        const jNow = Math.floor(since / EVERY);
        ln.cards.forEach((c, slot) => {
          // the slot shows the most recent shot j with j % 6 === slot
          const j = jNow - ((jNow - slot) % 6 + 6) % 6;
          const age = t - (ln.start + j * EVERY);
          const vis = since >= 0 && j >= 0 && age >= 0 && age < TRAVEL;
          c.el.style.visibility = vis ? '' : 'hidden';
          if (!vis) return;
          const p = age / TRAVEL;
          const x = SRC_X - 40 + p * (FF_X - SRC_X - 60);
          c.setNum(pad(ln.w * per + j + 1));
          c.setBall(((ln.w * per + j) % 30) / 29);
          tf(c.el, { x, opacity: clamp(age / 0.12) * (1 - clamp((p - 0.9) / 0.1)) });
        });
      }
      // ffmpeg glows as it packs, the file pops out
      const po = springAt(t, 8.4, springs.bouncy);
      tf(out, { scale: Math.max(0, Math.min(po, 1.12)), opacity: clamp(po * 2) });
      out.style.visibility = t < 8.4 ? 'hidden' : '';
      outArrow.style.opacity = String(clamp((t - 8.3) / 0.2));
      outArrow.style.transformOrigin = '0 50%';
      outArrow.style.transform = `scaleX(${ease.outCubic(progress(t, 8.2, 0.3))})`;
      cap.update(t);
    },
  };
}
