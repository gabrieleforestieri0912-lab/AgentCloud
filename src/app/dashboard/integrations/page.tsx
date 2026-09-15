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
            {/* Progress integrato — non un bottone guida a parte, ma il flusso stesso ti guida */}
            {(() => {
              const connectedCount = rows.filter((r) => r.status === "connected").length + (shopifyConnections.some((c) => c.connected) ? 1 : 0) + (googleConnection?.connected ? 1 : 0);
              const total = 8; // Shopify, Gmail, Calendar, Stripe, HubSpot, Notion, Sheets, Slack
              const pct = Math.round((connectedCount / total) * 100);
              return (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-white/10 sm:block">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {connectedCount === 0 ? "Inizia dal primo: scegli un'app qui sotto e clicca Connetti — 2 minuti, senza codice." : connectedCount < total ? `${connectedCount} di ${total} connesse · prossimo: clicca Connetti sulla prossima card` : "Tutte connesse — prova gli agenti in chat."}
                  </p>
                  <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white">{connectedCount}/{total}</span>
                </div>
              );
            })()}
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
