"use client";

import Link from "next/link";
import { Plug, CheckCircle2, ArrowRight } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

type Props = {
  integrations: string[];
  agentSlug: string;
  // generic statuses from tenant_integrations
  genericConnected: Record<string, boolean>;
  shopifyConnected: boolean;
  googleConnected: boolean;
};

function providerForIntegration(label: string): string | null {
  const k = label.toLowerCase();
  if (k.includes("shopify")) return "shopify";
  if (k === "gmail" || k === "google calendar" || k === "calendar" || k.includes("google calendar")) return "google";
  if (k === "stripe" || k.includes("stripe")) return "stripe";
  if (k === "notion" || k.includes("notion")) return "notion";
  if (k === "slack" || k.includes("slack")) return "slack";
  if (k === "hubspot" || k.includes("hubspot")) return "hubspot";
  if (k === "google sheets" || k.includes("sheets")) return "google_sheets";
  if (k.includes("google")) return "google";
  return null;
}

export default function AgentIntegrationsCard({ integrations, agentSlug, genericConnected, shopifyConnected, googleConnected }: Props) {
  const { locale, dict } = useLanguage();
  return (
    <div className="rounded-2xl border border-white/5 bg-neutral-900/80 p-6 shadow-xl shadow-black/20 backdrop-blur">
      <div className="mb-4 flex items-center gap-2.5 border-b border-white/5 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
          <Plug size={18} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">{dict.agentIntegrations.integrations}</h2>
          <p className="text-xs font-semibold text-neutral-500">
            {dict.agentIntegrations.connectToolsDesc}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {integrations.map((label) => {
          const prov = providerForIntegration(label);
          const isGeneric = prov && ["stripe", "notion", "slack", "hubspot", "google_sheets"].includes(prov);
          const connected = isGeneric
            ? !!genericConnected[prov!]
            : prov === "shopify"
              ? shopifyConnected
              : prov === "google"
                ? googleConnected
                : false;
          const href = isGeneric
            ? `/api/integrations/${prov}/authorize?returnTo=${encodeURIComponent(`/agents/${agentSlug}`)}`
            : prov === "shopify"
              ? `/api/shopify/install?returnTo=${encodeURIComponent(`/agents/${agentSlug}`)}`
              : prov === "google"
                ? `/api/auth/google/connect?returnTo=${encodeURIComponent(`/agents/${agentSlug}`)}`
                : `/dashboard/integrations`;
          return (
            <div key={label} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${connected ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/5 bg-neutral-800/60"}`}>
              <span className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${connected ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-neutral-400"}`}>
                  {connected ? <CheckCircle2 size={16} /> : <Plug size={16} />}
                </span>
                <span className="text-sm font-bold text-white">{label}</span>
                {connected && <span className="text-xs font-bold text-emerald-400">· {locale === "it" ? dict.agentIntegrations.connected : dict.agentIntegrations.connected}</span>}
              </span>
              {connected ? (
                <Link href="/dashboard/integrations" className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20">
                  {dict.agentIntegrations.manage} <ArrowRight size={12} />
                </Link>
              ) : (
                <Link href={href} className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white hover:bg-brand-400">
                  {dict.agentIntegrations.connect} <ArrowRight size={12} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-500">
        {locale === "it"
          ? "Configura sia da qui (pagina agente) sia da /dashboard/integrations — è lo stesso collegamento. Se ti abboni, l'agente risulta già connesso."
          : "Configure either here (agent page) or from /dashboard/integrations — same link. If you subscribe, the agent shows already connected."}
      </p>
    </div>
  );
}
