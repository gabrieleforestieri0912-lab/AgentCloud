import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TENANT_SHOPIFY_ID, listShopifyConnections } from "@/lib/shopify/connections";
import { TENANT_GOOGLE_ID, getGoogleConnectionSummary } from "@/lib/google/connections";
import DashboardShell from "@/components/DashboardShell";
import IntegrationsGrid from "@/components/IntegrationsGrid";
import { getLocale } from "@/lib/i18n/locale";

export default async function DashboardIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ integration?: string; status?: string; reason?: string }>;
}) {
  const locale = await getLocale();
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
    <DashboardShell email={email}>
      <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {locale === "it" ? "Integrazioni" : "Integrations"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              {locale === "it"
                ? "Collega Stripe, Notion, Slack, HubSpot e Google Sheets. Ogni provider è OAuth per-tenant, i token sono cifrati e proxati via Edge Function — mai esposti al browser."
                : "Connect Stripe, Notion, Slack, HubSpot and Google Sheets. Per-tenant OAuth, tokens encrypted and proxied via Edge Functions — never exposed to the browser."}
            </p>
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
                ? locale === "it" ? "Connesso" : "Connected"
                : sp.status === "disconnected"
                  ? locale === "it" ? "Disconnesso" : "Disconnected"
                  : sp.reason
                    ? `Errore: ${sp.reason}`
                    : sp.status}
            </div>
          )}

          <IntegrationsGrid rows={rows} locale={locale} shopifyConnections={shopifyConnections} googleConnection={googleConnection} />
        </div>
      </section>
    </DashboardShell>
  );
}
