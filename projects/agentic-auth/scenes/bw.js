// 7 · In the wild: Bitwarden Agent Access — the real topology: agent and laptop both dial OUT to a
// relay; pairing (code carried by you + fingerprint compare, so the relay can't impersonate);
// sealed request through the relay; approval on the laptop against its local vault; then the fork
// that matters: `aac run` (secret → a program's env) vs `--output json` (plaintext → model context).
// Lesson: approving isn't hiding.
// Facts: research/bitwarden-relay.md (topology, pairing, relay threat model), openclaw-bitwarden.md §C1.
import { h, tf, css, draw } from '/studio/dom.js';
import { Agent, Badge, Pill, Wires, wire, place, blinkAt } from '../lib/cast.js';
import { headline, showAt, captions, rich, richWords, wordsAt, interpolate, ease, progress, springAt, springs, clamp } from '../lib/fx.js';
import { icon } from '../lib/icons.js';

const Y = 400; // topology row
const AG = [270, Y];
const RL = [920, Y];
const LAP = [1500, Y + 10];
const A = [760, 755], B = [1380, 755];
// the wires end at the relay box edges
const AG_X = 430, RL_L = 780, RL_R = 1060, LAP_X = 1190;

export function mount(root) {
  root.classList.add('gr-glow');
  const hl = headline(root, { eyebrow: 'In the wild · 2026', text: 'Bitwarden **Agent Access**', cls: 'sm' });

  const agent = Agent({ size: 110, label: false });
  const agentW = place(h('div', { class: 'agent-wrap' }, agent.el, Badge()), AG[0], AG[1]);

  // the relay in the middle: both sides connect out to it
  const relay = h('div', { class: 'relay gr-panel' }, icon('server', { size: 48, width: 1.6 }), h('b', {}, 'relay'), h('span', {}, 'ap.lesspassword.dev'));
  const relayW = place(relay, RL[0], RL[1]);

  // your laptop: `aac listen` next to an unlocked local `bw` vault
  const pair = h('div', { class: 'term-view' },
    h('div', { class: 'tl hi' }, 'vault unlocked · local bw'),
    h('div', { class: 'tl' }, 'code  ', h('b', { class: 'code-hl' }, 'ABC-DEF-GHI')),
    h('div', { class: 'tl' }, 'fingerprint ', h('b', { class: 'code-hl' }, '3f9a1c'), ' ok? ', h('span', { class: 'typed' }, '')));
  const ask = h('div', { class: 'term-view' },
    h('div', { class: 'tl' }, 'Send credential for'),
    h('div', { class: 'tl hi' }, 'shop.example → restock-7f3?'),
    h('div', { class: 'tl keys' }, h('b', {}, '[y]'), ' approve  ', h('b', {}, '[n]'), ' deny'),
    h('div', { class: 'tl keys' }, h('b', {}, '[a]'), ' approve + auto-approve'),
    h('div', { class: 'tl' }, '> ', h('span', { class: 'typed' }, ''), h('i', { class: 'caret' })));
  const term = h('div', { class: 'term term-stack' }, pair, ask);
  const lap = h('div', { class: 'win gr-panel', style: { width: '620px', height: '390px' } },
    h('div', { class: 'win-bar' }, icon('terminal', { size: 26, width: 2 }), h('span', {}, 'your laptop · aac listen')), h('div', { class: 'win-body' }, term));
  const lapW = place(lap, LAP[0], LAP[1]);

  // both connections are opened from the ends toward the relay
  const svg = Wires();
  const wA = wire(svg, `M ${AG_X} ${Y} L ${RL_L} ${Y}`, { cls: 'ok' });
  const wB = wire(svg, `M ${LAP_X} ${Y} L ${RL_R} ${Y}`, { cls: 'ok' });
  const dial = place(h('div', { class: 'tun-lab' }, '↑ both ends dial out to it'), RL[0], Y + 150);

  // pairing: you carry the code across, out of band
  const oob = wire(svg, `M ${LAP[0] - 80} ${LAP[1] + 200} C ${LAP[0] - 300} ${740}, ${AG[0] + 400} ${740}, ${AG[0] + 60} ${AG[1] + 250}`, { cls: 'warm', dash: true });
  const oobLab = place(h('div', { class: 'tun-lab' }, 'you paste it to the agent'), RL[0], 760);
  const codeChip = place(h('div', { class: 'code-chip' }, 'ABC-DEF-GHI'), 0, 0);
  const fp = place(h('div', { class: 'code-chip fp' }, icon('fingerprint', { size: 26, width: 2 }), '3f9a1c'), AG[0], AG[1] + 300);

  // sealed traffic + what the relay can tell
  const sealed = (txt) => h('div', { class: 'req-chip sealed', 'data-lint-ignore': '' }, icon('lock', { size: 24, width: 2.2 }), h('span', {}, txt));
  const req = place(sealed('▒▒▒▒▒▒▒'), 0, 0);
  const cred = place(sealed('▒▒▒▒▒▒▒'), 0, 0);
  const sees = h('div', { class: 'rsees gr-panel' },
    h('div', { class: 'rsees-r' }, icon('eye', { size: 30, width: 1.8 }), h('span', {}, 'sees: who ↔ who, when, size')),
    h('div', { class: 'rsees-r no' }, icon('lock', { size: 30, width: 1.8 }), h('span', {}, 'can’t read what’s inside')));
  const seesW = place(sees, RL[0], 640);
  const demo = place(Pill('default relay: a demo server · self-hostable', 'warm'), RL[0], 790);

  // the fork
  const laneA = wire(svg, `M ${AG[0] + 30} ${AG[1] + 170} C ${AG[0] + 30} ${A[1]}, ${A[0] - 420} ${A[1]}, ${A[0] - 260} ${A[1]}`, { cls: 'ok' });
  const laneB = wire(svg, `M ${AG[0] + 60} ${AG[1] + 170} C ${AG[0] + 200} ${A[1] - 230}, ${B[0] - 500} ${B[1] - 230}, ${B[0] - 260} ${B[1] - 40}`, { cls: 'bad' });
  const boxA = h('div', { class: 'lane ok' },
    h('div', { class: 'lane-h' }, icon('terminal', { size: 32, width: 1.8 }), h('code', {}, 'aac run -- shop-cli')),
    h('div', { class: 'lane-b' }, h('span', { class: 'lane-k' }, 'program env'), h('code', {}, 'AAC_PASSWORD=••••')),
    h('div', { class: 'lane-f' }, icon('eye', { size: 28, width: 1.8 }), 'model sees: nothing'),
    h('div', { class: 'lane-n' }, 'unless the program prints it'));
  const boxB = h('div', { class: 'lane bad' },
    h('div', { class: 'lane-h' }, icon('terminal', { size: 32, width: 1.8 }), h('code', {}, 'aac … --output json')),
    h('div', { class: 'lane-b' }, h('span', { class: 'lane-k' }, 'model context'), h('code', {}, '"password": "Tr4il-run!"')),
    h('div', { class: 'lane-f' }, icon('eye', { size: 28, width: 1.8 }), 'model sees: the password'),
    h('div', { class: 'lane-n' }, 'used by their OpenClaw skill example'));
  const boxAW = place(boxA, A[0], A[1]), boxBW = place(boxB, B[0], B[1]);

  // the lesson
  const { nodes, words } = richWords('**Approving** isn’t **hiding**.');
  const lesson = h('div', { class: 'fill lesson' }, h('h2', { class: 'big gr-headline' }, nodes));

  root.append(svg, relayW, lapW, agentW, dial, oobLab, fp, seesW, demo, boxAW, boxBW, codeChip, req, cred, lesson);
  const cap = captions(root, [
    { at: 2.6, out: 7.4, text: 'No direct line: **both sides dial out** to a relay.' },
    { at: 7.8, out: 12.4, text: 'Pair once: carry a code over, **compare fingerprints**.' },
    { at: 12.6, out: 16.6, text: 'That stops the relay **posing as your laptop**.' },
    { at: 16.8, out: 21.6, text: 'The relay passes **sealed** messages: who and when, not what.' },
    { at: 21.8, out: 26.0, text: 'Your laptop checks its **local vault**. **You approve.**' },
    { at: 26.2, out: 30.4, text: '`aac run`: the secret goes **straight to the program**.' },
    { at: 30.6, out: 35.2, text: '`--output json`: the model ~~reads the password~~.' },
  ]);

  // a sealed chip hops agent → relay (pauses: the relay only routes it) → laptop, or back
  const hop = (el, t, t0, dir) => {
    const [x0, x1] = dir > 0 ? [AG_X, LAP_X] : [LAP_X, AG_X];
    const p1 = ease.inOutCubic(progress(t, t0, 0.8)), p2 = ease.inOutCubic(progress(t, t0 + 1.5, 0.8));
    const x = interpolate(p1 + p2, [0, 1, 2], [x0, RL[0], x1]);
    tf(el, { x, y: Y - 2, scale: 1 + 0.12 * interpolate(t, [t0 + 0.8, t0 + 1.0, t0 + 1.3, t0 + 1.5], [0, 1, 1, 0]), opacity: interpolate(t, [t0 - 0.1, t0 + 0.1, t0 + 2.2, t0 + 2.4], [0, 1, 1, 0]) });
    return interpolate(t, [t0 + 0.7, t0 + 0.9, t0 + 1.4, t0 + 1.7], [0, 1, 1, 0]);
  };

  const LESSON = 35.6;
  return {
    update(t) {
      hl.update(t, 0.2);
      showAt(agentW, t, 0.6, Infinity, { dy: 30, scale0: 0.85 });
      showAt(lapW, t, 1.0, Infinity, { dy: 50, scale0: 0.96 });
      showAt(relayW, t, 1.6, Infinity, { dy: 0, scale0: 0.7, spring: springs.bouncy });
      draw(wA, ease.inOutCubic(progress(t, 2.2, 0.7)));
      draw(wB, ease.inOutCubic(progress(t, 2.5, 0.6)));
      showAt(dial, t, 3.0, 16.6, { dy: 10 });

      // pairing: the code appears, you carry it to the agent, fingerprints compared, y
      const [vA, cLine, fLine] = pair.children;
      showAt(vA, t, 1.4, Infinity, { dx: -10, dy: 0 });
      showAt(cLine, t, 7.8, Infinity, { dx: -10, dy: 0 });
      draw(oob, ease.inOutCubic(progress(t, 8.6, 1.4)));
      oob.style.opacity = String(1 - progress(t, 15.6, 0.6));
      showAt(oobLab, t, 9.0, 16.0, { dy: 10 });
      const pc = ease.inOutCubic(progress(t, 8.6, 1.6));
      const L = oob.getTotalLength(), q = oob.getPointAtLength(L * pc);
      tf(codeChip, { x: q.x, y: q.y, opacity: interpolate(t, [8.5, 8.7, 10.2, 10.5], [0, 1, 1, 0]) });
      showAt(fp, t, 10.6, 16.0, { scale0: 0.6, dy: 0, spring: springs.bouncy });
      showAt(fLine, t, 10.8, Infinity, { dx: -10, dy: 0 });
      pair.querySelector('.typed').textContent = t > 12.2 ? 'y ✓' : '';
      const fpGlow = interpolate(t, [11.2, 11.5, 12.2, 12.6], [0, 1, 1, 0]);
      for (const el of [fp.firstChild, fLine.querySelector('.code-hl')]) el.style.boxShadow = fpGlow > 0.01 ? `0 0 0 ${3 * fpGlow}px color-mix(in srgb, var(--accent) 60%, transparent)` : 'none';

      // sealed request → relay (it only routes) → laptop
      const atRelay1 = hop(req, t, 17.0, 1);
      showAt(seesW, t, 17.8, 25.6, { dy: 20 });
      showAt(demo, t, 19.4, 25.6, { dy: 14 });

      // laptop switches from pairing to the approval prompt
      const sw = ease.inOutCubic(progress(t, 19.4, 0.5));
      pair.style.opacity = String(1 - sw);
      pair.style.visibility = sw > 0.99 ? 'hidden' : '';
      ask.style.visibility = sw < 0.01 ? 'hidden' : '';
      [...ask.children].forEach((ln, i) => showAt(ln, t, 19.6 + i * 0.25, Infinity, { dx: -10, dy: 0 }));
      ask.querySelector('.typed').textContent = t > 22.8 ? 'y' : '';
      ask.querySelector('.caret').style.opacity = t > 20.6 && t < 22.8 && Math.floor(t * 2) % 2 === 0 ? '1' : '0';
      const atRelay2 = hop(cred, t, 23.2, -1);
      const rg = Math.max(atRelay1, atRelay2);
      relay.style.boxShadow = rg > 0.01 ? `0 0 0 ${4 * rg}px color-mix(in srgb, var(--accent-2) 45%, transparent)` : '';

      // the fork
      draw(laneA, ease.inOutCubic(progress(t, 26.2, 0.8)));
      showAt(boxAW, t, 26.8, Infinity, { dy: 30 });
      draw(laneB, ease.inOutCubic(progress(t, 30.6, 0.8)));
      showAt(boxBW, t, 31.2, Infinity, { dy: 30 });

      // lesson: everything recedes, two words land
      const rec = ease.inOutCubic(progress(t, LESSON, 0.6));
      for (const el of [svg, lapW, relayW, agentW, boxAW, boxBW]) el.style.opacity = String(Number(el.style.opacity || 1) * (1 - 0.85 * rec));
      hl.el.style.opacity = String(1 - 0.85 * rec);
      lesson.style.visibility = t < LESSON ? 'hidden' : '';
      wordsAt(words, t, LESSON + 0.3, { each: 0.12, dy: 40, blur: 10 });

      const look = t < 8.4 ? [1, 0] : t < 10.6 ? [0.6, 0.9] : t < 16.8 ? [1, 0.3] : t < 26 ? [1, 0] : t < 30.6 ? [0.4, 1] : [1, 0.9];
      agent.face({ look, blink: blinkAt(t, [2.0, 6.6, 14.2, 20.2, 28.0, 33.4]), alarm: interpolate(t, [31.2, 31.6, 35.4, 35.8], [0, 0.8, 0.8, 0]) });
      cap.update(t);
    },
  };
}
