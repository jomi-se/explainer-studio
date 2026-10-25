# How personal AI agents get credentials: OpenClaw SecretRefs, the OpenClaw `secrets` tool, Bitwarden Agent Access

Research date: 2026-10-06. Sources: primary docs (docs.openclaw.ai raw markdown, OpenClaw CHANGELOG in the GitHub repo, GitHub release API timestamps, the bitwarden/agent-access README, protocol spec and source, the MCP spec) and secondary press for incidents and the competitive landscape.
Everything fetched was treated as data. Two skill files (Confidant's SKILL.md and Bitwarden's `agent-access` SKILL.md) contain instructions aimed at AI agents. I read them only to describe them and did not follow them.

Background: OpenClaw (by Peter Steinberger) went viral as **Clawdbot** around Jan 24–25, 2026. After a trademark request from Anthropic it became **Moltbot** on Jan 27, 2026, then **OpenClaw** on Jan 30, 2026 ([alternativeto](https://alternativeto.net/news/2026/1/trending-open-source-ai-agent-clawdbot-rebrands-to-moltbot-after-pressure-from-anthropic/), [morphllm](https://www.morphllm.com/clawdbot)). Versions are date-based, such as `2026.8.1`. The current stable release is `2026.9.8` (Oct 3, 2026).

---

## A. OpenClaw SecretRefs

### What it is (plain language)
A **SecretRef** is a small pointer that sits in the config where a password or API key would otherwise go. Instead of `"apiKey": "sk-live-…"` in `openclaw.json`, the config says "get this from environment variable X / file Y / command Z / the secret store". The Gateway (OpenClaw's always-on server process) looks up the real value when it starts. As a result the config file, and the agent reading it, no longer holds the plaintext.

OpenClaw's own docs give the reason ([docs.openclaw.ai/gateway/secrets](https://docs.openclaw.ai/gateway/secrets)):
> "Plaintext credentials remain agent-readable when they sit in files the agent can inspect, including `openclaw.json`, `.env`, retired auth-profile JSON archives, or generated `agents/*/agent/models.json` files."

The feature is opt-in. The docs say: "Plaintext still works. SecretRefs are opt-in per credential."

### Exact shape (good for the screen)
From [SecretRef contract](https://docs.openclaw.ai/gateway/secrets/secretref-contract):

```json5
{ source: "env" | "file" | "exec" | "store", provider: "default", id: "..." }
```

Examples:
```json5
{ source: "env",   provider: "default",  id: "OPENAI_API_KEY" }            // environment variable
{ source: "file",  provider: "filemain", id: "/providers/openai/apiKey" }  // JSON pointer into a 0600 file
{ source: "exec",  provider: "vault",    id: "providers/openai/apiKey#value" } // run a resolver binary
{ source: "store", provider: "default",  id: "STRIPE_API_KEY" }            // OpenClaw's shared secret store
```
Shorthand on simple fields: `"${OPENAI_API_KEY}"` or `"$OPENAI_API_KEY"`.

A short on-screen snippet using a password manager (from [integration examples](https://docs.openclaw.ai/gateway/secrets/integration-examples)):
```json5
models: { providers: { openai: {
  apiKey: { source: "exec", provider: "onepassword", id: "op://Engineering/OpenAI/apiKey" }
}}}
```
Providers are declared under `secrets.providers`. One example is an exec provider:
```json5
secrets: { providers: {
  vault: { source: "exec", command: "/usr/local/bin/openclaw-vault-resolver",
           args: ["--profile","prod"], passEnv: ["PATH","VAULT_ADDR"], jsonOnly: true }
}}
```

### Supported sources and backends
- **env**: environment variables. Supports an optional allowlist of names.
- **file**: reads a local JSON file (by JSON pointer) or a single-value file. The file must be private, 0600, not a symlink, and have exactly one hard link.
- **exec**: runs an absolute-path binary with no shell. The binary must not be a symlink or group/world-writable. Request and response are JSON over stdin and stdout (`{"protocolVersion":1,"provider":…,"ids":[…]}`). This is how external vaults plug in. The documented recipes cover:
  - **1Password**: bundled `onepassword` plugin, uses the `op` CLI and a service account
  - **Bitwarden Secrets Manager**: `bws`, via `scripts/secrets/openclaw-bws-resolver.mjs`. This is Bitwarden's developer secrets product, not the consumer vault.
  - **HashiCorp Vault**: a bundled plugin
  - **pass** (password-store)
  - **sops**
- **store**: OpenClaw's own shared secret store, inside the Gateway's SQLite database. The docs say store values are **not encrypted at rest**: "stored unencrypted in the shared state SQLite database (`state/openclaw.sqlite`), protected by … `0600` file and `0700` directory permissions" ([secret store and egress](https://docs.openclaw.ai/gateway/secrets/secret-store-and-egress)).
- **No OS keychain provider** is documented. A keychain could only be wired in through `exec`.

### CLI (`openclaw secrets`) ([CLI docs](https://docs.openclaw.ai/cli/secrets))
| Command | What it does |
|---|---|
| `audit` (`--check`) | Read-only scan for plaintext secrets left in config, the auth store, `.env` and generated model files. Exits with code 1 if it finds any. |
| `configure` | Interactive planner: pick providers, map credential fields to refs, run preflight checks |
| `apply --from plan.json` | Executes the plan. Rewrites fields to SecretRefs and **scrubs the plaintext** (one-way). |
| `reload` | Re-resolves every ref and swaps in a new in-memory snapshot. Config is not rewritten. |
| `store list/set/get/rm/import` | Manages the shared store. `--value` is refused for secrets because it would leak into shell history. `get` refuses to print protected secrets. |

Recommended loop: `audit --check` → `configure --plan-out` → `apply --dry-run` → `apply` → `audit --check` → `reload`.

### Step by step (diagram-ready)
1. The operator writes the config with SecretRefs, or runs `openclaw secrets configure` / `apply` to migrate existing plaintext.
2. **Gateway startup (or `secrets reload`)**: every active ref is resolved **eagerly**, from env, file, exec or store, into an **in-memory runtime snapshot**. A ref that cannot be resolved stops startup ("fail fast"). Some owners can instead start degraded or keep their last-known-good value.
3. **Sentinel step (since 2026.7.1, model-provider keys)**: the Gateway does not pass the real key around. It mints an opaque sentinel such as `oc-sent-v2.<authenticated-ciphertext>.end`. Logs, error objects, SDK config and runtime introspection see only that token.
4. **Egress**: right before an HTTP request leaves the process, a guarded fetch swaps the sentinel for the real key in the URL or headers. An unknown sentinel-shaped value makes the request fail closed.
5. **Optional egress proxy** (`secrets.egressProxy.enabled`, default off): shell commands run by the agent get sentinels in their environment, for example `$OPENAI_API_KEY = oc-sent-v2…end`. A loopback HTTPS proxy with a Gateway-generated CA swaps in the real value **only for that secret's allowed hosts**, such as `api.openai.com`. A request to any other host is refused.

Source: [Secrets runtime model](https://docs.openclaw.ai/gateway/secrets/runtime-model).

### What the agent/LLM can and cannot see
- **Cannot see:** a provider API key or channel token configured as a SecretRef never appears in the prompt or model context. The model is not the one calling the API; the Gateway is. Resolved values are also registered for **exact-value log redaction**. Protected store entries are "write-only after saving… there is no reveal RPC".
- **Can still see:** anything left in plaintext on disk that the agent's file or shell tools can read. The docs say this directly: "SecretRefs … are not a process-isolation boundary. A plaintext credential left on disk in a path the agent can read is still readable via file or shell tools." Sentinels "are not process isolation. The real value still exists in same-process memory." `env`-kind store entries are agent-readable by design. Also: "A permitted service can also reflect credentials back to the agent."

### Dates / versions
- **2026.2.26** (published Feb 27, 2026): "External Secrets Management introduces a full `openclaw secrets` workflow (`audit`, `configure`, `apply`, `reload`) with runtime snapshot activation… ref-only auth-profile support" (PR #26155, @joshavant). This is the SecretRefs launch ([CHANGELOG/2026.2.26.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG/2026.2.26.md)).
- **2026.7.1** (Jul 13, 2026): sentinels for SecretRef-backed model-provider keys ("additional protection against accidental exposure in logs, errors, proxy captures…", #102009).
- **2026.8.1** (Aug 31, 2026, press-dubbed "OpenClaw 2.0"): private credential requests, the `secrets` tool, and the opt-in egress proxy (see B).
- SecretRef coverage was then extended field by field across 2026: Slack tokens in 2026.6.11, QQ Bot, Feishu, and others.

### Why this matters: documented incidents and criticism
- **Plaintext by default (late Jan 2026).** Researchers described Clawdbot as storing API keys, OAuth tokens, bot tokens and `gateway.auth.token` in plaintext under `~/.clawdbot` ([BlackFog](https://www.blackfog.com/clawdbot-and-openclaw-data-exfiltration-goldmine/), [Straiker](https://www.straiker.ai/blog/how-the-clawdbot-moltbot-ai-assistant-becomes-a-backdoor-for-system-takeover)).
- **Exposed instances (Jan 2026).** Jamieson O'Reilly used Shodan (searching for "Clawdbot Control") and found hundreds of public control panels, some unauthenticated and leaking API keys and chat history. Later counts were "4,500+" and "900+ on port 18789", and figures reach ">40,000" in later CVE coverage. These numbers come from different researchers at different times and should not be compared directly ([Pillar Security](https://www.pillar.security/blog/caught-in-the-wild-real-attack-traffic-targeting-exposed-clawdbot-gateways)).
- **CVE-2026-25253 (disclosed ~Feb 1, 2026, CVSS 8.8).** In a one-click attack, the Control UI trusted a `gatewayUrl` query parameter and sent the stored gateway auth token to an attacker's server. All versions before 2026.1.29 were affected ([The Hacker News](https://thehackernews.com/2026/02/openclaw-bug-enables-one-click-remote.html), [depthfirst](https://depthfirst.com/post/1-click-rce-to-steal-your-moltbot-data-and-keys)).
- **ClawHavoc malicious skills (early Feb 2026).** Koi Security audited 2,857 ClawHub skills and found 341 malicious ones, 335 of which used fake "Prerequisites" to install Atomic macOS Stealer (AMOS). The count grew to 824 as ClawHub passed 10,700 skills. Payloads included exfiltration of `~/.clawdbot/.env` ([Koi](https://koi.ai/blog/clawhavoc-341-malicious-clawedbot-skills-found-by-the-bot-they-were-targeting), [The Hacker News](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)).
- **First infostealer to take OpenClaw secrets (Feb 13, 2026, reported Feb 16).** Hudson Rock found a Vidar variant exfiltrating `openclaw.json` (which held the gateway token), `device.json` (which held the device **private key**), and `soul.md`/memory files. It was a generic file grab that matched keywords like "token", not malware written for OpenClaw ([BleepingComputer](https://www.bleepingcomputer.com/news/security/infostealer-malware-found-stealing-openclaw-secrets-for-first-time/)).

### Limitations (OpenClaw's own wording)
- Opt-in. Plaintext still works, so protection depends on migrating every field and getting a clean `audit --check`.
- Not process isolation. A same-host agent with shell or file access can read any leftover plaintext, backups, or old `models.json`.
- The built-in store is unencrypted SQLite with 0600 permissions, "not an HSM". The docs point operators to 1Password or Vault for stronger custody.
- The egress proxy is off by default. It only constrains clients that honor `HTTPS_PROXY`, and an allowed host can echo the credential back to the agent.

---

## B. Asking a remote human for a secret without it entering the chat

The feature the user remembers has three candidates. The **official, built-in one is the `secrets` tool** ("private credential requests") in OpenClaw 2026.8.1. Two community add-ons on ClawHub did the same job earlier: **Confidant** (a skill) and **ClawTunnel** (a plugin).

### B1. OpenClaw built-in `secrets` tool, "Private credential requests" (most likely match)
**What it is.** The agent can ask *you* for a credential it doesn't have. You type the value into a masked field in a trusted OpenClaw interface. The Gateway saves it straight into the protected store, and the agent receives only a SecretRef handle. Docs: [tools/secrets](https://docs.openclaw.ai/tools/secrets). The docs say: "The value never appears in the chat, the session transcript, the tool result, or the model's context — the agent receives only entry metadata and its store SecretRef."

**Introduced:** 2026.8.1, published Aug 31, 2026. The changelog entry reads: "**Private credential requests:** let your agent request a credential through a masked prompt without putting its value in chat or model context, and use an opt-in proxy to limit protected-secret substitution to approved destinations." (#129670, #123216, #132122). Release 2026.9.5 (Sep 19, 2026) fixed delivery of "protected form links" on Telegram.

**Step by step (diagram-ready):**
1. The agent calls `secrets` → `list` and sees names and metadata only. Values are "structurally absent".
2. The agent calls `secrets` → `request` with a name (for example `STRIPE_API_KEY`), a short `reason`, and proposed `allowedHosts` (for example `api.stripe.com`). The tool **blocks**. The default timeout is 15 minutes, clamped to 30–3600 s.
3. **Delivery to the human:**
   - *Web Control UI, TUI, iOS/macOS/Android apps:* a card appears showing who is asking (agent and session), the entry name, the reason, and an **editable list of allowed hosts**, with a **masked input**.
   - *Chat channels (Telegram, Discord, WhatsApp, etc.):* "Chat channels never accept the value." The user receives a **link** to the Control UI prompt. A plain-text reply in chat is deliberately ignored. This requires `gateway.publicOrigin` to be configured, otherwise the request is cancelled with a visible blocker.
4. The human types the secret, can narrow the allowed hosts, and submits. They can also press **Skip**.
5. The Gateway writes the value into the **shared secret store** (SQLite, kind `secret`) and refreshes any config that references it.
6. The tool result to the agent says: `status: "stored"`, the ref `{ "source": "store", "provider": "default", "id": "STRIPE_API_KEY" }`, and the current host policy. **No value is included.**
7. Later uses of the secret:
   - (a) any config field that accepts a SecretRef, or
   - (b) shell commands get a sentinel in `$STRIPE_API_KEY`, and the egress proxy substitutes the real key only for `api.stripe.com`. This requires `secrets.egressProxy.enabled`.

**Guardrails worth mentioning:**
- There is "deliberately no action that writes a value the agent supplies".
- Creating a request needs `operator.admin` plus a live agent run. If the run ends, the prompt is cancelled.
- Subagents and ACP workers don't get the tool.
- It can be disabled with `tools.deny: ["secrets"]`.
- In local `openclaw chat` mode it can't be fulfilled; the user must run `openclaw secrets store set NAME`, which uses a no-echo prompt.
- The related `ask_user` tool is for non-secret questions only: "a credential is never a valid answer to one".

**What the LLM sees:** the name, the reason, the hosts, and the ref. It never sees the value, unless an allowed destination service echoes the credential back.

**Where it's stored:** `state/openclaw.sqlite`, unencrypted at rest, with 0600 file permissions.

### B2. Confidant (community ClawHub skill, by Eric Santos)
- [clawhub.ai/ericsantos/confidant](https://clawhub.ai/ericsantos/confidant): v1.5.3, MIT-0, npm `@aiconnect/confidant`. It is mirrored in the `openclaw/skills` archive and works with any agent that reads SKILL.md.
- **Flow:**
  1. The agent runs `scripts/request-secret.sh --label "…" --service openai [--tunnel]`.
  2. A local Confidant web server starts on port 3000, creates a one-time request, and can expose it through **localtunnel or ngrok**, giving a URL like `https://<random>.loca.lt/requests/<id>`.
  3. The agent **pastes that URL into the chat**.
  4. The human opens it in a browser and submits the secret through a web form.
  5. The script polls, saves the value, and the request is destroyed. It expires after submission or 24 h.
- **Storage:** `~/.config/<service>/api_key` (chmod 600), a `--save <path>`, an env var (`--env`), or **stdout** if no flag is given. With stdout, the value lands in the agent's tool output and therefore in the LLM context.
- **Criticism and limits:** the value is saved as a **plaintext file the same agent can `cat`**. The skill relies on instructions such as "NEVER reveal received secrets in chat" rather than enforcement. No client-side encryption is documented, and the tunnel provider is in the path. (I saw these agent-directed instructions in the SKILL text and treated them as data.)

### B3. ClawTunnel (community ClawHub plugin `secret-tunnel`, by Hanyang Gu / @mcxiaoguu)
- [clawhub.ai/mcxiaoguu/plugins/secret-tunnel](https://clawhub.ai/mcxiaoguu/plugins/secret-tunnel), v0.1.2.
- **Flow:**
  1. The `request_secret` tool mints a one-time link.
  2. The link goes to the human over chat.
  3. The human pastes the secret into a single-field form.
  4. The value is held **in memory** under a key, and the agent gets only the key.
  5. When the agent writes `{{secret:<key>}}` in a tool call, a `before_tool_call` hook substitutes the value at the last moment and then wipes it.
- **Transport:** `publicUrl` (self-managed), Tailscale Funnel, or **Cloudflare Quick Tunnel** (the default). The author notes Cloudflare can see values in transit, and client-side encryption is planned.

### B4. The generic standard: MCP "URL mode elicitation"
- Introduced in the **MCP spec version 2025-11-25** via **SEP-1036** ("URL Mode Elicitation for secure out-of-band interactions", status Final) ([spec](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation#url-mode-elicitation-for-sensitive-data), [SEP-1036](https://modelcontextprotocol.io/seps/1036-url-mode-elicitation-for-secure-out-of-band-intera)).
- **Flow:**
  1. The server sends `elicitation/create` with `mode: "url"`, `url`, `elicitationId` and `message`.
  2. The client shows the full URL and domain and asks for consent.
  3. The browser opens the URL.
  4. The user enters the credential directly on the server's HTTPS page.
  5. The server stores it, bound to the user's identity.
  6. Optionally the server sends `notifications/elicitation/complete`. A server can also return `URLElicitationRequiredError` (-32042).
- **Normative rules:**
  - "Servers **MUST NOT** use form mode elicitation to request sensitive information such as passwords, API keys…"
  - Credentials "never pass through the LLM context, MCP client or any intermediate MCP servers".
  - The client must open the URL "in a secure manner that does not enable the client or LLM to inspect the content or user inputs".
  - The server must check that the person opening the link is the same user (anti-phishing).
- **Relation to OpenClaw:** OpenClaw's own docs cite this as the same pattern: "This is not a unique pattern. MCP supports out-of-band URL elicitation for sensitive data…" ([why-openclaw/secrets](https://docs.openclaw.ai/start/why-openclaw/secrets)). The differences are where the secret ends up (an MCP server's storage vs. the OpenClaw Gateway store) and the UI (a browser page vs. a masked card or a Control UI link).

---

## C. Bitwarden "Agent Access" (and what else Bitwarden shipped for agents)

### C1. Bitwarden Agent Access SDK (main item)
**What it is.** An **open protocol, CLI (`aac`) and Rust SDK** that lets an agent on one machine request a *single* credential from the user's password manager on another, trusted device, through an end-to-end-encrypted tunnel. The user approves each request. Bitwarden built it, but the protocol is meant for any credential provider. Bitwarden stresses that it "does not introduce any AI functionality into the Bitwarden product and does not grant AI systems persistent or unrestricted access to vault data."

**Dates and status:**
- Announced **March 24, 2026** ([blog by Kasey Babcock](https://bitwarden.com/blog/introducing-agent-access-sdk/), [press release](https://www.businesswire.com/news/home/20260324779404/en/Bitwarden-Introduces-Open-Standard-to-Secure-Agent-Credential-Access-with-the-Agent-Access-SDK)).
- Repo [github.com/bitwarden/agent-access](https://github.com/bitwarden/agent-access): created Dec 19, 2025; Rust; latest tagged release v0.11.0 (Mar 21, 2026); main last committed Aug 20, 2026.
- Status: "early alpha" / "early preview"; "not for production credential orchestration or autonomous access". Bitwarden recommends testing with sample data.

**Pieces:**
- the `aac` CLI (`listen` on the trusted device, `connect` / `run` on the agent side)
- the Rust SDK, with Python (UniFFI) and JS/WASM bindings
- a relay server; the CLI default is `wss://ap.lesspassword.dev`
- `protocol-v0.md`
- an **official OpenClaw skill** (`examples/skills/agent-access/SKILL.md`) and a GitHub Action example

**Step by step (diagram-ready):**
1. **Trusted device:** the user runs `aac listen`. It connects to their **Bitwarden CLI (`bw`)**, unlocks the vault, and shows a pairing token: either a short rendezvous code like `ABC-DEF-GHI` (5-minute TTL) or a 129-character PSK token.
2. **Agent side:** the agent runs `aac connect --token <code>`. Both sides authenticate to the relay with identity keys (Ed25519 or ML-DSA-65). They then run a **Noise NNpsk2** handshake. The relay only forwards ciphertext (XChaCha20-Poly1305) and "cannot read or modify E2E payloads". In rendezvous mode the users compare a 6-hex fingerprint out-of-band. Sessions are cached in `~/.access-protocol/`.
3. **Request:** the agent sends `credential-request {query: {domain: "github.com"} | {id} | {search}}`.
4. **Approval:** the `aac listen` terminal UI on the trusted device prompts **"[y] approve [a] approve + auto-approve [n] deny"**. "Auto-approve" whitelists the same agent identity and the same query for a time window, **10 minutes by default** and adjustable. Approval currently happens **in the CLI**. Bitwarden says a browser-extension approval is "coming soon". No mobile or biometric approval was found in the repo.
5. **Delivery:** the vault returns `{username, password, totp, uri, notes}` encrypted to the agent.
6. **Use:** either
   - (a) `aac run --domain example.com --env DB_PASSWORD=password -- psql`, which injects the secret as **environment variables into a child process**. In the README's words: "Secrets never touch stdout or disk." Or:
   - (b) `aac connect --domain … --output json`, which **prints the plaintext password to stdout**.

**What the agent/LLM can and cannot see:** this is the important nuance for the film.
- With `aac run`, the LLM never sees the value; only the child process does. This is the mode the blog and the README recommend: "For LLM's specifically, where possible use environment injection (e.g. `aac run`)."
- **Bitwarden's own example OpenClaw skill uses `aac --domain example.com --output json` and tells the agent to parse `credential.username` / `credential.password` / `credential.totp`.** In that flow the plaintext password and TOTP **do enter the model's context**. The human approved the request, but the secret is not hidden from the LLM.
- With a proxy integration like **OneCLI** (announced Mar 30, 2026), OneCLI intercepts the agent's outbound API calls, gets the credential through the Agent Access SDK after CLI approval, and injects it at the network layer. OneCLI says: "The agent never holds the key. The LLM provider never sees it." ([OneCLI blog](https://onecli.sh/blog/bitwarden-agent-access-sdk-onecli)). A Browserbase integration was "in development" as of March 2026.

**Scoping, limits and audit:**
- Access is one credential per request, scoped by domain, item ID or search. Every request is human-approved unless the user chooses the time-boxed auto-approve.
- Transport keys rekey every 24 h.
- Audit is minimal so far. The blog says it helps users "keep track of which credentials the agent is using, so they can rotate as needed" and "sets a foundation for more robust agent access auditing in the future".
- Open items in the spec: identity attestation, a "purpose string" to show in the approval UI, structured errors, and relay buffering (both sides must currently be online). The spec itself warns that rendezvous mode can be MITM'd by a determined relay; PSK mode cannot.

### C2. Other Bitwarden agent items
- **Bitwarden MCP Server.**
  - Jul 10, 2025: local MCP server wrapping the `bw` CLI. It lets an AI assistant unlock the vault, retrieve, generate and edit items ([press](https://www.businesswire.com/news/home/20250710815039/en/Bitwarden-Brings-Agentic-AI-to-Secure-Credential-Management), [blog](https://bitwarden.com/blog/bitwarden-mcp-server/)). Through this route, retrieved secrets do pass through the model.
  - Oct 30, 2025: enhanced for enterprise **admin** workflows ([press](https://www.businesswire.com/news/home/20251030669790/en/Bitwarden-Enhances-MCP-Server-to-Enable-AI-Workflows-in-Enterprise-Administration)).
- **Bitwarden Secrets Manager (`bws`)**: the developer/machine secrets product. OpenClaw's docs ship a `bws` exec resolver for SecretRefs (see A).

### C3. Landscape: other password managers and agents (one line each)
- **1Password Secure Agentic Autofill + Browserbase** (early access Oct 8, 2025): the browser extension fills credentials for a browser agent after human approval over an E2E channel. "Raw credentials never enter the LLM context." [1password.com press](https://1password.com/press/2025/oct/browserbase-ai-security-partnership)
- **1Password for Claude** (Jul 2026, Mac): Claude's browser agent signs in with credentials from the 1Password vault after **biometric approval**. The model "never sees the actual password or multi-factor code". The August 2026 "Agentic Mode" limits the extension when an agent is driving. [IT Brief](https://itbrief.news/story/1password-launches-claude-browser-login-for-ai-agents), [1Password community, Aug 2026](https://www.1password.community/announcements-52/august-2026-at-1password-smarter-sign-ins-secure-ai-agents-and-safer-developer-secrets-25431)
- **1Password service accounts / SDKs / Environments MCP server (Cursor, Jul 2026)**: programmatic access for developer agents. OpenClaw's bundled `onepassword` plugin uses a service account with per-secret `auto`/`approve`/`deny` policy and audit logging. The OpenClaw docs note the agent-tool value **is model-visible** for that execution. [docs.openclaw.ai/plugins/onepassword](https://docs.openclaw.ai/plugins/onepassword)
- **Keeper**: Keeper Secrets Manager MCP integration (Jul 10, 2025), with folder-scoped access and real-time confirmation for sensitive operations, and **Keeper Agent Kit** (Apr 30, 2026), skills for coding agents that inject secrets into local runtimes. [Security Boulevard](https://securityboulevard.com/2025/07/keeper-security-adds-support-for-mcp-to-secrets-management-platform/), [VMblog](https://vmblog.com/news/keeper-security-launches-agent-kit-to-secure-ai-driven-developer-workflows/)

---

## Safe on-screen lines (≤ 15 words each, with source)
1. "SecretRefs: config points to a secret instead of containing it." [docs.openclaw.ai/gateway/secrets](https://docs.openclaw.ai/gateway/secrets)
2. `{ source: "env" | "file" | "exec" | "store", provider, id }`: OpenClaw's SecretRef shape. [secretref-contract](https://docs.openclaw.ai/gateway/secrets/secretref-contract)
3. "Plaintext still works. SecretRefs are opt-in per credential." [docs.openclaw.ai/gateway/secrets](https://docs.openclaw.ai/gateway/secrets)
4. OpenClaw added `openclaw secrets` audit/configure/apply/reload in v2026.2.26 (Feb 2026). [CHANGELOG 2026.2.26](https://github.com/openclaw/openclaw/blob/main/CHANGELOG/2026.2.26.md)
5. "SecretRefs … are not a process-isolation boundary." (OpenClaw docs) [runtime-model](https://docs.openclaw.ai/gateway/secrets/runtime-model)
6. Feb 2026: an infostealer grabbed OpenClaw's config, gateway token and device private key. [BleepingComputer](https://www.bleepingcomputer.com/news/security/infostealer-malware-found-stealing-openclaw-secrets-for-first-time/)
7. 341 malicious ClawHub skills found; most installed a password-stealing macOS malware. [The Hacker News](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)
8. "`secrets` lets the agent ask you for a credential without ever seeing it." [tools/secrets](https://docs.openclaw.ai/tools/secrets)
9. "Chat channels never accept the value." On Telegram you get a secure link instead. [tools/secrets](https://docs.openclaw.ai/tools/secrets)
10. The agent receives a reference, never the value: `{source:"store", id:"STRIPE_API_KEY"}`. [tools/secrets](https://docs.openclaw.ai/tools/secrets)
11. MCP (Nov 2025): servers MUST NOT request passwords via form elicitation; use URL mode. [MCP spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation)
12. Bitwarden Agent Access (Mar 2026): an open protocol for agents to request credentials. [bitwarden.com blog](https://bitwarden.com/blog/introducing-agent-access-sdk/)
13. Each request is end-to-end encrypted and approved by the human on a trusted device. [bitwarden/agent-access](https://github.com/bitwarden/agent-access)
14. `aac run` injects the secret into a process's environment, never stdout. [agent-access README](https://github.com/bitwarden/agent-access)
15. 1Password for Claude: approve with biometrics; the model never sees the password. [IT Brief](https://itbrief.news/story/1password-launches-claude-browser-login-for-ai-agents)

## Uncertain / could not verify
- **Which "secrets skill" the user remembers.** The best match is OpenClaw's built-in `secrets` tool from 2026.8.1, which sends chat users a link to a masked prompt. It is a tool, not a ClawHub skill. If they meant a ClawHub *skill*, it is probably **Confidant**. ClawTunnel is a third option. I could not get Confidant's first-publish date; ClawHub only says "updated ~4 months ago".
- **When the `store` source and the egress proxy first shipped.** The changelog ties the masked credential request and the "opt-in proxy" to 2026.8.1. I did not pin down the exact release that first added `source: "store"`. Note also that `2026.9.1-beta.1` was a mislabeled `2026.8.1-beta.4`.
- **"OpenClaw 2.0".** This is a press label for 2026.8.1 (cybersecuritynews). I did not see it in the official changelog header.
- **Exposed-instance counts** (hundreds, 900+, 4,500+, 40,000+) come from different researchers and dates. Use "thousands" or cite one source.
- **ClawHavoc dates and numbers** vary by outlet (341, 386, 824, 1,103). The Koi/THN figure of 341 out of 2,857 skills, early Feb 2026, is the most-cited.
- **CVE-2026-25253 disclosure date.** I used ~Feb 1, 2026 from secondary coverage. The fixed version is 2026.1.29.
- **Bitwarden approval UX beyond the CLI** (browser extension, mobile, biometrics): announced as "coming soon" in March 2026. I found no evidence in the repo that it shipped by Oct 2026. I also found no Bitwarden-side audit-log feature for Agent Access.
- **Whether Bitwarden updated its OpenClaw skill to use `aac run` rather than `--output json`.** As of the main branch fetched on 2026-10-06, the skill still uses `--output json`, which exposes plaintext to the agent.
- **1Password for Claude date.** IT Brief says Jul 17, 2026, but the 1Password community roundup lists it under August 2026. It may be an early-access vs. GA difference.
