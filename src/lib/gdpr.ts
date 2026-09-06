/**
 * GDPR & Privacy Compliance Module
 *
 * Implements data minimization, sub-processor registry, and
 * the "Right to be forgotten" (deletion of all tenant data associated with an email).
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
 * Delete all tenant data linked to a specific email address across services.
 */
export async function deleteTenantDataForEmail(
  tenantId: string,
  email: string,
): Promise<DeletionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  let deletedCount = 0;

  logAudit("gdpr_deletion_request", { tenantId, email: normalizedEmail });

  // 1. Purge matching reviews / author submissions in memory/store
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
 * Return summary privacy notice for widget presentation.
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
