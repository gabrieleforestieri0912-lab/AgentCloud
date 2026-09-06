import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client that uses the service role key.
 *
 * The service role bypasses Row Level Security, so this client MUST ONLY be
 * used from server code (route handlers / server components) AFTER the
 * request has been authenticated (e.g. via a verified
 * webhook signature). Never import it from client components.
 *
 * Returns `null` when `SUPABASE_SERVICE_ROLE_KEY` is not configured so that
 * callers can degrade gracefully in development.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
