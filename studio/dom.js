// Tiny DOM/SVG builders and per-frame setters for scenes. Scenes build their
// DOM once in mount() and only mutate styles/attributes in update(t).

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan',
  'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'filter', 'feGaussianBlur',
  'feOffset', 'feMerge', 'feMergeNode', 'feColorMatrix', 'marker', 'use', 'symbol', 'pattern', 'foreignObject',
]);

function build(ns, tag, attrs, children) {
  const el = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    }
    else if (k === 'class') el.setAttribute('class', v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'ref') v(el);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// h('div', { class: 'card' }, 'text', h('span', {}, 'child'))
// SVG tags are created in the SVG namespace automatically.
export const h = (tag, attrs, ...children) => build(SVG_TAGS.has(tag) ? SVG_NS : null, tag, attrs, children);

// Set many inline styles at once; numbers become px for the usual length props.
const PX = new Set(['left', 'top', 'right', 'bottom', 'width', 'height', 'fontSize', 'borderRadius', 'gap', 'padding', 'margin', 'letterSpacing']);
export function css(el, styles) {
  for (const [k, v] of Object.entries(styles)) el.style[k] = typeof v === 'number' && PX.has(k) ? `${v}px` : v;
  return el;
}

// transform shorthand: tf(el, { x, y, scale, rotate, opacity, blur })
export function tf(el, { x = 0, y = 0, scale = 1, rotate = 0, opacity, blur } = {}) {
  el.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`;
  if (opacity !== undefined) el.style.opacity = String(opacity);
  if (blur !== undefined) el.style.filter = blur > 0.01 ? `blur(${blur}px)` : 'none';
  return el;
}

// Stroke-draw an SVG path/line/shape: p=0 hidden, p=1 fully drawn.
export function draw(el, p) {
  el.setAttribute('pathLength', '1');
  el.style.strokeDasharray = '1 1';
  el.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, p)));
  return el;
}

// Point at fraction p along an SVG path (for things travelling along a connector).
export function pointAt(pathEl, p) {
  const len = pathEl.getTotalLength();
  const pt = pathEl.getPointAtLength(Math.min(1, Math.max(0, p)) * len);
  return { x: pt.x, y: pt.y };
}

// Split text into per-word (or per-char) spans for staggered reveals.
export function splitText(text, { by = 'word', className = 'tok' } = {}) {
  const parts = by === 'char' ? [...text] : text.split(/(\s+)/);
  return parts.map((s) => (/^\s+$/.test(s) ? document.createTextNode(s) : h('span', { class: className, style: { display: 'inline-block' } }, s)));
}
