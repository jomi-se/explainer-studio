// Who let the agent in? — access & secrets for AI agents (explainer, graphite theme).
// Scene order follows SCRIPT.md. Times are seconds; `overlap` pulls a scene under the previous one.

export default {
  title: 'Who let the agent in?',
  poster: 15.5,
  width: 1920,
  height: 1080,
  fps: 30,
  styles: ['/node_modules/@fontsource-variable/inter/index.css', '/node_modules/@fontsource-variable/jetbrains-mono/index.css', '/brands/graphite/theme.css', 'theme.css'],
  scenes: [
    { id: 'hook', title: 'Who let the agent in?', duration: 19.5, module: () => import('./scenes/hook.js') },
    { id: 'actor', title: 'A new kind of actor', duration: 25, overlap: 0.6, module: () => import('./scenes/actor.js') },
    { id: 'delegate', title: 'Who sent you?', duration: 31, overlap: 0.6, module: () => import('./scenes/delegate.js') },
    { id: 'key', title: 'The valet key', duration: 30, transition: 'cut', module: () => import('./scenes/key.js') },
    { id: 'vault', title: 'Secrets stay home', duration: 24, overlap: 0.6, module: () => import('./scenes/vault.js') },
    { id: 'claw', title: 'In the wild: OpenClaw', duration: 26, overlap: 0.6, module: () => import('./scenes/claw.js') },
    { id: 'ask', title: 'Asking for a secret', duration: 27.6, overlap: 0.6, module: () => import('./scenes/ask.js') },
    { id: 'broker', title: 'The credential broker', duration: 31.4, overlap: 0.6, module: () => import('./scenes/broker.js') },
    { id: 'bw', title: 'In the wild: Bitwarden', duration: 38.6, overlap: 0.6, module: () => import('./scenes/bw.js') },
    { id: 'matrix', title: 'Approve ≠ hide', duration: 18.5, overlap: 0.6, module: () => import('./scenes/matrix.js') },
    { id: 'night', title: '3:12 a.m.', duration: 19, overlap: 0.8, module: () => import('./scenes/night.js') },
    { id: 'confirm', title: 'A fresh yes', duration: 15, overlap: 0.6, module: () => import('./scenes/confirm.js') },
    { id: 'morning', title: 'Who’s keeping score?', duration: 18, overlap: 0.8, module: () => import('./scenes/morning.js') },
    { id: 'recap', title: 'Recap', duration: 14, overlap: 0.6, module: () => import('./scenes/recap.js') },
    { id: 'unsolved', title: 'Still unsolved', duration: 19.6, overlap: 0.6, module: () => import('./scenes/unsolved.js') },
  ],
  layers: [{ id: 'texture', module: () => import('./scenes/texture.js') }],
  audio: [{ src: 'audio/score.wav', start: 0, gain: 0 }],
};
