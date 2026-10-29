import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { accountIdentityFromUser } from "@/lib/account-identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { listShopifyConnections } from "@/lib/shopify/connections";
import { getGoogleConnectionSummary } from "@/lib/google/connections";
import DashboardShell from "@/components/DashboardShell";
import IntegrationsGrid from "@/components/IntegrationsGrid";
import PluginsCatalog from "@/components/skills/PluginsCatalog";
import SkillsList from "@/components/skills/SkillsList";
import { INTEGRATIONS, BRAND_TO_PROVIDER } from "@/lib/integrations";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSkillsDictionary } from "@/lib/i18n/skills";
import {
  agentOptions,
  flattenSkills,
  getPlugins,
  integrationOptions,
  pluginCategories,
} from "@/lib/skills/data";
import { ArrowRight, GraduationCap, Puzzle } from "lucide-react";

export default async function DashboardIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ integration?: string; status?: string; reason?: string }>;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const sp = await searchParams;

  const user = await getSessionUser();

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

  // Shopify + Google (existing OAuth) — così la pagina dashboard mostra TUTTE le app menzionate su agentcloud
  const shopifyOwner = user?.id ?? null;
  const googleOwner = user?.id ?? null;
  const shopifyConnections = shopifyOwner ? await listShopifyConnections(shopifyOwner).catch(() => []) : [];
  const googleConnection = googleOwner ? await getGoogleConnectionSummary(googleOwner).catch(() => null) : null;

  const email = user?.email ?? "";

  // Catalogo plugin + skill: stessa sorgente delle pagine pubbliche (/plugins
  // e /skills), già risolta e localizzata. Le sezioni qui sotto riutilizzano
  // i cataloghi interattivi completi (filtri, ricerca, card) invece di
  // duplicare una versione ridotta che diverrebbe subito.
  const skillDict = getSkillsDictionary(locale);
  const plugins = await getPlugins(locale);
  const skillCategories = pluginCategories(plugins);
  const skillAgents = agentOptions(plugins);
  const skillIntegrations = integrationOptions(plugins);
  const liveSlugs = plugins
    .filter((p) => p.resolvedIntegrations.some((i) => i.available))
    .map((p) => p.slug);
  const comingSoonRequiredSlugs = plugins
    .filter((p) => p.resolvedIntegrations.some((i) => i.status === "required" && !i.available))
    .map((p) => p.slug);
  const skills = flattenSkills(plugins);

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
              // Contiamo le CARD connesse, non le righe: le quattro app Microsoft
              // condividono una sola connessione `microsoft`, quindi contare le
              // righe mostrerebbe "1/16" con quattro card già attive.
              const connectedProviders = new Set(
                rows.filter((r) => r.status === "connected").map((r) => r.provider),
              );
              const availableApps = INTEGRATIONS.filter((a) => a.available);
              const connectedCount = availableApps.filter((a) => {
                const p = BRAND_TO_PROVIDER[a.brand];
                if (p) return connectedProviders.has(p);
                if (a.brand === "shopify") return shopifyConnections.some((c) => c.connected);
                if (a.brand === "gmail" || a.brand === "googlecalendar") {
                  return !!googleConnection?.connected;
                }
                return false;
              }).length;
              // Derivato, non scritto a mano: era un numero fisso che ogni
              // connettore aggiunto dimenticava di aggiornare.
              const total = availableApps.length;
              return (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-white/10 sm:block">
                    {/* Solo transform: animare `width` su una barra provoca
                        layout, quindi non è animabile via GPU. */}
                    <div
                      className="h-full origin-left bg-emerald-500 transition-transform duration-300"
                      style={{ transform: `scaleX(${Math.min(1, Math.max(0, connectedCount / total))})` }}
                    />
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
                  : sp.status === "pending"
                    ? dict.dashboardIntegrations.pending
                    : sp.reason
                      ? `${dict.dashboardIntegrations.errorPrefix} ${sp.reason}`
                      : sp.status}
            </div>
          )}

          <IntegrationsGrid rows={rows} locale={locale} shopifyConnections={shopifyConnections} googleConnection={googleConnection} />

          {/* ── Plugin ──────────────────────────────────────────────────────
              Pacchetti di competenze: la sezione vive qui perché dai
              connettori si passa ai lavori che li usano — chi collega
              Notion/Slack vuole anche vedere cosa può automatizzare. */}
          <section id="plugins" aria-labelledby="plugins-title" className="mt-16">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Puzzle size={18} className="text-brand-400" aria-hidden />
                  <h2 id="plugins-title" className="text-2xl font-bold tracking-tight text-white">
                    {skillDict.pluginsHeroTitle}
                  </h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                  {skillDict.pluginsHeroSubtitle}
                </p>
              </div>
              <Link
                href="/plugins"
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10"
              >
                {skillDict.browsePlugins}
                <ArrowRight size={13} aria-hidden />
              </Link>
            </div>
            <PluginsCatalog
              plugins={plugins}
              categories={skillCategories}
              agents={skillAgents}
              integrations={skillIntegrations}
              locale={locale}
              liveSlugs={liveSlugs}
              comingSoonRequiredSlugs={comingSoonRequiredSlugs}
            />
          </section>

          {/* ── Skills ──────────────────────────────────────────────────────
              Le singole competenze (figlie dei plugin): stessa divisione
              delle pubbliche — plugin = pacchetti, skill = competenze. */}
          <section id="skills" aria-labelledby="skills-title" className="mt-16 border-t border-white/5 pt-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap size={18} className="text-brand-400" aria-hidden />
                  <h2 id="skills-title" className="text-2xl font-bold tracking-tight text-white">
                    {skillDict.heroTitle}
                  </h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                  {skillDict.heroSubtitle}
                </p>
              </div>
              <Link
                href="/skills"
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10"
              >
                {skillDict.browseSkills}
                <ArrowRight size={13} aria-hidden />
              </Link>
            </div>
            <SkillsList
              skills={skills}
              categories={skillCategories}
              agents={skillAgents}
              integrations={skillIntegrations}
              locale={locale}
            />
          </section>
        </div>
      </section>
    </DashboardShell>
  );
}
