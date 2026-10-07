/**
 * Client Graph per un tenant.
 *
 * Separato da `graph.ts` per una ragione precisa: qui si tocca Supabase
 * (`resolveIntegrationToken` → admin client → `tenant_integrations`), e quei
 * moduli usano l'alias `@/` che i test con `node --experimental-strip-types`
 * non risolvono. Tenendo la risoluzione in questo file, `graph.ts` resta
 * testabile in isolamento.
 *
 * Il token lo risolve `resolveIntegrationToken` (src/lib/integrations/api-proxy):
 * decripta la riga e, se il token è scaduto, lo rinfresca tramite l'hook
 * `refreshToken` dell'adapter Microsoft. È la stessa strada di tutti gli altri
 * provider e lo stesso punto che decide quando chiedere all'utente di
 * riconnettere: non va duplicato.
 */

import { resolveIntegrationToken, integrationAuth } from "@/lib/integrations/api-proxy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGraphClient, type GraphClient, type GraphResult } from "./graph";

/**
 * True se il tenant ha una connessione Microsoft attiva. Usato dalla route
 * dell'agente per esporre i tool Microsoft solo quando possono funzionare.
 * Non rinfresca il token: è un controllo di presenza, non di validità.
 */
export async function isMicrosoftConnected(tenantId: string): Promise<boolean> {
  if (!tenantId) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  const { data, error } = await admin
    .from("tenant_integrations")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("provider", "microsoft")
    .maybeSingle();
  if (error || !data) return false;
  return (data as { status?: string }).status === "connected";
}

export async function graphClientForTenant(
  tenantId: string,
): Promise<GraphResult<GraphClient>> {
  const resolved = await resolveIntegrationToken(tenantId, "microsoft");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  return { ok: true, data: createGraphClient(integrationAuth(resolved.token)) };
}
