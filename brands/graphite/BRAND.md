# Graphite — the house theme

A neutral dark theme for explainers: cool graphite, one bright colour for what's trusted, one for the agent or
automation, and red kept for risk. Theme: `brands/graphite/theme.css`.

## Palette and what each colour means

| Token | Hex | Explainer meaning |
|---|---|---|
| graphite-100 | `#0d1117` | background |
| paper-10 | `#f4f7fb` | primary text |
| paper-70 | `#c5cddb` | secondary text |
| lime-100 | `#b5f07a` | **trusted / granted / the protected thing** |
| blue-100 | `#74b0ff` | **the agent / automation / AI** |
| slate-100 | `#182030` | cards and panels |
| graphite-60/70 | `#566076` / `#333c4f` | lines, connectors at rest |
| coral-60 | `#ff7a72` | **denied / risk / attacker** (sparingly) |
| sand-100 | `#efc77e` | caution / pending / the thing you shouldn't hand over |

Never introduce colours outside this palette. Red appears only for denials and risk, never decoratively.

## Type
- Headlines: Inter **Semibold (650)**, tracking −2.2%, line-height 1.1, sentence case.
  One word may be set in lime for emphasis (`.gr-em`). Max one per headline.
- Secondary headings: Inter Medium (500), tracking −1%. Body: Inter Regular.
- Labels and eyebrows: JetBrains Mono, uppercase, wide tracking.

## Components
- Buttons: 10px radius, weight 600, lime or blue fill with near-black (`#0a0d12`) text; ghost = 1.5px lime outline.
- Panels: thin 1px graphite border, 14px radius, flat (no heavy shadows).
- Pills/eyebrows: mono uppercase in a soft lime-tinted capsule.
- Atmosphere: graphite with a faint blue/lime radial glow (`.gr-glow`, pre-rendered by `make-glow.mjs`). Never bright gradients.

## Don'ts
- Don't draw real product, company or customer logos.
- Don't put product claims, stats or feature names on screen unless they come from the source doc.
