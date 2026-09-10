import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandLogo from "@/components/BrandLogo";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageSeo } from "@/lib/seo";
import { INTEGRATIONS } from "@/lib/integrations";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowRight, Sparkles, Plug, Clock3, CheckCircle2, Link2, Unlink } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isIt = locale === "it";
  const dict = getDictionary(locale);
  const title = dict.integrationsPage.integrationsLabel;
  const description = isIt
    ? "Collega AgentCloud ai tuoi strumenti: Shopify, Gmail, Slack, HubSpot e molti altri. Vedi tutte le app disponibili e quelle in arrivo."
    : "Connect AgentCloud to your tools: Shopify, Gmail, Slack, HubSpot and more. See all available and upcoming apps.";
  return pageSeo({ title, description, path: "/integrations", locale });
}

export default async function IntegrationsPage() {
  const locale = await getLocale();
  const isIt = locale === "it";
  const dict = getDictionary(locale);

  // Check real connection status
  const user = await getSessionUser();
  const connectedProviders: Record<string, boolean> = {};

  if (user?.id) {
    const admin = createAdminClient();
    if (admin) {
      // Check Shopify connections
      const { data: shopifyRows } = await admin
        .from("shopify_connections")
        .select("shop_domain")
        .eq("user_id", user.id)
        .is("uninstalled_at", null)
        .limit(1);
      if (shopifyRows && shopifyRows.length > 0) {
        connectedProviders["shopify"] = true;
      }

      // Check Google connections
      const { data: googleRow } = await admin
        .from("google_connections")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (googleRow) {
        connectedProviders["gmail"] = true;
        connectedProviders["googlecalendar"] = true;
      }

      // Check generic integrations (tenant_integrations)
      const { data: tenantRows } = await admin
        .from("tenant_integrations")
        .select("provider")
        .eq("tenant_id", user.id)
        .eq("status", "connected");
      for (const row of tenantRows ?? []) {
        connectedProviders[row.provider.toLowerCase()] = true;
      }
    }
  }

  const available = INTEGRATIONS.filter((i) => i.available);
  const comingSoon = INTEGRATIONS.filter((i) => !i.available);

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <section className="px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          <div className="mb-10 text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Plug size={13} className="text-brand-400" />
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
                {dict.integrationsPage.integrationsLabel}
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {dict.integrationsPage.connectYourTools}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-neutral-400">
              {isIt
                ? "Tutte le app con cui AgentCloud si collega — quelle già disponibili portano all'agente che le usa, quelle in arrivo sono contrassegnate come Prossimamente."
                : "All apps AgentCloud connects to — available ones link to the agent that uses them, upcoming ones are marked as Coming soon."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-400"
              >
                {dict.integrationsPage.browseAgents} <ArrowRight size={14} />
              </Link>
              <Link                 href="/contact"
                 className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10"
               >
                 <Sparkles size={14} /> {dict.integrationsPage.requestDemo}
              </Link>
            </div>
          </div>

          <div className="mb-8 flex items-center gap-2 text-sm font-bold text-white">
            <CheckCircle2 size={16} className="text-emerald-400" />
            {`${dict.integrationsPage.availableNow} · ${available.length}`}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {available.map((app) => {
              const isConnected = connectedProviders[app.brand.toLowerCase()] || false;
              return (
                <Link
                  key={app.brand}
                  href={app.agentSlug ? `/agents/${app.agentSlug}` : "/agents"}
                  className="group relative rounded-xl border border-white/5 bg-neutral-900 p-5 hover:border-brand-500/30 hover:bg-neutral-900/80 transition-colors"
                >
                  {/* Connection status badge */}
                  {user && (
                    <div className="absolute right-3 top-3">
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <Link2 size={10} />
                          {isIt ? "Connesso" : "Connected"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-500/15 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                          <Unlink size={10} />
                          {isIt ? "Non connesso" : "Not connected"}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                    <BrandLogo slug={app.brand} size={22} />
                  </div>
                  <h3 className="font-bold text-white group-hover:text-brand-300">{app.name}</h3>
                  <p className="text-xs font-semibold text-neutral-500">{app.category}</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{app.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-400">
                    {dict.integrationsPage.goToAgent} <ArrowRight size={12} />
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 flex items-center gap-2 text-sm font-bold text-white">
            <Clock3 size={16} className="text-amber-400" />
            {`${dict.integrationsPage.comingSoon} · ${comingSoon.length}`}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
            {comingSoon.map((app) => (
              <Link
                key={app.brand}
                href="/contact"
                className="rounded-xl border border-white/5 bg-neutral-900/60 p-5 hover:border-white/10 hover:bg-neutral-900 transition-colors"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 opacity-80">
                  <BrandLogo slug={app.brand} size={22} />
                </div>
                <h3 className="font-bold text-white">{app.name}</h3>
                <p className="text-xs font-semibold text-neutral-500">{app.category}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-400">{app.description}</p>
                <span className="mt-3 inline-flex rounded-full bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-300">
                  {dict.integrationsPage.comingSoon}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
