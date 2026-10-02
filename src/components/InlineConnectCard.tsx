"use client";

import { useState, useCallback } from "react";
import { ExternalLink, CheckCircle2, Plug } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { useLanguage } from "./LanguageProvider";
import { isIntegrationAvailable } from "@/lib/integrations";
import { resolveShopDomain } from "@/lib/shopify-input";
import { t, type Dictionary } from "@/lib/i18n/dictionaries";

type Provider = string;

type ProviderMeta = { name: string; brand: string; desc: string };

const PROVIDER_BRANDS: Record<string, { name: string; brand: string }> = {
  shopify: { name: "Shopify", brand: "shopify" },
  gmail: { name: "Gmail", brand: "gmail" },
  google_calendar: { name: "Google Calendar", brand: "googlecalendar" },
  google_sheets: { name: "Google Sheets", brand: "googlesheets" },
  calendar: { name: "Google Calendar", brand: "googlecalendar" },
  slack: { name: "Slack", brand: "slack" },
  notion: { name: "Notion", brand: "notion" },
  hubspot: { name: "HubSpot", brand: "hubspot" },
  github: { name: "GitHub", brand: "github" },
  clickup: { name: "ClickUp", brand: "clickup" },
  asana: { name: "Asana", brand: "asana" },
  whatsapp: { name: "WhatsApp", brand: "whatsapp" },
};

function getMeta(provider: Provider, descs: Dictionary["inlineConnect"]["descs"]): ProviderMeta {
  const key = provider.toLowerCase().replace(/[^a-z0-9]/g, "");
  // normalize aliases
  if (key.includes("gmail") || key === "email") return { ...PROVIDER_BRANDS.gmail, desc: descs.gmail };
  if (key.includes("calendar")) return { ...PROVIDER_BRANDS.google_calendar, desc: descs.google_calendar };
  if (key.includes("sheets") || key.includes("googlesheets")) return { ...PROVIDER_BRANDS.google_sheets, desc: descs.google_sheets };
  if (key.includes("shopify")) return { ...PROVIDER_BRANDS.shopify, desc: descs.shopify };
  const base = PROVIDER_BRANDS[key];
  if (base && key in descs) return { ...base, desc: descs[key as keyof typeof descs] };
  return { name: provider.charAt(0).toUpperCase() + provider.slice(1), brand: key, desc: "" };
}

export default function InlineConnectCard({ provider }: { provider: string }) {
  const { dict } = useLanguage();
  const ic = dict.inlineConnect;
  const meta = getMeta(provider, ic.descs);
  const desc = meta.desc || t(ic.fallbackDesc, { provider: meta.name });
  // App non ancora collegabile (catalogo `available: false`): la card resta, ma
  // senza un bottone "Connetti" che porterebbe a un errore di OAuth.
  const available = isIntegrationAvailable(meta.brand);
  const [connecting, setConnecting] = useState(false);
  const [shop, setShop] = useState("");
  const [showShopInput, setShowShopInput] = useState(false);
  const [shopError, setShopError] = useState(false);

  const handleConnect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      const p = provider.toLowerCase();
      if (p.includes("shopify")) {
        if (!showShopInput) {
          setShowShopInput(true);
          return;
        }
        const normalized = resolveShopDomain(shop);
        if (!normalized) {
          setShopError(true);
          return;
        }
        window.location.href = `/api/shopify/install?shop=${encodeURIComponent(normalized)}&returnTo=${returnTo}`;
        return;
      }
      if (p.includes("gmail") || p.includes("calendar") || p === "google") {
        window.location.assign(`/api/auth/google/connect?returnTo=${returnTo}`);
        return;
      }
      // generic integrations via tenant_integrations
      const genericMap: Record<string, string> = {
        notion: "notion",
        slack: "slack",
        hubspot: "hubspot",
        github: "github",
        clickup: "clickup",
        asana: "asana",
        googlesheets: "google_sheets",
        google_sheets: "google_sheets",
        sheets: "google_sheets",
      };
      const gKey = p.replace(/[^a-z0-9_]/g, "");
      const mapped = genericMap[gKey] || gKey;
      window.location.assign(`/api/integrations/${mapped}/authorize?returnTo=${returnTo}`);
    } finally {
      setConnecting(false);
    }
  }, [provider, connecting, shop, showShopInput]);

  const confirmShop = () => {
    const normalized = resolveShopDomain(shop);
    if (!normalized) {
      setShopError(true);
      return;
    }
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(normalized)}&returnTo=${returnTo}`;
  };

  return (
    <div className="my-3 rounded-2xl border border-brand-500/20 bg-neutral-900/80 backdrop-blur p-4 shadow-lg shadow-brand-500/5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-white/10 shrink-0">
          <BrandLogo slug={meta.brand} size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white flex items-center gap-1.5">
            <Plug size={14} className="text-brand-400" />
            {ic.connect} {meta.name}
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed">{desc}</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
          {ic.required}
        </span>
      </div>

      {provider.toLowerCase().includes("shopify") && showShopInput ? (
        <div className="mt-3">
          <div className="flex gap-2">
            <input
              value={shop}
              onChange={(e) => {
                setShop(e.target.value);
                setShopError(false);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") confirmShop(); }}
              placeholder="tuo-negozio.myshopify.com"
              aria-invalid={shopError}
              className={`flex-1 rounded-full border bg-neutral-800 px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none ${shopError ? "border-red-500/60" : "border-white/10 focus:border-brand-500"}`}
              autoFocus
            />
            <button
              type="button"
              onClick={confirmShop}
              className="rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
            >
              {ic.authorize}
            </button>
          </div>
          {shopError && (
            <p className="mt-1.5 text-xs text-red-400">
              {ic.invalidShopPrefix} <span className="font-bold">tuo-negozio.myshopify.com</span>
            </p>
          )}
        </div>
      ) : !available ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-300">
            {dict.common.comingSoon}
          </span>
          <span className="text-xs text-neutral-500">
            {ic.comingSoonDesc}
          </span>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400 disabled:opacity-50 transition-colors"
          >
            <ExternalLink size={14} />
            {connecting ? ic.opening : `${ic.connect} ${meta.name}`}
          </button>
          <span className="text-xs text-neutral-500">
            {ic.oauthNote}
          </span>
        </div>
      )}

      <p className="mt-2 text-[11px] text-neutral-600">
        {t(ic.agentHelps, { name: meta.name })}
      </p>
    </div>
  );
}
