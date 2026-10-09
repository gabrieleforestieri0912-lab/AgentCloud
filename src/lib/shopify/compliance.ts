import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markShopifyUninstalled } from "@/lib/shopify/connections";
import { verifyShopifyWebhookSignature } from "@/lib/shopify/verify-webhook";

/**
 * Webhook di conformità Shopify (privacy webhooks).
 *
 * ── Cosa l'app conserva davvero, per shop ──────────────────────────────────
 * Due tabelle, e solo due:
 *
 *   shopify_connections        shop_domain + access token cifrato + scope.
 *                              Nessun dato di cliente del negozio.
 *   shopify_compliance_events  audit: webhook_id, shop_domain, topic, esito.
 *                              Nessun dato personale.
 *
 * I prodotti, gli ordini e i clienti che l'agente legge arrivano dalla Admin
 * API di Shopify **durante il run** e non vengono scritti da nessuna parte:
 *
 *   - `conversation_messages` esiste nello schema ma nessuna riga di codice la
 *     scrive; i messaggi di chat stanno nel `localStorage` del browser
 *     (src/components/ChatInterface.tsx);
 *   - `agent_runs` salva solo contatori (`input_tokens`, `output_tokens`,
 *     `tool_calls`), mai il contenuto;
 *   - i tool Shopify non fanno caching (`src/lib/agents/tools.ts`).
 *
 * Quindi per `customers/data_request` e `customers/redact` non c'è nulla da
 * estrarre o cancellare lato server. È una constatazione, non unplaceholder:
 * le funzioni sono scritte per elencare le superfici che potrebbero contenere
 * dati di cliente, così se un domani ne venisse aggiunta una si vede subito
 * dove registrarla.
 *
 * Quello che resta da dichiarare a Shopify non è la conservazione ma la
 * **trasmissione**: il risultato di `shopify_list_customers` (nome, cognome,
 * email) entra nel prompt inviato al provider LLM durante il run. Non viene
 * persistito da noi, ma è divulgato a un subprocessor. È scritto in
 * docs/shopify-compliance.md e va dichiarato nell'informativa privacy.
 *
 * ── Perché il lavoro pesante è sincrono ────────────────────────────────────
 * Shopify ritenta sui 5xx, e su Vercel una funzione "fire and forget" viene
 * uccisa quando risponde: cancellare in background significherebbe perdere la
 * garanzia che `shop/redact` sia stato onorato. Sono due query indicizzate,
 * quindi restano sotto il timeout e il 200 arriva subito. Se in futuro i
 * dati crescessero, il giusto spostamento è una coda, non un `void` senza
 * attesa.
 */

/** I tre topic di conformità che Shopify invia. */
export const COMPLIANCE_TOPICS = [
  "customers/data_request",
  "customers/redact",
  "shop/redact",
] as const;

export type ComplianceTopic = (typeof COMPLIANCE_TOPICS)[number];

/** Payload che Shopify manda sui topic di conformità. */
export type ShopifyCompliancePayload = {
  shop_domain?: string;
  customer?: { id?: number | string; email?: string; phone?: string };
  orders_requested?: number[];
};

/**
 * `shop/redact`: cancella tutto ciò che riguarda il negozio.
 *
 * Elimina `shopify_connections` (i token: è l'unico dato che vale davvero la
 * pena di cancellare) e le righe di audit precedenti dello stesso negozio.
 * L'evento in corso resta come ricevuta di conformità: senza una traccia che
 * dimostri di aver onorato la richiesta, un revisore non ha modo di verificare
 * nulla, e quella riga non contiene dati di nessun cliente.
 */
export async function deleteShopData(
  shopDomain: string,
  keepWebhookId: string | null,
): Promise<{ connections: number; auditRows: number }> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client unavailable.");

  const { error: delErr, count: connections } = await admin
    .from("shopify_connections")
    .delete({ count: "exact" })
    .eq("shop_domain", shopDomain);
  if (delErr) {
    throw new Error(`Failed to delete Shopify connections: ${delErr.message}`);
  }

  // Audit del negozio, escluso l'evento corrente. `neq` con NULL non
  // filtrerebbe (NULL <> NULL è NULL in SQL), quindi il caso senza webhook_id
  // va gestito a parte: senza, le righe anonime di quel negozio resterebbero.
  //
  // Best-effort, e NON fatale: la tabella di audit potrebbe non essere stata
  // applicata al database, e in quel caso l'errore deve comunque lasciare
  // passare la cancellazione dei token, che è l'obbligo vero. Se la pulizia
  // dell'audit facesse fallire la richiesta, `shop/redact` risponderebbe 500,
  // Shopify ritenterebbe e il negozio resterebbe con i dati: il housekeeping
  // che blocca l'erasure è il caso peggiore.
  let auditRows = 0;
  if (keepWebhookId) {
    const { error: auditErr, count } = await admin
      .from("shopify_compliance_events")
      .delete({ count: "exact" })
      .eq("shop_domain", shopDomain)
      .neq("webhook_id", keepWebhookId);
    if (auditErr) {
      console.warn(
        `Shopify shop/redact: token eliminati, ma pulizia audit saltata (${auditErr.message}).`,
      );
    } else {
      auditRows = count ?? 0;
    }
  }

  return { connections: connections ?? 0, auditRows };
}

/**
 * Superfici che l'app potrebbe usare per conservare dati di un cliente del
 * negozio. Oggi sono tutte vuote: nessuna tabella le implementa.
 *
 * Se un domani si aggiunge una persistenza di dati di cliente (per esempio un
 * cache delle risposte dei tool, o messaggi di chat salvati sul server), il suo
 * nome va aggiunto qui e la logica dei due handler qui sotto va aggiornata.
 * Finché l'elenco è vuoto, `customers/data_request` e `customers/redact` non
 * hanno nulla da fare e rispondono 200 senza toccare dati.
 */
export const CUSTOMER_DATA_SURFACES: ReadonlyArray<{
  name: string;
  holdsCustomerData: boolean;
}> = [];

/**
 * `customers/data_request`: il merchant chiede i dati del cliente che abbiamo.
 *
 * Non ne abbiamo (vedi `CUSTOMER_DATA_SURFACES`), quindi l'esito è "nulla
 * trovato" e si risponde 200 senza toccare dati.
 *
 * Non riceve e non conserva l'oggetto `customer` della richiesta, che porta
 * email e telefono del cliente del negozio: non serve a nulla e conservarlo
 * creerebbe proprio la PII che questo webhook è lì per evitare. Se un domani
 * si aggiunge una superficie con dati di cliente, qui si passa a ricevere lo
 * shop e il cliente per delimitare l'ambito della ricerca.
 */
export async function collectCustomerData(): Promise<{
  surfaces: string[];
  found: boolean;
}> {
  const surfaces = CUSTOMER_DATA_SURFACES.filter((s) => s.holdsCustomerData).map(
    (s) => s.name,
  );
  return { surfaces, found: surfaces.length > 0 };
}

/**
 * `customers/redact`: il merchant chiede di cancellare i dati di un cliente.
 *
 * Nulla da cancellare lato server. La chat con i dati del cliente vive nel
 * `localStorage` del browser di chi l'ha scritta e il server non può
 * raggiungerlo: è il merchant a doverla rimuovere dai propri utenti. Questo
 * limite è dichiarato in docs/shopify-compliance.md e non è aggirabile da qui.
 */
export async function redactCustomerData(): Promise<{
  surfaces: string[];
  redacted: number;
}> {
  const surfaces = CUSTOMER_DATA_SURFACES.filter((s) => s.holdsCustomerData).map(
    (s) => s.name,
  );
  return { surfaces, redacted: 0 };
}

export type ComplianceEventOutcome = "new" | "duplicate" | "unavailable";

/**
 * Registra l'evento nella tabella di audit (solo metadati, mai PII).
 * Non lancia mai: un fallimento del logging non deve bloccare la
 * conformità. Ritorna `duplicate` se questo `webhook_id` è già stato visto
 * (retry Shopify) così il chiamante può saltare la riesecuzione.
 */
export async function recordComplianceEvent(opts: {
  webhookId: string | null;
  shopDomain: string;
  topic: string;
}): Promise<ComplianceEventOutcome> {
  try {
    const admin = createAdminClient();
    if (!admin) return "unavailable";
    const { error } = await admin.from("shopify_compliance_events").insert({
      webhook_id: opts.webhookId,
      shop_domain: opts.shopDomain,
      topic: opts.topic,
      status: "received",
    });
    if (!error) return "new";
    if ((error as { code?: string }).code === "23505") return "duplicate";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

/** Aggiorna lo stato dell'evento (best-effort, non lancia mai). */
export async function markComplianceEvent(
  webhookId: string | null,
  status: "completed" | "failed",
): Promise<void> {
  if (!webhookId) return;
  try {
    const admin = createAdminClient();
    if (!admin) return;
    await admin
      .from("shopify_compliance_events")
      .update({ status })
      .eq("webhook_id", webhookId);
  } catch {
    // best-effort: lo stato dell'audit non deve mai rompere la risposta
  }
}

/** True se il topic è uno dei tre di conformità. */
export function isComplianceTopic(topic: string): topic is ComplianceTopic {
  return (COMPLIANCE_TOPICS as readonly string[]).includes(topic);
}

/**
 * Handler unico dei webhook Shopify.
 *
 * Un'unica implementazione per tutte le route, così due endpoint non possono
 * divergere sul comportamento di `shop/redact` (prima uno cancellava e l'altro
 * no: lo stesso topic produceva effetti diversi a seconda dell'URL registrato).
 *
 * Ordine delle operazioni, non negoziabile:
 *   1. secret mancante → 500 (configurazione, non richiesta malformata);
 *   2. `await req.text()` sul corpo GREZZO e verifica HMAC sul grezzo →
 *      401 senza elaborare nulla. `req.json()` solo DOPO, per il routing:
 *      ri-serializzare il corpo cambierebbe i byte e invalida la firma;
 *   3. topic ammesso → elaborazione;
 *   4. topic non previsto dalla route → 400.
 *
 * Nei log finiscono solo topic, shop_domain ed esito. Il payload contiene PII
 * del cliente del negozio e non viene mai stampato.
 */
export async function receiveShopifyWebhook(
  req: NextRequest,
  opts: { allowedTopics: readonly string[] },
): Promise<NextResponse> {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook misconfigured" }, { status: 500 });
  }

  // Corpo grezzo: mai `req.json()` prima della verifica della firma.
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  if (!verifyShopifyWebhookSignature(rawBody, hmac, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") || "";
  if (!opts.allowedTopics.includes(topic)) {
    return NextResponse.json({ error: "unknown topic" }, { status: 400 });
  }

  let payload: ShopifyCompliancePayload | null = null;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as ShopifyCompliancePayload) : null;
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // Header autorevole, fallback al payload (l'header non ci su tutti i topic).
  const shopDomain =
    req.headers.get("x-shopify-shop-domain") ||
    (typeof payload?.shop_domain === "string" ? payload.shop_domain : "");
  const webhookId = req.headers.get("x-shopify-webhook-id");

  if (!shopDomain) {
    return NextResponse.json({ error: "missing shop_domain" }, { status: 400 });
  }

  // Audit + idempotenza (best-effort: mai bloccare la conformità).
  const outcome = await recordComplianceEvent({ webhookId, shopDomain, topic });
  if (outcome === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (topic) {
      case "customers/data_request":
        await collectCustomerData();
        break;
      case "customers/redact":
        await redactCustomerData();
        break;
      case "shop/redact":
        await deleteShopData(shopDomain, webhookId);
        break;
      case "app/uninstalled":
        await markShopifyUninstalled(shopDomain);
        break;
      default:
        return NextResponse.json({ error: "unknown topic" }, { status: 400 });
    }
  } catch (e) {
    await markComplianceEvent(webhookId, "failed");
    console.error(
      `Shopify webhook ${topic} for shop ${shopDomain}: failed.`,
      e instanceof Error ? e.message : String(e),
    );
    // 500 così Shopify ritenta: un 200 su una cancellazione fallita sarebbe
    // una dichiarazione falsa di conformità.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  await markComplianceEvent(webhookId, "completed");
  console.info(
    `Shopify webhook ${topic} for shop ${shopDomain}: acknowledged.`,
  );
  return NextResponse.json({ received: true });
}