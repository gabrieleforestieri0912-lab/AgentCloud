"use client";

import { useState, useCallback } from "react";
import { ExternalLink, Plug } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import { isIntegrationAvailable } from "@/lib/integrations";
import { resolveShopDomain } from "@/lib/shopify-input";

type Provider = string;

const PROVIDER_META: Record<string, { name: string; brand: string; descKey: string }> = {
  shopify: { name: "Shopify", brand: "shopify", descKey: "connectShopify" },
  gmail: { name: "Gmail", brand: "gmail", descKey: "connectGmail" },
  google_calendar: { name: "Google Calendar", brand: "googlecalendar", descKey: "connectCalendar" },
  google_sheets: { name: "Google Sheets", brand: "googlesheets", descKey: "connectSheets" },
  calendar: { name: "Google Calendar", brand: "googlecalendar", descKey: "connectCalendar" },
  slack: { name: "Slack", brand: "slack", descKey: "connectSlack" },
  notion: { name: "Notion", brand: "notion", descKey: "connectNotion" },
  hubspot: { name: "HubSpot", brand: "hubspot", descKey: "connectHubSpot" },
  github: { name: "GitHub", brand: "github", descKey: "connectGithub" },
  clickup: { name: "ClickUp", brand: "clickup", descKey: "connectClickUp" },
  asana: { name: "Asana", brand: "asana", descKey: "connectAsana" },
  googledrive: { name: "Google Drive", brand: "googledrive", descKey: "connectDrive" },
  airtable: { name: "Airtable", brand: "airtable", descKey: "connectAirtable" },
  trello: { name: "Trello", brand: "trello", descKey: "connectTrello" },
  woocommerce: { name: "WooCommerce", brand: "woocommerce", descKey: "connectWooCommerce" },
  mailchimp: { name: "Mailchimp", brand: "mailchimp", descKey: "connectMailchimp" },
  whatsapp: { name: "WhatsApp", brand: "whatsapp", descKey: "connectWhatsApp" },
};

function getMeta(provider: Provider) {
  const key = provider.toLowerCase().replace(/[^a-z0-9]/g, "");
  // normalize aliases
  if (key.includes("gmail") || key === "email") return PROVIDER_META.gmail;
  if (key.includes("calendar")) return PROVIDER_META.google_calendar;
  if (key.includes("sheets") || key.includes("googlesheets")) return PROVIDER_META.google_sheets;
  // "google_drive" e "googledrive" si normalizzano entrambi a "googledrive",
  // quindi qui basta il prefisso per coprire i due alias emessi dal modello.
  if (key.includes("drive")) return PROVIDER_META.googledrive;
  if (key.includes("airtable")) return PROVIDER_META.airtable;
  if (key.includes("trello")) return PROVIDER_META.trello;
  if (key.includes("woocommerce")) return PROVIDER_META.woocommerce;
  if (key.includes("mailchimp")) return PROVIDER_META.mailchimp;
  if (key.includes("shopify")) return PROVIDER_META.shopify;
  return PROVIDER_META[key] || { name: provider.charAt(0).toUpperCase() + provider.slice(1), brand: key, descKey: "connectGeneric" };
}

export default function InlineConnectCard({ provider }: { provider: string }) {
  const { dict } = useLanguage();
  const meta = getMeta(provider);
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
        drive: "google_drive",
        googledrive: "google_drive",
        google_drive: "google_drive",
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
            {t(dict.chat.connectTitle, { provider: meta.name })}
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t(dict.chat[meta.descKey as keyof typeof dict.chat] as string, { provider: meta.name })}
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
          {dict.chat.connectRequested}
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
              placeholder={dict.deploy.shopifyPlaceholder}
              aria-invalid={shopError}
              className={`flex-1 rounded-full border bg-neutral-800 px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none ${shopError ? "border-red-500/60" : "border-white/10 focus:border-brand-500"}`}
              autoFocus
            />
            <button
              type="button"
              onClick={confirmShop}
              className="rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
            >
              {dict.chat.connectAuthorize}
            </button>
          </div>
          {shopError && (
            <p className="mt-1.5 text-xs text-red-400">
              {t(dict.chat.connectInvalidDomain, { example: "tuo-negozio.myshopify.com" })}
            </p>
          )}
        </div>
      ) : !available ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-300">
            {dict.common.comingSoon}
          </span>
          <span className="text-xs text-neutral-500">
            {dict.chat.connectSoonNote}
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
            {connecting ? dict.chat.connectOpening : t(dict.chat.connectButton, { provider: meta.name })}
          </button>
          <span className="text-xs text-neutral-500">
            {dict.chat.connectOAuthNote}
          </span>
        </div>
      )}

      <p className="mt-2 text-[11px] text-neutral-600">
        {t(dict.chat.connectAgentNote, { provider: meta.name })}
      </p>
    </div>
  );
}
