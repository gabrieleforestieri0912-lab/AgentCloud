import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeSessionToken,
  verifyShopifySessionToken,
} from "@/lib/shopify/session-token";
import { SHOPIFY_API_VERSION } from "@/lib/shopify/version";

/**
 * POST /api/shopify/session
 *
 * Endpoint di autenticazione dell'app incapsulata. Il pannello dentro
 * l'amministratore Shopify chiama questo endpoint con il **session token**
 * ottenuto da App Bridge (`shopify.idToken()`):
 *
 *   Authorization: Bearer <session token>
 *
 * Cosa fa il server:
 *  1. verifica la firma HS256 del token con `SHOPIFY_API_SECRET` e
 *     controlla scadenza, audience e store (`src/lib/shopify/session-token.ts`);
 *  2. scambia il session token in un access token per la Admin API dello
 *     store (token exchange) e, se va a buon fine, legge il nome del negozio.
 *
 * Non viene accettato nulla dai parametri di richiesta: la verità sta nel
 * token firmato, non in un `?shop=` manipolabile.
 *
 * Il client secret non esce mai da qui.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    return NextResponse.json(
      { error: "missing_session_token" },
      { status: 401 },
    );
  }

  const session = verifyShopifySessionToken(token);
  if (!session) {
    return NextResponse.json(
      { error: "invalid_session_token" },
      { status: 401 },
    );
  }

  const exchanged = await exchangeSessionToken({
    shop: session.shop,
    sessionToken: token,
  });

  let shopName: string | null = null;
  if (exchanged) {
    try {
      const res = await fetch(
        `https://${session.shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
        {
          headers: { "X-Shopify-Access-Token": exchanged.accessToken },
          cache: "no-store",
        },
      );
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as {
          shop?: { name?: unknown };
        } | null;
        if (typeof data?.shop?.name === "string") {
          shopName = data.shop.name;
        }
      }
    } catch {
      shopName = null;
    }
  }

  return NextResponse.json({
    shop: session.shop,
    shopName,
    userId: session.userId,
    scope: exchanged?.scope || null,
    // `connected` dice se lo scambio è riuscito: cioè se l'app è davvero
    // autenticata per questo store, non solo "il token era ben formato".
    connected: Boolean(exchanged),
  });
}
