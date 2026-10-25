// 5 · Secrets stay home — password-only sites: the agent asks the vault; the vault checks with
// you (passkey); the vault fills the field itself along a path that never touches the agent.
// Callback: the hook's four leak tiles come back clean.
import { h, tf, css, draw } from '/studio/dom.js';
import { Agent, Badge, Win, LoginForm, PwChip, Vault, Passkey, Tile, Wires, wire, place, blinkAt } from '../lib/cast.js';
import { headline, showAt, captions, arc, arcPath, interpolate, ease, progress, springAt, springs, clamp, stagger } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const AG = [300, 560];
const SHOP = [1420, 500];
const VAULT = [760, 800];
const FIELD = [1420, 609];

export function mount(root) {
  root.classList.add('gr-glow');
  const hl = headline(root, { eyebrow: 'Secrets stay home', text: 'Some doors still only take a **password**.', cls: 'sm' });

  const agent = Agent({ size: 120, label: false });
  const agentW = place(h('div', { class: 'agent-wrap' }, agent.el, Badge()), AG[0], AG[1]);
  const shop = Win({ url: 'shop.example/login', w: 600, h: 560, glyph: null });
  const form = LoginForm({ title: 'Sign in' });
  shop.body.append(h('h2', { class: 'win-title' }, 'Sign in to Shop'), form.el);
  const shopW = place(shop.el, SHOP[0], SHOP[1]);
  const vault = Vault({ size: 170 });
  const vaultW = place(vault.el, VAULT[0], VAULT[1]);
  const pk = Passkey({ size: 120, label: false });
  const pkW = place(pk.el, VAULT[0] + 210, VAULT[1] - 20);

  const svg = Wires();
  const ask = wire(svg, `M ${AG[0] + 60} ${AG[1] + 160} C ${AG[0] + 120} ${VAULT[1] - 20}, ${VAULT[0] - 260} ${VAULT[1] - 20}, ${VAULT[0] - 110} ${VAULT[1] - 20}`, { cls: 'ag' });
  const fillPath = wire(svg, `M ${VAULT[0] + 40} ${VAULT[1] - 110} C ${VAULT[0] + 200} ${VAULT[1] - 380}, ${FIELD[0] - 420} ${FIELD[1] + 60}, ${FIELD[0] - 160} ${FIELD[1]}`, { cls: 'ok dash' });
  const reply = wire(svg, `M ${SHOP[0] - 310} ${SHOP[1] - 140} L ${AG[0] + 110} ${AG[1] - 60}`, { cls: 'ok' });
  const askChip = h('div', { class: 'req-chip' }, icon('arrow', { size: 26, width: 2 }), 'sign in to shop.example');
  const askW = place(askChip, 0, 0);
  const pw = place(PwChip({ text: '••••••••••' }), 0, 0);
  const signed = h('div', { class: 'granted' }, icon('check', { size: 26, width: 2.4 }), 'signed in');
  const signedW = place(signed, SHOP[0], SHOP[1] + 320);
  const sees = place(h('div', { class: 'sees' }, h('span', {}, 'agent sees:'), h('b', {}, '✓ signed in')), AG[0], AG[1] - 190);

  // callback to the hook: the same four places, now clean
  const LEAKS = [['chat', 'Chat history'], ['eye', 'Model context'], ['terminal', 'Debug logs'], ['link', 'Plugins & tools']];
  const tiles = LEAKS.map(([g, title], i) => {
    const el = Tile({ glyph: g, title, cls: 'ok fixed' });
    el.append(h('div', { class: 'tile-ok' }, icon('check', { size: 30, width: 2.4 })));
    return place(el, 700 + (i % 2) * 520, 560 + Math.floor(i / 2) * 124);
  });

  root.append(svg, shopW, vaultW, pkW, agentW, askW, pw, signedW, sees, ...tiles);
  const cap = captions(root, [
    { at: 3.4, out: 8.8, text: 'The agent asks your vault to sign in. It never gets the password.' },
    { at: 9.0, out: 12.6, text: 'Your vault checks with **you** first.' },
    { at: 12.8, out: 18.0, text: 'The vault fills the field itself. The agent only learns: **signed in**.' },
    { at: 18.4, out: 23.4, text: 'Nothing in the chat. Nothing in the model. **Nothing to leak.**' },
  ]);

  return {
    update(t) {
      hl.update(t, 0.2);
      showAt(agentW, t, 0.6, Infinity, { dy: 30, scale0: 0.85 });
      showAt(shopW, t, 1.0, Infinity, { dy: 50, scale0: 0.96 });
      showAt(vaultW, t, 3.0, Infinity, { dy: 40, scale0: 0.8, spring: springs.bouncy });
      form.password.el.querySelector('.caret').style.opacity = t > 1.5 && t < 15.2 && Math.floor(t * 2) % 2 === 0 ? '1' : '0';

      // the ask
      draw(ask, ease.inOutCubic(progress(t, 3.6, 0.9)));
      const pa = ease.inOutCubic(progress(t, 3.8, 1.2));
      const pathEl = ask;
      const L = pathEl.getTotalLength();
      const pt = pathEl.getPointAtLength(L * pa);
      tf(askW, { x: pt.x + 40, y: pt.y - 50, opacity: interpolate(t, [3.8, 4.0, 7.6, 8.0], [0, 1, 1, 0]) });

      // vault checks with you
      showAt(pkW, t, 8.9, 18.2, { dy: 20, scale0: 0.7 });
      pk.set(ease.inOutCubic(progress(t, 9.6, 1.3)), clamp(springAt(t, 11.0, springs.snappy)));
      const unlock = springAt(t, 11.2, springs.bouncy);
      vault.dial.style.transform = `rotate(${unlock * 90}deg)`;

      // the vault fills the field directly
      draw(fillPath, ease.inOutCubic(progress(t, 12.6, 0.8)));
      const pf = ease.inOutCubic(progress(t, 13.2, 1.6));
      const L2 = fillPath.getTotalLength();
      const q = fillPath.getPointAtLength(L2 * pf);
      tf(pw, { x: q.x, y: q.y, scale: 0.9, opacity: t > 13.1 && t < 14.9 ? 1 : 0 });
      form.password.val.textContent = t > 14.8 ? '••••••••••' : '';
      const fieldGlow = interpolate(t, [14.8, 15.0, 16.0], [0, 1, 0]);
      form.password.el.querySelector('.field-box').style.borderColor = fieldGlow > 0.02 ? 'var(--accent)' : '';
      showAt(signedW, t, 15.3, Infinity, { dy: 14, scale0: 0.8 });

      // only the outcome goes back to the agent
      draw(reply, ease.inOutCubic(progress(t, 15.8, 0.6)));
      showAt(sees, t, 16.3, Infinity, { dy: 14, scale0: 0.9 });

      // callback: the hook's leak sites, now clean
      // everything else steps back so the callback is the one focal point
      const fade = 1 - ease.inOutCubic(progress(t, 18.0, 0.6));
      for (const el of [vaultW, svg, pkW, shopW, signedW, sees, agentW]) el.style.opacity = String(Number(el.style.opacity || 1) * (0.12 + 0.88 * fade));
      hl.el.style.opacity = String(0.35 + 0.65 * fade);
      tiles.forEach((el, i) => showAt(el, t, stagger(i, 0.15, 18.6), Infinity, { dy: 30 }));

      agent.face({ look: t < 3.6 ? [1, 0] : t < 12.5 ? [0.6, 0.9] : t < 16 ? [1, 0.2] : [0.3, 0.9], blink: blinkAt(t, [2.2, 7.1, 12.0, 17.2, 21.4]) });
      cap.update(t);
    },
  };
}
