import { h, tf, draw, pointAt, css } from '/studio/dom.js';
import { springAt, springs, stagger, interpolate, ease, typewriter, progress } from '/studio/motion.js';

const NODES = [
  { id: 'agent', x: 400, y: 440, title: 'AI agent', sub: 'client_id=bot-7' },
  { id: 'gw', x: 960, y: 440, title: 'Auth server', sub: 'issues tokens' },
  { id: 'api', x: 1520, y: 440, title: 'Vault API', sub: 'scope: read' },
];

export function mount(root) {
  root.classList.add('gr-glow');
  const svg = h('svg', { width: 1920, height: 1080, viewBox: '0 0 1920 1080', style: { position: 'absolute', inset: 0 } });
  const links = [
    h('path', { d: 'M 580 440 L 780 440', stroke: 'var(--line)', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }),
    h('path', { d: 'M 1140 440 L 1340 440', stroke: 'var(--line)', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }),
  ];
  const route = h('path', { d: 'M 400 330 C 600 180, 1320 180, 1520 330', fill: 'none', stroke: 'none' });
  svg.append(...links, route);
  const nodes = NODES.map((n) => css(h('div', { class: 'node gr-panel' }, h('b', {}, n.title), h('span', {}, n.sub)), { left: n.x, top: n.y }));
  const token = h('div', { class: 'token' }, 'JWT');
  const caption = h('div', { class: 'caption' });
  root.append(svg, ...nodes, token, caption);
  const line = 'The agent presents a short-lived, scoped token.';

  return {
    update(t) {
      nodes.forEach((el, i) => {
        const p = springAt(t, stagger(i, 0.18, 0.3), springs.snappy);
        tf(el, { y: (1 - p) * 40, scale: 0.92 + 0.08 * p, opacity: Math.min(1, p * 1.5) });
      });
      links.forEach((l, i) => draw(l, interpolate(t, [0.9 + i * 0.3, 1.5 + i * 0.3], [0, 1], { easing: ease.inOutCubic })));

      const travel = interpolate(t, [2.2, 4.2], [0, 1], { easing: ease.inOutCubic });
      const pt = pointAt(route, travel);
      const pop = springAt(t, 2.0, springs.bouncy);
      tf(token, { x: pt.x, y: pt.y, scale: pop, opacity: Math.min(1, pop) });

      caption.textContent = typewriter(line, progress(t, 2.2, 1.6));
      // highlight the API node when the token lands
      const hit = springAt(t, 4.2, springs.snappy) - springAt(t, 4.9, springs.gentle);
      nodes[2].style.borderColor = hit > 0.05 ? 'var(--accent-2)' : '';
      nodes[2].style.boxShadow = `0 0 ${60 * Math.max(0, hit)}px rgb(47 211 167 / ${0.6 * Math.max(0, hit)})`;
    },
  };
}
