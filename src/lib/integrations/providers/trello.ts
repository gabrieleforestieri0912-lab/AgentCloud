import type { IntegrationProvider, TokenExchangeResult } from "../types";

/**
 * Trello — NON è un authorization_code flow OAuth.
 *
 * Env: TRELLO_API_KEY (la key dell'app), TRELLO_API_SECRET (non serve per
 * /1/authorize, ma va tenuta: alcuni endpoint la richiedono).
 * Redirect: /api/integrations/trello/callback — Trello rimanda il token come
 * query param `?token=...`, non come `code`.
 *
 * Come funziona: `GET https://trello.com/1/authorize` mostra il consenso e
 * redirige all'URL indicato con dentro il token già pronto. Non c'è codice da
 * scambiare e non c'è refresh: per questo l'adapter dichiara
 * `tokenInRedirect`, e il callback legge `authParam` ("token") invece di "code".
 *
 * `expiration=30days` invece di `never`: il massimo di Trello è 157 giorni, ma
 * `never` produce un token che non scade mai e che nessuno riesce a revocare da
 * solo (si revoca da Trello, a mano). 30 giorni è il compromesso: il tenant
 * riconnette una volta al mese, e se la riga scade senza refresh token
 * resolveIntegrationToken dice esplicitamente di riconnettersi invece di
 * lasciar arrivare un 401 al modello.
 *
 * PKCE: non esiste per Trello. Da qui `authType: "oauth2"` e non
 * "oauth2_pkce" nel catalogo — non è una scelta nostra, è il protocollo.
 */
export const trelloProvider: IntegrationProvider = {
  provider: "trello",

  // Trello rimanda `token`, non `code`.
  authParam: "token",
  tokenInRedirect: true,

  getAuthUrl({ state, redirectUri }) {
    const appKey = process.env.TRELLO_API_KEY || "";
    if (!appKey) {
      throw new Error("Trello non configurato (TRELLO_API_KEY mancante nel file .env)");
    }
    const params = new URLSearchParams({
      key: appKey,
      name: "AgentCloud",
      scope: (process.env.TRELLO_SCOPES || "read,write").replace(/[\s,]+/g, ","),
      expiration: process.env.TRELLO_TOKEN_EXPIRATION || "30days",
      response_type: "token",
      redirect_uri: redirectUri,
      state,
    });
    return `https://trello.com/1/authorize?${params.toString()}`;
  },

  /**
   * Nessuno scambio: `code` è già il token che Trello ha rimandato. Si chiama
   * comunque `exchangeCode` per rispettare l'interfaccia comune, e si ignora
   * il `redirectUri` perché non serve a nulla.
   */
  async exchangeCode({ code }): Promise<TokenExchangeResult> {
    const accessToken = code?.trim();
    if (!accessToken) throw new Error("Trello: nessun token ricevuto al redirect");

    const appKey = process.env.TRELLO_API_KEY || "";
    const who = await bestEffortWhoami(appKey, accessToken);

    return {
      accessToken,
      // Trello non emette refresh token: la riga scade e va riconnessa.
      refreshToken: null,
      // expires_in non arriva con tokenInRedirect in modo affidabile; la
      // scadenza è derivata da `expiration` richiesto in authorize.
      expiresAt: expiryFromRequest(process.env.TRELLO_TOKEN_EXPIRATION || "30days"),
      scope: process.env.TRELLO_SCOPES || "read,write",
      externalAccountId: who.username ?? who.fullName ?? null,
      metadata: {
        trello_username: who.username ?? null,
        trello_member_id: who.id ?? null,
        trello_full_name: who.fullName ?? null,
      },
      raw: { token_received: true },
    };
  },

  /**
   * Revoca: `DELETE /1/member/{id}/tokens/{token}`. Best-effort: se fallisce la
   * riga viene comunque cancellata dal route disconnect.
   */
  async revokeToken({ accessToken }) {
    const appKey = process.env.TRELLO_API_KEY || "";
    const secret = process.env.TRELLO_API_SECRET || "";
    const who = await bestEffortWhoami(appKey, accessToken);
    if (!who.id) return;
    await fetch(
      `https://api.trello.com/1/member/${encodeURIComponent(who.id)}/tokens/${encodeURIComponent(accessToken)}`,
      { method: "DELETE", headers: { Authorization: `OAuth oauth_consumer_key="${appKey}", oauth_token="${accessToken}", oauth_signature_secret="${secret}"` } },
    ).catch(() => {});
  },
};

/**
 * `expiration` richiesto in authorize → data di scadenza.
 * 30days → +30 giorni; never → null (non scade).
 */
function expiryFromRequest(expiration: string): string | null {
  const days = /^\s*(\d+)\s*days?\s*$/i.exec(expiration);
  if (!days) return null;
  return new Date(Date.now() + Number(days[1]) * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * GET /1/members/me → identità del token. Serve per l'etichetta in UI ("@nome").
 * Best-effort: se fallisce non deve far fallire la connessione.
 */
async function bestEffortWhoami(
  appKey: string,
  token: string,
): Promise<{ id?: string; username?: string; fullName?: string }> {
  try {
    const url = new URL("https://api.trello.com/1/members/me");
    url.searchParams.set("key", appKey);
    url.searchParams.set("token", token);
    url.searchParams.set("fields", "id,username,fullName");
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return {};
    return (await res.json()) as { id?: string; username?: string; fullName?: string };
  } catch {
    return {};
  }
}