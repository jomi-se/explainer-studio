// 1 · Hook — the errand, the login wall, the tempting shortcut (paste the password),
// the leak, a rewind, and the title.
import { h, tf, css } from '/studio/dom.js';
import { Agent, Bubble, Win, LoginForm, PwChip, Tile, place, blinkAt } from '../lib/cast.js';
import { showAt, enterAt, captions, arc, richWords, wordsAt, interpolate, ease, progress, springAt, springs, clamp } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const REWIND = [13.1, 14.0]; // the story plays backwards in this window
const TITLE = 14.0;

export function mount(root) {
  root.classList.add('gr-glow');
  const world = h('div', { class: 'world' });
  root.append(world);

  // chat thread (left)
  const right = (el, x, y) => css(h('div', { class: 'abs' }, el), { right: 1920 - x, top: y });
  const left = (el, x, y) => css(h('div', { class: 'abs' }, el), { left: x, top: y });
  const b1 = right(Bubble({ who: 'you', text: 'Watch for the restock. Grab one, €120 max.' }), 1010, 150);
  const a1 = left(Bubble({ who: 'agent', text: 'On it.' }), 280, 330);
  const a2 = left(Bubble({ who: 'agent', text: 'The shop wants your password. What is it?' }), 280, 450);
  const chipInBubble = PwChip({ text: '••••••••••' });
  const b2 = right(h('div', { class: 'bubble b-you', style: { display: 'flex', alignItems: 'center', gap: '18px' } }, h('p', {}, 'Sure, it’s'), chipInBubble), 1010, 660);
  const agent = Agent({ size: 112, label: false });
  const agentW = place(agent.el, 180, 410);

  // the shop's login (right)
  const shop = Win({ url: 'shop.example/login', w: 620, h: 560, glyph: null });
  const form = LoginForm({ title: 'Sign in' });
  shop.body.append(h('h2', { class: 'win-title' }, 'Sign in to Shop'), form.el);
  const shopW = place(shop.el, 1480, 470);
  const signed = h('div', { class: 'granted' }, icon('check', { size: 28, width: 2.4 }), 'Signed in');
  const signedW = place(signed, 1480, 800);

  // where the password ends up
  const LEAKS = [
    { glyph: 'chat', title: 'Chat history', x: 345, y: 850 },
    { glyph: 'eye', title: 'Model context', x: 845, y: 850 },
    { glyph: 'terminal', title: 'Debug logs', x: 345, y: 960 },
    { glyph: 'link', title: 'Plugins & tools', x: 845, y: 960 },
  ];
  const tiles = LEAKS.map((l) => ({ ...l, w: place(Tile({ glyph: l.glyph, title: l.title, cls: 'bad fixed' }), l.x, l.y) }));
  const fly = PwChip({ text: '••••••••••' });
  const flyW = place(fly, 0, 0);
  const copies = LEAKS.map(() => place(PwChip({ text: '•••••', cls: 'leak' }), 0, 0));
  const toField = place(PwChip({ text: '••••••••••' }), 0, 0);

  const chat = h('div', { class: 'world' }, b1, a1, a2, b2, agentW);
  world.append(chat, shopW, signedW, ...tiles.map((t) => t.w), ...copies, toField, flyW);
  const cap = captions(world, [{ at: 9.4, out: 13.15, text: 'It worked. And now your password is ~~everywhere~~.' }], { cls: 'top' });

  // title card
  const { nodes, words } = richWords('Who let the __agent__');
  const inWord = h('span', { class: 'tok', style: { display: 'inline-block' } }, 'in?');
  const caret = h('i', { class: 'caret' });
  const field = h('span', { class: 'title-field' }, inWord, caret);
  const title = h('h1', { class: 'big gr-headline' }, nodes, ' ', field);
  const sub = h('p', { class: 'sub' }, 'Every agent ends up at a login screen.');
  const card = h('div', { class: 'fill', style: { display: 'grid', placeContent: 'center', justifyItems: 'center', gap: '36px', textAlign: 'center' } }, title, sub);
  root.append(card);

  const AGENT = [180, 410], BUB = [905, 712], FIELD = [1420, 580];

  function story(t) {
    // the chat starts centred and slides left to make room for the shop
    const shift = 330 * (1 - springAt(t, 3.1, springs.slow));
    chat.style.transform = `translateX(${shift}px)`;
    showAt(b1, t, 0.4, Infinity, { dx: 40, dy: 20 });
    showAt(agentW, t, 1.7, Infinity, { dy: 20, scale0: 0.7 });
    showAt(a1, t, 2.0, Infinity, { dx: -40, dy: 20 });
    const shopIn = showAt(shopW, t, 3.4, Infinity, { dy: 60, scale0: 0.96 });
    form.password.el.querySelector('.caret').style.opacity = t > 4 && t < 9.3 && Math.floor(t * 2) % 2 === 0 ? '1' : '0';
    showAt(a2, t, 4.6, Infinity, { dx: -40, dy: 20 });
    showAt(b2, t, 7.0, Infinity, { dx: 40, dy: 20 });

    // the password: bubble → agent → field, and copies → everywhere
    const launch = 8.4, land = 9.0;
    const pa = ease.inOutCubic(progress(t, launch, land - launch));
    chipInBubble.style.opacity = t < launch ? '1' : '0.15';
    const [fx, fy] = arc(pa, BUB, AGENT, 160);
    tf(flyW, { x: fx, y: fy, scale: 1 - 0.35 * pa, opacity: t >= launch && t < land + 0.05 ? 1 : 0 });
    const gulp = springAt(t, land, springs.bouncy) - springAt(t, land + 0.15, springs.gentle);
    agent.body.style.transform = `scale(${1 + 0.12 * gulp})`;

    const pf = ease.inOutCubic(progress(t, land + 0.1, 0.6));
    const [gx, gy] = arc(pf, AGENT, FIELD, 220);
    tf(toField, { x: gx, y: gy, scale: 0.7, opacity: t > land + 0.1 && t < land + 0.72 ? 1 : 0 });
    form.password.val.textContent = t > land + 0.7 ? '••••••••••' : '';
    showAt(signedW, t, land + 0.85, Infinity, { dy: 20, scale0: 0.8, spring: springs.bouncy });

    // leak: the chat dims, tiles appear, red copies fly out of the agent
    const dim = interpolate(t, [9.5, 10.0], [1, 0.3]);
    for (const el of [b1, a1, a2, b2]) el.style.opacity = String(Math.min(Number(el.style.opacity || 1), dim));
    tiles.forEach((tl, i) => showAt(tl.w, t, 9.9 + i * 0.12, Infinity, { dy: 30 }));
    copies.forEach((c, i) => {
      const s = 10.1 + i * 0.12;
      const p = ease.outCubic(progress(t, s, 0.55));
      const dst = [LEAKS[i].x + 160, LEAKS[i].y];
      const [cx, cy] = arc(p, AGENT, dst, 60);
      tf(c, { x: cx, y: cy, scale: 0.85, opacity: t < s ? 0 : 1 });
    });
    // the agent looks where things happen
    const look = t < 3.4 ? [0.8, -0.6] : t < 6.8 ? [1, 0] : t < 9.4 ? [0.9, 0.6] : [0.6, 0.9];
    agent.face({ look, blink: blinkAt(t, [1.2, 3.9, 6.3, 11.6]) });
    cap.update(t);
    return shopIn;
  }

  return {
    update(t) {
      // rewind: the story runs backwards, fast, smeared
      let st = t, smear = 0;
      if (t >= REWIND[0]) {
        const p = ease.inOutCubic(progress(t, REWIND[0], REWIND[1] - REWIND[0]));
        st = REWIND[0] * (1 - p);
        smear = Math.sin(p * Math.PI);
      }
      story(st);
      // copies & bubbles have their own transforms; smear the whole world on top
      world.style.filter = smear > 0.01 ? `blur(${(smear * 5).toFixed(2)}px)` : 'none';
      world.style.transform = `translateX(${(-smear * 40).toFixed(1)}px)`;
      world.style.opacity = String(t < REWIND[1] - 0.25 ? 1 : 1 - progress(t, REWIND[1] - 0.25, 0.3));
      world.style.visibility = t > REWIND[1] + 0.1 ? 'hidden' : '';

      // title
      card.style.visibility = t < TITLE - 0.05 ? 'hidden' : '';
      wordsAt(words, t, TITLE, { each: 0.09, dy: 50, blur: 12 });
      // "in?" types into a login field, caret blinking
      const fp = springAt(t, TITLE + 0.45, springs.snappy);
      tf(field, { y: (1 - fp) * 50, opacity: clamp(fp * 1.5) });
      inWord.textContent = 'in?'.slice(0, Math.max(0, Math.min(3, Math.floor((t - TITLE - 0.75) / 0.12) + 1)));
      caret.style.opacity = t < TITLE + 0.75 || Math.floor((t - TITLE) * 1.8) % 2 === 0 ? '1' : '0';
      showAt(sub, t, TITLE + 1.0, Infinity, { dy: 24 });
    },
  };
}
