// How this video was made — a film about explainer-studio, made with explainer-studio.
// Every scene is drawn (no screen recordings), so nothing private can appear on screen.

export default {
  title: 'How this video was made',
  poster: 1.2,
  width: 1920,
  height: 1080,
  fps: 30,
  styles: ['/node_modules/@fontsource-variable/inter/index.css', '/node_modules/@fontsource-variable/jetbrains-mono/index.css', '/brands/graphite/theme.css', 'theme.css'],
  scenes: [
    { id: 'title', title: 'How this video was made', duration: 4.2, module: () => import('./scenes/title.js') },
    { id: 'flipbook', title: 'A video is a flipbook', duration: 8.5, overlap: 0.3, module: () => import('./scenes/flipbook.js') },
    { id: 'browser', title: 'A browser draws each frame', duration: 8.5, overlap: 0.3, module: () => import('./scenes/browser.js') },
    { id: 'seek', title: 'seek(t)', duration: 13.7, overlap: 0.3, module: () => import('./scenes/seek.js') },
    { id: 'render', title: 'Rendering', duration: 11.5, overlap: 0.3, module: () => import('./scenes/render.js') },
    { id: 'motion', title: 'Motion is maths', duration: 10, overlap: 0.3, module: () => import('./scenes/motion.js') },
    { id: 'footage', title: 'Real recordings', duration: 9.3, overlap: 0.3, module: () => import('./scenes/footage.js') },
    { id: 'claude', title: 'How Claude makes one', duration: 14, overlap: 0.3, module: () => import('./scenes/claude.js') },
    { id: 'end', title: 'Recap', duration: 7.5, overlap: 0.3, module: () => import('./scenes/end.js') },
  ],
  layers: [{ id: 'hud', module: () => import('./scenes/hud.js') }],
  audio: [{ src: 'audio/score.wav', start: 0, gain: 0 }],
};
