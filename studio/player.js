// Transport for preview (dev) and viewer (exported film) modes. Wall-clock
// playback lives here and only here — scenes never see a clock, they get
// apply()ed exactly like in render mode.
//
// Keys: space play/pause · ←/→ one frame · shift+←/→ one second · 1-9 jump to chapter
//       home/end · L loop current scene · F fullscreen · the URL hash (#t=12.3) tracks the playhead.

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const fmtShort = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function mountPlayer({ viewer, title, poster, stage, width, height, fps, duration, scenes, audio, apply, getTime }) {
  const wrap = document.getElementById('viewport');
  const bar = document.getElementById('transport');
  bar.hidden = false;

  const fit = () => {
    const s = Math.min(wrap.clientWidth / width, wrap.clientHeight / height);
    stage.style.transform = `scale(${s})`;
    stage.style.left = `${(wrap.clientWidth - width * s) / 2}px`;
    stage.style.top = `${(wrap.clientHeight - height * s) / 2}px`;
  };
  new ResizeObserver(fit).observe(wrap);
  fit();

  const scrub = bar.querySelector('#scrub');
  const timeEl = bar.querySelector('#time');
  const playBtn = bar.querySelector('#play');
  const sceneList = bar.querySelector('#scenes');
  scrub.max = String(duration);
  scrub.step = String(1 / fps);

  // Long films group scenes into chapters: when any scene sets `chapter`, the viewer lists only those
  // (each chapter runs until the next one starts). The dev transport always lists every scene.
  const grouped = viewer && scenes.some((s) => s.chapter);
  const chapters = grouped ? scenes.filter((s) => s.chapter).map((s) => ({ ...s, title: s.chapter })) : scenes;
  const chapterBtns = chapters.map((s, i) => {
    const b = document.createElement('button');
    b.textContent = viewer ? s.title : `${i + 1} ${s.id}`;
    b.title = `${fmt(s.start)} – ${fmt(s.start + s.duration)}`;
    b.onclick = () => seek(s.start);
    sceneList.append(b);
    return b;
  });

  // Viewer chrome: big play/replay overlay + fullscreen + auto-hiding controls.
  let overlay = null;
  if (viewer) {
    overlay = document.createElement('button');
    overlay.id = 'overlay';
    overlay.innerHTML = `<span class="ov-play">▶</span><span class="ov-title"></span><span class="ov-meta">${fmtShort(duration)} · ${chapters.length} chapters · space to pause, ←/→ to step</span>`;
    overlay.querySelector('.ov-title').textContent = title;
    overlay.onclick = () => {
      if (!started) seek(0);
      toggle(true);
    };
    document.body.append(overlay);
    const fs = document.createElement('button');
    fs.id = 'fullscreen';
    fs.textContent = '⛶';
    fs.title = 'fullscreen (F)';
    fs.onclick = () => fullscreen();
    bar.append(fs);
    let idle;
    const wake = () => {
      document.body.classList.remove('idle');
      clearTimeout(idle);
      idle = setTimeout(() => playing && document.body.classList.add('idle'), 2500);
    };
    addEventListener('pointermove', wake);
    addEventListener('keydown', wake);
  }
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());

  const tracks = audio.map((a) => Object.assign(new Audio(a.src), { _def: a, preload: 'auto', volume: Math.min(1, 10 ** ((a.gain ?? 0) / 20)) }));
  let playing = false, started = false, loop = null, t0 = 0, wall0 = 0;

  function show(t) {
    apply(t);
    scrub.value = String(t);
    const sc = scenes.findLast((s) => t >= s.start);
    const ch = chapters.findLast((s) => t >= s.start);
    timeEl.textContent = viewer ? `${fmtShort(t)} / ${fmtShort(duration)}` : `${fmt(t)} / ${fmt(duration)}  ·  f${Math.round(t * fps)}  ·  ${sc?.id ?? ''}`;
    chapterBtns.forEach((b, i) => b.classList.toggle('on', chapters[i] === ch));
    history.replaceState(null, '', `#t=${t.toFixed(viewer ? 1 : 3)}`);
  }
  function syncAudio(t) {
    for (const tr of tracks) {
      const local = t - (tr._def.start ?? 0);
      if (!playing || local < 0) { tr.pause(); continue; }
      tr.currentTime = local;
      tr.play().catch(() => {});
    }
  }
  function seek(t) {
    t = Math.max(0, Math.min(duration, t));
    t0 = t; wall0 = performance.now();
    show(t);
    syncAudio(t);
  }
  function tick() {
    if (!playing) return;
    let t = t0 + (performance.now() - wall0) / 1000;
    const range = loop ?? { start: 0, end: duration };
    if (t >= range.end) {
      if (!loop) { show(duration); return toggle(false); }
      seek(range.start);
      t = range.start;
    }
    show(t);
    requestAnimationFrame(tick);
  }
  function toggle(on = !playing) {
    playing = on;
    // Scenes with native media (exported footage clips) pause and resume with the film.
    document.dispatchEvent(new CustomEvent('studio:playstate', { detail: { playing } }));
    playBtn.textContent = playing ? '❚❚' : '▶';
    if (playing && getTime() >= duration) t0 = 0;
    else t0 = getTime();
    wall0 = performance.now();
    syncAudio(t0);
    if (playing) started = true;
    if (overlay) {
      // Only before the first play (poster) and at the end (replay) — a mid-film pause
      // must leave the frame readable.
      const ended = !playing && getTime() >= duration;
      overlay.hidden = playing || (started && !ended);
      overlay.querySelector('.ov-play').textContent = ended ? '↺' : '▶';
      document.body.classList.toggle('idle', false);
    }
    if (playing) requestAnimationFrame(tick);
  }

  playBtn.onclick = () => toggle();
  scrub.oninput = () => seek(Number(scrub.value));
  addEventListener('keydown', (e) => {
    const t = getTime();
    if (e.key === ' ') { e.preventDefault(); if (!started && overlay) seek(0); toggle(); }
    else if (e.key === 'ArrowRight') seek(t + (e.shiftKey ? 1 : 1 / fps));
    else if (e.key === 'ArrowLeft') seek(t - (e.shiftKey ? 1 : 1 / fps));
    else if (e.key === 'Home') seek(0);
    else if (e.key === 'End') seek(duration);
    else if (e.key.toLowerCase() === 'f' && viewer) fullscreen();
    else if (e.key.toLowerCase() === 'l') {
      const sc = scenes.findLast((s) => t >= s.start);
      loop = loop ? null : { start: sc.start, end: sc.start + sc.duration };
      bar.classList.toggle('looping', !!loop);
    } else if (/^[1-9]$/.test(e.key) && chapters[Number(e.key) - 1]) seek(chapters[Number(e.key) - 1].start);
  });

  const m = location.hash.match(/t=([\d.]+)/);
  if (m) { started = true; seek(Number(m[1])); }
  else seek(viewer && poster != null ? poster : 0);
}
