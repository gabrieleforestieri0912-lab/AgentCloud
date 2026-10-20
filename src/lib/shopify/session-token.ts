import { createHmac, timingSafeEqual } from "crypto";
import { SHOPIFY_CLIENT_ID } from "./client";
import { normalizeShop } from "./oauth";

/**
 * Session token Shopify (server-only).
 *
 * Cos'è: quando l'app gira incapsulata nell'amministratore, App Bridge
 * espone `shopify.idToken()` che restituisce un **JWT di breve durata
 * firmato da Shopify** con il client secret dell'app. Quel token prova
 * "questa richiesta viene dal pannello admin dello store X, aperto
 * dall'utente Y" e sostituisce i cookie di sessione.
 *
 * Perché lo verifichiamo noi: il token porta dentro `dest` (lo store) e
 * `sub` (l'utente). Se non lo validiamo, chiunque potrebbe dichiarare di
 * essere un merchant. La verifica è HS256 con `SHOPIFY_API_SECRET`, che
 * non lascia mai il server.
 *
 * Cosa NON facciamo qui: niente scambio di token. Lo scambio
 * session token → access token Admin API sta in `exchangeSessionToken`,
 * perché è una chiamata di rete verso il negozio e va eseguita solo
 * quando serve davvero.
 */

export type ShopifySession = {
  /** Dominio del negozio (`*.myshopify.com`), normalizzato. */
  shop: string;
  /** Id utente Shopify che ha aperto l'app (`sub` del token). */
  userId: string;
  /** Scadenza del token (epoch secondi). */
  expiresAt: number;
};

/** Tolleranza sull'orologio: i token Shopify e il nostro server possono
 *  essere qualche secondo scollegati. */
const CLOCK_SKEW_SECONDS = 60;

function base64UrlDecode(segment: string): Buffer {
  return Buffer.from(
    segment.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  );
}

/**
 * Verifica la firma e le dichiarazioni di un session token Shopify.
 * Restituisce null se il token non è valido (per ogni motivo).
 */
export function verifyShopifySessionToken(
  token: string,
): ShopifySession | null {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerSeg, payloadSeg, signatureSeg] = parts;

  // 1) Header: solo HS256 è accettato. "none" e gli algoritmi asimmetrici
  //    vengono rifiutati prima di guardare la firma.
  let header: { alg?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerSeg).toString("utf8"));
  } catch {
    return null;
  }
  if (header.alg !== "HS256") return null;

  // 2) Firma: HMAC-SHA256 del client secret su "header.payload",
  //    confrontata a tempo costante.
  const expected = createHmac("sha256", secret)
    .update(`${headerSeg}.${payloadSeg}`)
    .digest();
  const signature = base64UrlDecode(signatureSeg);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(signature, expected)) return null;

  // 3) Payload: la firma è valida, quindi il contenuto è di Shopify.
  let payload: {
    aud?: string;
    dest?: string;
    sub?: string;
    exp?: number;
    nbf?: number;
    iss?: string;
  };
  try {
    payload = JSON.parse(base64UrlDecode(payloadSeg).toString("utf8"));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number") return null;
  if (payload.exp + CLOCK_SKEW_SECONDS < now) return null;
  if (typeof payload.nbf === "number" && payload.nbf - CLOCK_SKEW_SECONDS > now) {
    return null;
  }
  // L'audience è il client ID dell'app: un token emesso per un'altra app
  // non vale qui.
  if (payload.aud !== SHOPIFY_CLIENT_ID) return null;

  // `dest` è l'URL del negozio: da lì ricaviamo il dominio e lo
  // normalizziamo (niente open redirect, niente host arbitrari).
  let hostname = "";
  try {
    hostname = new URL(String(payload.dest ?? "")).hostname;
  } catch {
    return null;
  }
  const shop = normalizeShop(hostname);
  if (!shop) return null;

  // Difesa in depth: l'issuer deve essere l'admin del negozio indicato.
  if (payload.iss && payload.iss !== `https://${shop}/admin`) return null;

  return {
    shop,
    userId: String(payload.sub ?? ""),
    expiresAt: payload.exp,
  };
}

export type ShopifyAdminToken = {
  accessToken: string;
  scope: string;
};

/**
 * Scambio "token exchange": trasforma il session token in un access token
 * per la Admin API del negozio.
 *
 * È il flusso raccomandato da Shopify per le app incapsulate: il session
 * token vale per l'utente e lo store, ma non per la Admin API. Con lo
 * scambio otteniamo un token limitato a quello store, senza far girare
 * OAuth dal merchant.
 *
 * Il client secret resta qui, lato server.
 */
export async function exchangeSessionToken(opts: {
  shop: string;
  sessionToken: string;
}): Promise<ShopifyAdminToken | null> {
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!clientSecret) return null;

  try {
    const res = await fetch(`https://${opts.shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: clientSecret,
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token: opts.sessionToken,
        subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as {
      access_token?: unknown;
      scope?: unknown;
    } | null;
    const accessToken = data?.access_token;
    if (typeof accessToken !== "string" || !accessToken) return null;
    return {
      accessToken,
      scope: typeof data?.scope === "string" ? data.scope : "",
    };
  } catch {
    return null;
  }
}
