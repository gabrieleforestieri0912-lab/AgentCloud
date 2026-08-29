import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_SPOTS } from "@/lib/waitlist-constants";

// Total available waitlist spots (mirrors the DB-driven cap everywhere).
export { MAX_SPOTS };

/**
 * Authoritative remaining spots: MAX_SPOTS minus the real number of signups
 * currently stored (waitlist emails are unique, so each row is one person).
 * Uses the service-role client so RLS on the table (select = authenticated
 * only) doesn't hide rows; falls back to the anon client in dev.
 */
export async function getRemainingSpots(): Promise<number> {
  const supabase = createAdminClient() ?? (await createClient());
  const { count, error } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return Math.max(MAX_SPOTS - (count ?? 0), 0);
}