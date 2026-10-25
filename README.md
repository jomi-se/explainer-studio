# Explainer Studio

Explainer films written as code, made to be driven by Claude Code.

Each scene is an HTML/SVG module whose every pixel is a pure function of time. The scripts open the
film in headless Chromium and give you:

- **a single self-contained HTML file** that plays the film live in the browser (vector-sharp at any
  size, chapters, pause/step, fullscreen). This is the easiest way to share a film.
- **a 1080p MP4** (frames captured one by one, encoded with ffmpeg, with the generated score mixed in).

Nothing is downloaded at runtime: fonts come from npm and illustrations are hand-written SVG. The
music and sound effects are **synthesized** from a cue sheet (`projects/<p>/audio.js`), not recorded.

`projects/agentic-auth` is a complete example: *Who let the agent in?*, a 5:49 explainer on how AI
agents get access to your accounts. `projects/making-of` is a short film about how the studio works, made with it.

## Setup

You need Node 22 or newer. [mise](https://mise.jdx.dev) is optional: `mise.toml` pins Node and keeps
Playwright's browser in `./.playwright`.

```sh
mise trust && mise install        # optional
npm ci                            # playwright, ffmpeg-static, esbuild, fonts
npx playwright install chromium   # headless Chromium for this OS and CPU
node scripts/selftest.mjs         # motion-math checks
```

**Install on the machine that runs the scripts.** `node_modules/` and the browser are platform-specific:
`ffmpeg-static` fetches an ffmpeg binary for your OS and CPU at install time, and Playwright does the
same for Chromium. A macOS checkout and a Linux dev container each need their own `npm ci` and
`playwright install`. Never copy `node_modules/` between them. Both are gitignored.

## Watch the example

**[Who let the agent in?](https://jomi-se.github.io/explainer-studio/)** plays in your browser. It is
the agentic-auth film, exported to [`docs/index.html`](docs/index.html) and served by GitHub Pages.

To build it yourself:

```sh
node scripts/export.mjs agentic-auth    # → out/agentic-auth/agentic-auth.html (~10 MB)
open out/agentic-auth/agentic-auth.html
```

The export takes about a minute, most of it spent generating the score on the first run. The HTML
plays smoothly on a recent MacBook and is the version to share.

For an MP4, run `node scripts/render.mjs agentic-auth`, which writes `out/agentic-auth/agentic-auth.mp4`.
This one is slow: every frame is repainted from scratch in software, and the film-grain layer is
expensive. It took about 45 minutes with 4 workers in a Linux container. Add `--draft` for a half-res
preview at roughly real time.

To scrub through a film while working on it:

```sh
node scripts/serve.mjs     # then open http://localhost:4173/studio/index.html?project=agentic-auth
```

Space plays and pauses. ←/→ step one frame (hold Shift for one second), 1–9 jump to a scene, and L loops the current scene.

## Making a film with Claude Code

`CLAUDE.md` holds the house rules: the scene contract, the visual and motion rules, the workflow gates
and the critique loop. Claude Code reads it automatically.

1. **Start a project.** Copy the template with `cp -r projects/_template projects/my-film`, and put your
   source material (a doc, notes, links) in `projects/my-film/research/`.
2. **Ask Claude for the film.** Tell it who the audience is, what they should remember, a target length
   and a theme (`brands/graphite` or none). Then let it work through the gates:

   | Gate | What Claude writes |
   |---|---|
   | Source digest | `SOURCE_NOTES.md`, with every on-screen claim traced to a source |
   | Brief | `BRIEF.md`: audience, three takeaways, tone, cast, palette |
   | Script | `SCRIPT.md`: each beat's exact on-screen text, visual and duration |
   | Storyboard → animatic → full pass → polish | `scenes/*.js`, checked with contact sheets and lint, scored in `REVIEW.md` |
   | Audio | `audio.js`: cues tied to scene timing |
   | Final | Determinism lint, MP4 and HTML export |

3. **Let it run unattended if you like.** The rules tell Claude never to block on a question. It records
   each call in `DECISIONS.md`, flags what you should confirm at the top, logs every round in
   `PROGRESS.md` and commits after each gate. The agentic-auth project shows what that looks like after a
   real overnight run plus one round of review.
4. **Review.** Read the contact sheets (`out/<p>/stills/`), scrub in the preview server, then reply with
   notes. Fixing the script or storyboard is much cheaper than fixing finished motion, so review early.

Facts are checked against sources on the web. Claude does not install packages on its own: if a film
needs a new dependency, it notes it in `DECISIONS.md` for you to install.

## Commands

All scripts are run as `node scripts/<name>.mjs <project> …`, or through `npm run <name> -- <project> …`.

| Script | What it does |
|---|---|
| `serve` | Preview server on port 4173 |
| `stills` | Three frames per scene plus contact sheets, written to `out/<p>/stills/`. `--scene <id> --every 0.2` gives a film strip of one scene |
| `lint` | Checks the safe area, minimum text size (28px), overflow, overlaps and page errors. `--determinism` also checks that seeking in any order gives the same frames |
| `audio` | Synthesizes `projects/<p>/audio/score.wav` from `audio.js` |
| `footage` | Cuts a screen recording into film-time frames from the edit list in `projects/<p>/footage.js` (speed ramps, HDR tone-mapping, privacy blurs burned in). Output is gitignored |
| `render` | Writes the MP4. `--draft` gives half-res and fast |
| `export` | Writes the single-file HTML film |
| `selftest` | Runs unit checks on `studio/motion.js` |
| `check` | Static checks with no browser: syntax, formatting (no tabs, trailing spaces or CRLF, final newline) and the scene determinism rules (no `Math.random`, clocks, timers or CSS animations under `projects/`) |

`score.wav` is not committed. `render` and `export` regenerate it whenever it is missing or older than
any `.js` file in the project (scores read cue times from scenes and libs) or `studio/sound.js`. Synthesis is seeded, so a regenerated score sounds the
same: renders differ by at most one bit (−90 dBFS) from floating-point rounding.

## Layout

```
CLAUDE.md    house rules for Claude: scene contract, design and motion rules, workflow gates
brands/      themes and usage rules (graphite: palette, type, do and don't)
studio/      runtime (seek, preview and viewer player), motion.js, dom.js, sound.js, base.css
scripts/     serve · stills · lint · audio · render · export · selftest · check · footage
projects/
  _template/     starting BRIEF, SCRIPT and REVIEW
  demo/          tiny smoke-test film
  agentic-auth/  the full example: composition.js, scenes/, lib/ (shared cast), theme.css,
                 audio.js, research/, and the BRIEF, SCRIPT, REVIEW, DECISIONS and PROGRESS docs
  making-of/     "How this video was made": a film about the studio, made with it
out/         renders, stills and lint reports (gitignored)
```

## CI

`.github/workflows/ci.yml` runs two GitHub Actions jobs on every push and pull request:

| Job | What it does |
|---|---|
| `check` | `check` and `selftest` (Node only, no install needed) |
| `lint` | `npm ci`, Playwright's Chromium, then `lint --determinism` for every film that doesn't need a screen recording (recordings are never committed) |

To publish a film as a static page, `node scripts/export.mjs making-of --out public/index.html` writes one
self-contained HTML file that any static host can serve. On a system where Playwright's own Chromium doesn't run
(e.g. Alpine), install the distro's Chromium and point the scripts at it with `CHROMIUM_PATH` (read by
`scripts/lib.mjs`).

## Screen recordings

A film can mix motion graphics with real footage, e.g. a product demo. Put the recording (or a symlink to it)
under `projects/<p>/footage/` (gitignored), describe the edit in `projects/<p>/footage.js`, and run
`node scripts/footage.mjs <p>`. Each clip becomes a numbered JPEG per film frame, with speed changes, HDR
tone-mapping and privacy blurs already applied. Only clips whose edit changed are rebuilt.

```js
// projects/<p>/footage.js: times are seconds in the recording, boxes are pixels in the recording
export const source = 'footage/source.mov';
export const size = [3456, 2164];     // recording size in pixels
export const tonemap = true;          // HDR recording (e.g. a macOS screen capture)
export const clips = {
  login: { parts: [[643, 648, 2.5], [648, 650, 0.5]] },   // [from, to, speed], played back to back
};
export const blur = [{ from: 95, to: 110, x: 760, y: 500, w: 680, h: 690 }];   // burned into the frames
```

A scene then shows frame `round(t * fps) + 1` of its clip through an `<img>`
(`ctx.asset('footage/login/00001.jpg')` and so on), so it stays deterministic: `seek()` waits for the image to
decode before a frame is captured. The single-file HTML export can't carry the frames (hundreds of MB), so it
encodes each clip once more as a small 720-px H.264 video (`footage/<clip>.mp4`, ~0.6 MB per 10 s) and the
scene plays that in viewer mode, re-seeking it on seeks and holds.

## How it works

```js
// projects/<p>/scenes/<id>.js
export function mount(root, ctx) {            // once: build the DOM
  return { update(t, ctx) { /* set every style from t */ } };
}
```

`update(t)` must set absolute state from `t`. It must not accumulate state, use `Math.random` (use
`rng(seed)`), read clocks or timers, or use CSS animations. This determinism is what lets the renderer
split the frames across parallel workers and lets the HTML viewer seek anywhere, and
`lint --determinism` enforces it. Full rules are in `CLAUDE.md`.

## Notes

- **Fonts.** Inter and JetBrains Mono come from npm (`@fontsource-variable/*`), so nothing is fetched at runtime.
  To use another typeface, add its fontsource package and list its CSS in `composition.styles`.
- **Example content.** The agentic-auth film's facts were checked in early October 2026 (the sources are
  in `research/`). Agent products change fast, so re-check them before reusing the claims.
