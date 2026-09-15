"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/constants";
import { INTEGRATIONS } from "@/lib/integrations";
import { useLanguage } from "./LanguageProvider";
import IntegrationSteps from "./IntegrationSteps";

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

  // Separa disponibili e coming soon: i disponibili hanno guida passo-passo
  const available = INTEGRATIONS.filter((a) => a.available);
  const comingSoon = INTEGRATIONS.filter((a) => !a.available);

  return (
    <div className="space-y-8">
      {/* Disponibili con guida 3 passi */}
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">Disponibili ora · {available.length} · 3 passi, 1-2 minuti</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((app) => {
            const isGeneric = BRAND_TO_PROVIDER[app.brand] !== undefined;
            const genericProvider = BRAND_TO_PROVIDER[app.brand];
            const row = genericProvider ? byProvider.get(genericProvider) : undefined;
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
            return (
              <IntegrationSteps
                key={app.brand}
                brand={app.brand}
                name={app.name}
                category={app.category}
                description={app.description}
                connected={connected}
                pending={pending}
                error={error}
                workspace={workspace}
                busy={busy === genericProvider}
                onConnectHref={hrefForConnect}
                onDisconnect={isGeneric && connected ? () => onDisconnect(genericProvider!) : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Coming soon compatti */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white">
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">Prossimamente · {comingSoon.length}</span>
          <span className="text-xs font-semibold text-neutral-500 group-open:hidden">mostra</span>
          <span className="hidden text-xs font-semibold text-neutral-500 group-open:inline">nascondi</span>
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {comingSoon.map((app) => (
            <div key={app.brand} className="rounded-xl border border-white/5 bg-neutral-900/40 p-4 opacity-80">
              <p className="text-sm font-bold text-white">{app.name}</p>
              <p className="text-xs text-neutral-500">{app.category}</p>
              <p className="mt-2 text-xs leading-5 text-neutral-500 line-clamp-2">{app.description}</p>
              <span className="mt-3 inline-flex rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {ig.comingSoon}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
