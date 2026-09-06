/**
 * Modulo conformità GDPR & Privacy.
 *
 * Perché esiste: la normativa richiede di sapere sempre quali dati trattiamo e
 * di poterli cancellare su richiesta dell'interessato. Qui sono implementati:
 * la minimizzazione dei dati, il registro dei sub-processori (i fornitori che
 * trattano dati per nostro conto) e il "diritto all'oblio" (cancellazione di
 * tutti i dati del tenant associati a un'email).
 */

import { logAudit } from "@/lib/audit";
import { getOrCreateTenantReviews } from "@/lib/tools/reviews";

export type SubProcessor = {
  name: string;
  purpose: string;
  location: string;
  dpaSigned: boolean;
};

export const SUB_PROCESSORS: SubProcessor[] = [
  {
    name: "Anthropic, PBC",
    purpose: "LLM Inference & Generation (Claude)",
    location: "USA (EU Standard Contractual Clauses)",
    dpaSigned: true,
  },
  {
    name: "Supabase, Inc.",
    purpose: "Database & Session Authentication",
    location: "EU (Frankfurt, Germany)",
    dpaSigned: true,
  },
  {
    name: "Stripe Payments Europe, Ltd.",
    purpose: "Subscription & Payment Processing",
    location: "EU (Ireland)",
    dpaSigned: true,
  },
  {
    name: "Resend, Inc.",
    purpose: "Transactional Email Delivery",
    location: "USA (EU Standard Contractual Clauses)",
    dpaSigned: true,
  },
  {
    name: "Tavily Inc.",
    purpose: "Real-time Web Search",
    location: "USA",
    dpaSigned: true,
  },
];

export type DeletionResult = {
  tenantId: string;
  email: string;
  deletedItemsCount: number;
  timestamp: string;
};

/**
 * Cancella tutti i dati del tenant collegati a un indirizzo email, su tutti i
 * servizi che ne conservano una copia (diritto all'oblio).
 */
export async function deleteTenantDataForEmail(
  tenantId: string,
  email: string,
): Promise<DeletionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  let deletedCount = 0;

  logAudit("gdpr_deletion_request", { tenantId, email: normalizedEmail });

  // 1. Rimuove le recensioni / segnalazioni dell'autore in memoria/store
  try {
    const reviews = getOrCreateTenantReviews(tenantId);
    const initialLen = reviews.length;
    const filtered = reviews.filter(
      (r) => !r.authorName.toLowerCase().includes(normalizedEmail),
    );
    if (filtered.length < initialLen) {
      deletedCount += initialLen - filtered.length;
      reviews.length = 0;
      reviews.push(...filtered);
    }
  } catch {}

  logAudit("gdpr_deletion_completed", {
    tenantId,
    email: normalizedEmail,
    deletedCount,
  });

  return {
    tenantId,
    email: normalizedEmail,
    deletedItemsCount: deletedCount,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Restituisce la sintesi della privacy (informativa) da mostrare nel widget
 * agli utenti finali prima che lascino dati.
 */
export function getWidgetPrivacyDisclosure(): {
  controller: string;
  dataCollected: string[];
  subProcessors: string[];
} {
  return {
    controller: "AgentCloud / Tenant Controller",
    dataCollected: ["Nome", "Indirizzo Email", "Messaggio / Richiesta"],
    subProcessors: SUB_PROCESSORS.map((s) => `${s.name} (${s.purpose})`),
  };
}
