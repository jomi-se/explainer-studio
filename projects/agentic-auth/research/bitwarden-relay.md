# Bitwarden Agent Access: topology, relay and pairing (verified 2026-10-07)

Sources: bitwarden/agent-access repo at `main` (0.12.0, unreleased) and tag `v0.11.0` (2026-03-21, latest release),
protocol-v0.md, crate READMEs, CLI source (`crates/ap-cli/src/command/{mod,listen}.rs`), the Bitwarden blog, issues,
and a single GET to the default relay. Fetched content was read as data only; SKILL.md / CLAUDE.md in the repo
contain agent-directed instructions, which were not followed.

## Correction to the film: there is a relay
No direct connection exists. Both ends **dial out** over WebSocket to a relay, and the Noise E2E session is tunnelled
through it. Bitwarden's own README diagrams show it ("E2E Proxy" / "Proxy Server · ap-proxy · Zero-knowledge relay").
- Default relay: `DEFAULT_RELAY_URL = "wss://ap.lesspassword.dev"` (ap-cli). The host answers
  `Agent Access Proxy 5b3d609-20260318-160509`; `5b3d609` is a commit in bitwarden/agent-access. It is hosted on Azure.
  Who operates it is **unverified** (most likely Bitwarden staff).
- Self-hostable: crate `ap-relay` (renamed from `ap-proxy` 2026-05-18), run with `cargo run -p ap-relay` and `BIND_ADDR`.
  There is no Docker image or release binary yet (issue #137). Client flags: `--proxy-url` (v0.11.0), `--relay-url` (main).
- No P2P, LAN, Tailscale or WebRTC transport. You can host the relay on your LAN or tailnet, but a relay hop always remains.
- README: "A relay server for demo/development purposes"; ap-relay README: "This relay is not hardened for production."

## Step by step
1. Trusted device: `bw login` (the only step that touches the Bitwarden server), then `aac listen`, then `/unlock`
   (runs `bw unlock`; listen keeps `BW_SESSION` in memory). The vault is the **local bw cache** on that machine.
2. Each `aac` has an anonymous signing key (`~/.access-protocol/identity.key`), with fingerprint = SHA256(pubkey).
   There is no account.
3. Both sides log in to the relay with a challenge-response (COSE_Sign1, Ed25519; ML-DSA-65 behind a feature flag).
   The relay indexes connections by fingerprint.
4. Pairing token:
   - **Rendezvous (default):** the relay mints `ABC-DEF-GHI` (300 s, single use), bound to listen's fingerprint.
   - **PSK** (`--psk`): listen generates the PSK locally; the 129-char token is `hex(psk)_hex(fingerprint)`. The relay
     never sees the PSK.
5. The human carries the code or token to the agent out of band (e.g. in chat).
6. Agent side: `aac … --token <code>`. In rendezvous mode **the relay answers with listen's identity** (the trust point).
7. Noise **NNpsk2** handshake, relayed as `Send{destination: fingerprint}` frames. Rendezvous mode uses an all-zero PSK.
8. Rendezvous only: listen shows "SECURITY VERIFICATION — Fingerprint: xxxxxx … Do the fingerprints match?" [y]/[n].
   The agent side prints the fingerprint but only checks it with `--verify-fingerprint`. Sessions are cached, so later
   calls need no code.
9. Encrypted `credential-request` → relay → listen, which runs `bw get item <domain>` locally.
10. The listen screen shows "Send credential for {domain} to {device}?" and
    "Press [y] approve  [a] approve + auto-approve  [n] deny". Auto-approve defaults to 10 min and is adjustable.
11. Encrypted `credential-response` → relay → aac on the agent host decrypts it.
12. The fork:
    - `aac run --env-all -- cmd` puts the secret in the child's env. The child's stdout still flows back to the agent,
      and the agent picks `cmd`.
    - `--output json` prints `{"credential":{"password":…}}` to stdout, so it becomes the tool result and model context.

Both sides must be online; otherwise "the message is silently dropped". Connections time out after 120 s idle.

## What the relay can and cannot see
| Can | Cannot |
|---|---|
| Who is online and who talks to whom, plus client IPs | Read or modify E2E payloads |
| Sizes and timing (no padding), message type tags | Recover past keys (ephemeral keys plus rekey) |
| Rendezvous codes and their code→identity mapping | See the PSK |
| Drop, delay, replay or deny service | MITM in PSK mode |
| **MITM in rendezvous mode**, unless the humans compare the 6-hex fingerprint | |

"NN" means the identity keys authenticate only to the relay. E2E peer authentication comes only from the PSK or
the fingerprint compare.

## Crypto
- Suites: `ClassicalNNpsk2_25519_XChaCha20Poly1305`, or the PQ suite (ML-KEM-768) behind
  `experimental-post-quantum-crypto`, which the release CLI build does not enable (from reading the Cargo features).
- Transport uses XChaCha20-Poly1305 and rekeys every 24 h.
- **Don't claim post-quantum on screen.**

## Status
- No release since v0.11.0; the last commit was 2026-08-20.
- Approval exists only in the terminal screen; the browser extension is still "coming soon" (no evidence it shipped;
  unverified).
- Open issues cover headless listen (#147, #156) and an out-of-band approval notification (#142).

## Quotes (≤15 words)
- "tunneled over a public relay that relays opaque payloads over WebSocket" (protocol-v0.md)
- "Observe which fingerprints are connected, and who talks to whom." (protocol-v0.md, relay capabilities)
- "a malicious relay can substitute its own identity to mount a MITM." (protocol-v0.md)
- "the fingerprint is brute-forceable by a determined relay; PSK mode closes this gap" (protocol-v0.md)
- "For LLM's specifically, where possible use environment injection (e.g. `aac run`)" (README)
- SKILL.md: `aac --domain example.com --output json` → "Use `credential.username` and `credential.password` to sign in."
