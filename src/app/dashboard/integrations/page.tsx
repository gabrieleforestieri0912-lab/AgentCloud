import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { accountIdentityFromUser } from "@/lib/account-identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { TENANT_SHOPIFY_ID, listShopifyConnections } from "@/lib/shopify/connections";
import { TENANT_GOOGLE_ID, getGoogleConnectionSummary } from "@/lib/google/connections";
import DashboardShell from "@/components/DashboardShell";
import IntegrationsGrid from "@/components/IntegrationsGrid";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function DashboardIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ integration?: string; status?: string; reason?: string }>;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const sp = await searchParams;

  const user = await getSessionUser();

  const effectiveId = user?.id ?? (false ? "__tenant__" : null);

  const db = createAdminClient();
  let rows: Array<{
    provider: string;
    status: string;
    external_account_id: string | null;
    metadata: Record<string, unknown> | null;
    updated_at: string;
    scope: string | null;
  }> = [];

  if (db && effectiveId) {
    const { data } = await db
      .from("tenant_integrations")
      .select("provider, status, external_account_id, metadata, updated_at, scope")
      .eq("tenant_id", effectiveId);
    rows = (data as typeof rows) ?? [];
  }

  // Shopify + Google (existing OAuth) — così la pagina dashboard mostra TUTTE le app menzionate su agentcloud
  const shopifyOwner = false ? user?.id ?? null : user?.id ?? null;
  const googleOwner = false ? user?.id ?? null : user?.id ?? null;
  const shopifyConnections = shopifyOwner ? await listShopifyConnections(shopifyOwner).catch(() => []) : [];
  const googleConnection = googleOwner ? await getGoogleConnectionSummary(googleOwner).catch(() => null) : null;

  const email = false ? "admin@agentcloud.agency" : (user?.email ?? "");

  return (
    <DashboardShell email={email} account={accountIdentityFromUser(user)}>
      <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {dict.dashboardIntegrations.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              {dict.dashboardIntegrations.desc}
            </p>
            {/* Guida rapida 3 passi */}
            <div className="mt-4 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4">
              <p className="text-sm font-bold text-white">Come si collega? 3 passi, 1-2 minuti — senza codice.</p>
              <ol className="mt-2 grid gap-2 text-sm leading-6 text-neutral-300 sm:grid-cols-3">
                <li className="flex gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-neutral-900">1</span> <span><b className="text-white">Scegli</b> lo strumento che usi (Shopify, Gmail, Slack...)</span></li>
                <li className="flex gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-neutral-900">2</span> <span><b className="text-white">Clicca Connetti</b> e autorizza nella pagina ufficiale (Google, Slack, ecc.)</span></li>
                <li className="flex gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-neutral-900">3</span> <span><b className="text-white">Torna qui</b>: vedrai “Connesso”. Prova subito l’agente in chat.</span></li>
              </ol>
              <p className="mt-2 text-xs text-neutral-400">I token sono cifrati e mai visibili nel browser. Puoi scollegare quando vuoi con un click.</p>
            </div>
          </div>

          {(sp.status || sp.integration) && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                sp.status === "connected"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : sp.status === "disconnected"
                    ? "border-white/10 bg-white/5 text-neutral-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              {sp.integration ? `${sp.integration}: ` : ""}
              {sp.status === "connected"
                ? dict.dashboardIntegrations.connected
                : sp.status === "disconnected"
                  ? dict.dashboardIntegrations.disconnected
                  : sp.reason
                    ? `${dict.dashboardIntegrations.errorPrefix} ${sp.reason}`
                    : sp.status}
            </div>
          )}

          <IntegrationsGrid rows={rows} locale={locale} shopifyConnections={shopifyConnections} googleConnection={googleConnection} />
        </div>
      </section>
    </DashboardShell>
  );
}
