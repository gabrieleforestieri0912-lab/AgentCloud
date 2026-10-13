import type { IntegrationProvider, TokenExchangeResult } from "../types";
import { providerRequest } from "../http";

/**
 * Microsoft Outlook (email + calendario) via Microsoft Graph — OAuth 2.0
 * authorization_code + PKCE, permessi DELEGATI (mai app-only).
 *
 * Perché un provider separato da `microsoft`: la connessione Microsoft 365
 * esistente copre file/note (Files.ReadWrite, Notes.ReadWrite) e allargare i
 * suoi scope a Mail/Calendars imporrebbe a tutti il consenso email anche a chi
 * usa solo Word. Con un provider dedicato (`microsoft_outlook`) il consenso è
 * incrementale: l'utente collega Outlook solo se usa email/calendario, sulla
 * STESSA registrazione app Entra (stesso client id, redirect diverso).
 *
 * Env: MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID (default "common"),
 * MS_OUTLOOK_SCOPES (override completo), MS_OUTLOOK_REDIRECT_URI (opzionale,
 * vedi registry.getRedirectUri — auth e callback restano coerenti).
 *
 * Scope (cfr. verifica docs ottobre 2026, tutti gratuiti, nessun metering su
 * mail/calendar, throttling Outlook 10.000 richieste/10min per app+mailbox):
 * offline_access, User.Read, Mail.Read, Mail.ReadWrite (bozze),
 * Calendars.ReadWrite, Mail.Send. `Mail.Send` è incluso perché il tool
 * outlook_send_message esiste e richiede comunque approvazione esplicita
 * (tool-confirmation.ts): lo schermo di consenso Microsoft lo mostra in chiaro.
 */

const DEFAULT_OUTLOOK_SCOPES = [
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.ReadWrite",
  "Calendars.ReadWrite",
  "Mail.Send",
];

const GRAPH_ME = "https://graph.microsoft.com/v1.0/me";

/**
 * Il tenant entra nella URL di autorizzazione e di token: va validato o un env
 * malformato costruirebbe una URL arbitraria. Stesse regole del provider
 * `microsoft` (vedi providers/microsoft.ts).
 */
function tenantSegment(): string {
  const raw = (process.env.MS_TENANT_ID || "common").trim().toLowerCase();
  const allowed =
    raw === "common" || raw === "organizations" || raw === "consumers"
      ? raw
      : /^[a-z0-9.-]+$/.test(raw)
        ? raw
        : null;
  if (!allowed) {
    throw new Error(
      "MS_TENANT_ID non valido: usa 'common' oppure il tuo dominio/GUID tenant",
    );
  }
  return allowed;
}

function authBase(tenant: string): string {
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`;
}

function scopes(): string {
  const override = process.env.MS_OUTLOOK_SCOPES?.trim();
  const list = override
    ? override.split(/[,\s]+/).filter(Boolean)
    : [...DEFAULT_OUTLOOK_SCOPES];
  return list.join(" ");
}

function requireClientId(): string {
  const clientId = process.env.MS_CLIENT_ID || "";
  if (!clientId) {
    throw new Error("Microsoft non configurato (MS_CLIENT_ID mancante nel file .env)");
  }
  return clientId;
}

/**
 * Identità del token: GET /me su Graph. Best-effort: serve per l'etichetta in UI
 * (quale account è collegato) e per capire se il token è ancora buono.
 */
async function bestEffortWhoami(accessToken: string): Promise<{
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}> {
  const res = await providerRequest(GRAPH_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
    providerLabel: "Microsoft Graph",
    maxRetries: 1,
  });
  if (!res.ok || !res.json || typeof res.json !== "object") return {};
  const j = res.json as Record<string, unknown>;
  return {
    id: typeof j.id === "string" ? j.id : undefined,
    displayName: typeof j.displayName === "string" ? j.displayName : undefined,
    mail: typeof j.mail === "string" ? j.mail : undefined,
    userPrincipalName:
      typeof j.userPrincipalName === "string" ? j.userPrincipalName : undefined,
  };
}

type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

/**
 * Token Graph durano ~1h: se Microsoft non manda `expires_in` si ripiega su 1h
 * così il refresh automatico resta corretto.
 */
function expiresAtFrom(expiresIn: number | undefined): string {
  const seconds = typeof expiresIn === "number" && expiresIn > 0 ? expiresIn : 3600;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export const microsoftOutlookProvider: IntegrationProvider = {
  provider: "microsoft_outlook",

  getAuthUrl({ state, redirectUri, pkce }) {
    const clientId = requireClientId();
    if (!pkce?.codeChallenge) {
      throw new Error("Microsoft richiede PKCE: code_challenge non disponibile");
    }
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: scopes(),
      state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: "S256",
    });
    return `${authBase(tenantSegment())}/authorize?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri, codeVerifier }): Promise<TokenExchangeResult> {
    const clientId = requireClientId();
    const clientSecret = process.env.MS_CLIENT_SECRET || "";
    if (!codeVerifier) {
      throw new Error("Microsoft Outlook PKCE: code_verifier mancante");
    }
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      scope: scopes(),
    });

    const res = await providerRequest(`${authBase(tenantSegment())}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      providerLabel: "Microsoft",
    });
    const json = (res.json ?? {}) as TokenPayload;
    if (!res.ok) {
      throw new Error(
        json.error_description || json.error || `Microsoft token exchange failed (${res.status})`,
      );
    }
    const accessToken = json.access_token;
    if (!accessToken) throw new Error("Microsoft Outlook: no access_token");

    const who = await bestEffortWhoami(accessToken);

    return {
      accessToken,
      refreshToken: json.refresh_token ?? null,
      expiresAt: expiresAtFrom(json.expires_in),
      scope: json.scope ?? scopes(),
      externalAccountId:
        who.userPrincipalName ?? who.mail ?? who.id ?? null,
      metadata: {
        token_type: json.token_type,
        microsoft_email: who.mail ?? who.userPrincipalName ?? null,
        microsoft_display_name: who.displayName ?? null,
        microsoft_user_id: who.id ?? null,
        ms_tenant: tenantSegment(),
        granted_scopes: json.scope ?? null,
      },
      raw: { ...json, access_token: undefined, refresh_token: undefined, id_token: undefined },
    };
  },

  async refreshToken({ refreshToken }) {
    const clientId = requireClientId();
    const clientSecret = process.env.MS_CLIENT_SECRET || "";
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      // `offline_access` va richiesto anche al refresh, altrimenti Microsoft non
      // emette un nuovo refresh token e la connessione muore al rinnovo dopo.
      scope: scopes(),
    });

    const res = await providerRequest(`${authBase(tenantSegment())}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      providerLabel: "Microsoft",
    });
    const json = (res.json ?? {}) as TokenPayload;
    if (!res.ok) {
      throw new Error(
        json.error_description || json.error || `Microsoft refresh failed (${res.status})`,
      );
    }
    const accessToken = json.access_token;
    if (!accessToken) throw new Error("Microsoft Outlook refresh: no access_token");

    // Microsoft emette un nuovo refresh token a ogni rinnovo: se non arriva si
    // conserva il precedente, altrimenti la riga resta senza rinnovo.
    return {
      accessToken,
      refreshToken: json.refresh_token ?? refreshToken,
      expiresAt: expiresAtFrom(json.expires_in),
      scope: json.scope ?? scopes(),
      raw: { ...json, access_token: undefined, refresh_token: undefined, id_token: undefined },
    };
  },
};
