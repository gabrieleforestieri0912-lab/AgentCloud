import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingBrandBubbles from "@/components/FloatingBrandBubbles";
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
  const dict = getDictionary(locale);
  const title = dict.integrationsPage.integrationsLabel;
  const description = dict.integrationsPage.metaDescription;
  return pageSeo({ title, description, path: "/integrations", locale });
}

export default async function IntegrationsPage() {
  const locale = await getLocale();
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
    <main className="relative min-h-screen overflow-x-hidden bg-neutral-950">
      {/* Sfondo — stesso linguaggio della landing e di /agents: il gradiente scuro
          con radiali e hairline vive nel layer fisso; le bolle (z-0) stanno sopra
          il gradiente e sotto il contenuto (z-10), altrimenti resterebbero
          coperte da un fondo opaco. Replica la homepage 1:1. */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 dark-gradient-main" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 85% 12%, rgba(234,67,53,.14), transparent 28%), radial-gradient(circle at 50% 85%, rgba(168,85,247,.12), transparent 36%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
      </div>

      <FloatingBrandBubbles
        bubbles={[
          { top: "8%", left: "3%", size: "w-11 h-11", brand: "google", delay: "0s", anim: "animate-float-gentle" },
          { top: "12%", left: "91%", size: "w-10 h-10", brand: "shopify", delay: "1.2s", anim: "animate-float-reverse" },
          { top: "22%", left: "2%", size: "w-10 h-10", brand: "stripe", delay: "0.6s", anim: "animate-float-gentle" },
          { top: "25%", left: "92%", size: "w-11 h-11", brand: "gmail", delay: "1.8s", anim: "animate-float-reverse" },
          { top: "40%", left: "4%", size: "w-10 h-10", brand: "whatsapp", delay: "0.4s", anim: "animate-float-reverse" },
          { top: "38%", left: "88%", size: "w-11 h-11", brand: "notion", delay: "2.0s", anim: "animate-float-gentle" },
          { top: "55%", left: "3%", size: "w-12 h-12", brand: "hubspot", delay: "1.0s", anim: "animate-float-reverse" },
          { top: "53%", left: "92%", size: "w-10 h-10", brand: "facebook", delay: "1.5s", anim: "animate-float-gentle" },
          { top: "65%", left: "6%", size: "w-11 h-11", brand: "discord", delay: "1.6s", anim: "animate-float-gentle" },
          { top: "63%", left: "86%", size: "w-12 h-12", brand: "google", delay: "0.9s", anim: "animate-float-reverse" },
          { top: "78%", left: "5%", size: "w-10 h-10", brand: "github", delay: "1.1s", anim: "animate-float-gentle" },
          { top: "76%", left: "91%", size: "w-11 h-11", brand: "trello", delay: "2.2s", anim: "animate-float-reverse" },
          { top: "88%", left: "4%", size: "w-10 h-10", brand: "linkedin", delay: "0.7s", anim: "animate-float-gentle" },
          { top: "86%", left: "88%", size: "w-11 h-11", brand: "dropbox", delay: "1.9s", anim: "animate-float-reverse" },
        ]}
      />

      <Navbar />
      <section className="relative z-10 px-4 pb-16 pt-28 sm:px-6 lg:px-8">
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
              {dict.integrationsPage.integrationsDesc}
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
            <p className="mx-auto mt-3 max-w-2xl text-xs text-neutral-500">Scorri sotto: ogni card ti guida in 3 passi — scegli, clicca Connetti, usa l’agente. Nessun bottone guida a parte.</p>
          </div>

          <div className="mb-8 flex items-center gap-2 text-sm font-bold text-white">
            <CheckCircle2 size={16} className="text-emerald-400" />
            {`${dict.integrationsPage.availableNow} · ${available.length}`}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((app) => {
              const isConnected = connectedProviders[app.brand.toLowerCase()] || false;
              return (
                <div
                  key={app.brand}
                  className="relative rounded-xl border border-white/5 bg-neutral-900 p-5 flex flex-col"
                >
                  {user && (
                    <div className="absolute right-3 top-3">
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <Link2 size={10} />
                          {dict.integrationsGrid.connectedStatus}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-500/15 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                          <Unlink size={10} />
                          {dict.integrationsGrid.notConnected}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                    <BrandLogo slug={app.brand} size={22} />
                  </div>
                  <h3 className="mt-3 font-bold text-white">{app.name}</h3>
                  <p className="text-xs font-semibold text-neutral-500">{app.category}</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{app.description}</p>
                  {/* Guida integrata nel flusso — 3 passi sempre visibili, non un bottone a parte */}
                  <ol className="mt-3 space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <li className="flex gap-2 text-xs leading-5 text-neutral-300"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-neutral-900">1</span><span>Scegli {app.name}</span></li>
                    <li className="flex gap-2 text-xs leading-5 text-neutral-300"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">2</span><span>Clicca sotto e autorizza (2 min)</span></li>
                    <li className="flex gap-2 text-xs leading-5 text-neutral-400"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-neutral-800 text-[10px] font-bold">3</span><span>Torna qui: usa l’agente</span></li>
                  </ol>
                  <Link
                    href={user ? "/dashboard/integrations" : (app.agentSlug ? `/agents/${app.agentSlug}` : "/agents")}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
                  >
                    {isConnected ? "Gestisci" : "Connetti in 2 minuti"} <ArrowRight size={14} />
                  </Link>
                </div>
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
