/**
 * Motore recensioni / Google Business Profile.
 *
 * Fornisce monitoraggio delle recensioni, supporto all'analisi del sentiment
 * e flussi di bozza di risposta per le sedi Google Business Profile, con
 * isolamento per-tenant dei dati.
 */

import { logAudit } from "@/lib/audit";
import { getTenantCredentials } from "@/lib/tenants";

export type GoogleBusinessReview = {
  reviewId: string;
  authorName: string;
  rating: number; // 1..5 (0 = non specificato dall'API)
  comment: string;
  createTime: string;
  reply?: {
    comment: string;
    updateTime: string;
  };
};

export type ListReviewsParams = {
  tenantId?: string;
  minRating?: number;
  unansweredOnly?: boolean;
};

// Forma del payload restituito dalla Google Business Profile API (solo i
// campi che ci servono): i nomi sono quelli originali dell'API, da qui lo
// stile diverso dal tipo GoogleBusinessReview già normalizzato.
type GoogleBusinessReviewPayload = {
  reviewId?: string;
  name?: string;
  reviewer?: { displayName?: string } | null;
  starRating?: string | number;
  comment?: string | null;
  createTime?: string;
  reviewReply?: { comment?: string; updateTime?: string } | null;
};

const BUSINESS_API_BASE = "https://mybusiness.googleapis.com/v4";

/** Valori dell'enum `StarRating` della Reviews API (v4). */
const STAR_RATING_VALUES: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

/**
 * L'API restituisce `starRating` come enum testuale (ONE..FIVE), non come
 * numero: fare `Number(starRating)` dava sempre NaN. I valori numerici sono
 * accettati solo per robustezza; 0 significa "non specificato".
 */
function parseStarRating(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(5, Math.max(1, Math.round(value)));
  }
  return STAR_RATING_VALUES[String(value ?? "").trim().toUpperCase()] ?? 0;
}

/**
 * URL della Reviews API per la sede configurata, o null se manca account id o
 * location id: in v4 il path è `accounts/{accountId}/locations/{locationId}/reviews`
 * e `-` non è un wildcard (a differenza delle nuove Business Profile API v1),
 * quindi senza un location id reale la chiamata non può funzionare.
 */
function businessReviewsUrl(): string | null {
  const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID;
  const locationId = process.env.GOOGLE_BUSINESS_LOCATION_ID;
  if (!accountId || !locationId) return null;
  return `${BUSINESS_API_BASE}/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews`;
}

// Store di fallback in memoria per le recensioni demo/test per-tenant
const tenantReviewsStore = new Map<string, GoogleBusinessReview[]>();

export function getOrCreateTenantReviews(tenantId: string): GoogleBusinessReview[] {
  if (!tenantReviewsStore.has(tenantId)) {
    tenantReviewsStore.set(tenantId, [
      {
        reviewId: "rev-101",
        authorName: "Alessandro V.",
        rating: 5,
        comment: "Servizio eccellente e veloce. Molto professionali e puntuali!",
        createTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        reviewId: "rev-102",
        authorName: "Giulia B.",
        rating: 2,
        comment: "Tempi di attesa un po' lunghi, anche se il lavoro finale era ok.",
        createTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  }
  return tenantReviewsStore.get(tenantId)!;
}

export async function listBusinessReviews(
  params: ListReviewsParams,
): Promise<GoogleBusinessReview[]> {
  const tenantId = params.tenantId || "default";
  logAudit("reviews_list_fetch", { tenantId, minRating: params.minRating });

  // Se per il tenant esistono credenziali Google live, interroghiamo la Google
  // Business API
  const creds = getTenantCredentials(tenantId);
  const token = creds?.google?.accessToken;

  // Accesso live solo con account id E location id configurati.
  const reviewsUrl = businessReviewsUrl();
  if (token && reviewsUrl) {
    try {
      const res = await fetch(`${reviewsUrl}?pageSize=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          reviews?: GoogleBusinessReviewPayload[];
        };
        const apiReviews: GoogleBusinessReview[] = (data.reviews ?? []).map((r) => ({
          reviewId: r.reviewId || r.name || "",
          authorName: r.reviewer?.displayName || "Utente",
          rating: parseStarRating(r.starRating),
          comment: r.comment || "",
          createTime: r.createTime || new Date().toISOString(),
          reply: r.reviewReply?.comment
            ? {
                comment: r.reviewReply.comment,
                updateTime: r.reviewReply.updateTime || "",
              }
            : undefined,
        }));
        return filterReviews(apiReviews, params);
      }
    } catch (err) {
      logAudit("reviews_fetch_error", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Altrimenti restituisci le recensioni locali per tenant
  const localReviews = getOrCreateTenantReviews(tenantId);
  return filterReviews(localReviews, params);
}

function filterReviews(
  reviews: GoogleBusinessReview[],
  params: ListReviewsParams,
): GoogleBusinessReview[] {
  return reviews.filter((r) => {
    if (params.minRating && r.rating < params.minRating) return false;
    if (params.unansweredOnly && r.reply) return false;
    return true;
  });
}

export async function replyToBusinessReview(
  tenantId: string,
  reviewId: string,
  replyText: string,
): Promise<{ ok: boolean; message: string }> {
  logAudit("review_reply_attempt", { tenantId, reviewId, replyLength: replyText.length });

  const cleanReply = replyText.trim();
  if (!cleanReply) {
    return { ok: false, message: "Il testo della risposta non può essere vuoto." };
  }
  // Limite documentato da Google: 4096 byte per risposta.
  if (Buffer.byteLength(cleanReply, "utf8") > 4096) {
    return {
      ok: false,
      message: "La risposta supera il limite di 4096 byte imposto da Google Business Profile.",
    };
  }

  const creds = getTenantCredentials(tenantId);
  const token = creds?.google?.accessToken;

  const reviewsUrl = businessReviewsUrl();
  if (token && reviewsUrl) {
    try {
      const res = await fetch(`${reviewsUrl}/${encodeURIComponent(reviewId)}/reply`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment: cleanReply }),
      });
      if (res.ok) {
        logAudit("review_reply_published", { tenantId, reviewId });
        return { ok: true, message: `Risposta pubblicata con successo per la recensione ${reviewId} su Google Business.` };
      }
    } catch (err) {
      logAudit("review_reply_publish_error", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Aggiorna nello store locale per-tenant
  const reviews = getOrCreateTenantReviews(tenantId);
  const target = reviews.find((r) => r.reviewId === reviewId);
  if (target) {
    target.reply = {
      comment: cleanReply,
      updateTime: new Date().toISOString(),
    };
  }

  logAudit("review_reply_saved_locally", { tenantId, reviewId });
  return {
    ok: true,
    message: `Risposta registrata per la recensione ${reviewId} (autore: ${target?.authorName || "Cliente"}):\n"${cleanReply}"`,
  };
}

export function formatReviewsMarkdown(reviews: GoogleBusinessReview[]): string {
  if (reviews.length === 0) return "Nessuna recensione trovata.";

  return reviews
    .map((r, i) => {
      const replyBlock = r.reply
        ? `\n  ↳ **Risposta della sede:** "${r.reply.comment}" (${r.reply.updateTime.slice(0, 10)})`
        : "\n  ↳ *Nessuna risposta pubblicata.*";
      return `[${i + 1}] **${r.authorName}** — ${r.rating}/5\n  "${r.comment}" (ID: \`${r.reviewId}\`, Data: ${r.createTime.slice(0, 10)})${replyBlock}`;
    })
    .join("\n\n");
}
