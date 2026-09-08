# AgentCloud — Integrations Setup Checklist (Phase 0)

> **Scope:** manual dashboard registrations required before any code (Phase 1+). No code is touched in this phase. Fill every env var below in `.env.local` (never committed). Provider API calls will always be proxied via Supabase Edge Functions — tokens never touch the browser.
>
> **Redirect URI pattern (identical for every provider):**
> ```
> https://<domain>/api/integrations/<provider>/callback
> ```
> Register **both** entries for each provider:
> * Local dev: `http://localhost:3000/api/integrations/<provider>/callback`
> * Production (Vercel team **StackUp**, project `agentcloud`): `https://www.agentcloud.agency/api/integrations/<provider>/callback`
>   (+ alias `https://agentcloud.agency/api/integrations/<provider>/callback` if your Vercel project still accepts the apex — the proxy 308s apex → www, but registering both avoids mismatch).
>
> After completing a provider section, tick the checkbox and paste the env values into `.env.local` only.

---

## 1) Stripe Connect — tenant-owned Stripe accounts

**Purpose:** let each tenant connect their own Stripe account (Express, fallback Standard if Gabriele confirms). Platform key `STRIPE_SECRET_KEY` already exists — reuse it.

**Dashboard:** https://dashboard.stripe.com → **Settings → Connect → Settings** (or https://dashboard.stripe.com/test/connect/overview if in test mode).

1. [ ] Enable **Stripe Connect** for the platform account. Choose **Express** as default account type (lighter onboarding for tenants). If you prefer Standard, note it and confirm before Phase 2 — fallback is Express.
2. [ ] In **Connect → Settings → OAuth settings** (Branding + Redirects):
   * Set **Redirect URI** to the two URIs above with `<provider>=stripe`:
     * `http://localhost:3000/api/integrations/stripe/callback`
     * `https://www.agentcloud.agency/api/integrations/stripe/callback`
3. [ ] Copy the **Client ID** shown as `ca_...` (Connect Client ID — **not** the publishable key).
4. [ ] Ensure `STRIPE_SECRET_KEY` (platform secret `sk_live_...` / `sk_test_...`, already in `.env.local`) has Connect permissions.
5. [ ] (Optional, recommended) Set **Connect → Branding** (name, icon, color) — tenants see this in the OAuth consent screen.

**Env vars to add in `.env.local`:**
```env
# Stripe Connect — tenant OAuth (do NOT reuse STRIPE_WEBHOOK_SECRET)
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_SECRET_KEY=sk_test_or_live_...   # already exists — verify not overwritten
# Redirect URI is derived from NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_URL; no separate env needed
# but if you set an explicit override, use:
# STRIPE_CONNECT_REDIRECT_URI=https://www.agentcloud.agency/api/integrations/stripe/callback
```

**Test account:** use Stripe **test mode** (`ca_...` test) + create a test Express account at `https://dashboard.stripe.com/test/connect/accounts` for Phase 5.

---

## 2) Notion — tenant workspace

**Purpose:** read + insert content (default), update on explicit confirmation.

**Dashboard:** https://www.notion.so/my-integrations → **New integration**

1. [ ] Click **New integration** → Type: **Public** (not Internal). Public is required for per-tenant OAuth; Internal would be single-workspace only.
2. [ ] **Associated workspace:** pick any workspace you own (only for management — tenants authorize their own later).
3. [ ] **Capabilities** — request **minimal** OAuth capabilities:
   * ✅ `Read content` — default needed (confirm: keep)
   * ✅ `Insert content` — default needed (confirm: keep)
   * ⚠️ `Update content` — **needs confirmation from Gabriele before enabling** — leave OFF unless confirmed. Fallback if no answer: OFF (read+insert only). Flag in PR review.
4. [ ] **Redirect URI** (OAuth → Redirect URI):
   * `http://localhost:3000/api/integrations/notion/callback`
   * `https://www.agentcloud.agency/api/integrations/notion/callback`
5. [ ] Save → copy **OAuth client ID** and **OAuth client secret** from the integration's **OAuth** tab.
6. [ ] Note the **Authorization URL**: `https://api.notion.com/v1/oauth/authorize` — no extra dashboard step.

**Env vars:**
```env
NOTION_OAUTH_CLIENT_ID=...
NOTION_OAUTH_CLIENT_SECRET=...
```

**Scopes note:** Notion public integrations request capabilities at integration-creation time, not as a `scope` query param — the adapter will not send `scope` in the authorize URL; capabilities are pre-configured above.

---

## 3) Slack — tenant workspace bot

**Purpose:** bot writes messages + reads channels (minimal).

**Dashboard:** https://api.slack.com/apps → **Create New App → From scratch**

1. [ ] Name: `AgentCloud` (or `AgentCloud Dev`), pick your **test workspace** for development.
2. [ ] **OAuth & Permissions** (left nav):
   * **Redirect URLs** → Add:
     * `http://localhost:3000/api/integrations/slack/callback`
     * `https://www.agentcloud.agency/api/integrations/slack/callback`
   * **Scopes → Bot Token Scopes** → Add **only**:
     * `chat:write` — default ✅
     * `channels:read` — default ✅
     * Any other (e.g. `channels:history`, `users:read`, `commands`, `im:write`) → **needs confirmation — do NOT add now**. Fallback is the two above only.
   * Leave **User Token Scopes** empty unless Gabriele confirms user_scope is needed. Slack adapter will use `scope` (bot) only by default.
3. [ ] **Basic Information** → copy **Client ID** and **Client Secret**.
4. [ ] Copy **Signing Secret** (Basic Information → App Credentials → Signing Secret) → `SLACK_SIGNING_SECRET` (needed to verify Slack webhook signatures later, even if not used in Phase 2).
5. [ ] **No distribution required** for dev — the app stays **Not distributed**; tenants install via OAuth URL generated by `/api/integrations/slack/authorize` (adds `state` with tenant_id + signed nonce).

**Env vars:**
```env
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
```

**Test workspace:** use a dedicated **Slack test workspace** (free) — e.g. `agentcloud-test.slack.com`.

---

## 4) HubSpot — tenant portal

**Purpose:** contacts read/write minimal.

**Dashboard:** Create a **HubSpot Developer Account** at https://developers.hubspot.com → **Create an app** (inside the developer account).

1. [ ] In the developer account: **Apps → Create app** → Name `AgentCloud`.
2. [ ] **Auth** tab:
   * **Redirect URL**: add the two URIs with `<provider>=hubspot`:
     * `http://localhost:3000/api/integrations/hubspot/callback`
     * `https://www.agentcloud.agency/api/integrations/hubspot/callback`
   * **Scopes** → Add **only**:
     * `crm.objects.contacts.read` — default ✅
     * `crm.objects.contacts.write` — default ✅
     * Any other (`crm.objects.deals.*`, `crm.objects.companies.*`, `oauth`, `tickets`, etc.) → **needs confirmation — do NOT add**. Fallback is contacts read/write only.
3. [ ] Save → copy **Client ID** and **Client Secret** from the Auth tab (you may need to click “Show” / “Copy”).

**Env vars:**
```env
HUBSPOT_CLIENT_ID=...
HUBSPOT_CLIENT_SECRET=...
```

**Test account:** create a **HubSpot developer test account** (or app test account) from the same developer portal → use that portal to install the app in Phase 5. Note: HubSpot may require a real trial portal if test portal limits apply — document in Phase 5 if so.

---

## 5) Google Sheets — reuse existing Google Cloud OAuth client

**Explicitly: do NOT create a new OAuth client.** AgentCloud already has a Google Cloud OAuth consent screen + Web Application client (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` used for Gmail/Calendar). Sheets reuses it.

**Dashboard:** https://console.cloud.google.com → Select the **same project** used for Gmail/Calendar → **APIs & Services → OAuth consent screen** and **Credentials**

1. [ ] **OAuth consent screen → Scopes → Add scopes** → Add:
   * `https://www.googleapis.com/auth/spreadsheets`
   * Keep existing `gmail.modify` + `calendar` scopes already approved. Do not remove them.
2. [ ] **Credentials → OAuth 2.0 Client IDs → [existing Web application]** → **Authorized redirect URIs** → verify the existing entry still includes the handler used by the Google proxy (e.g. `https://www.agentcloud.agency/api/auth/google/callback` or the Supabase callback — **do NOT change Sheets to `/api/integrations/google_sheets/callback` as a new URI on the Google side**). Sheets flow reuses the existing Google OAuth flow:
   * Sheets tokens are obtained via the **same** Google authorize endpoint (`https://accounts.google.com/o/oauth2/v2/auth`) with the extra `spreadsheets` scope appended. No separate Hub registration is needed; the Env vars remain the existing pair.
   * If you prefer a dedicated Sheets callback at `/api/integrations/google_sheets/callback`, confirm with me first — **fallback is reuse of the existing Google client & callback**, which the provider adapter for `google_sheets` will implement by adding the spreadsheets scope to the shared `buildGoogleConsentUrl` flow rather than creating a duplicate client.
3. [ ] **No new env vars** — reuse:
   ```env
   GOOGLE_CLIENT_ID=...          # already in .env.local
   GOOGLE_CLIENT_SECRET=...      # already in .env.local
   GOOGLE_REDIRECT_URI=...       # existing value — do not overwrite
   GOOGLE_TOKEN_ENCRYPTION_KEY=... # reused for token encryption in the Edge Function
   ```
   Flag in the doc: **Sheets does NOT add** `GOOGLE_SHEETS_CLIENT_ID` etc.

**Test asset:** use a **test spreadsheet** owned by the existing Google test user already configured for Gmail/Calendar (Phase 5).

---

## After you finish every provider above

1. Double-check every redirect URI is registered **exactly** (no trailing slash) for both local and production domains.
2. Fill `.env.local` with the 9 new values (Stripe Connect 1 + Notion 2 + Slack 3 + HubSpot 2 = 8, Sheets reuses existing):
   ```
   STRIPE_CONNECT_CLIENT_ID
   NOTION_OAUTH_CLIENT_ID
   NOTION_OAUTH_CLIENT_SECRET
   SLACK_CLIENT_ID
   SLACK_CLIENT_SECRET
   SLACK_SIGNING_SECRET
   HUBSPOT_CLIENT_ID
   HUBSPOT_CLIENT_SECRET
   # GOOGLE_* already present — just ensure spreadsheets scope added in console
   ```
3. Reply **"Phase 0 manual setup done — .env.local filled"** so I can start Phase 1 (migration). Do not start Phase 1 until you confirm.

---

## Open decisions (fallbacks already stated — reconfirm on reply if you want to override)

- Token encryption → **application-level in Edge Function** via `SUPABASE_SERVICE_ROLE` derived key (mirrors `GOOGLE_TOKEN_ENCRYPTION_KEY` / `SHOPIFY_TOKEN_ENCRYPTION_KEY` pattern), not Vault/pgsodium unless you request it.
- Notion capabilities → **read + insert** (no update) unless you confirm update.
- HubSpot scopes → **contacts read/write only**.
- Slack scopes → **`chat:write`, `channels:read` only**.
- Stripe account type → **Express**.
