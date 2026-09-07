/**
 * Helper puri per risolvere gli eventi checkout di Stripe.
 *
 * Perché puri: tenuti senza dipendenze framework/SDK così possono essere
 * unit-testati senza Stripe né Supabase. Ricevono i metadati dell'evento e
 * restituiscono i dati tipizzati che il webhook deve applicare.
 */

import {
  DEFAULT_TOKEN_LIMIT,
  getPlan,
} from "@/lib/billing/pricing";
import {
  SERVICES_LAUNCH_CONFIG,
  SHOPIFY_LAUNCH_CONFIG,
} from "@/lib/agents/feature-flags";

export type Vertical = "shopify" | "services";

export type CheckoutMetadata = {
  userId: string | null;
  email: string | null;
  agentId: string | null;
  agentIds: string[] | null;
  cartId: string | null;
  planId: string | null;
  vertical: Vertical | null;
  tokens: number | null; // monthly token allowance
  source: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Normalizza i metadati della sessione checkout Stripe in un oggetto tipizzato.
 * Accetta i valori da `session.metadata` (i Payment Links iniettano ogni
 * parametro sotto `metadata[...]`, inclusi `client_reference_id` ed `email`).
 */
export function parseCheckoutMetadata(
  metadata: Record<string, unknown>,
  extra?: { client_reference_id?: unknown; email?: unknown },
): CheckoutMetadata {
  // La chiave nuova è `tokens`; ripiega sulla legacy `conversations` così i
  // payment link creati prima della migrazione ai token continuano a funzionare.
  const tokensRaw = asString(metadata.tokens) ?? asString(metadata.conversations);
  const tokens = tokensRaw ? Number(tokensRaw) : null;
  const vertical = asString(metadata.vertical);

  const agentIdsRaw = asString(metadata.agent_ids) ?? asString(metadata.agentIds);
  const agentIds = agentIdsRaw
    ? agentIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  return {
    userId:
      asString(metadata.client_reference_id) ??
      asString(metadata.user_id) ??
      asString(extra?.client_reference_id),
    email:
      asString(metadata.email) ?? asString(extra?.email),
    agentId: asString(metadata.agent_id),
    agentIds,
    cartId: asString(metadata.cart_id),
    planId: asString(metadata.plan_id),
    vertical: vertical === "shopify" || vertical === "services" ? vertical : null,
    tokens: tokens !== null && Number.isFinite(tokens) ? tokens : null,
    source: asString(metadata.source),
  };
}

export type CheckoutResolution = {
  agentIds: string[];
  tokenLimit: number;
  planId: string | null;
  vertical: Vertical | null;
};

/**
 * Mappa un checkout normalizzato alla lista di agenti che il cliente deve
 * possedere e all'allowance mensile di token del proprio piano.
 *
 * - Checkout basati su agente: il singolo agente, con l'allowance configurata.
 * - Checkout basati su piano: tutti gli agenti del verticale, con l'allowance
 *   del piano.
 */
export function resolveCheckoutAgents(info: CheckoutMetadata): CheckoutResolution {
  if (info.agentIds && info.agentIds.length > 0) {
    return {
      agentIds: info.agentIds,
      tokenLimit: info.tokens ?? DEFAULT_TOKEN_LIMIT,
      planId: null,
      vertical: null,
    };
  }
  if (info.agentId) {
    return {
      agentIds: [info.agentId],
      tokenLimit: info.tokens ?? DEFAULT_TOKEN_LIMIT,
      planId: null,
      vertical: null,
    };
  }

  if (info.planId && info.vertical) {
    // plan_id arriva come `${vertical}-${tier}` (es. "shopify-growth");
    // getPlan si aspetta solo il tier.
    const tier = info.planId.startsWith(`${info.vertical}-`)
      ? info.planId.slice(info.vertical.length + 1)
      : info.planId;
    const plan = getPlan(info.vertical, tier as "starter" | "growth");
    if (plan) {
      const launchConfig =
        info.vertical === "shopify"
          ? SHOPIFY_LAUNCH_CONFIG
          : SERVICES_LAUNCH_CONFIG;
      return {
        agentIds: launchConfig.enabledAgents,
        tokenLimit: plan.tokens,
        // plan_id è già salvato come `${vertical}-${tier}` dalla route del payment link.
        planId: info.planId,
        vertical: info.vertical,
      };
    }
  }

  return {
    agentIds: [],
    tokenLimit: DEFAULT_TOKEN_LIMIT,
    planId: null,
    vertical: null,
  };
}
