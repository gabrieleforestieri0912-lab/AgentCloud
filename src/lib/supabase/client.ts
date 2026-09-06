/**
 * Client Supabase per il browser (componenti client).
 *
 * Perché separato da server.ts: usa la anon key pubblica (sicura nel browser)
 * e i cookie di sessione gestiti da @supabase/ssr. Va importato SOLO da
 * componenti client, mai da codice server.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
