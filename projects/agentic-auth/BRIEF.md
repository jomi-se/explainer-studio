# Brief — Who let the agent in?

**Logline:** Every AI agent ends up at a login screen. This film shows how it should get in: by delegation,
narrow and short-lived keys, secrets that stay in the vault, and a human who says yes. Handing it your
password is the wrong way.

**Audience:** technical-adjacent people (product, design, marketing, support, engineering) who know
passwords, passkeys and vaults well. Most don't know OAuth internals or the 2026
agent-credential landscape (OpenClaw, Bitwarden Agent Access, MCP).

**The three takeaways:**
1. **Delegate, don't share.** An agent should get its *own*, narrow, short-lived, bound key (a token), never your password.
2. **Two separate questions: who says yes, and who sees the secret.** Approving a request is not the same as hiding the
   secret from the model. Aim for both.
3. **Assume the agent will be tricked.** Limits, a fresh yes for big moments, logs and one-tap revoke cap the damage.

**Format:** 1920×1080 · 30 fps · ~4:00 (grew from ~3:00 when the user added OpenClaw and Bitwarden) · no voiceover;
the on-screen text carries the story · synthesized score and SFX.

**Tone:** calm, precise, a little wry. Think "senior engineer at a whiteboard", not "product launch". The tone
is honest about what's unsolved.

**Style direction:** *editorial product diagram*. It uses the studio's graphite theme: cool graphite, semibold
headlines with tight tracking, flat panels, mono pills, a quiet glow and a faint film grain. UI fragments (chat, login form,
consent card, phone) are drawn as flat diagrams, not screenshots. Every move carries meaning: requests travel along wires,
tokens get engraved, denials bounce.

**Palette & type:** `brands/graphite/theme.css`. Lime = granted / safe / the protected secret. Blue = the agent.
Red (sparingly) = leak / denied / attacker. Sand = the password itself and pending states. Headlines are Inter Variable
semibold; mono labels use JetBrains Mono.

**Recurring cast** (`lib/cast.js`):
| Role | Look | Colour | Label |
|---|---|---|---|
| You | round avatar with a person glyph | sand ring | "You" |
| Agent | squircle with two eyes (blinks, looks, alarms) plus ID badge | blue | `agent:restock-7f3` |
| Service | flat window with URL bar | slate panel | `shop.example`, `pay.example` |
| Password | ••• pill with key glyph | sand → red when leaked | — |
| Token / valet key | key card with engraved rows, small chip in transit | lime | "token" |
| Vault | rounded safe with dial | lime | "Your vault" |
| Passkey | fingerprint inside a filling ring → ✓ | lime | — |
| Phone | flat phone with a notification card | graphite | — |

**Out of scope / must not claim:**
- No product claims, features or roadmaps: framing only ("every agent ends up at a login screen").
- No logos.
- Vendor names (OpenClaw, Bitwarden, MCP) appear only where the user asked, with verified facts.
- No 1Password or other password-manager names on screen.
- No statistics except dated, sourced incident facts.

**Source:**
- a ChatGPT deep-research report supplied by the user (not kept in the repo; every claim in it was re-checked)
- verified and extended by `research/factcheck.md`, `research/openclaw-bitwarden.md`, `research/openclaw-flows.md` and `research/bitwarden-relay.md`
- digest in `SOURCE_NOTES.md`
