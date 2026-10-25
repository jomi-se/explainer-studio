// Cues follow the composition timing, so retiming a scene moves its sounds too.
export default async function score(kit, { scenes, duration }) {
  const at = (id) => scenes.find((s) => s.id === id).start;
  kit.pad(0, duration - 1, ['A2', 'E3', 'C#4', 'E4'], { gain: -24 });
  [0, 1, 2, 3, 4].forEach((i) => kit.tick(0.2 + i * 0.08, { freq: 1400 + i * 120 }));
  kit.whoosh(at('flow') - 0.5, { dur: 0.6 });
  [0, 1, 2].forEach((i) => kit.tick(at('flow') + 0.3 + i * 0.18, { freq: 900 }));
  kit.whoosh(at('flow') + 2.2, { dur: 2, from: 400, to: 2500, gain: -24 });
  kit.grant(at('flow') + 4.2);
}
