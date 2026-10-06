"use client";

import { useState } from "react";
import Link from "next/link";
import { Plug, CheckCircle2, ArrowRight } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { isIntegrationAvailable } from "@/lib/integrations";
import { resolveShopDomain } from "@/lib/shopify-input";

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
  if (k === "notion" || k.includes("notion")) return "notion";
  if (k === "slack" || k.includes("slack")) return "slack";
  if (k === "hubspot" || k.includes("hubspot")) return "hubspot";
  if (k === "google sheets" || k.includes("sheets")) return "google_sheets";
  // Va PRIMA del catch-all `includes("google")` sotto: Drive sta nel layer
  // generico (tenant_integrations), non in google_connections.
  if (k.includes("drive")) return "google_drive";
  if (k.includes("airtable")) return "airtable";
  if (k.includes("trello")) return "trello";
  if (k.includes("google")) return "google";
  return null;
}

export default function AgentIntegrationsCard({ integrations, agentSlug, genericConnected, shopifyConnected, googleConnected }: Props) {
  const { dict } = useLanguage();
  const [shopifyOpen, setShopifyOpen] = useState(false);
  const [shopifyShop, setShopifyShop] = useState("");
  const [shopifyError, setShopifyError] = useState(false);

  const connectShopify = () => {
    const shop = resolveShopDomain(shopifyShop);
    if (!shop) {
      setShopifyError(true);
      return;
    }
    const returnTo = encodeURIComponent(`/agents/${agentSlug}`);
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(shop)}&returnTo=${returnTo}`;
  };

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
          const soon = !isIntegrationAvailable(label);
          const isGeneric = prov && ["notion", "slack", "hubspot", "google_sheets", "google_drive", "github", "clickup", "asana", "airtable", "trello"].includes(prov);
          const connected = isGeneric
            ? !!genericConnected[prov!]
            : prov === "shopify"
              ? shopifyConnected
              : prov === "google"
                ? googleConnected
                : false;
          const href = isGeneric
            ? `/api/integrations/${prov}/authorize?returnTo=${encodeURIComponent(`/agents/${agentSlug}`)}`
            : prov === "google"
              ? `/api/auth/google/connect?returnTo=${encodeURIComponent(`/agents/${agentSlug}`)}`
              : `/dashboard/integrations`;
          // Shopify richiede il dominio del negozio: lo chiediamo inline,
          // altrimenti /api/shopify/install rifiuta la richiesta (invalid_shop).
          const needsShopInput = prov === "shopify" && !connected && !soon;
          return (
            <div key={label} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${connected ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/5 bg-neutral-800/60"}`}>
              <span className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${connected ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-neutral-400"}`}>
                  {connected ? <CheckCircle2 size={16} /> : <Plug size={16} />}
                </span>
                <span className="text-sm font-bold text-white">{label}</span>
                {connected && <span className="text-xs font-bold text-emerald-400">· {dict.agentIntegrations.connected}</span>}
              </span>
              {connected ? (
                <Link href="/dashboard/integrations" className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20">
                  {dict.agentIntegrations.manage} <ArrowRight size={12} />
                </Link>
              ) : soon ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                  {dict.common.comingSoon}
                </span>
              ) : needsShopInput ? (
                shopifyOpen ? (
                  <span className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-2">
                      <input
                        value={shopifyShop}
                        onChange={(e) => {
                          setShopifyShop(e.target.value);
                          setShopifyError(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") connectShopify();
                        }}
                        placeholder="tuo-negozio.myshopify.com"
                        aria-invalid={shopifyError}
                        className={`w-44 rounded-full border bg-neutral-900 px-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none ${shopifyError ? "border-red-500/60" : "border-white/10 focus:border-brand-500"}`}
                      />
                      <button
                        type="button"
                        onClick={connectShopify}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white hover:bg-brand-400"
                      >
                        {dict.agentIntegrations.connect} <ArrowRight size={12} />
                      </button>
                    </span>
                    {shopifyError && (
                      <span className="text-[11px] font-semibold text-red-400">
                        Dominio non valido (es. mio-negozio.myshopify.com)
                      </span>
                    )}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShopifyOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white hover:bg-brand-400"
                  >
                    {dict.agentIntegrations.connect} <ArrowRight size={12} />
                  </button>
                )
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
        {dict.agentIntegrations.configureNote}
      </p>
    </div>
  );
}
