import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseCheckoutMetadata,
  resolveCheckoutAgents,
} from "@/lib/stripe/webhook-helpers";
import { getOrCreateMeterItem, isOverageBillingEnabled } from "@/lib/stripe/overage";
import { isExpiringSoon } from "@/lib/billing/subscription-notifications";
import { getPlan } from "@/lib/billing/pricing";
import { buildPoolConfig } from "@/lib/billing/token-pool";

/**
 * I tipi generati dello Stripe SDK v22 sono pesantemente ristrutturati;
 * queste forme ristrette coprono solo i campi su cui fa affidamento il webhook.
 */
type WebhookSubscription = {
  id: string;
  status?: string;
  // Nelle versioni API recenti (basil+) current_period_end è stato spostato a
  // livello di subscription item; teniamo entrambe le posizioni per coprire
  // anche payload legacy.
  current_period_end?: number | null;
  current_period_start?: number | null;
  cancel_at_period_end?: boolean | null;
  items?: { data?: Array<{ current_period_end?: number | null }> };
};

function subscriptionPeriodEndIso(sub: WebhookSubscription): string | null {
  const ts =
    sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

function subscriptionPeriodStartIso(sub: WebhookSubscription): string | null {
  const ts = sub.current_period_start ?? null;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

type WebhookInvoice = {
  subscription?: string | null;
  period_end?: number | null;
  period_start?: number | null;
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, {});
}

/**
 * Risolve l'utente di piattaforma per un checkout.
 * Priorità: client_reference_id (ID utente) -> metadata user_id -> email.
 */
function resolveUserId(session: Stripe.Checkout.Session, metadataUserId: string | null) {
  return (
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null) ??
    metadataUserId ??
    session.customer_details?.email ??
    null
  );
}

/**
 * Allinea il PERIODO DEL POOL di tutte le righe `user_agents` di un
 * abbonamento.
 *
 * Serve al rinnovo: il budget si misura dentro il periodo di abbonamento,
 * quindi a ogni rinnovo la finestra di consumo deve scorrere. La `config` va
 * riletta e riscritta campo per campo: `config` è un jsonb con dentro anche
 * planId, poolId e gli altri metadati, e sovrascriverla perderebbe tutto.
 */
async function syncPoolPeriod(
  db: NonNullable<ReturnType<typeof createAdminClient>>,
  subscriptionId: string,
  periodStart: string | null,
  periodEnd: string | null,
) {
  if (!periodStart && !periodEnd) return;
  const { data } = await db
    .from("user_agents")
    .select("id, config")
    .eq("stripe_subscription_id", subscriptionId);
  for (const row of data ?? []) {
    const config = (row.config ?? {}) as Record<string, unknown>;
    const next: Record<string, unknown> = { ...config };
    if (periodStart) next.periodStart = periodStart;
    if (periodEnd) next.periodEnd = periodEnd;
    await db.from("user_agents").update({ config: next }).eq("id", row.id);
  }
}

async function activateSubscription(
  db: NonNullable<ReturnType<typeof createAdminClient>>,
  session: Stripe.Checkout.Session,
) {
  const metadata = parseCheckoutMetadata(
    session.metadata ?? {},
    {
      client_reference_id: session.client_reference_id,
      email: session.customer_details?.email,
    },
  );

  const userId = resolveUserId(session, metadata.userId);
  const resolution = resolveCheckoutAgents(metadata);

  if (!userId) {
    console.error(
      "Cannot resolve user for checkout session",
      session.id,
      session.metadata,
    );
    return;
  }

  if (resolution.agentIds.length === 0) {
    console.error(
      "No agents resolvable from checkout metadata",
      session.id,
      session.metadata,
    );
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const customerId =
    typeof session.customer === "string" ? session.customer : null;

  // Periodo corrente: recuperato dall'abbonamento Stripe appena creato. È la
  // fonte di verità per le notifiche di scadenza (7 giorni prima): senza
  // questo campo la riga `user_agents` resta senza scadenza e il preavviso
  // non può mai scattare. invoice.paid e subscription.updated lo tengono poi
  // sincronizzato ai rinnovi.
  //
  // Lo stesso periodo è il PERIODO DEL POOL DI TOKEN: il budget si misura
  // dentro [periodStart, periodEnd], non nel mese di calendario.
  let periodEndIso: string | null = null;
  let periodStartIso: string | null = null;
  if (subscriptionId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      periodEndIso = subscriptionPeriodEndIso(sub as unknown as WebhookSubscription);
      periodStartIso = subscriptionPeriodStartIso(sub as unknown as WebhookSubscription);
    } catch (err) {
      console.error("Failed to retrieve subscription period end:", err);
    }
  }

  // Budget del pool: lo snapshot di ciò che è stato VENDUTO (metadata `tokens`)
  // vince sul valore corrente del catalogo, così un piano venduto a 300k resta
  // a 300k anche se il catalogo cambia dopo. Senza metadata si usa il
  // catalogo; senza niente, l'allowance di default.
  const catalogTokens =
    resolution.planId && resolution.vertical
      ? (() => {
          const tier = resolution.planId.startsWith(`${resolution.vertical}-`)
            ? resolution.planId.slice(resolution.vertical.length + 1)
            : resolution.planId;
          const plan = getPlan(
            resolution.vertical,
            tier as "starter" | "growth",
          );
          return plan?.tokens ?? null;
        })()
      : null;

  const pool = buildPoolConfig({
    // Un pool = un abbonamento Stripe: gli agenti dello stesso piano
    // condividono lo stesso budget.
    poolId: subscriptionId ?? `agent:${resolution.agentIds[0] ?? "unknown"}`,
    planId: resolution.planId,
    vertical: resolution.vertical,
    soldTokens: metadata.tokens,
    catalogTokens,
    periodStart: periodStartIso,
    periodEnd: periodEndIso,
  });

  const config: Record<string, unknown> = {
    planId: resolution.planId,
    vertical: resolution.vertical,
    activatedVia: resolution.planId ? "plan" : "agent",
    // Pool di token: budget e periodo (vedi lib/billing/token-pool.ts).
    tokenLimit: pool.tokenLimit,
    poolId: pool.poolId,
    periodStart: pool.periodStart,
    periodEnd: pool.periodEnd,
  };

  // Aggancia subito il Price metered overage all'abbonamento così l'overage può essere fatturato dalla prima run.
  if (subscriptionId && isOverageBillingEnabled()) {
    const meterItemId = await getOrCreateMeterItem(subscriptionId);
    if (meterItemId) config.stripeSubscriptionItemId = meterItemId;
  }

  // Se il checkout proviene da carrello, segna il carrello come convertito
  if (metadata.cartId && userId) {
    await db.from("carts").update({ status: "converted", updated_at: new Date().toISOString() }).eq("id", metadata.cartId).eq("user_id", userId);
    await db.from("cart_items").delete().eq("cart_id", metadata.cartId);
  }

  for (const agentId of resolution.agentIds) {
    // Registro grezzo degli abbonamenti Stripe (una riga per subscription x agente).
    const { error: subError } = await db.from("subscriptions").upsert(
      {
        user_id: userId,
        agent_id: agentId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: "active",
      },
      { onConflict: "stripe_subscription_id, agent_id" },
    );

    if (subError) {
      console.error("Failed to save subscription:", subError);
      continue;
    }

    // Tabella autoritativa di proprietà usata per applicare i limiti di run.
    // current_period_end viene valorizzata dagli eventi subscription.updated /
    // invoice.paid (l'expires_at della sessione checkout è la scadenza del
    // payment link).
    const { error: uaError } = await db.from("user_agents").upsert(
      {
        user_id: userId,
        agent_slug: agentId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: "active",
        config,
        activated_at: new Date().toISOString(),
        cancelled_at: null,
        current_period_end: periodEndIso,
      },
      { onConflict: "user_id, agent_slug" },
    );

    if (uaError) {
      console.error("Failed to activate user agent:", uaError);
      continue;
    }

    console.log(`Subscription activated: ${agentId} for ${userId}`);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createAdminClient();
  if (!db) {
    return Response.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await activateSubscription(db, session);
      break;
    }

    case "invoice.paid": {
      // Abbonamento rinnovato — mantieni il diritto attivo e aggiorna il periodo.
      // Il periodo è anche la finestra di consumo del pool di token: senza
      // questo allineamento il budget continuerebbe a contare i token del
      // periodo precedente.
      const invoice = event.data.object as unknown as WebhookInvoice;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : null;
      if (subscriptionId) {
        const periodEnd = invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null;
        const periodStart = invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : null;
        await db
          .from("user_agents")
          .update({
            status: "active",
            current_period_end: periodEnd,
            cancelled_at: null,
          })
          .eq("stripe_subscription_id", subscriptionId);
        await syncPoolPeriod(db, subscriptionId, periodStart, periodEnd);
        console.log(`Invoice paid for subscription ${subscriptionId}`);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as unknown as WebhookSubscription;
      const periodEnd = subscriptionPeriodEndIso(subscription);
      const periodStart = subscriptionPeriodStartIso(subscription);
      const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;

      await db
        .from("subscriptions")
        .update({ status: subscription.status })
        .eq("stripe_subscription_id", subscription.id);

      // Aggiorna ogni agente dell'abbonamento singolarmente così possiamo
      // registrare `cancel_at_period_end` nella config (la dashboard lo mostra
      // come chip "Annulla a fine periodo") senza sovrascrivere le altre chiavi.
      const { data: agents } = await db
        .from("user_agents")
        .select("id, config")
        .eq("stripe_subscription_id", subscription.id);

      for (const agent of agents ?? []) {
        const existing = (agent.config ?? {}) as Record<string, unknown>;
        const config: Record<string, unknown> = {
          ...existing,
          cancelAtPeriodEnd,
        };
        // Il periodo del pool segue il periodo dell'abbonamento: se Stripe
        // sposta la fine periodo (prova, cambio di fatturazione) la finestra
        // di consumo del budget deve spostarsi con lei.
        if (periodStart) config.periodStart = periodStart;
        if (periodEnd) config.periodEnd = periodEnd;
        // Un periodo rinnovato/prolungato è un nuovo ciclo di fatturazione,
        // quindi la notifica di scadenza può scattare di nuovo alla prossima
        // finestra.
        if (!periodEnd || !isExpiringSoon(periodEnd, Date.now())) {
          delete config.renewalNotifiedAt;
        }
        await db
          .from("user_agents")
          .update({
            status: subscription.status,
            current_period_end: periodEnd,
            config,
          })
          .eq("id", agent.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as unknown as WebhookSubscription;
      const lastPeriodEnd = subscriptionPeriodEndIso(subscription);

      await db
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);

      await db
        .from("user_agents")
        .update({
          status: "canceled",
          cancelled_at: new Date().toISOString(),
          current_period_end: lastPeriodEnd,
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    default:
      break;
  }

  return Response.json({ received: true });
}
