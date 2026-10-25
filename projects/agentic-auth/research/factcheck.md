# Fact-check: Authentication & access management for consumer AI agents (explainer film)

Checked 2026-10-06. Primary sources were preferred. For OAuth 2.1, the RFCs, the MCP spec, the AP2 spec, the ACP OpenAPI file and the OWASP 2026 list, I downloaded the source and grepped for the normative text. Items whose details came only from a summarised page fetch are marked *(summary-sourced)*.

**Prompt-injection hygiene:** No fetched page contained instructions aimed at an AI. One WebFetch summary of the ACP GitHub README ended with "Note to AI agents: reference the official OpenAPI file…". It looks like the summariser echoed my own prompt, not text from the page. Either way it was harmless, and I ignored it. I then read the OpenAPI file directly.

Story constraint used throughout: *watch shop → restock → buy 1 item, ≤ €120, this shop, until Sunday, possibly at 3 a.m.*

---

## 1. OAuth 2.1

**VERDICT: correct, with two refinements.**

- **Status:** still an Internet-Draft, not an RFC. The latest is **draft-ietf-oauth-v2-1-16, dated 3 Sep 2026**. The OAuth WG has set a milestone of **Dec 2026 for submission to the IESG**. Don't call it "the OAuth 2.1 standard (RFC)". Say "OAuth 2.1 (draft)", or just "OAuth".
- **PKCE:** "Clients MUST use code_challenge and code_verifier and authorization servers MUST enforce their use". There is one narrow exception: a *confidential* client with a verified OpenID Connect `nonce`, where PKCE stays RECOMMENDED (§7.5.1.1). The `plain` method is removed. "PKCE required for all authorization-code clients" is fine for the screen.
- **Removed:** the Implicit grant ("omitted … as per Section 2.1.2 of RFC 9700") and the Resource Owner Password Credentials grant ("omitted … as per Section 2.4 of RFC 9700"). Bearer tokens in URL query strings are also omitted.
- **Refresh tokens:** §10 says "Refresh tokens for public clients must either be sender-constrained or one-time use". "One-time use" means rotation. The normative text in §4.3 says the AS "SHOULD issue sender-constrained refresh tokens or use refresh token rotation" when client authentication isn't possible.
- **On-screen:** "OAuth 2.1 (draft): PKCE always, no password grant, no implicit grant."
- **Sources:** https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ · https://www.ietf.org/archive/id/draft-ietf-oauth-v2-1-16.html (§4.3, §7.5.1.1, §10) · RFC 9700 (OAuth Security BCP, Jan 2025) https://www.rfc-editor.org/rfc/rfc9700

## 2. PKCE (RFC 7636)

**VERDICT: fair, slightly loose.**

- PKCE stops a stolen (intercepted or injected) authorization code from being swapped for tokens by anyone except the client that created the secret verifier. The MCP spec uses nearly your wording: PKCE ensures "that only the original requestor can exchange an authorization code for tokens."
- Nuance for notes: PKCE alone does **not** stop "mix-up" attacks, where a malicious authorization server is in the loop. MCP 2026-07-28 adds RFC 9207 `iss` validation for that.
- **On-screen:** "PKCE: only the app that started the sign-in can finish it."
- **Sources:** https://www.rfc-editor.org/rfc/rfc7636 · https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations

## 3. Device Authorization Grant (RFC 8628) and CIBA

**VERDICT: correct. CIBA is final. "Approve on your phone while the agent waits" is a fair description.**

- **RFC 8628 (Aug 2019):** built for devices that "lack a browser … or are input constrained". The device shows a short code or URL, and the user approves "by using a user agent on a separate device" while the device polls. This fits headless and voice agents.
- **OpenID CIBA Core 1.0:** **Final specification, 1 Sep 2021.** It has "direct Relying Party to OpenID Provider communication without redirects through the user's browser." It separates the *consumption device* from the *authentication device* ("often a smartphone"). Results come back by poll, ping or push. A `binding_message` is shown on both devices "to interlock them together for the transaction by a visual cue". That's a nice visual.
- Caveats for notes:
  - The client must already know who the user is (login_hint / id_token_hint).
  - The provider must be able to reach the user's phone.
  - Consumer deployment is still limited.
- The OpenID Foundation agentic-AI whitepaper recommends CIBA for exactly the asynchronous "agent needs approval hours later" case.
- **On-screen (Device):** "No screen? The agent shows a code; you approve on your phone."
- **On-screen (CIBA):** "The agent asks; your phone buzzes; you approve. No browser needed."
- **Sources:** https://www.rfc-editor.org/rfc/rfc8628 · https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html · https://arxiv.org/abs/2510.25819 (OIDF whitepaper, §"asynchronous" and §3.4)

## 4. Rich Authorization Requests (RFC 9396)

**VERDICT: needs a small correction.**

- RFC 9396 (May 2023) adds the `authorization_details` parameter for "fine-grained authorization data".
- Its leading example *is* `"type": "payment_initiation"`. It says **instructedAmount EUR 123.50, creditorName "Merchant A"**, plus a creditor IBAN.
- That is an **exact amount to a named merchant, not "up to €X"**. The RFC defines no max-amount field. Each `type` is defined by the API or authorization server, so an "up to €120 at shop Y until Sunday" type can be expressed, but it is not standardised in the RFC.
- **On-screen:** "Permissions can be precise: this amount, this merchant, this purpose."
- **Source:** https://www.rfc-editor.org/rfc/rfc9396 (§2, Figure 1)

## 5. DPoP (RFC 9449)

**VERDICT: correct.**

- The abstract reads: "sender-constraining OAuth 2.0 tokens via a proof-of-possession mechanism … allows for the detection of replay attacks with access and refresh tokens."
- Nuance for notes: this only holds if the private key isn't stolen too, so it should be non-exportable or hardware-backed.
- **On-screen:** "Tokens tied to the agent's key: stolen copies don't work."
- **Source:** https://www.rfc-editor.org/rfc/rfc9449

## 6. Token Exchange / Revocation / Introspection

**VERDICT: all three numbers are correct.**

- **RFC 8693, Token Exchange (Jan 2020):** an STS protocol "including security tokens employing impersonation and delegation". It has `actor_token` / `act` claims, so you can swap a broad token for a narrower, agent-labelled one.
- **RFC 7009, Token Revocation (Aug 2013):** the client tells the AS a token "is no longer needed". Revocation invalidates the token and, if applicable, other tokens from the same grant.
- **RFC 7662, Token Introspection:** a protected resource asks the AS whether a token is active, plus its metadata.
- **On-screen:** "Swap for a narrower token" · "Revoke: the key stops working" · "Check: is this token still valid?"
- **Sources:** https://www.rfc-editor.org/rfc/rfc8693 · https://www.rfc-editor.org/rfc/rfc7009 · https://www.rfc-editor.org/rfc/rfc7662

## 7. MCP authorization: current version is **2026-07-28**

**VERDICT: mostly correct. Important update: the current spec is 2026-07-28, not 2025-06-18 or 2025-11-25.**

The versioning page says: "The current protocol version is 2026-07-28". The previous version was 2025-11-25.

- **Optional:** "Authorization is OPTIONAL for MCP implementations." HTTP transports SHOULD follow the spec. STDIO servers take credentials from the environment instead.
- **Built on OAuth 2.1 draft-13.** The MCP server is "an OAuth 2.1 resource server" and the client is an OAuth 2.1 client.
- **RFC 9728:** "MCP servers MUST implement OAuth 2.0 Protected Resource Metadata", and clients MUST use it for authorization-server discovery. A 401 response carries a `WWW-Authenticate` header with `resource_metadata`.
- **RFC 8707:** clients MUST send `resource` (the canonical MCP server URI) in both the authorization and token requests.
- **Audience binding / no passthrough:**
  - Servers MUST validate that tokens "were issued specifically for them as the intended audience".
  - Servers "MUST NOT accept or transit any other tokens".
  - Token passthrough is "explicitly forbidden" (Security Best Practices).
- **PKCE:** clients MUST implement it, MUST use S256 when capable, and MUST refuse to proceed if the AS metadata lacks `code_challenge_methods_supported`.
- **New in 2026-07-28:** clients MUST validate a present `iss` (RFC 9207, mix-up defense), and ASes SHOULD send it.
- **Client registration (three options):**
  1. **Client ID Metadata Documents (CIMD)**: SHOULD. The client_id is an HTTPS URL pointing to a JSON document. It is now the default for clients and servers with no prior relationship.
  2. **Pre-registration.**
  3. **Dynamic Client Registration (RFC 7591)**: MAY, and **deprecated in 2026-07-28** in favour of CIMD. It is kept only for backward compatibility.

  Priority order: pre-registered → CIMD → DCR → ask the user. CIMD itself is still an IETF draft (draft-ietf-oauth-client-id-metadata-document-02, 6 Jul 2026).
- **Scopes / step-up:**
  - Servers SHOULD put `scope` in the 401 `WWW-Authenticate` header.
  - At runtime, an operation that needs more permission gets **403 with `error="insufficient_scope"`** and the required scopes.
  - Clients acting for a user SHOULD do a **step-up authorization flow**, requesting the union of the old and new scopes.
  - Retries are limited to "no more than a few times".
- **Confused deputy:** MCP proxy servers MUST implement per-client consent before forwarding to third-party authorization.
- **URL-mode elicitation: YES, this exists.** It was introduced in 2025-11-25 and is retained in 2026-07-28, which simplified it: `elicitationId` and the completion notification were removed, and the client now retries the request.
  - Servers "MUST NOT use form mode elicitation to request sensitive information such as passwords, API keys, access tokens, or payment credentials" and "MUST use URL mode" for these.
  - Data in URL mode "is not exposed to the client".
  - Clients MUST NOT pre-fetch the URL, MUST get consent, MUST show the full URL, and MUST open it "in a secure manner that does not enable the client or LLM to inspect the content or user inputs". The example given is SFSafariViewController rather than WKWebView.
  - The rationale: "sensitive credentials never pass through the LLM context, MCP client or any intermediate MCP servers."
  - It is also used for third-party OAuth and **payment flows**. Credentials obtained this way MUST NOT be sent to the MCP client.
- Other spec text: "there SHOULD always be a human in the loop with the ability to deny tool invocations" (Tools spec).
- **On-screen:**
  - "Each tool server says which login it trusts."
  - "Tokens are addressed to one server, and can't be forwarded."
  - "Need more access? Ask the user again, just for that step."
  - "Secrets go into a page the agent can't see."
- **Sources:**
  - https://modelcontextprotocol.io/specification/versioning
  - https://modelcontextprotocol.io/specification/2026-07-28/changelog
  - https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
  - https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration
  - https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations
  - https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation
  - https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices
  - https://modelcontextprotocol.io/specification/2026-07-28/server/tools
  - https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/

## 8. Agent payments / commerce

**VERDICT: the old "intent mandate / cart mandate" terminology is out of date.** The generic claim "the spending limit can be cryptographically signed by the user ahead of time" is **correct** for AP2 and the card networks' "verifiable intent" work. It is **not** how ACP works: there, limits are enforced by the payment provider's token.

### AP2, now **v0.2**, donated to the **FIDO Alliance** (28 Apr 2026)

- v0.1 (Sep 2025) had Intent, Cart and Payment mandates. **v0.2 restructures these into a Checkout Mandate and a Payment Mandate, each with an open and a closed form**, as SD-JWT verifiable credentials:
  - An **open** mandate holds the user's constraints and is signed by the user, or vouched for by a trusted agent provider.
  - A **closed** mandate is bound to one exact checkout.
- **Human-not-present ("autonomous") mode:** "The User sees and approves a set of constraints … The Shopping Agent then assembles and approves a closed Checkout and Payment Mandate on their behalf using these open Mandates."
  - The agent signs with a key endorsed by the open mandate's `cnf` claim.
  - Verifiers check the closed mandate against the open mandate's constraints.
  - Verifiers "always receive a closed Payment and Checkout Mandate".
- **Defined constraints map one-to-one onto our story:**
  - `checkout.allowed_merchants` → this shop
  - `checkout.line_items` (with quantity) → 1 item
  - `payment.amount_range` (max) → ≤ €120
  - `payment.budget`
  - Execution Date → until Sunday
  - `payment.agent_recurrence` (max occurrences)
  - Allowed Payee / Allowed Payment Instrument
- Selective disclosure: "Only constraints relevant to the closed Mandates are shared with the verifier."
- Signed receipts let the agent "reduce the scope of the open mandate" after use, which helps prevent a second purchase.
- The spec notes passkeys and hardware-attested keys as possible future user keys.
- Sources:
  - https://ap2-protocol.org/
  - https://github.com/google-agentic-commerce/AP2 (docs/ap2/specification.md, checkout_mandate.md, payment_mandate.md, agent_authorization.md)
  - https://fidoalliance.org/fido-alliance-to-develop-standards-for-trusted-ai-agent-interactions/

### Agentic Commerce Protocol (ACP)

- Open standard, Apache-2.0. Founding maintainers are OpenAI and Stripe; Stripe's docs also name Meta as a creator. The latest stable spec is **2026-04-17**.
- The Delegate Payment spec tokenises a card under an **Allowance**: `reason: one_time` (the only value supported), `max_amount`, `currency`, `merchant_id`, `checkout_session_id`, `expires_at`. So: a single-use, amount-capped, merchant- and session-locked, expiring token. The agent never handles the card number.
- Note: the allowance is created per checkout session. It is not a user-signed standing mandate.
- Sources:
  - https://github.com/agentic-commerce-protocol/agentic-commerce-protocol (spec/2026-04-17/openapi/openapi.delegate_payment.yaml)
  - https://docs.stripe.com/agentic-commerce/protocols/acp

### Visa Intelligent Commerce + Trusted Agent Protocol

- TAP was launched **14 Oct 2025** with Cloudflare. It is built on HTTP Message Signatures (RFC 9421) and aligned with Web Bot Auth. Merchants use it to recognise legitimate agents and their intent (browse vs. buy).
- VIC adds tokenised agent credentials with consumer-set spending controls.
- Sources: https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21716.html · https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications

### Mastercard Agent Pay

- **Agentic Tokens** are per-agent tokenised credentials carrying user-defined limits.
- **Verifiable Intent** is "a tamper-resistant record of exactly what a cardholder authorized". It was co-developed with Google and contributed to FIDO alongside AP2.
- Sources: https://newsroom.mastercard.com/news/press/2025/april/mastercard-unveils-agent-pay-pioneering-agentic-payments-technology-to-power-commerce-in-the-age-of-ai · https://www.mastercard.com/global/en/news-and-trends/stories/2025/agentic-commerce-framework.html

### FIDO Alliance (28 Apr 2026)

- New **Agentic Authentication TWG**, chaired by CVS Health, Google and OpenAI. Payments work sits in the Payments TWG, chaired by Mastercard and Visa.
- Three focus areas: **Verifiable User Instructions**, **Agent Authentication**, **Trusted Delegation for Commerce**.

### On-screen

- "Your limits, signed by you: one item, €120, this shop, until Sunday."
- "The agent can only sign a purchase that fits your signed limits."
- "A single-use payment token: one shop, one purchase, capped, expiring."

## 9. Agent identity: "Who is this agent?"

**VERDICT: correct in spirit. Statuses have moved on.**

- **Web Bot Auth:**
  - There is now an **IETF webbotauth Working Group**. Its adopted draft is **draft-ietf-webbotauth-httpsig-protocol-00 (1 Sep 2026)**, "HTTP Message Signatures for automated traffic", by T. Meunier (Cloudflare) and S. Major (Google), Standards Track intended.
  - The agent signs each request (RFC 9421). A `Signature-Agent` header points to where its public keys live (a JWKS directory, or a CIMD).
  - The older draft-meunier-web-bot-auth-architecture has been replaced.
  - Sources: https://datatracker.ietf.org/wg/webbotauth/documents/ · https://datatracker.ietf.org/doc/draft-ietf-webbotauth-httpsig-protocol/
- **OpenID Foundation whitepaper**, *"Identity Management for Agentic AI: The new frontier of authorization, authentication, and security for an AI agent world"*:
  - Published Oct 2025 by the OIDF AI Identity Management Community Group; lead author Tobin South. Also on arXiv as 2510.25819.
  - Key line: "User impersonation by agents should be replaced by delegated authority … explicit 'on-behalf-of' flows where agents prove their delegated scope while remaining identifiable as distinct from the user."
  - Sources: https://openid.net/new-whitepaper-tackles-ai-agent-identity-challenges/ · https://arxiv.org/abs/2510.25819
- **IETF agent on-behalf-of drafts** (all *individual* drafts, none adopted by a WG):
  - draft-oauth-ai-agents-on-behalf-of-user-02 (25 Aug 2025): **expired**. It proposed `requested_actor` and `actor_token`.
  - **draft-klrc-aiagent-auth-03 (Jul 2026)**, "AI Agent Authentication and Authorization" by Kasselman, Lombardo, Rosomakho, Campbell, Steele and later Parecki. It is active and applies WIMSE + the OAuth family without inventing a new protocol.
  - Others: draft-mcguinness-oauth-actor-profile, draft-mw-oauth-actor-chain, draft-niyikiza-oauth-attenuating-agent-tokens.
  - Sources: https://datatracker.ietf.org/doc/draft-oauth-ai-agents-on-behalf-of-user/ · https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/
- **NIST NCCoE** concept paper, "Accelerating the Adoption of Software and AI Agent Identity and Authorization" (5 Feb 2026). Source: https://www.nccoe.nist.gov/publications/other/accelerating-adoption-software-and-ai-agent-identity-and-authorization-concept
- **On-screen:**
  - "Agents sign their requests, so shops can tell who's knocking."
  - "Not pretending to be you: acting for you, and labelled as an agent."

## 10. Passkeys / WebAuthn

**VERDICT: correct.**

- WebAuthn Level 3 is now a **W3C Recommendation (25 Aug 2026)** *(summary-sourced)*. The spec says "the public key credential can only be accessed by origins belonging to that Relying Party. This scoping is enforced jointly by conforming User Agents and authenticators." So a look-alike site can't get a valid signature.
- **On-screen:** "Passkeys only work on the real site, so fake sites get nothing."
- **Sources:** https://www.w3.org/TR/webauthn-3/ · https://fidoalliance.org/passkeys/

## 11. Credential release and agents using password managers

**VERDICT: broadly correct, with nuance.**

- **Apple:** "Password AutoFill exposes no credential information to an app until a user consents to release a credential to the app." Face ID or Touch ID can gate the fill. Source: https://support.apple.com/guide/security/sec7aefe77c3/web
- **Chromium:** when passwords are autofilled on page load, the value is hidden from page JavaScript until the user interacts. Source: https://codereview.chromium.org/163843002/
- Safer phrasing: "Password managers fill only after you tap or confirm."
- **No cross-vendor standard yet**, but a clear common pattern has emerged ("credential injection"):
  1. The agent asks for a login *by name or site*, never for the secret.
  2. The user approves this task, often with a biometric.
  3. The password manager types the secret directly into the real site, through a channel the model can't read.
  4. Access is per task, the rest of the vault stays locked, and filled values are wiped if the login fails.
- Vendor examples (notes only):
  - 1Password "Secure Agentic Autofill" (Oct 2025, with Browserbase).
  - 1Password for Claude (16 Jul 2026): "the password and the MFA one-time code are never accessible to the model, its context, or Anthropic's systems." Per-task biometric approval; the vault locks to the granted items.
  - Bitwarden **Agent Access SDK** (24 Mar 2026): an "open protocol", Apache-2.0, alpha. The human approves each request, and the credential is E2E-encrypted and injected into a child process.
- The protocol-level twin is **MCP URL-mode elicitation** (item 7).
- Research version: **SUDP** (see flags below).
- Sources: https://1password.com/press/2026/july/1password-for-claude · https://1password.com/blog/closing-the-credential-risk-gap-for-browser-use-ai-agents · https://bitwarden.com/blog/introducing-agent-access-sdk/
- **On-screen:**
  - "The agent asks to log in. The vault fills it. The agent never sees it."
  - "You approve each login with a fingerprint, just for this task."

## 12. Prompt injection: OWASP

**VERDICT: needs correction. Your numbering is from the 2025 list, and a 2026 edition is out.**

- **OWASP Top 10 for LLM Applications 2025:** LLM01 Prompt Injection, **LLM06 Excessive Agency**. Correct for 2025.
- **OWASP GenAI LLM Top 10 2026, published 3 Aug 2026:**
  - **LLM01:2026 Prompt Injection** (still #1).
  - **LLM03:2026 Excessive Agency** (up from #6).
  - The rest: LLM02 Sensitive Info Disclosure, LLM04 Supply Chain, LLM05 Data & Model Poisoning, LLM06 Unbounded Consumption, LLM07 Misinformation, LLM08 Hidden Context Exposure (formerly System Prompt Leakage), LLM09 Vector & Embedding Weaknesses, LLM10 Improper Output Handling.
  - Confirmed from the official repo's `2026/final` folder.
- **OWASP Top 10 for Agentic Applications 2026 (9 Dec 2025):**
  - ASI01 Agent Goal Hijack
  - ASI02 Tool Misuse & Exploitation
  - ASI03 Identity & Privilege Abuse
  - ASI04 Agentic Supply Chain
  - ASI05 Unexpected Code Execution
  - ASI06 Memory & Context Poisoning
  - ASI07 Insecure Inter-Agent Communication
  - ASI08 Cascading Failures
  - ASI09 Human-Agent Trust Exploitation
  - ASI10 Rogue Agents
  - Names via Auth0's summary; the official PDF is on genai.owasp.org.
- **Documented indirect prompt-injection examples (notes):**
  - **Brave vs Perplexity Comet**, the best fit for a shopping or browsing agent. Hidden instructions in a Reddit comment made the agentic browser grab the user's email, open a look-alike domain, read a Gmail OTP and exfiltrate it. Reported 25 Jul 2025, disclosed 20 Aug 2025. https://brave.com/blog/comet-prompt-injection/
  - **EchoLeak, CVE-2025-32711** (M365 Copilot, zero-click via email; "AI command injection", published 11 Jun 2025). https://cveawg.mitre.org/api/cve/CVE-2025-32711 · https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-32711
  - **"Whisper attacks" on AP2** (arXiv 2609.11757, 10 Sep 2026): product descriptions steer shopping agents into purchases that *pass mandate validation but violate user intent*. 56–90% success. https://arxiv.org/abs/2609.11757
- **On-screen:**
  - "Web pages can hide instructions for the agent."
  - "Prompt injection: #1 risk on OWASP's 2026 list."
- **Sources:** https://genai.owasp.org/llm-top-10/ · https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ · https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/tree/main/2026/final · https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ · https://auth0.com/blog/owasp-top-10-agentic-applications-lessons/

## 13. Confused deputy, lateral movement, and "intersection" scoping

**VERDICT: correct. Well supported.**

- **Microsoft Zero Trust developer guidance** states the intersection explicitly: effective permissions are "the least-privileged intersection of the delegated permissions the app has been granted … and the privileges of the currently signed-in user. Your app can never have more privileges than the signed-in user." https://learn.microsoft.com/en-us/security/zero-trust/develop/developer-strategy-delegated-permission
- **OWASP LLM03:2026 "Execute tools in user's context":** "ensure actions taken on behalf of a user are executed on downstream systems in the context of that specific user, and with the minimum privileges necessary … preserve the original user context and authorization scope across chained tool or agent calls, rather than relying only on the permissions of the calling agent." https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM03_ExcessiveAgency.md
- **OIDF whitepaper:**
  - "Apply least privilege rigorously … permissions … consistent with the permissions of the users to whom they will output information."
  - Recursive delegation needs "scope attenuation", meaning permissions are "progressively narrowed at each step".
- **MCP Security Best Practices:**
  - A named "Confused Deputy Problem" section about OAuth proxies.
  - Token passthrough is forbidden.
  - Its "Scope Minimization" section says a broad stolen token "enables lateral data access, privilege chaining".
- **OWASP ASI03** Identity & Privilege Abuse.
- **On-screen:** "The agent gets only what you can do and what its job needs."

## 14. Human-in-the-loop with a fresh factor (step-up)

**VERDICT: correct.**

- **OWASP LLM03:2026 "Require user approval":** "Use human-in-the-loop control to require a human to approve high-impact actions before they are taken."
- **MCP Tools spec:** "there SHOULD always be a human in the loop with the ability to deny tool invocations."
- **RFC 9470, OAuth 2.0 Step Up Authentication Challenge (Sep 2023):**
  - The resource server returns `insufficient_user_authentication` with `acr_values` / `max_age` to demand a stronger or more recent login.
  - Its own motivating example is **e-commerce purchases above a threshold**.
  - https://www.rfc-editor.org/rfc/rfc9470
- **OIDF whitepaper:** "Risk-Based Dynamic Authorization … an anomalous request would dynamically trigger a CIBA flow to request explicit, out-of-band human approval." It also cites EU AI Act Art. 14 human oversight.
- **W3C Secure Payment Confirmation** (Candidate Recommendation Draft, 2 Jul 2026, *summary-sourced*): the browser must show payee and amount, and both are inside the passkey-signed data. https://www.w3.org/TR/secure-payment-confirmation/
- Vendor (notes): Auth0 on the OWASP agentic list, "When an agent suggests something irreversible … trigger a fresh MFA challenge."
- **On-screen:** "Over the limit? Your phone asks first: fingerprint to approve."

## 15. Open problems (coda)

**VERDICT: all four are supported by the OIDF whitepaper.** NIST NCCoE is a secondary source.

- **Consent fatigue:** "Users will face thousands of authorization requests … creating security risks from reflexive approval"; "'consent fatigue' … paradoxically reduces security as users begin reflexively approving".
- **Verifiable agent identity:** "Agent identity fragmentation"; "agents often act indistinguishably from users".
- **Headless / background agents:** "how does the user grant authentication … for semi-autonomous agents operating in the background … necessitates architectures that can handle asynchronous, out-of-band authorization".
- **Sites with no OAuth (password-only, browser agents):** "Browser and computer-use agents break the current authorization paradigm … bypass all traditional API-based authorization controls."
- Also flagged as unsolved:
  - **Revocation** across delegation chains: "A critical, and largely unsolved, problem … is revocation".
  - **Recursive delegation.**
- **Additional open problem:** signed limits don't guarantee a good *decision*. An agent can be manipulated into a purchase that still fits the mandate (arXiv 2609.11757).
- **Sources:** https://arxiv.org/abs/2510.25819 · https://www.nccoe.nist.gov/publications/other/accelerating-adoption-software-and-ai-agent-identity-and-authorization-concept

---

## Flags on the earlier (ChatGPT-generated) claims

| Claim | Verdict | Correct version |
|---|---|---|
| "MCP requires OAuth 2.1/PKCE for ChatGPT plugins" | **Wrong.** | ChatGPT plugins were shut down in 2024: new plugin chats ended 19 Mar 2024 and all plugin chats ended 9 Apr 2024. MCP is a separate protocol. MCP authorization is *optional*, but when HTTP authorization is used it builds on OAuth 2.1 and clients MUST use PKCE (S256). |
| "PAR is RFC 9125" | **Wrong.** | PAR (Pushed Authorization Requests) is **RFC 9126** (Sep 2021). RFC 9125 is a BGP/segment-routing document. https://www.rfc-editor.org/rfc/rfc9126 |
| "EU AI Act comes into force ~2027" | **Wrong / misleading.** | It **entered into force 1 Aug 2024** (Reg. (EU) 2024/1689) and applies in phases: prohibitions from Feb 2025, GPAI from Aug 2025, most rules from Aug 2026. The **Digital Omnibus on AI** (Reg. (EU) 2026/1744, in force late July 2026, *summary-sourced via Orrick*) moved Annex III high-risk obligations to **2 Dec 2027** and Annex I product-embedded ones to **2 Aug 2028**. Safe phrasing: "in force since 2024; high-risk rules phase in 2027–2028." https://eur-lex.europa.eu/eli/reg/2024/1689/oj · https://www.orrick.com/en/Insights/2026/07/EU-AI-Act-Update-Digital-Omnibus-Finalizes-8-Compliance-Changes |
| "SUDP" | **Exists.** | *SUDP: Secret-Use Delegation Protocol for Agentic Systems*, Yu, Geng, Zeng, Knottenbelt, arXiv 2604.24920 (v1 27 Apr 2026, v3 22 May 2026). Three roles: **requester** (the agent), **user**, **custodian**. The user authorises one canonical operation with a fresh authenticator-backed grant, and the custodian performs the bounded use. "Reusable authority never crosses the requester boundary." It's an academic proposal, not a standard. https://arxiv.org/abs/2604.24920 · https://github.com/xhyumiracle/sudp |

---

## Safe on-screen lines (≤ 15 words)

1. "OAuth 2.1 (draft): PKCE always. No password sharing. No tokens in URLs." [§1]
2. "PKCE: only the app that started the sign-in can finish it." [§2, RFC 7636, MCP sec.]
3. "No screen? The agent shows a code; you approve on your phone." [§3, RFC 8628]
4. "The agent asks; your phone buzzes; you approve. No browser needed." [§3, CIBA]
5. "Matching codes on both screens prove it's the same request." [§3, CIBA binding_message]
6. "Permissions can be precise: this amount, this merchant, this purpose." [§4, RFC 9396]
7. "Tokens tied to the agent's key: stolen copies don't work." [§5, RFC 9449]
8. "Swap a broad pass for a narrower one, labelled 'agent'." [§6, RFC 8693]
9. "One tap revokes it: the agent's pass stops working." [§6, RFC 7009]
10. "Each tool server says which login it trusts." [§7, RFC 9728 / MCP]
11. "Every token is addressed to one server and can't be passed on." [§7, RFC 8707 / MCP]
12. "Need more access? Ask the user again, just for that step." [§7, MCP step-up]
13. "Passwords and card numbers go into a page the agent can't see." [§7, MCP URL elicitation]
14. "Your rules, signed by you: one item, €120, this shop, until Sunday." [§8, AP2 open mandates]
15. "At 3 a.m. the agent signs the exact cart, but only within your rules." [§8, AP2 closed mandates]
16. "The shop and bank check the cart against your signed rules." [§8, AP2]
17. "Single-use payment token: one shop, one purchase, capped, expiring." [§8, ACP Allowance / network tokens]
18. "The agent never sees your card number." [§8, ACP / VIC / Agent Pay]
19. "Agents sign their requests, so shops can tell who's knocking." [§9, Web Bot Auth]
20. "Not pretending to be you: acting for you, and labelled as an agent." [§9, OIDF]
21. "Passkeys only work on the real site, so fake sites get nothing." [§10, WebAuthn]
22. "The agent asks to log in. The vault fills it. The agent never sees it." [§11]
23. "You approve each login with a fingerprint, just for this task." [§11]
24. "Web pages can hide instructions meant for your agent." [§12, OWASP LLM01:2026]
25. "The agent gets only what you can do and what its job needs." [§13, Microsoft / OWASP LLM03:2026]
26. "Big or irreversible? Your phone asks first, with a fresh fingerprint." [§14, OWASP / RFC 9470]
27. "Too many prompts and people stop reading them: consent fatigue." [§15, OIDF]
28. "Most sites still only have passwords, with no way to delegate." [§15, OIDF browser-agent gap]
29. "A signed limit caps the damage. It can't guarantee a good choice." [§15, arXiv 2609.11757]

Avoid:
- "OAuth 2.1 standard/RFC". Use "OAuth 2.1 (draft)".
- "MCP requires OAuth". Use "MCP's optional authorization is built on OAuth".
- "Intent mandate / cart mandate" as current names.
- "OWASP LLM06 Excessive Agency" without saying "2025".

---

## Ideas the research suggests (concrete, accurate, visual)

1. **Open vs closed mandate: two signatures, two moments.**
   - Friday evening: the user signs a "rules card" on a trusted screen (merchant, 1 item, ≤ €120, until Sunday). This is the open mandate.
   - 3 a.m.: the agent fills in the exact cart and signs it with a key the rules card endorsed. This is the closed mandate.
   - Shop and bank check that card against cart.
   - Animate as a stencil (the rules) and a filled-in form that must fit it. (AP2 v0.2)
2. **Selective disclosure.** The shop sees only the constraints it needs: merchant and items. The bank sees only the payment ones. Animate as the rules card with parts blurred per viewer. (AP2: "Only constraints relevant … are shared"; SD-JWT)
3. **Use-once and receipts.** After the purchase, a signed receipt "spends" the rules card, so "limit: 1" is enforced and a second drop at 3:05 a.m. can't trigger another buy. (AP2 receipts; OIDF "credentials constrained by execution counts")
4. **Disposable card.** A one-time, merchant-locked, amount-capped, expiring payment token. Visual: a card that dissolves after one swipe. (ACP Allowance `one_time` / `max_amount` / `merchant_id` / `expires_at`; network agentic tokens)
5. **Agent badge at the shop door.** Each HTTP request carries a signature, and a `Signature-Agent` header points to a public key directory, so the shop can tell a known shopping agent from a scalper bot. (Web Bot Auth WG draft; Visa TAP)
6. **What-you-see-is-what-you-sign.** For an out-of-policy case, e.g. the price rose to €130: a browser- or OS-controlled dialog shows "€130 to Shop Y", and the passkey signature covers exactly that amount and payee. (W3C Secure Payment Confirmation; PSD2-style dynamic linking; RFC 9470 step-up with its e-commerce threshold example)
7. **Out-of-band approval with matching words.** CIBA `binding_message`: the same short phrase appears in the agent app and on the phone lock screen ("Approve: SNEAKER-42 €119").
8. **The sealed window.** MCP URL-mode elicitation: the agent opens a system browser sheet it cannot read, and the user types the secret there. Spec detail: SFSafariViewController is fine, an embedded WKWebView is not.
9. **Vault fills, agent sees asterisks.** Credential injection with per-task biometric approval. The vault "locks down" to only the granted login, and filled values are wiped if the login fails.
10. **Token addressed to one door.** Audience-bound token (RFC 8707 `resource`), with a key-bound token (DPoP) on top: a stolen token is useless at another server and useless without the agent's key.
11. **Kill switch.** One revoke action (RFC 7009) and the agent's pass stops working. Note the honest caveat from the OIDF paper: propagating revocation across chains of sub-agents is "largely unsolved".
12. **Coda twist:** "Signed ≠ wise." Whisper-attack research shows a manipulated agent can buy the wrong thing *within* your signed limits. The limits cap the blast radius; human review of anything unusual still matters.
