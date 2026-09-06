import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase server-only che usa la service role key.
 *
 * PERICOLO: il service role bypassa la Row Level Security, quindi questo
 * client può essere usato SOLO da codice server (route handler / server
 * component) DOPO che la richiesta è stata autenticata (es. via firma
 * webhook verificata). Mai importarlo da componenti client.
 *
 * Restituisce `null` quando `SUPABASE_SERVICE_ROLE_KEY` non è configurata,
 * così i chiamanti degradano con grazia in sviluppo.
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
