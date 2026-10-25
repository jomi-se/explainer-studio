# Progress — agentic-auth

## Morning summary
- **Status:** film complete; reworked on 2026-10-07 after review. 15 chapters, 5:49, 1080p30, synthesized score.
- **Files:**
  - `out/agentic-auth/agentic-auth.mp4`: final MP4, with audio normalized to −16 LUFS
  - `out/agentic-auth/agentic-auth.html`: single self-contained file with a chapter player; it opens from disk
  - `out/agentic-auth/agentic-auth-draft.mp4`: half-res draft
- **Where to look:**
  - `SCRIPT.md`: every on-screen line
  - `SOURCE_NOTES.md` and `research/`: sources for every claim
  - `REVIEW.md`: critique rounds
  - `DECISIONS.md`: ⚑ items for you
- **Open questions (DECISIONS ⚑):**
  - the length, 5:49 instead of 3
  - Bitwarden and OpenClaw named on screen
  - the Bitwarden `--output json` framing
- **Live preview:** `npm run serve`, then `/studio/index.html?project=agentic-auth` (←/→ step, 1–9 jump to chapter).

## Log
- 2026-10-06 22:20: plan approved (concepts, errand, four questions, passkey motif).
- 22:30: two research agents: a fact-check of the source report, and OpenClaw + Bitwarden. Both reports are in `research/`.
- 22:40: cast library (`lib/cast.js`, `lib/icons.js`, `lib/fx.js`), textures (grain, vignette, night, dawn).
- 23:10: gates 0–2: SOURCE_NOTES, BRIEF, SCRIPT (restructured to add OpenClaw, Bitwarden and the approve ≠ hide matrix).
- 23:15: storyboard: hook, actor and delegate render.
  - Fixed anchor centring: `tf` was overriding the centring transform, so I switched to CSS `translate`.
  - Fixed CSS custom properties in `h()`.
- 23:20: all 13 scenes storyboarded. Score written (pad per chapter, night/morning colour, cue-synced SFX).
- 23:30: full lint found 32 issues (no determinism problems); all fixed, and the next lint was clean.
- 23:40: draft render at 39.7 fps. Focus pulls added (PKCE match, poisoned review, phone, matrix target), plus the progress hairline.
- 23:50: final lint (determinism), final 1080p render and HTML export.

## 2026-10-07 — rework after the first review (OpenClaw flows, Bitwarden relay, broker pattern)
- **Research:** two deep fact-checks, against the OpenClaw repo source and docs, and the bitwarden/agent-access source,
  spec and relay. Written up in `research/openclaw-flows.md` and `research/bitwarden-relay.md`.
- **New scenes:**
  - `claw`: SecretRefs, with the Gateway pulling from the vault at startup.
  - `ask`: the `secrets` tool, accurately.
  - `broker`: the egress-injection pattern.
- **Rebuilt:** `bw` now shows the relay topology, pairing, and what the relay can and cannot see.
- **Also changed:** matrix dots, audio cues for all four scenes, `SCRIPT.md`, and `DECISIONS.md`.
- **Checks:** lint clean 0–349 s including determinism; stills reviewed.
