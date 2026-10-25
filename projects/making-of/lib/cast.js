// Recurring cast: line icons, the ball, frame cards and browser windows, used by every scene.
import { h } from '/studio/dom.js';

const ICONS = {
  film: 'M4 4h16v16H4z M8 4v16 M16 4v16 M4 8h4 M4 12h4 M4 16h4 M16 8h4 M16 12h4 M16 16h4',
  browser: 'M3 5h18v14H3z M3 9h18 M6 7h.01 M8.5 7h.01',
  code: 'M8.5 8 4.5 12l4 4 M15.5 8l4 4-4 4 M13.5 6l-3 12',
  plug: 'M9 3v5 M15 3v5 M6 8h12v3a6 6 0 0 1-12 0z M12 17v4',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7',
  file: 'M6 3h8l4 4v14H6z M14 3v4h4',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  scissors: 'M6 7a2.5 2.5 0 1 0 0-.01 M6 17a2.5 2.5 0 1 0 0 .01 M8 8.5 20 18 M8 15.5 20 6',
  terminal: 'M4 5h16v14H4z M7.5 9.5 10 12l-2.5 2.5 M12 15h4.5',
  sparkle: 'M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z',
  play: 'M8 5.5v13l10-6.5z',
  music: 'M9 18V6l10-2v12 M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
};

export function icon(name, { size = 48, width = 1.9 } = {}) {
  return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    h('path', { d: ICONS[name] }));
}

// One picture of the film: a rounded card with its frame number and the ball inside.
// `ballX` is 0→1 across the card.
export function frameCard({ w = 200, h: H = 130, num = '', ballX = 0.5 } = {}) {
  const ball = h('div', { class: 'fball', style: { left: `${18 + ballX * (w - 36)}px`, top: `${H * 0.6}px` } });
  const el = h('div', { class: 'fcard', style: { width: `${w}px`, height: `${H}px` } }, h('div', { class: 'num' }, num), ball);
  return { el, ball, setBall: (x) => (ball.style.left = `${18 + x * (w - 36)}px`), setNum: (n) => (el.firstChild.textContent = n) };
}

// A browser window (blue = automation). headless → dashed outline, no fill.
export function browserWin({ w = 700, h: H = 460, url = '', headless = false } = {}) {
  const urlEl = h('div', { class: 'url' }, url);
  const body = h('div', { class: 'abs', style: { left: '0', top: '58px', right: '0', bottom: '0' } });
  const el = h('div', { class: `abs card browser${headless ? ' headless' : ''}`, style: { width: `${w}px`, height: `${H}px`, overflow: 'hidden' } },
    h('div', { class: 'win-bar' }, h('i'), h('i'), h('i'), urlEl), body);
  return { el, body, urlEl };
}

export const pad = (n, w = 4) => String(n).padStart(w, '0');
