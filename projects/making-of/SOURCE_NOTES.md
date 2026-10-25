# Source notes — making-of

The source is this repository itself (2026-10-14; the footage numbers come from a real edit list of another film) and the explanations Claude gave the
user on 2026-10-09 (transcript: "A video is a flipbook…" and the repo overview). Every claim below was
checked against the files named.

## Claims shown on screen
| Claim | Where it's true |
|---|---|
| A video is a series of still frames; our films are 30 fps | every `composition.js` (`fps: 30`) |
| Each frame is a web page drawn by headless Chromium, driven by Playwright | `scripts/lib.mjs` (`launch`), `package.json` |
| `seek(t)` sets the page to exactly time `t` | `studio/runtime.js` (`window.__studio.seek`) |
| Scenes set absolute state from `t`; no clocks, no `Math.random`, no CSS animation | `CLAUDE.md` → Determinism; `studio/base.css` |
| Render = seek, screenshot, pipe to ffmpeg; 4 workers split the frames | `scripts/render.mjs` (header, `per = ceil(total / workers)`) |
| `lint --determinism` seeks in shuffled order and compares | `scripts/lint.mjs` |
| No animation library; springs/easing are closed-form maths in `motion.js` | `studio/motion.js` (`spring`, `springAt`) |
| Engine (`studio/`) is ~34 KB | `wc -c studio/*` = 33,926 bytes |
| 5 dev dependencies | `package.json` devDependencies |
| Music and SFX are synthesised in the browser's offline audio engine | `scripts/audio.mjs`, `studio/sound.js` |
| Screen recordings are cut by an edit list `[from, to, speed]` with blurs burned in | `scripts/footage.mjs` |
| Claude's gates each leave a file: SOURCE_NOTES, BRIEF, SCRIPT, scenes, REVIEW, audio.js | `CLAUDE.md` → Workflow gates |
| Claude checks its work by reading still images (contact sheets) | `CLAUDE.md` → "You can see your work" |

## Out of scope
- Comparisons with Remotion/GSAP (mentioned in the explanation, not needed here).
- Any real recording: the footage scene is drawn, so no secret or account ID can appear.

## Likely misconceptions
- "An AI generated the pixels" — no, it writes code that draws them.
- "It records the screen while the animation plays" — no, every frame is set up exactly and photographed.
