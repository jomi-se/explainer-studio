# Review log — Who let the agent in?

Scores 1–10: clarity · accuracy · readability · composition · motion · continuity · pacing.
Pass = every scene averages ≥ 8, no dimension < 7, lint clean.

## Round 1 — 2026-10-06 23:20 — gate 3 (storyboard, all scenes)

| Scene | clar | acc | read | comp | motion | cont | pace | avg | worst problem |
|---|---|---|---|---|---|---|---|---|---|
| hook | 8 | 9 | 8 | 7 | 7 | 8 | 8 | 7.9 | Leak tiles crowd the bottom left. The opening 1.5 s is near-empty. |
| actor | 8 | 9 | 8 | 8 | 7 | 8 | 7 | 7.9 | The badge beat comes late; 25 s is long for one idea. |
| delegate | 7 | 9 | 8 | 7 | 7 | 8 | 7 | 7.6 | The PKCE ticket is small and the "match" moment is hard to read. Six caption beats is dense. |
| key | 8 | 9 | 8 | 8 | 7 | 9 | 7 | 8.0 | Rows stay at 14 % opacity until engraved, so the card looks empty and greyed. |
| vault | 9 | 9 | 8 | 7 | 7 | 9 | 8 | 8.1 | Composition is wide and sparse. The ask chip overlaps the vault at the end of its path. |
| claw | 8 | 9 | 7 | 7 | 7 | 8 | 7 | 7.6 | Very dense: incidents, config, phone and MCP in 31 s. Editor text is small at a glance. |
| bw | 8 | 9 | 8 | 7 | 7 | 8 | 8 | 7.9 | The terminal line wrapped because of a CSS class clash (`.keys`); fixed. |
| matrix | 9 | 9 | 8 | 8 | 7 | 8 | 8 | 8.1 | Dots drop in uniformly; the vault dot deserves a beat of its own. |
| night | 8 | 9 | 8 | 7 | 7 | 8 | 8 | 7.9 | The gate is cramped between agent and window. |
| confirm | 8 | 9 | 8 | 8 | 7 | 8 | 8 | 8.0 | Pills sit on the ping wire. |
| morning | 9 | 9 | 8 | 7 | 7 | 9 | 8 | 8.1 | The log row was clipped by the side panel; fixed. |
| recap | 8 | 9 | 9 | 8 | 7 | 9 | 8 | 8.3 | Static. |
| unsolved | 8 | 9 | 8 | 8 | 7 | 8 | 8 | 8.1 | Fine; the bookend lands. |

Lint: 32 issues (caption entrances below the safe area, an offscreen phone form, edge labels, small flying
chips, the `.keys` clash) → all addressed.

**Three worst problems → fixes this round:**
1. **Motion is uniformly 7.** Every element uses the same spring-in. Next round: add camera push-ins on the focal
   moments (key engraving, phone in claw, the gate in night) and give the vault dot in the matrix its own beat.
2. **Delegate PKCE beat is unclear.** Make the ticket larger and give the "match" its own push-in.
3. **Pacing and density** (claw, delegate, length ~4:40). Trim dead holds; review in the draft render.

## Round 2 — 2026-10-06 23:45 — gates 4–6 (draft render, focus pulls, polish)

Draft render: 8478 frames in 3m43s (39.7 fps), 12.6 MB; full lint clean (0.0–282.6 s).

| Scene | clar | acc | read | comp | motion | cont | pace | avg | change |
|---|---|---|---|---|---|---|---|---|---|
| hook | 8 | 9 | 8 | 8 | 8 | 8 | 8 | 8.1 | Leak tiles re-spaced; flying chips exempt from the size lint |
| actor | 8 | 9 | 8 | 8 | 7 | 8 | 8 | 8.0 | Questions moved inside the safe area |
| delegate | 8 | 9 | 8 | 8 | 8 | 9 | 7 | 8.1 | PKCE halves scale ×1.45 with a glow while the rest dims; seamless hand-off to key |
| key | 8 | 9 | 8 | 8 | 8 | 9 | 7 | 8.1 | Empty rows read as slots (40 %); ghost path clear of the caption |
| vault | 9 | 9 | 8 | 8 | 7 | 9 | 8 | 8.3 | Field target fixed; vault reads as a dial, not a "+" |
| claw | 8 | 9 | 8 | 8 | 8 | 8 | 7 | 8.0 | Phone leans in while focal; pills clear before the reference lands |
| bw | 9 | 9 | 8 | 8 | 7 | 8 | 8 | 8.1 | `.keys` clash fixed; the footnote now sits inside the red lane |
| matrix | 9 | 9 | 8 | 8 | 8 | 8 | 8 | 8.3 | The target dot gets its own bouncy beat and halo |
| night | 8 | 9 | 8 | 8 | 8 | 8 | 8 | 8.1 | The poisoned review leans forward (red border) while the rest dims |
| confirm | 8 | 9 | 8 | 8 | 7 | 8 | 8 | 8.0 | — |
| morning | 9 | 9 | 8 | 8 | 7 | 9 | 8 | 8.3 | — |
| recap | 8 | 9 | 9 | 8 | 7 | 9 | 8 | 8.3 | — |
| unsolved | 8 | 9 | 8 | 8 | 7 | 8 | 8 | 8.1 | — |

Every scene now averages ≥ 8 with no dimension < 7.

Known softer spots, for a future pass:
- Motion is 7 in several scenes (the spring-in vocabulary is consistent but plain).
- Total length is 4:43, against the planned ~3:00.
