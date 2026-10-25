// Composition runtime: mounts a composition's scenes into a fixed-size stage and
// exposes a deterministic seek(t) on window.__studio. Modes:
//   preview: stage scaled to the window + dev transport (studio/index.html?project=<p>)
//   render:  bare stage at native size, driven by the scripts (…&render)
//   viewer:  the exported single-file film (scripts/export.mjs) — play overlay, chapters, fullscreen
// Entry points: studio/main.js (dev, loads the composition by URL) and the bundle
// scripts/export.mjs generates (composition imported statically).

import { clamp } from './motion.js';
import { mountPlayer } from './player.js';

const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.error?.stack ?? e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason?.stack ?? e.reason)));

export function fail(msg) {
  errors.push(msg);
  document.body.append(Object.assign(document.createElement('pre'), { className: 'fatal', textContent: msg }));
  throw new Error(msg);
}

// comp: the composition object · project: its name · mode: see above
// resolve(path): URL for a project-relative path (assets, audio, styles)
// inlineStyles: true when the bundle already carries comp.styles
export function boot(opts) {
  document.documentElement.dataset.mode = opts.mode;
  window.__studioReady = load(opts).catch((e) => {
    errors.push(String(e.stack ?? e));
    throw e;
  });
  return window.__studioReady;
}

// Mounts a composition's scenes and layers into `stage` and returns apply(t), which sets every pixel for time t.
// Used by boot() below and by companion sites that drive a film themselves (sites/*).
export async function mountComposition({ comp, project: projectName, stage, resolve, inlineStyles = false }) {
  const { width = 1920, height = 1080, fps = 30, background = 'var(--bg)' } = comp;

  for (const href of inlineStyles ? [] : comp.styles ?? []) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = resolve(href);
    document.head.append(link);
    await new Promise((res) => ((link.onload = res), (link.onerror = res)));
  }

  Object.assign(stage.style, { width: `${width}px`, height: `${height}px`, background });

  // Lay scenes end to end; `overlap` pulls a scene earlier so it overlaps the previous one.
  let cursor = 0;
  const scenes = [];
  for (const [i, def] of comp.scenes.entries()) {
    const overlap = i === 0 ? 0 : def.overlap ?? 0;
    const start = cursor - overlap;
    const mod = await def.module();
    const el = document.createElement('div');
    el.className = 'scene';
    el.dataset.scene = def.id;
    el.style.zIndex = String(10 + i);
    stage.append(el);
    scenes.push({ ...def, index: i, start, overlap, el, mod, inst: null });
    cursor = start + def.duration;
  }
  const duration = cursor;
  for (const s of scenes) s.exitOverlap = scenes[s.index + 1]?.overlap ?? 0;

  const layers = [];
  for (const [i, def] of (comp.layers ?? []).entries()) {
    const mod = await def.module();
    const el = document.createElement('div');
    el.className = 'scene layer';
    el.dataset.layer = def.id;
    // `under: true` puts the layer below every scene (a persistent backdrop the scenes draw over).
    el.style.zIndex = String(def.under ? 1 + i : 1000 + i);
    stage.append(el);
    layers.push({ ...def, el, mod, inst: null, start: def.start ?? 0, duration: def.duration ?? duration });
  }

  const baseCtx = { width, height, fps, duration, project: projectName, asset: resolve, scenes: scenes.map(({ id, title, chapter, start, duration: d }) => ({ id, title: title ?? id, chapter, start, duration: d })) };
  for (const s of [...scenes, ...layers]) {
    s.inst = (await s.mod.mount(s.el, { ...baseCtx, sceneDuration: s.duration, props: s.props ?? {} })) ?? {};
  }

  // Wait for everything that could change pixels after the first paint.
  await document.fonts.ready;
  await Promise.all([...stage.querySelectorAll('img')].map((img) => img.decode().catch(() => errors.push(`image failed: ${img.src}`))));

  let current = 0;
  function apply(t) {
    current = clamp(t, 0, duration);
    const T = current;
    for (const s of scenes) {
      const local = T - s.start;
      const isLast = s.index === scenes.length - 1;
      const active = local >= 0 && (local < s.duration || (isLast && local <= s.duration));
      s.el.style.display = active ? '' : 'none';
      if (!active) continue;
      const enter = s.overlap > 0 ? clamp(local / s.overlap) : 1;
      const exit = s.exitOverlap > 0 ? clamp((local - (s.duration - s.exitOverlap)) / s.exitOverlap) : 0;
      // Runtime-owned transitions; 'none' means the scene animates itself using ctx.enter/exit.
      const tr = s.transition ?? (s.overlap > 0 ? 'fade' : 'cut');
      if (tr === 'fade') s.el.style.opacity = String(enter);
      s.inst.update?.(local, { ...baseCtx, t: local, T, sceneDuration: s.duration, p: clamp(local / s.duration), enter, exit, frame: Math.round(T * fps) });
    }
    for (const l of layers) {
      const local = T - l.start;
      const active = local >= 0 && local <= l.duration;
      l.el.style.display = active ? '' : 'none';
      if (active) l.inst.update?.(local, { ...baseCtx, t: local, T, sceneDuration: l.duration, p: clamp(local / l.duration), frame: Math.round(T * fps), sceneAt: (x) => scenes.findLast((s) => x >= s.start) });
    }
  }

  const meta = { project: projectName, title: comp.title ?? projectName, width, height, fps, duration, capture: comp.capture, scenes: baseCtx.scenes, audio: (comp.audio ?? []).map((a) => ({ ...a, src: resolve(a.src), path: `projects/${projectName}/${a.src}` })) };
  return { apply, meta, getTime: () => current };
}

async function load({ comp, project: projectName, mode, resolve, inlineStyles = false }) {
  const stage = document.getElementById('stage');
  const { apply, meta, getTime } = await mountComposition({ comp, project: projectName, stage, resolve, inlineStyles });
  const { width, height, fps, duration } = meta;

  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  window.__studio = {
    meta,
    errors,
    async seek(t) {
      // Chromium reuses raster/compositing state between frames (composited layers,
      // skipped invalidation for sub-pixel moves), which makes pixels depend on the
      // previous frame. Dropping the stage out of rendering and back forces a
      // from-scratch paint, so a frame looks the same whatever was seeked before.
      stage.style.display = 'none';
      await nextFrame();
      stage.style.display = '';
      apply(t);
      // Footage scenes swap <img> sources per frame: wait until every image is decoded
      // so a capture never shows a stale or blank frame.
      await Promise.all([...stage.querySelectorAll('img')].filter((img) => img.offsetParent && !img.complete).map((img) => img.decode().catch(() => {})));
      await nextFrame();
      return getTime();
    },
    get time() {
      return getTime();
    },
  };

  apply(0);
  if (mode !== 'render') mountPlayer({ viewer: mode === 'viewer', title: meta.title, poster: comp.poster, stage, width, height, fps, duration, scenes: meta.scenes, audio: meta.audio, apply, getTime });
  return window.__studio;
}
