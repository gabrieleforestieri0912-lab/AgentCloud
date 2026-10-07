import type { IntegrationProvider, TokenExchangeResult } from "../types";
import { providerRequest } from "../http";

/**
 * Microsoft Entra ID (Azure AD) — OAuth 2.0 authorization_code + PKCE, permessi
 * DELEGATI (mai app-only).
 *
 * Env: MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID (default "common"),
 * MS_REDIRECT_URI (opzionale, vedi registry.getRedirectUri), MS_SCOPES
 * (override), MS_SHAREPOINT (opt-in per Sites.ReadWrite.All).
 *
 * Perché delegato: l'API OneNote non supporta più l'autenticazione app-only,
 * quindi un flusso client_credentials non basterebbe per OneNote. Con i permessi
 * delegati l'agente opera con l'identità dell'utente e i file restano suoi.
 *
 * PKCE (S256) è obbligatorio come per Airtable: il `code_verifier` resta nel
 * cookie httpOnly e nello state finisce solo la `code_challenge`, così il
 * verifier non transita mai dalla barra degli indirizzi.
 *
 * Scope (cfr. PROVIDER_CATALOG): offline_access, User.Read, Files.ReadWrite,
 * Notes.ReadWrite. `Sites.ReadWrite.All` NON è nel default: è un opt-in
 * esplicito (MS_SHAREPOINT=1) perché apre SharePoint oltre al OneDrive
 * personale, e la scelta deve essere dell'utente, non una sorpresa nel consenso.
 */

const DEFAULT_SCOPES = [
  "offline_access",
  "User.Read",
  "Files.ReadWrite",
  "Notes.ReadWrite",
];

/** Scope aggiunto solo su opt-in esplicito (SharePoint). */
const SHAREPOINT_SCOPE = "Sites.ReadWrite.All";

const GRAPH_ME = "https://graph.microsoft.com/v1.0/me";

/**
 * Il tenant entra nella URL di autorizzazione e di token: va validato o un env
 * malformato costruirebbe una URL arbitraria. Accettiamo solo "common",
 * "organizations", "consumers", un dominio o un GUID — tutto minuscolo,
 * lettere/cifre/punto/trattino.
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
  const override = process.env.MS_SCOPES?.trim();
  const list = override
    ? override.split(/[,\s]+/).filter(Boolean)
    : [...DEFAULT_SCOPES];
  if (!override && process.env.MS_SHAREPOINT && process.env.MS_SHAREPOINT !== "0") {
    list.push(SHAREPOINT_SCOPE);
  }
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
 * (quale account Microsoft è collegato) e per capire se il token è ancora buono.
 * Un fallimento non deve impedire la connessione.
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
 * Un token senza `expires_at` rinfrescato a ogni chiamata è inutile: se Microsoft
 * non manda `expires_in` (non dovrebbe) ripieghiamo su 1h, che è la durata dei
 * token Graph.
 */
function expiresAtFrom(expiresIn: number | undefined): string {
  const seconds = typeof expiresIn === "number" && expiresIn > 0 ? expiresIn : 3600;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export const microsoftProvider: IntegrationProvider = {
  provider: "microsoft",

  getAuthUrl({ state, redirectUri, pkce }) {
    const clientId = requireClientId();
    if (!pkce?.codeChallenge) {
      // Senza challenge Entra rifiuta lo scambio: meglio fallire qui, con un
      // messaggio, che al callback con un invalid_grant opaco.
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
      throw new Error("Microsoft PKCE: code_verifier mancante");
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
    if (!accessToken) throw new Error("Microsoft: no access_token");

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
      // `raw` non viene persistito, ma non tenere il token in chiaro in memoria
      // evita che un futuro log lo bruci.
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
      // `offline_access` deve essere richiesto anche al refresh, altrimenti
      // Microsoft non emette un nuovo refresh token e la connessione muore al
      // rinnovo successivo.
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
    if (!accessToken) throw new Error("Microsoft refresh: no access_token");

    // Microsoft emette un nuovo refresh token a ogni rinnovo: se per qualche
    // motivo non arriva, conserviamo il precedente — azzerarlo renderebbe la
    // riga irrecuperabile dopo la scadenza dell'access token.
    return {
      accessToken,
      refreshToken: json.refresh_token ?? refreshToken,
      expiresAt: expiresAtFrom(json.expires_in),
      scope: json.scope ?? scopes(),
      raw: { ...json, access_token: undefined, refresh_token: undefined, id_token: undefined },
    };
  },
};
