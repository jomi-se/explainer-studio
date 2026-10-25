// Who draws the frames: a web page (the scene's code) drawn by Chromium. The window chrome fades
// to a dashed outline (headless: no window), then Playwright plugs in as the remote control.
import { h, tf, draw } from '/studio/dom.js';
import { springAt, springs, ease, progress, clamp } from '/studio/motion.js';
import { captions, showAt } from '../lib/fx.js';
import { icon, browserWin } from '../lib/cast.js';

const CODE = [
  ['c', '// scenes/ball.js'],
  ['', '<k>mount</k>(root):'],
  ['', '  ball = h(<n>\'div\'</n>)'],
  ['', '<k>update</k>(t):'],
  ['', '  ball.x = <n>100 + 300 * t</n>'],
];
const fmt = (s) => s.replace(/<(\w)>(.*?)<\/\1>/g, '<span class="$1">$2</span>');

export function mount(root) {
  root.append(h('div', { class: 'bg gr-glow' }));
  const L = h('div', { class: 'bg' });
  root.append(L);

  const code = h('div', { class: 'abs card', style: { left: '150px', top: '210px', width: '700px', height: '430px' } },
    h('div', { class: 'label', style: { position: 'absolute', left: '32px', top: '-56px' } }, 'the scene: code'),
    h('div', { class: 'codebox', html: CODE.map(([c, s]) => (c ? `<span class="c">${s}</span>` : fmt(s))).join('\n') }));
  const win = browserWin({ w: 760, h: 430, url: 'Chromium · 1920×1080' });
  win.el.style.left = '1010px'; win.el.style.top = '210px';
  const winLabel = h('div', { class: 'label', style: { position: 'absolute', left: '1042px', top: '154px' } }, 'the picture: a web page');
  const ball = h('div', { class: 'ball' });
  win.body.append(ball, h('div', { class: 'abs', style: { left: '60px', right: '60px', top: '230px', height: '3px', background: 'var(--line)' } }));
  const arrow = h('svg', { class: 'abs', width: 1920, height: 1080, style: { left: '0', top: '0', overflow: 'visible' } },
    h('path', { d: 'M 870 425 C 920 425 950 425 990 425', fill: 'none', stroke: 'var(--accent-2)', 'stroke-width': 5, 'stroke-linecap': 'round' }),
    h('path', { d: 'M 975 410 L 992 425 L 975 440', fill: 'none', stroke: 'var(--accent-2)', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  const [shaft, head] = arrow.children;
  const headless = h('div', { class: 'abs chip ag', style: { left: '1010px', top: '670px' } }, 'headless: no window');
  const cable = h('svg', { class: 'abs', width: 1920, height: 1080, style: { left: '0', top: '0', overflow: 'visible' } },
    h('path', { d: 'M 1390 795 C 1390 740 1390 700 1390 640', fill: 'none', stroke: 'var(--accent-2)', 'stroke-width': 4, 'stroke-dasharray': '1 1' }));
  const pw = h('div', { class: 'abs chip ag', style: { left: '1236px', top: '780px', fontSize: '32px', padding: '14px 26px' } }, icon('plug', { size: 36, width: 2 }), 'Playwright');
  L.append(code, winLabel, win.el, arrow, headless, cable, pw);

  const cap = captions(L, [
    { at: 0.35, out: 4.45, text: 'Who draws them? A web browser, with no window' },
    { at: 4.45, out: 8.25, text: 'A script drives it: __Playwright__ + headless __Chromium__' },
  ]);

  return {
    update(t) {
      showAt(code, t, 0.2, Infinity, { dx: -40, dy: 0 });
      showAt(win.el, t, 0.55, Infinity, { dx: 40, dy: 0 });
      showAt(winLabel, t, 0.75, Infinity, { dy: 10 });
      draw(shaft, ease.outCubic(progress(t, 0.9, 0.5)));
      head.style.opacity = String(clamp((t - 1.3) / 0.15));
      // the ball obeys the code: x = 100 + 300·t, wrapping every 2 s (in the window's 640 px)
      const tt = t % 2;
      ball.style.left = `${60 + ((100 + 300 * tt - 100) / 600) * 640}px`;
      ball.style.top = '200px';
      // headless: the window's chrome melts away, a dashed outline stays
      const ph = ease.inOutCubic(progress(t, 2.4, 0.6));
      win.el.style.background = `color-mix(in srgb, color-mix(in srgb, var(--gr-slate-100) 70%, var(--bg)) ${Math.round(100 * (1 - ph))}%, transparent)`;
      win.el.style.borderStyle = ph > 0.5 ? 'dashed' : 'solid';
      win.el.firstChild.style.opacity = String(1 - ph);
      showAt(headless, t, 2.8, Infinity, { dy: 12 });
      // Playwright plugs in from below
      const pp = springAt(t, 4.8, springs.snappy);
      tf(pw, { y: (1 - pp) * 80, opacity: clamp(pp * 1.6) });
      draw(cable.firstChild, ease.outCubic(progress(t, 5.1, 0.5)));
      cap.update(t);
    },
  };
}
