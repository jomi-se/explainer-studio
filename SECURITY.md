# Security policy

## Supported version

Only the current `main` branch. This is a vibe-coded personal project (see the
README), so treat it as experimental.

## Reporting a vulnerability

Use GitHub's private **Report a vulnerability** flow. Include the commit,
reproduction steps and the impact you observed. Please don't open a public
issue for an unpatched problem.

## Boundaries worth knowing

- **Preview server.** `scripts/serve.mjs` serves the whole repository with no
  authentication. It listens on `127.0.0.1` by default; `--host 0.0.0.0`
  exposes it to your network, so use that only on a network you trust.
- **Screen recordings.** Recordings under `projects/*/footage/` and raw
  `.mov`/`.mp4` files in the repository root are gitignored because they can
  show secrets. Blurs from `footage.js` are burned into the frames that scenes
  use, but the source recording itself is untouched; never commit it.
- **Rendered output.** Films run no network requests: fonts, images and audio
  are bundled into the export. Anything a scene shows ends up in the MP4 or
  HTML, so check stills before sharing a film.
- **CI.** Workflows use SHA-pinned actions, read-only repository permissions
  and no secrets. Dependabot proposes grouped updates after a seven-day
  cooldown.

Before publishing history, run `./scripts/install-gitleaks.sh`, then
`./scripts/scan-secrets.sh history`. A clean scan does not replace reviewing
what a film shows on screen.
