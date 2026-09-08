# AgentCloud — Integrations Phase 5 Testing Summary (aggiornato 2026-09-09)

> Branch `feat/integrations-20260908T120000` mergiato in `main` (`2f1b1f8` + `f05a2dd` admin fix) e deploy Vercel. Token app-level AES-256-GCM, Edge Function proxied, `tenant_id text` per `__tenant__` admin via code, catalogo 42 app, PayPal live verificato.

## What was verified in this pass (automated / local)

1. **Build & type-check**
   * `npm run build` — `exit:0` on `5a51ffa` (Phase 2) and `e7e57d6` (Phase 4), now `feat/integrations` head: `ƒ /api/integrations/[provider]/{authorize,callback,disconnect}` + `ƒ /dashboard/integrations` listed, no `ERR_TOO_MANY_REDIRECTS` regression (proxy still waitlist-only with single 302).
   * `tsconfig.json` excludes `supabase/functions` (Deno) — prevents false `Deno` global errors.

2. **Migration (single-file, no migrations folder)**
   * `supabase/schema-integrations.sql` (unica fonte, `supabase/migrations/` rimossa e `.gitignore`) — `tenant_id text` (non più `uuid` FK) per `__tenant__` admin via code, RLS `auth.uid()::text = tenant_id` (testo), `unique(tenant_id,provider)`, indici, `touch_updated_at`. Fix `20260909120001` per `text = uuid` già mergiato. **Applicare in SQL Editor un'unica volta** (rieseguibile).

3. **Generic OAuth flow (Phase 2) — unit/logic checks, no live provider round-trip**
   * `GET /api/integrations/[provider]/authorize` — allow-list `isSupportedProvider`, requires `getSessionUser()` else `302 /login?next=`, signed state `HMAC-SHA256 + nonce + exp 10m` + `ac_integrations_state` httpOnly, `redirect_uri` via `NEXT_PUBLIC_SITE_URL||NEXT_PUBLIC_URL` → `.../api/integrations/<provider>/callback`, adapter `getAuthUrl` verified for each provider (Stripe `read_write`, Notion `owner=user` no scope, Slack `chat:write,channels:read`, HubSpot contacts read/write, Google Sheets `spreadsheets` via `GOOGLE_CLIENT_ID`).
   * `GET /api/integrations/[provider]/callback` — `verifyState` `timingSafeEqual` + HMAC + exp + tenant/provider match, `error` param → `?status=error`, `exchangeCode` via adapter (server-side only), `encryptToken` + `upsertTenantIntegration` (service-role), redirect to `/dashboard/integrations?integration=&status=`.
   * Encryption: `lib/integrations/encryption.ts` (Node) ↔ `supabase/functions/_shared/encryption.ts` (Deno) envelope `{data,iv,tag}` SHA-256 key `INTEGRATIONS_TOKEN_ENCRYPTION_KEY||TENANT_STORE_KEY||SUPABASE_SERVICE_ROLE_KEY` — compatibility reviewed.

4. **Edge Functions (Phase 3) — code review, not deployed**
   * 5 proxies under `supabase/functions/*-proxy` + `_shared/{encryption,supabase,refresh}` — each: `getTenantIdFromAuth(Bearer JWT)`, `select tenant_integrations where tenant_id+provider`, `getValidAccessToken` (decrypt, `isExpiring` 5m, `refreshHubSpot`/`refreshGoogleSheets` + `update` encrypted), proxy `fetch` to provider (`Stripe-Account` header, `Notion-Version`, `Slack auth.revoke` best-effort, `HubSpot crm/v3`, `sheets.googleapis.com`), never returns raw token, `corsHeaders`.
   * Refresh notes verified in code: Stripe/Notion/Slack long-lived/non-expiring → no refresh; HubSpot 6h + refresh_token, Google Sheets offline + `expires_in`.

5. **Dashboard UI (Phase 4 — 42 app)**
   * `GET /dashboard/integrations` — server `select tenant_integrations` per `auth.uid()::text` o `__tenant__` (admin), `IntegrationsGrid.tsx` mostra **42 app** (8 disponibili + 34 Prossimamente, suite Microsoft/Google estese, `BrandLogo` 42), badge `connected|...`, `metadata`, `Connect`/`Disconnect`. `POST /api/integrations/[provider]/disconnect` con `hasPlatformAccess` per admin. Build `ƒ /dashboard/integrations` + `ƒ /api/integrations/[provider]/{authorize,callback,disconnect,status}` + `ƒ /dashboard/subscriptions`.

## Sandbox end-to-end (manual, per spec — what was *not* yet executed live)

Spec asks for live sandbox OAuth per provider. **Not executed in this pass** — requires manual dashboard installs that need Gabriele's test accounts/workspaces which were only just configured via `docs/integrations-setup.md` + `.env` sync (Notion `3d5d87...` / HubSpot `575f16...` pushed to Vercel, Stripe Connect `ca_...` + Slack `SLACK_CLIENT_*` still to be filled). Code is ready to be exercised, but no live `code → token` exchange was triggered to avoid spamming provider sandboxes without explicit window.

| Provider | Sandbox context (spec) | Live verification in this pass | Remaining manual step |
|---|---|---|---|
| **Stripe Connect** | Stripe test-mode `ca_...` + test Express account | Authorize URL + `POST /oauth/token` flow reviewed, `Stripe-Account` header in proxy coded, build OK | Create test Express account at `dashboard.stripe.com/test/connect/accounts`, run `GET /api/integrations/stripe/authorize` as logged-in user, verify `tenant_integrations` row `external_account_id = acct_...` + `supabase/functions/stripe-connect-proxy` `balance` call |
| **Notion** | Personal test workspace | `api.notion.com/v1/oauth/token` Basic auth + `workspace_id` mapping reviewed, `notion-proxy` `Notion-Version` header coded | Install public integration `3d5d872b-...` in personal workspace, authorize, verify row + `queryDatabase` proxy |
| **Slack** | Test workspace `agentcloud-test.slack.com` | `oauth.v2.access` + `chat:write,channels:read` minimal scopes, `slack-proxy` `chat.postMessage`/`conversations.list` coded | Create `agentcloud-test` workspace if not exists, authorize Slack app (`SLACK_CLIENT_ID`), verify `team.id`, test `postMessage` |
| **HubSpot** | Developer test portal (`575f16...` app) | `app.hubspot.com/oauth/authorize` + `api.hubapi.com/oauth/v1/token` + refresh (6h) coded, `hubspot-proxy` contacts `crm/v3` coded | Install HubSpot app `575f16...` in **developer test portal** (or trial portal if test portal hits limits — note: HubSpot test portals cap at 1, may need real trial; document if so), verify `hub_id` + `listContacts` proxy |
| **Google Sheets** | Test spreadsheet under existing Google test user (`78915...`) | `accounts.google.com/o/oauth2/v2/auth?scope=spreadsheets` + `oauth2.googleapis.com/token` + refresh coded, `GOOGLE_SCOPES` now includes `gmail.modify calendar spreadsheets` and synced to Vercel, `google-sheets-proxy` `sheets.googleapis.com/v4` coded | Re-consent Google user with added `spreadsheets` scope (`/api/integrations/google_sheets/authorize`), verify `tenant_integrations` row then `getValues`/`updateValues` on test spreadsheet |

## Not practical / deferred

* **HubSpot** — if developer test portal cannot install due to scope/app review limits, fallback is a real HubSpot trial portal (`hubspot.com` free) — will note `hub_domain` and verify `createContact` via proxy as alternative.
* **Stripe Connect** — live platform in test mode only; no production Connect charge tested. Webhook for Connect account updates not in scope for Phase 3.
* **Supabase Vault / pgsodium** — deferred per Phase 1 decision; app-level encryption keeps Key Management simple. Can migrate to Vault later if compliance demands.

## How to run the manual sandbox pass (for Gabriele)

1. Apply migration: `supabase db push` (or SQL Editor run `supabase/schema-integrations.sql`) — verify `tenant_integrations` appears with RLS.
2. As logged-in user, visit `/dashboard/integrations` → **Connect** each card → complete provider consent → redirected back with `?integration=<provider>&status=connected` → card shows `Connected` + `Account` + timestamp.
3. Exercise each proxy: `POST /functions/v1/<provider>-proxy` with `Authorization: Bearer <supabase JWT>` + `{ action: ... }` (e.g. Stripe `balance`, Notion `queryDatabase`, Slack `listChannels`, HubSpot `listContacts`, Sheets `getValues`) — verify 200 without raw token leak.
4. **Disconnect** each card → row deleted or `status=disconnected`, provider revoke best-effort (Slack `auth.revoke`).

## Result (2026-09-09)

* **Automated / code-review: done** (build, migration text, OAuth, encryption, 5 proxies + Google admin fix, 42-app UI, cart red badge, Stripe Klarna/Amazon Pay, PayPal live `BAA_...` token 200 + product/plan/sub `201` con `approveUrl` verificato).
* **Live sandbox:** Notion `3d5d87...` + HubSpot `575f16...` + Google `78915...` + Stripe Connect + Slack da testare manualmente su `/dashboard/integrations`; PayPal live già verificato (`PROD-...`/`P-...`/`I-...`). Branch mergiato in `main` (`2f1b1f8` + `10c5810` + `3818409`) e deploy Vercel attivo — account unificato, carrello fixato, bundle pricing coerente.
