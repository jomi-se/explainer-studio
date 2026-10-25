// Harness smoke test: exercises springs, word staggers, SVG connectors, a token
// travelling along a path, a crossfade, a persistent layer and an audio score.

export default {
  title: 'Who let the agent in? — harness demo',
  poster: 2.4, // frame shown under the play overlay in the HTML viewer
  width: 1920,
  height: 1080,
  fps: 30,
  styles: ['/node_modules/@fontsource-variable/inter/index.css', '/node_modules/@fontsource-variable/jetbrains-mono/index.css', '/brands/graphite/theme.css', 'theme.css'],
  scenes: [
    { id: 'title', title: 'The question', duration: 4, module: () => import('./scenes/title.js') },
    { id: 'flow', title: 'Scoped tokens', duration: 7, overlap: 0.6, module: () => import('./scenes/flow.js') },
  ],
  layers: [{ id: 'progress', module: () => import('./scenes/progress.js') }],
  audio: [{ src: 'audio/score.wav', start: 0, gain: 0 }],
};
