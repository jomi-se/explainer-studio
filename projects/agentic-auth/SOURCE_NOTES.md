# Source notes — agentic auth

Primary input: a user-supplied ChatGPT deep-research report (mid-2026). It is not kept in the repo: nothing on screen
rests on it alone, and its errors are listed in `research/factcheck.md` §"Flags on the earlier claims".
Verification and extension (web research, 2026-10-06):
- `research/factcheck.md` covers standards, platforms and threats, with an on-screen line and URLs for each claim.
- `research/openclaw-bitwarden.md` covers OpenClaw SecretRefs, the `secrets` tool and Bitwarden Agent Access, from primary docs.
- `research/openclaw-flows.md` and `research/bitwarden-relay.md` (2026-10-07 re-check) correct the OpenClaw flows and the Bitwarden relay topology.

Every on-screen claim below traces to one of those files (§ refers to the fact-check sections).

## Concepts and the line we use on screen
| Concept | On-screen phrasing | Source |
|---|---|---|
| Agent ≠ user ≠ app | "Your judgment, a machine's speed, and it believes what it reads." | source report §threats; OWASP LLM01:2026 (§12) |
| Agent identity | "Its own identity, not a copy of yours." | OIDF agentic whitepaper (§9); Web Bot Auth WG draft (§9) |
| OAuth delegation | "The agent sends you to the wallet's own sign-in page." | OAuth 2.1 draft-16 (§1) |
| Passkeys | "You sign in there, with a passkey. The agent never sees it." | WebAuthn (§10) |
| Consent | "Consent names the agent and spells out what it may do." | source report §delegation; RFC 9396 (§4) |
| PKCE | "PKCE: only whoever started the sign-in can finish it." | RFC 7636; MCP security considerations (§2) |
| MCP | "Agent tools that speak MCP use this same flow." | MCP 2026-07-28 authorization (optional, built on OAuth 2.1) (§7) |
| Intersection scope | "Only the overlap: what you can do, and what its job needs." | Microsoft Zero Trust; CSA; OWASP (§13) |
| Signed limits | "Your rules, signed by you: one item, €120, this shop, until Sunday." | AP2 v0.2 open mandates (§8) |
| Short-lived | "Short-lived: minutes, not months." | OAuth 2.1 / BCP RFC 9700 (§1) |
| Audience | "Addressed to one service. Useless anywhere else." | RFC 8707 / MCP (§7) |
| DPoP | "Tied to the agent's key: a stolen copy doesn't work." | RFC 9449 (§5) |
| Custodian / vault fill | "The agent asks to sign in. The vault fills it. The agent never sees it." | §11; SUDP arXiv 2604.24920 (pattern only) |
| Password-only sites | "Many sites still only take a password." | OIDF browser-agent gap (§15) |
| OpenClaw plaintext | "Early 2026: keys sat in plain text, and malware came for them." | openclaw-bitwarden §A: OpenClaw docs; BleepingComputer Feb 16 2026; Koi/THN 341 skills |
| SecretRefs | "SecretRefs: the config points to a secret instead of containing it." | docs.openclaw.ai/gateway/secrets; v2026.2.26 |
| `secrets` tool | "Chat never accepts the value. You type it into a masked prompt." / "The agent gets a reference, not the value." | docs.openclaw.ai/tools/secrets; v2026.8.1 |
| MCP URL mode | "MCP: passwords go into a page the agent can't see." | MCP spec URL-mode elicitation (§7; openclaw-bitwarden §B4) |
| Bitwarden Agent Access | "Each request crosses an encrypted tunnel to your device." / "You approve each one." | bitwarden.com blog Mar 24 2026; github.com/bitwarden/agent-access |
| `aac run` vs `--output json` | "aac run: secret goes straight to the program." / "--output json: the model reads the password." | agent-access README; example OpenClaw skill (openclaw-bitwarden §C1) |
| Approve ≠ hide | "Approving isn't hiding." | synthesis of §C1 |
| Prompt injection | "Web pages can hide instructions meant for your agent." | OWASP LLM01:2026 (§12) |
| Step-up / CIBA | "Big moments get a fresh yes, on your phone." | RFC 9470 (e-commerce threshold example); CIBA Final 2021 (§3, §14) |
| CIBA binding message | "Approve: TRAIL-42 · €118" shown on both screens | CIBA binding_message (§3) |
| Audit / continuous checks | "Every grant, every action, on the record." / "Rights are re-checked on every action." | source report §policy; OIDF (§15) |
| Revocation | "One tap revokes it. Its keys stop working." | RFC 7009 (§6) |
| Open problems | consent fatigue · password-only sites · proving which agent · "A signed limit caps the damage. It can't guarantee a good choice." | OIDF whitepaper; arXiv 2609.11757 (§15) |

## Corrections to the source report (never shown as in the report)
- **Plugins vs MCP:** "MCP requires OAuth 2.1/PKCE for ChatGPT plugins" is wrong. Plugins shut down in Apr 2024. MCP authorization is optional and built on OAuth 2.1.
- **PAR:** it is RFC 9126, not 9125.
- **EU AI Act:** in force since 1 Aug 2024. High-risk obligations were pushed to Dec 2027 / Aug 2028 by the July 2026 Digital Omnibus. Not shown on screen.
- **SUDP:** the paper exists (arXiv 2604.24920). We show its pattern, unnamed.
- **Platform table:** dated (Bard, Cortana, plugins), so it is not used.
- **RAR:** RFC 9396's example is an exact amount, not a cap. For the "≤ €120" rule we lean on AP2 open mandates.
- **OAuth 2.1:** still a draft (draft-16, Sep 2026). Label it "OAuth 2.1", never "RFC".

## Likely viewer misconceptions
- **"A token is just a password with a different name."** A token is scoped, short-lived, addressed to one service and can be bound to a key.
- **"If I approved it, the AI didn't see my password."** Approval and exposure are independent (Bitwarden `--output json`).
- **"Encrypting the config fixes it."** SecretRefs are "not a process-isolation boundary" (OpenClaw docs).
- **"Limits make the agent safe."** They cap the blast radius. They don't make choices wise.

## Out of scope
- Enterprise IAM (Entra Agent ID, RBAC/ABAC, policy-as-code).
- PAR, mTLS, DIDs.
- Regulation.
- Exposed-instance counts, which vary too much between sources.
