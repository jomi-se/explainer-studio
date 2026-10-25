# OpenClaw credentials: the two flows, and the egress broker (verified 2026-10-07)

Basis: openclaw/openclaw `main` at commit fa57fad (docs/, CHANGELOG/, source), with spot checks against
docs.openclaw.ai. DOC = https://docs.openclaw.ai, SRC = https://github.com/openclaw/openclaw/blob/main.
Fetched pages contained agent-directed instructions; they were treated as data and ignored.
**Supersedes** the parts of openclaw-bitwarden.md §A/§B that mixed these flows.

## The correction
The old scene merged two mechanisms that never touch:

**(A) Operator-configured SecretRefs**
- Started by the **operator**, resolved by the **Gateway** from env, file, exec (a vault CLI) or store,
  **eagerly at startup or reload**.
- Consumed by the Gateway itself: model keys, channel tokens. The LLM is not involved.

**(B) The `secrets` tool**
- Started by the **agent** mid-run. The human types the value into a masked card.
- The value lands **only in OpenClaw's local SQLite store**, not in a vault.

Other corrections:
- The card header reads **"API key"**. Store secrets are used only via config SecretRefs or via the default-off egress
  proxy for Gateway-hosted exec (HTTPS). The browser tool cannot use them, so a *website password* is the wrong example.
- On Telegram and other chat channels the user never types into the chat. They get a link, then the Control UI login
  gate (Gateway auth), then the masked card.

## Flow A: SecretRefs (who starts it in a vault?)
1. **The operator writes the refs.** `{source:"env"|"file"|"exec"|"store", provider, id}`, written via
   `openclaw secrets configure` → `apply`, `openclaw onepassword secretref setup`, onboarding, or a config edit.
   [DOC/gateway/secrets/secretref-contract], [DOC/cli/secrets]
2. **An exec provider is pull-only.** At startup or reload the Gateway spawns the resolver (`op`, `bws`, `vault`, `pass`),
   sends `{"protocolVersion":1,"provider":…,"ids":[…]}` on stdin and reads values from stdout. Nothing writes to the
   vault. Vault auth is headless (e.g. a 1Password service-account token).
3. **Resolution is eager.** "Secrets resolve into an in-memory runtime snapshot, eagerly during activation, not lazily on
   request paths." [DOC/gateway/secrets/runtime-model]
4. **The Gateway consumes the values.** Model keys become `oc-sent-v2…end` sentinels in-process and are swapped into the
   URL and headers at egress (2026.7.1, #102009). Channel sends read the snapshot.
5. **The LLM never sees these values.** Caveat: plaintext left in agent-readable files still is readable, so run
   `secrets audit --check`.

## Flow B: the `secrets` tool (2026.8.1)
1. **`list`** returns name, kind, hosts and updated time/by. `secret`-kind values are structurally absent; `env`-kind
   values are visible.
2. **`request(name, reason ≤200, allowedHosts)`.** `kind` is always `"secret"`. The call blocks for 15 min by default
   (30–3600 s), and the request is cancelled if the run ends. It needs `operator.admin` plus a live run, and is not
   available to subagents or ACP workers.
3. **The card.** Control UI, TUI and the native apps show it: header **"API key"**, "Provide the secret for NAME.",
   "Requested by {agent} · {session}", the reason, editable allowed hosts, a masked field, and Submit/Skip.
   [SRC/src/agents/tools/secrets-tool.ts], [SRC/ui/src/i18n/locales/en.ts]
4. **Chat channels.** The bot posts "🔑 Agent requests credential NAME (secret). Reply is disabled for secrets — open to
   provide it: `<publicOrigin>/ask/<id>`". [SRC/src/agents/tools/question-prompt-send.ts]
   - This needs `gateway.publicOrigin`; without it the request is cancelled with a blocker message.
   - The link carries no credential, so the Control UI **login gate** comes first: Gateway secret, paired-device token,
     Tailscale or trusted-proxy identity.
5. **Submit.** The value is written to `state/openclaw.sqlite`, **unencrypted at rest** (file 0600, directory 0700).
   Any config ref naming that entry is refreshed. [DOC/gateway/secrets/secret-store-and-egress]
6. **The agent gets** `{status:"stored", ref:{source:"store",provider:"default",id:NAME}, currentPolicy:{allowedHosts}}`:
   "Stored; value hidden. Use the returned ref for config SecretRefs."
   "There is deliberately no action that writes a value the agent supplies."

There is **no link between the vault and the store**. The `secrets` tool reads and writes only the SQLite store, and
exec-provider (vault) secrets are invisible to `list`.

## The credential broker: egress injection (OpenClaw specifics)
- **Default-off, opt-in since 2026.8.1:** `secrets.egressProxy.enabled`, then restart the Gateway.
- **Sentinel.** `oc-sent-v2.<base64url>.end`: an 8-byte scope + 12-byte nonce + GCM tag + **AES-256-GCM ciphertext of
  the secret**. The key is held only in Gateway memory and regenerated per process, so outside the Gateway the sentinel
  is useless.
- **Shell env for Gateway-hosted exec:**
  - every store `secret` entry appears as `$NAME=oc-sent-v2…end`;
  - `HTTPS_PROXY` points at a loopback proxy with per-process Basic auth;
  - the CA bundle variables are set (`NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, `CURL_CA_BUNDLE`, …).
- **MITM.** A CA is generated per Gateway start (never installed system-wide), and leaf certificates last 1 day.
- **Swap.** The proxy substitutes in the **URL, headers and streamed bodies** (WebSocket: handshake only). It is HTTPS
  only. Responses are **not** scrubbed.
- **allowedHosts.** Exact hostnames, set by the human on the card or with `secrets store set NAME --allow-host h`.
  "A secret with no allowed hosts is never substituted."
- **Mismatch.** The proxy returns **403**: `Secret "NAME" is not allowed for host "<host>"`. Unknown or tampered
  sentinels fail closed.
- **Limits:**
  - clients ignoring `HTTPS_PROXY` bypass the proxy (the sentinel stays useless ciphertext);
  - "Destination binding does not make an allowed host trustworthy": an allowed host can echo the secret back;
  - no DNS/IP pinning;
  - sandbox, node, Codex and ACP exec get neither the proxy nor sentinels;
  - a secret stored mid-run reaches the shell on the next turn.
- **Website login.** The OpenClaw docs recommend signing in manually in the `openclaw` browser profile. With
  owner-supplied credentials the password is model-visible. 1Password for Claude fills the page itself.

## Same pattern elsewhere (named on screen as pills)
- **OneCLI** (Apache-2.0). A Rust MITM gateway injects headers. Sources: its own store, Bitwarden Agent Access, or 1Password.
  "Agents hold placeholders, never real values." https://github.com/onecli/onecli
- **Infisical Agent Vault / Agent Proxy** (2026). An HTTPS_PROXY MITM proxy injects credentials and substitutes
  placeholders. https://infisical.com/ai/blog/agent-proxy
- **Docker Sandboxes.** A host proxy overwrites the auth header; the sandbox sees "a sentinel value".
  https://docs.docker.com/ai/sandboxes/security/credentials/
- Also: Vercel Sandbox header transform (2026-02-23), and Aembit's MCP Identity Gateway.
- Doppler is *not* this pattern: it injects plaintext env at launch.

## 1Password `onepassword` plugin (not on screen)
- Agent tool with per-slug `auto`/`approve`/`deny`.
- Approvals happen in the Control UI, an app, or via `/approve`.
- "The value is model-visible for that execution." [DOC/plugins/onepassword]
