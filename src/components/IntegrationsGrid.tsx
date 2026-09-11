"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/constants";
import BrandLogo from "./BrandLogo";
import { INTEGRATIONS } from "@/lib/integrations";
import { CheckCircle2, Plug, Unplug, Clock3, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

type Row = {
  provider: string;
  status: string;
  external_account_id: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
  scope: string | null;
};

type ShopifyConn = { shopDomain: string; connected: boolean };
type GoogleConn = { googleEmail: string | null; connected: boolean; connectedAt: string | null } | null;

// Map catalog brand -> generic provider id (where OAuth is via /api/integrations)
const BRAND_TO_PROVIDER: Record<string, string> = {
  stripe: "stripe",
  notion: "notion",
  slack: "slack",
  hubspot: "hubspot",
  googlesheets: "google_sheets",
};

function formatDate(iso: string, locale: Locale) {
  try {
    return new Date(iso).toLocaleString(locale === "it" ? "it-IT" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function metaLabel(row: Row | undefined): string | null {
  if (!row?.metadata) return row?.external_account_id ?? null;
  const m = row.metadata as Record<string, unknown>;
  return (
    (m.workspace_name as string) ||
    (m.team as { name?: string })?.name ||
    (m.hub_domain as string) ||
    (m.stripe_user_id as string) ||
    row.external_account_id
  );
}

export default function IntegrationsGrid({
  rows,
  locale,
  shopifyConnections = [],
  googleConnection = null,
}: {
  rows: Row[];
  locale: Locale;
  shopifyConnections?: ShopifyConn[];
  googleConnection?: GoogleConn;
}) {
  const { dict } = useLanguage();
  const ig = dict.integrationsGrid;
  const [busy, setBusy] = useState<string | null>(null);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  const onDisconnect = async (provider: string) => {
    setBusy(provider);
    try {
      const res = await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      if (res.ok || res.redirected) window.location.href = `/dashboard/integrations?integration=${provider}&status=disconnected`;
      else window.location.reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {INTEGRATIONS.map((app) => {
        const isGeneric = BRAND_TO_PROVIDER[app.brand] !== undefined;
        const genericProvider = BRAND_TO_PROVIDER[app.brand];
        const row = genericProvider ? byProvider.get(genericProvider) : undefined;

        // Shopify / Gmail / Google Calendar use existing connections, not tenant_integrations
        const isShopify = app.brand === "shopify";
        const isGmail = app.brand === "gmail";
        const isGCalendar = app.brand === "googlecalendar";
        const isGoogle = isGmail || isGCalendar;

        const shopifyConnected = isShopify ? shopifyConnections.some((c) => c.connected) : false;
        const googleConnected = isGoogle ? !!googleConnection?.connected : false;

        const connected = isGeneric ? row?.status === "connected" : isShopify ? shopifyConnected : isGoogle ? googleConnected : false;
        const pending = isGeneric ? row?.status === "pending" : false;
        const error = isGeneric ? row?.status === "error" : false;
        const workspace = isGeneric ? metaLabel(row) : isShopify ? shopifyConnections.find((c) => c.connected)?.shopDomain ?? null : isGoogle ? googleConnection?.googleEmail ?? null : null;
        const updatedAt = isGeneric ? row?.updated_at : isGoogle ? googleConnection?.connectedAt ?? null : null;

        const hrefForConnect = isGeneric
          ? `/api/integrations/${genericProvider}/authorize`
          : isShopify
            ? `/agents/shopify-agent`
            : isGmail
              ? `/api/auth/google/connect`
              : isGCalendar
                ? `/api/auth/google/connect`
                : app.agentSlug
                  ? `/agents/${app.agentSlug}`
                  : "/agents";

        // Coming soon
        if (!app.available) {
          return (
            <div key={app.brand} className="rounded-xl border border-white/5 bg-neutral-900/60 p-5 flex flex-col opacity-90">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 opacity-80">
                  <BrandLogo slug={app.brand} size={20} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{app.name}</h3>
                  <p className="text-xs font-semibold text-neutral-500">{app.category}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-400 line-clamp-3">{app.description}</p>
              <span className="mt-4 inline-flex w-fit rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
                {ig.comingSoon}
              </span>
            </div>
          );
        }

        return (
          <div key={app.brand} className="rounded-xl border border-white/5 bg-neutral-900 p-5 shadow-sm flex flex-col hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <BrandLogo slug={app.brand} size={20} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{app.name}</h3>
                  <p className="text-xs font-semibold text-neutral-500 truncate">{app.category}</p>
                </div>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                  connected
                    ? "bg-emerald-500/15 text-emerald-300"
                    : error
                      ? "bg-red-500/15 text-red-300"
                      : pending
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-white/5 text-neutral-400"
                }`}
              >
                {connected ? <CheckCircle2 size={12} /> : error ? <AlertCircle size={12} /> : <Plug size={12} />}
                {isGeneric ? (row?.status ?? ig.notConnected) : connected ? ig.connectedStatus : ig.notConnected}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-neutral-400 line-clamp-3">{app.description}</p>

            {(workspace || updatedAt) && (
              <div className="mt-3 space-y-1 text-xs text-neutral-500">
                {workspace && (
                  <p className="truncate">
                    <span className="font-semibold text-neutral-400">{ig.accountLabel}</span> {workspace}
                  </p>
                )}
                {updatedAt && (
                  <p className="flex items-center gap-1">
                    <Clock3 size={12} /> {formatDate(updatedAt, locale)}
                  </p>
                )}
                {isGeneric && row?.scope && <p className="truncate">Scope: {row.scope}</p>}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {connected ? (
                isGeneric ? (
                  <button
                    onClick={() => onDisconnect(genericProvider!)}
                    disabled={busy === genericProvider}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {busy === genericProvider ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                    {ig.disconnect}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300">
                    <CheckCircle2 size={14} /> {ig.linked}
                  </span>
                )
              ) : isShopify || isGoogle ? (
                <Link
                  href={hrefForConnect}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
                >
                  <Plug size={14} /> {ig.connect}
                </Link>
              ) : isGeneric ? (
                <a
                  href={hrefForConnect}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
                >
                  <Plug size={14} /> {ig.connect}
                </a>
              ) : (
                <Link
                  href={hrefForConnect}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 border border-white/10"
                >
                  {ig.viewAgent} <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
