import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const hasAccess = await hasPlatformAccess();
  if (!user && !hasAccess) redirect("/login");

  const isMock = !user && hasAccess;
  const tenantId = user?.id ?? (hasAccess ? "__tenant__" : null);
  // Generic integrations require real auth user (uuid FK). Mock tenant cannot have rows in tenant_integrations (uuid).
  const effectiveId = user?.id ?? null;

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

  const email = isMock ? "admin@agentcloud.agency" : (user?.email ?? "");

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

          <IntegrationsGrid rows={rows} locale={locale} />
        </div>
      </section>
    </DashboardShell>
  );
}
