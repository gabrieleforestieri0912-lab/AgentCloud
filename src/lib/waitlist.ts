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
// Metadata marker set on every waitlist-provisioned Auth user, so we can count
// only the signups that actually occupy a spot.
const WAITLIST_SOURCE = "waitlist";

/**
 * Count the Auth users provisioned from the waitlist (metadata source=
 * "waitlist"). Deleting one of them in Authentication → Users frees a spot.
 * Falls back to the `waitlist` table count when the service-role key is
 * missing (dev) or the Auth API is unreachable.
 */
async function countTakenSpots(): Promise<number> {
  const admin = createAdminClient();
  if (admin) {
    try {
      let taken = 0;
      let page = 1;
      let total: number | undefined;
      do {
        const { data, error } = await admin.auth.admin.listUsers({ page });
        if (error) throw error;
        const users = data?.users ?? [];
        taken += users.filter(
          (u) => u.user_metadata?.source === WAITLIST_SOURCE,
        ).length;
        total = data?.total;
        page += 1;
      } while (total !== undefined && page <= Math.max(1, Math.ceil(total / 50)));
      return taken;
    } catch (err) {
      console.error("[waitlist] failed to count Auth users:", err);
    }
  }

  // Dev / fallback: count waitlist rows as a proxy for taken spots.
  const supabase = createAdminClient() ?? (await createClient());
  const { count, error } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/**
 * Authoritative remaining spots: MAX_SPOTS minus the real number of signups
 * that occupy a spot. Today a "taken" spot is an Auth user provisioned from
 * the waitlist (so deleting a user in Authentication → Users frees the spot).
 */
export async function getRemainingSpots(): Promise<number> {
  const taken = await countTakenSpots();
  return Math.max(MAX_SPOTS - taken, 0);
}

/**
 * Provision a Supabase Auth user for the waitlist email (idempotent,
 * best-effort).
 *
 * The waitlist page only collects an email, but the owner wants every signup
 * to appear in Auth → Users so that, once the platform opens, those people are
 * already registered. The account is created with a random, never-revealed
 * password and a confirmed email: the person signs in later with Google
 * (same email → Supabase links the account) or via the "forgot password"
 * flow. The `handle_new_user` trigger also creates their `profiles` row.
 *
 * Returns true when the account was created or already exists; false when it
 * could not be verified (e.g. no service-role key, or a non-duplicate error).
 * Never throws: a duplicate email (already registered) is expected and fine.
 */
export async function provisionAuthUser(email: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false; // no service-role key — skip silently (dev fallback)
  try {
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(),
      user_metadata: { source: "waitlist" },
    });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // A pre-existing account is the common case here (re-join, or someone
    // already signed up): log at debug level and move on.
    if (/already registered|already been registered|duplicate/i.test(msg)) {
      console.log("[waitlist] auth user already exists:", email);
      return true;
    }
    console.error("[waitlist] failed to provision auth user:", msg);
    return false;
  }
}

/**
 * Backfill: ensure every email currently in the waitlist table also exists in
 * Supabase Auth. This repairs historical rows inserted before auth-user
 * provisioning existed (or that failed silently). Idempotent — existing
 * accounts are skipped. Returns how many rows were inspected and how many were
 * matched/created.
 */
export async function syncAuthUsers(): Promise<{ total: number; ok: number }> {
  const supabase = createAdminClient();
  if (!supabase) return { total: 0, ok: 0 };
  const { data, error } = await supabase
    .from("waitlist")
    .select("email");
  if (error) {
    console.error("[waitlist] sync: failed to read emails:", error.message);
    return { total: 0, ok: 0 };
  }
  const emails = (data ?? []).map((r) => r.email).filter(Boolean);
  let ok = 0;
  for (const email of emails) {
    if (await provisionAuthUser(email)) ok += 1;
  }
  return { total: emails.length, ok };
}