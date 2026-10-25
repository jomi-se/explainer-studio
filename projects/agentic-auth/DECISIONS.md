# Decisions — agentic-auth

## ⚑ For the reviewer to confirm
1. **Length is now 5:49, not ~3:00.**
   - **Why it grew:** the 2026-10-07 rework added real detail. The OpenClaw section is now three scenes (claw / ask /
     broker), and Bitwarden gained the relay and pairing beats.
   - **If you want it shorter:**
     - cut `actor` and `matrix` (−43 s);
     - fold `claw` into `ask` (−20 s);
     - drop the Bitwarden "posing as your laptop" beat (−4 s).
2. **Vendor names on screen:** OpenClaw, Bitwarden (and Bitwarden Agent Access, `aac`) and MCP.
   - **Why:** you asked for them. Every fact is dated and sourced.
   - **What's still off screen:** no logos, no other password-manager names, no product claims.
5. **More vendor names on screen (2026-10-07).** The broker scene shows the pills OneCLI · Infisical Agent Proxy ·
   Docker Sandboxes as "same pattern elsewhere", and the relay host `ap.lesspassword.dev` appears. All are sourced in
   `research/openclaw-flows.md` and `research/bitwarden-relay.md`. To drop them, replace them with one generic pill.
3. **The Bitwarden beat is critical.** It shows that their own example OpenClaw skill uses `--output json`, which puts the plaintext password in the model's context.
   - **Sourcing:** this comes from their repo as fetched on 2026-10-06, and the README itself recommends `aac run` for LLMs.
   - **Framing:** "approving isn't hiding". We show both modes fairly.
   - **Before sharing widely:** re-check this. It was re-verified on 2026-10-07 on `main` and v0.11.0.

4. **Final render takes ~40 min (4.2 fps).** The static film grain is costly to compress at full resolution
   (drafts run at about 40 fps). The MP4 is 74 MB at about 2.1 Mb/s. If the file needs to be smaller or to render faster,
   drop the `.grain` opacity in `theme.css` or remove the grain.

## Log
| Decision | Alternatives | Why |
|---|---|---|
| The errand is "watch for the restock, buy one, €120 max". | Flight rebooking (rejected in review); refund chase | It needs a login, a payment, unattended running and a natural signed limit, and it has an obvious injection vector (a product review). |
| Arc runs setup → 3 a.m. → morning. | Topic-by-topic survey | Chronology gives the audit log a payoff, because its rows are the events the viewer already saw. |
| Spine is the four questions: who are you / who sent you / what may you do, until when / who's keeping score. | Five rules up front | The questions give the film chapters, and the recap turns them into rules. |
| Passkey is the recurring "you approve" gesture. | Typed codes | Asked for in review. It's phishing-resistant and visually distinct. |
| Approval ≠ exposure matrix as the synthesis of the "in the wild" section | A list of products | It turns a product tour into a mental model, and it's the sharpest insight from the research. |
| Hook rewinds the leak and then shows the title. | A cold title | It shows the wrong way first, so the rest of the film is the right way. |
| PKCE is drawn as a torn ticket: the agent keeps one half. | Hash diagrams | A plain-language metaphor for the verifier and challenge. |
| Film grain and vignette are pre-rendered PNGs, and the grain is static. | Animated grain | Animated noise is incompressible, so it would bloat the MP4 and shimmer. |
| Inter (semibold headlines) and JetBrains Mono. | Fetch another free font | Already bundled, and the house rule is no runtime network. |
| `studio/dom.js` `h()` now supports CSS custom properties in `style`. | Set them per element | Fixed a silent bug: `Object.assign(style, {'--s': …})` does nothing. |
| Score loudness normalised to −16 LUFS. | — | Measured −15.9 LUFS integrated on the final MP4. |
| Progress hairline with chapter notches along the bottom edge | No progress indicator | A 4:40 film needs a sense of where you are. It sits in the bottom 4 px, outside the safe area, and has no text. |
| **2026-10-07 rework, after the first review.** OpenClaw split into 3 scenes: `claw` (SecretRefs; the Gateway pulls from your vault at startup), `ask` (the `secrets` tool: link → Gateway sign-in → masked "API key" card → local store → reference), and `broker` (egress injection as a pattern). | Patch the single scene | the reviewer flagged that the old scene merged two flows that never touch, and asked for the broker pattern to be pushed further. Per research/openclaw-flows.md, the masked answer goes to OpenClaw's local SQLite store, not a vault, and the tool is for API keys, not website passwords. |
| The `secrets` example is now `SHOP_API_KEY` for `api.shop.example`, not "your shop.example password". | Stripe key (the docs' example) | It keeps the restock errand (the agent watches stock via the shop's API) and is accurate: store secrets can't be used for browser logins. Website login stays the `vault` scene's job. |
| Bitwarden drawn as agent → relay ← laptop, both dialing out, with pairing (code + fingerprint compare) and what the relay can and cannot see. | A direct "E2E tunnel" | The review was right: there is always a relay (default `wss://ap.lesspassword.dev`; self-hostable `ap-relay`). In the default rendezvous mode the relay vouches for identity, so the fingerprint compare is what stops a MITM. Source: research/bitwarden-relay.md. |
| `aac run` lane now says "unless the program prints it". | Unqualified "model sees nothing" | The child's stdout flows back to the agent, and the agent picks the command. |
| Matrix gains an "Egress broker" dot, and `secrets tool` moves left of centre. | Keep the old 7 dots | The secrets tool asks the human once, at entry, not for each use. |
