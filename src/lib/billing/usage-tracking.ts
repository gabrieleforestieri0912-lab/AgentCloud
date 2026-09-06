/**
 * Tracciamento dell'utilizzo per AgentCloud.
 *
 * Come funziona: registra l'utilizzo delle conversazioni per utente/agente
 * così da applicare i limiti dei piani e calcolare gli addebiti di overage.
 * I limiti sono sui TOKEN (input + output) al mese, per agente installato.
 * I conteggi delle conversazioni servono solo per reportistica.
 *
 * IMPORTANTE: modulo server-only. Preferisce il client service-role così può
 * scrivere/leggere righe chiave sugli ID utente esterni (es. Clerk), e ripiega
 * sul client anon quando `SUPABASE_SERVICE_ROLE_KEY` non è impostata.
 * Mai importare queste funzioni da componenti client.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getOrCreateMeterItem,
  isOverageBillingEnabled,
  reportOverageUsage,
} from "@/lib/stripe/overage";
import { apiErrorMessageForLocale } from "@/lib/i18n/api-errors";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/constants";
import {
  DEFAULT_TOKEN_LIMIT,
  OVERAGE_HARD_CAP_MULTIPLIER,
} from "./pricing";

export type UsageRecord = {
  id?: string;
  user_id: string;
  agent_slug: string;
  conversation_id?: string;
  tokens_input: number;
  tokens_output: number;
  created_at?: string;
};

export type UsageSummary = {
  userId: string;
  agentSlug: string;
  period: string; // YYYY-MM format
  conversations: number; // informational only
  tokensUsed: number; // input + output tokens in the period
  tokenLimit: number; // monthly token allowance
  overage: number; // tokens over the allowance (0 when under)
};

export type UserAgentRecord = {
  id: string;
  user_id: string;
  agent_slug: string;
  status: string;
  config: Record<string, unknown>;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  current_period_end?: string | null;
};

/**
 * Esito del controllo permessi prima di una run.
 *
 * `allowed: true` è sempre accompagnato da `overage`: quando l'utente è oltre
 * l'allowance mensile la run è comunque consentita e fatturata via il meter
 * Stripe (`overage: true`), a meno che non venga raggiunto il tetto di
 * sicurezza (429).
 */
export type RunCheck =
  | { allowed: true; overage: boolean }
  | {
      allowed: false;
      status: number; // status HTTP da restituire (402 / 429 / 500)
      code: string;
      message: string;
    };

async function getDb() {
  return createAdminClient() ?? (await createClient());
}

function periodBounds(year: number, month: number) {
  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const periodEnd = new Date(
    Date.UTC(year, month, 0, 23, 59, 59, 999),
  ).toISOString();
  return { periodStart, periodEnd };
}

/**
 * Recupera l'istanza agente di un utente (proprietà + stato + config).
 * Restituisce null quando l'utente non possiede l'agente.
 */
export async function getUserAgent(
  userId: string,
  agentSlug: string,
): Promise<UserAgentRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const { data } = await db
    .from("user_agents")
    .select("*")
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    user_id: data.user_id,
    agent_slug: data.agent_slug,
    status: data.status ?? "inactive",
    config: (data.config ?? {}) as Record<string, unknown>,
    stripe_subscription_id: data.stripe_subscription_id,
    stripe_customer_id: data.stripe_customer_id,
    current_period_end: data.current_period_end,
  };
}

/**
 * Risolve l'allowance mensile di token per l'istanza agente di un utente.
 * Preferisce la nuova config `tokenLimit`, ripiega sulla legacy
 * `conversationLimit` (righe scritte prima della migrazione a token), poi
 * sull'allowance predefinita.
 */
export function resolveTokenLimit(config: Record<string, unknown>): number {
  if (typeof config.tokenLimit === "number") return config.tokenLimit;
  if (typeof config.conversationLimit === "number") {
    // Le righe legacy salvavano un budget di conversazioni (300/1000). Le
    // mappiamo sull'allowance token dello stesso livello di piano. Nota: un
    // limite legacy di 0 (completamente bloccato) mappa sull'allowance
    // predefinita — una sanatoria una tantum accettabile durante la migrazione.
    return config.conversationLimit >= 1000
      ? 1_000_000
      : DEFAULT_TOKEN_LIMIT;
  }
  return DEFAULT_TOKEN_LIMIT;
}

/**
 * Verifica se un utente loggato può eseguire un agente:
 *  1. Deve possedere l'agente con un abbonamento `active`.
 *  2. Non deve aver superato l'allowance mensile di token.
 *
 * I chiamanti anonimi/di anteprima dovrebbero saltare questo controllo e
 * chiamare `recordUsage` con `user_id` = "anonymous".
 */
export async function assertRunAllowed(
  userId: string,
  agentSlug: string,
  locale: Locale = DEFAULT_LOCALE,
  isAdmin = false,
): Promise<RunCheck> {
  // Gli account admin (verificati lato server via email di sessione) hanno
  // accesso pieno e illimitato a ogni agente, senza abbonamento né tetto piano.
  if (isAdmin) {
    return { allowed: true, overage: false };
  }

  if (!userId || userId === "anonymous") {
    return { allowed: true, overage: false };
  }

  const db = await getDb();
  if (!db) {
    // Nessun DB configurato — non bloccare lo sviluppo locale
    return { allowed: true, overage: false };
  }

  const userAgent = await getUserAgent(userId, agentSlug);

  if (!userAgent) {
    return {
      allowed: false,
      status: 402,
      code: "NOT_SUBSCRIBED",
      message: apiErrorMessageForLocale(locale, "notSubscribed"),
    };
  }

  if (userAgent.status !== "active") {
    return {
      allowed: false,
      status: 402,
      code: "SUBSCRIPTION_INACTIVE",
      message: apiErrorMessageForLocale(locale, "subscriptionInactive", {
        status: userAgent.status,
      }),
    };
  }

  const tokenLimit = resolveTokenLimit(userAgent.config);

  const now = new Date();
  const summary = await getUsageSummary(
    userId,
    agentSlug,
    now.getFullYear(),
    now.getMonth() + 1,
  );

  const used = summary?.tokensUsed ?? 0;

  // La fatturazione dell'overage scatta solo per i clienti con un vero
  // abbonamento E uno Stripe customer id, e quando il Price metered è
  // configurato. Altrimenti mantiene il comportamento precedente: blocco
  // all'allowance con 429.
  const overageAvailable =
    Boolean(userAgent.stripe_subscription_id) &&
    Boolean(userAgent.stripe_customer_id) &&
    isOverageBillingEnabled();

  if (used >= tokenLimit) {
    if (overageAvailable) {
      // Rete di sicurezza: oltre 2x l'allowance anche l'uso in overage viene
      // bloccato.
      const hardCap = tokenLimit * OVERAGE_HARD_CAP_MULTIPLIER;
      if (used >= hardCap) {
        return {
          allowed: false,
          status: 429,
          code: "OVERAGE_CAP_REACHED",
          message: apiErrorMessageForLocale(locale, "overageCapReached", {
            cap: hardCap.toLocaleString(
              locale === "en" ? "en-US" : "it-IT",
            ),
            multiplier: OVERAGE_HARD_CAP_MULTIPLIER,
          }),
        };
      }
      // Oltre l'allowance ma sotto il tetto: consentito, fatturato via meter.
      return { allowed: true, overage: true };
    }

    return {
      allowed: false,
      status: 429,
      code: "LIMIT_EXCEEDED",
      message: apiErrorMessageForLocale(locale, "limitExceeded", {
        limit: tokenLimit.toLocaleString(
          locale === "en" ? "en-US" : "it-IT",
        ),
      }),
    };
  }

  return { allowed: true, overage: false };
}

/**
 * Registra un evento di utilizzo della conversazione.
 */
export async function recordUsage(usage: UsageRecord): Promise<void> {
  if (!usage.user_id || !usage.agent_slug) return;

  const db = await getDb();
  if (!db) return;

  // Risolve la riga user_agents così possiamo collegare la run all'abbonamento.
  let userAgentId: string | null = null;
  if (usage.user_id !== "anonymous") {
    const userAgent = await getUserAgent(usage.user_id, usage.agent_slug);
    userAgentId = userAgent?.id ?? null;
  }

  const { error } = await db.from("agent_runs").insert({
    user_id: usage.user_id,
    user_agent_id: userAgentId,
    agent_slug: usage.agent_slug,
    conversation_id: usage.conversation_id ?? null,
    status: "completed",
    input_tokens: usage.tokens_input,
    output_tokens: usage.tokens_output,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to record usage:", error);
  }
}

/**
 * Registra una run E fattura il suo incremento di overage via Stripe.
 *
 * Chiamata a fine run. Al meter vengono segnalati solo i token di QUESTA run
 * che superano l'allowance mensile (incrementale, così run in overage
 * consecutive non vengono addebitate due volte). Quando la fatturazione
 * overage non è disponibile (niente abbonamento o Price metered configurato)
 * si comporta esattamente come `recordUsage`.
 */
export async function recordUsageAndReportOverage(
  usage: UsageRecord,
): Promise<void> {
  if (!usage.user_id || !usage.agent_slug) return;

  if (usage.user_id === "anonymous") {
    await recordUsage(usage);
    return;
  }

  const userAgent = await getUserAgent(usage.user_id, usage.agent_slug);
  const subscriptionId = userAgent?.stripe_subscription_id ?? null;
  const stripeCustomerId = userAgent?.stripe_customer_id ?? null;

  // Percorso rapido: nessun modo di fatturare → logga la run come prima.
  if (!subscriptionId || !stripeCustomerId || !isOverageBillingEnabled()) {
    await recordUsage(usage);
    return;
  }

  const tokenLimit = userAgent
    ? resolveTokenLimit(userAgent.config)
    : DEFAULT_TOKEN_LIMIT;

  // Snapshot dell'utilizzo PRIMA di questa run, così fatturiamo solo
  // l'incremento oltre l'allowance: i token di questa run che superano
  // l'allowance residua. (Due run concorrenti possono ancora correre qui;
  // l'errore è limitato a pochi token e viene corretto al report successivo.)
  const now = new Date();
  const summary = await getUsageSummary(
    usage.user_id,
    usage.agent_slug,
    now.getFullYear(),
    now.getMonth() + 1,
  );
  const usedBefore = summary?.tokensUsed ?? 0;
  const runTokens = (usage.tokens_input || 0) + (usage.tokens_output || 0);
  const remainingAllowance = Math.max(0, tokenLimit - usedBefore);
  const overageTokens = Math.max(0, runTokens - remainingAllowance);

  await recordUsage(usage);

  if (overageTokens <= 0) return;

  // Assicura che il Price metered dell'overage sia agganciato all'abbonamento,
  // poi segnala l'overage di questa run come evento Billing Meter. Il webhook
  // salva l'id della subscription item nella config al checkout, quindi
  // chiamiamo l'API Stripe solo quando manca (es. abbonamenti legacy).
  const storedItemId = userAgent?.config?.stripeSubscriptionItemId;
  const meterItemId =
    (typeof storedItemId === "string" && storedItemId.length > 0
      ? storedItemId
      : null) ?? (await getOrCreateMeterItem(subscriptionId));
  if (!meterItemId) return;

  await reportOverageUsage({
    stripeCustomerId,
    overageTokens,
    idempotencyKey: usage.conversation_id ?? crypto.randomUUID(),
  });
}

/**
 * Restituisce il riepilogo di utilizzo di un utente in un periodo.
 */
export async function getUsageSummary(
  userId: string,
  agentSlug: string,
  year: number,
  month: number,
): Promise<UsageSummary | null> {
  const db = await getDb();
  if (!db) return null;

  const { periodStart, periodEnd } = periodBounds(year, month);

  // Conta le conversazioni (solo le run completate contano per la quota).
  const { count: conversations } = await db
    .from("agent_runs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .eq("status", "completed")
    .gte("started_at", periodStart)
    .lte("started_at", periodEnd);

  // Calcola l'uso dei token. A differenza del conteggio conversazioni qui
  // sopra, somma i token di TUTTE le run (nessun filtro di stato): le run
  // interrotte/fallite consumano comunque token del provider, quindi contano
  // anch'esse sull'allowance.
  const { data: runs } = await db
    .from("agent_runs")
    .select("input_tokens, output_tokens")
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .gte("started_at", periodStart)
    .lte("started_at", periodEnd);

  const totalTokens =
    runs?.reduce(
      (sum, run) => sum + (run.input_tokens || 0) + (run.output_tokens || 0),
      0,
    ) || 0;

  const conversationCount = conversations || 0;

  // Legge l'allowance del piano da user_agents
  const userAgent = await getUserAgent(userId, agentSlug);
  const config = userAgent?.config ?? {};
  const tokenLimit = resolveTokenLimit(config);

  return {
    userId,
    agentSlug,
    period: `${year}-${month.toString().padStart(2, "0")}`,
    conversations: conversationCount,
    tokensUsed: totalTokens,
    tokenLimit,
    overage: Math.max(0, totalTokens - tokenLimit),
  };
}

