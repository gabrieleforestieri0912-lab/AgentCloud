"use client";

import { useState, useCallback } from "react";
import { ExternalLink, CheckCircle2, Plug } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { useLanguage } from "./LanguageProvider";

type Provider = string;

const PROVIDER_META: Record<string, { name: string; brand: string; desc: string }> = {
  shopify: { name: "Shopify", brand: "shopify", desc: "Collega il tuo store per gestire prodotti, ordini e carrello" },
  gmail: { name: "Gmail", brand: "gmail", desc: "Connetti Gmail per leggere, inviare e gestire le email" },
  google_calendar: { name: "Google Calendar", brand: "googlecalendar", desc: "Collega Calendar per prenotazioni e disponibilità" },
  google_sheets: { name: "Google Sheets", brand: "googlesheets", desc: "Connetti Sheets per leggere e scrivere fogli" },
  calendar: { name: "Google Calendar", brand: "googlecalendar", desc: "Collega Calendar per prenotazioni e disponibilità" },
  slack: { name: "Slack", brand: "slack", desc: "Connetti Slack per notifiche e messaggi" },
  notion: { name: "Notion", brand: "notion", desc: "Connetti Notion per documenti e knowledge base" },
  hubspot: { name: "HubSpot", brand: "hubspot", desc: "Connetti HubSpot per CRM e pipeline" },
  stripe: { name: "Stripe", brand: "stripe", desc: "Connetti Stripe per pagamenti e fatture" },
  whatsapp: { name: "WhatsApp", brand: "whatsapp", desc: "Connetti WhatsApp per messaggistica" },
};

function getMeta(provider: Provider) {
  const key = provider.toLowerCase().replace(/[^a-z0-9]/g, "");
  // normalize aliases
  if (key.includes("gmail") || key === "email") return PROVIDER_META.gmail;
  if (key.includes("calendar")) return PROVIDER_META.google_calendar;
  if (key.includes("sheets") || key.includes("googlesheets")) return PROVIDER_META.google_sheets;
  if (key.includes("shopify")) return PROVIDER_META.shopify;
  return PROVIDER_META[key] || { name: provider.charAt(0).toUpperCase() + provider.slice(1), brand: key, desc: `Connetti ${provider} per sbloccare le automazioni` };
}

export default function InlineConnectCard({ provider, onConnected }: { provider: string; onConnected?: () => void }) {
  const { dict } = useLanguage();
  const meta = getMeta(provider);
  const [connecting, setConnecting] = useState(false);
  const [shop, setShop] = useState("");
  const [showShopInput, setShowShopInput] = useState(false);

  const handleConnect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      let url = "";
      const p = provider.toLowerCase();
      if (p.includes("shopify")) {
        if (!showShopInput) {
          setShowShopInput(true);
          setConnecting(false);
          return;
        }
        const s = shop.trim().toLowerCase();
        if (!s) { setConnecting(false); return; }
        // normalize shop input like ShopifyConnectionPrompt
        const normalized = s.includes(".") ? s : `${s}.myshopify.com`;
        url = `/api/shopify/install?shop=${encodeURIComponent(normalized)}&returnTo=${returnTo}`;
        window.location.href = url;
        return;
      }
      if (p.includes("gmail") || p.includes("calendar") || p === "google") {
        url = `/api/auth/google/connect?returnTo=${returnTo}`;
        window.location.assign(url);
        return;
      }
      // generic integrations via tenant_integrations
      const genericMap: Record<string, string> = {
        notion: "notion",
        slack: "slack",
        hubspot: "hubspot",
        stripe: "stripe",
        googlesheets: "google_sheets",
        google_sheets: "google_sheets",
        sheets: "google_sheets",
      };
      const gKey = p.replace(/[^a-z0-9_]/g, "");
      const mapped = genericMap[gKey] || gKey;
      // try generic authorize, fallback to google for sheets
      url = `/api/integrations/${mapped}/authorize?returnTo=${returnTo}`;
      // check if endpoint exists by fetching, if 404 fallback to dashboard
      window.location.assign(url);
    } finally {
      setConnecting(false);
      onConnected?.();
    }
  }, [provider, connecting, shop, showShopInput, onConnected]);

  const confirmShop = () => {
    const s = shop.trim();
    if (!s) return;
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    const normalized = s.includes(".") ? s : `${s}.myshopify.com`;
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
            Connetti {meta.name}
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed">{meta.desc}</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
          Richiesto
        </span>
      </div>

      {provider.toLowerCase().includes("shopify") && showShopInput ? (
        <div className="mt-3 flex gap-2">
          <input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmShop(); }}
            placeholder="tuo-negozio.myshopify.com"
            className="flex-1 rounded-full border border-white/10 bg-neutral-800 px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500"
            autoFocus
          />
          <button
            type="button"
            onClick={confirmShop}
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
          >
            Autorizza
          </button>
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
            {connecting ? "Apertura..." : `Connetti ${meta.name}`}
          </button>
          <span className="text-xs text-neutral-500">
            Si apre in OAuth sicuro — poi torni qui
          </span>
        </div>
      )}

      <p className="mt-2 text-[11px] text-neutral-600">
        L&apos;agente può già rispondere senza connessione. Collega quando vuoi sbloccare azioni reali su {meta.name}.
      </p>
    </div>
  );
}
