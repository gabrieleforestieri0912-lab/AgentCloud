/**
 * Helper server-only per i banner promo di lancio.
 *
 * Non crea tabella nuova: riusa MAX_SPOTS + getRemainingSpots() da waitlist.
 * Chiamare SOLO da Server Component / Route Handler (usa service-role).
 */
import { getRemainingSpots } from "@/lib/waitlist";
import { MAX_SPOTS, LAUNCH_AT } from "@/lib/waitlist-constants";

export async function getPromoState() {
  const remaining = await getRemainingSpots();
  const deadline = LAUNCH_AT; // ISO con offset +02:00, stessa del proxy/countdown
  const totalSpots = MAX_SPOTS;
  const taken = totalSpots - remaining;
  const pctTaken = totalSpots > 0 ? Math.round((taken / totalSpots) * 100) : 0;
  const isLaunched = Date.now() >= new Date(deadline).getTime();
  return {
    totalSpots,
    spotsRemaining: remaining,
    taken,
    pctTaken,
    deadline,
    isLaunched,
  };
}
