"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/constants";
import { INTEGRATIONS, BRAND_TO_PROVIDER } from "@/lib/integrations";
import { getCatalogEntry, INTEGRATION_CATEGORIES } from "@/lib/integrations/catalog";
import { skillUsageCounts } from "@/lib/skills/catalog";
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

// BRAND_TO_PROVIDER è importato da @/lib/integrations: la stessa mappa serve
// anche al conteggio di avanzamento nella pagina dashboard.

function metaLabel(row: Row | undefined): string | null {
  if (!row?.metadata) return row?.external_account_id ?? null;
  const m = row.metadata as Record<string, unknown>;
  return (
    (m.workspace_name as string) ||
    (m.team as { name?: string })?.name ||
    (m.hub_domain as string) ||
    (m.login as string) ||
    (m.airtable_email as string) ||
    (m.trello_username as string) ||
    (m.google_email as string) ||
    (m.microsoft_email as string) ||
    (m.store_url as string) ||
    (m.asana_user as { email?: string })?.email ||
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  // Quante competenze del catalogo usano ciascuna integrazione: collega la
  // card al valore reale ("a cosa mi serve?"), dato pubblico e statico.
  const skillsCountByBrand = useMemo(() => skillUsageCounts(), []);

  const onDisconnect = async (provider: string) => {
    setBusy(provider);
    setDisconnectError(null);
    try {
      const res = await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      if (res.ok || res.redirected) {
        window.location.href = `/dashboard/integrations?integration=${provider}&status=disconnected`;
      } else {
        // Finora la rete andava a reload() silenzioso: un 500 sembrava un click
        // senza effetto. Ora l'utente viene avvisato.
        setDisconnectError(ig.disconnectError);
      }
    } catch {
      setDisconnectError(ig.disconnectError);
    } finally {
      setBusy(null);
    }
  };

  // Separa disponibili e coming soon: i disponibili hanno guida passo-passo
  const available = INTEGRATIONS.filter((a) => a.available);
  const comingSoon = INTEGRATIONS.filter((a) => !a.available);

  // Le categorie mostrate sono quelle realmente presenti fra le app disponibili,
  // nell'ordine di INTEGRATION_CATEGORIES: mostrare categorie vuote crea chip
  // che portano a uno stato vuoto inutile.
  const categories = useMemo(() => {
    const present = new Set(available.map((a) => a.category));
    const ordered = INTEGRATION_CATEGORIES.filter((c) => present.has(c));
    // Categorie presenti ma non nell'elenco ordinato: non si perdono.
    const rest = [...present].filter((c) => !ordered.includes(c)).sort();
    return [...ordered, ...rest];
  }, [available]);

  const matches = (app: (typeof INTEGRATIONS)[number], q: string) => {
    if (!q) return true;
    const l = q.toLowerCase();
    return (
      app.name.toLowerCase().includes(l) ||
      app.description.toLowerCase().includes(l) ||
      app.category.toLowerCase().includes(l)
    );
  };

  const filteredAvailable = useMemo(() => {
    const q = query.trim();
    return available.filter((a) => {
      if (category && a.category !== category) return false;
      return matches(a, q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, category, query]);

  const filteredComingSoon = useMemo(() => {
    const q = query.trim();
    return comingSoon.filter((a) => {
      if (category && a.category !== category) return false;
      return matches(a, q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comingSoon, category, query]);

  const filtersActive = Boolean(query.trim()) || Boolean(category);

  return (
    <div className="space-y-8">
      {/* Filtri: ricerca + categorie. Stesso pattern di MarketplaceGrid, così
          il gesto è lo stesso su marketplace e integrazioni. */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ig.searchPlaceholder}
            aria-label={ig.searchLabel}
            className="w-full rounded-xl border border-white/10 bg-neutral-900 py-2.5 pr-3 pl-9 text-sm text-white placeholder:text-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {categories.length > 0 && (
          <div
            role="group"
            aria-label={ig.categoriesLabel}
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              onClick={() => setCategory(null)}
              aria-pressed={category === null}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none ${
                category === null
                  ? "bg-brand-500 text-white"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {ig.allCategories}
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? null : c)}
                aria-pressed={category === c}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none ${
                  category === c
                    ? "bg-brand-500 text-white"
                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {filtersActive && (
          <div className="flex items-center gap-3 text-xs font-semibold text-neutral-500">
            <span aria-live="polite">
              {filteredAvailable.length} {ig.resultsCount} {available.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory(null);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 font-bold text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            >
              <X size={12} aria-hidden="true" />
              {ig.clearFilters}
            </button>
          </div>
        )}

        {disconnectError && (
          <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
            {disconnectError}
          </p>
        )}
      </div>

      {/* Disponibili con guida 3 passi */}
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">
          Disponibili ora · {filteredAvailable.length} · 3 passi, 1-2 minuti
        </h3>

        {filteredAvailable.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
            <p className="text-sm font-bold text-white">
              {category ? ig.noResultsCategory : ig.noResults}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory(null);
              }}
              className="mt-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            >
              {ig.clearFilters}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAvailable.map((app) => {
              const isGeneric = BRAND_TO_PROVIDER[app.brand] !== undefined;
              const genericProvider = BRAND_TO_PROVIDER[app.brand];
              const row = genericProvider ? byProvider.get(genericProvider) : undefined;
              const isShopify = app.brand === "shopify";
              const isGmail = app.brand === "gmail";
              const isGCalendar = app.brand === "googlecalendar";
              const isGoogle = isGmail || isGCalendar;
              const shopifyConnected = isShopify ? shopifyConnections.some((c) => c.connected) : false;
              const googleConnected = isGoogle ? !!googleConnection?.connected : false;
              const connected = isGeneric
                ? row?.status === "connected"
                : isShopify
                  ? shopifyConnected
                  : isGoogle
                    ? googleConnected
                    : false;
              const pending = isGeneric ? row?.status === "pending" : false;
              const error = isGeneric ? row?.status === "error" : false;
              const workspace = isGeneric
                ? metaLabel(row)
                : isShopify
                  ? shopifyConnections.find((c) => c.connected)?.shopDomain ?? null
                  : isGoogle
                    ? googleConnection?.googleEmail ?? null
                    : null;
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
                  tenantFields={getCatalogEntry(app.brand)?.tenantInput?.fields}
                  skillsCount={skillsCountByBrand[app.brand] ?? 0}
                  onDisconnect={isGeneric && connected ? () => onDisconnect(genericProvider!) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Coming soon compatti */}
      <details className="group" open={filteredComingSoon.length > 0 && filtersActive}>
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
            Prossimamente · {filteredComingSoon.length}
          </span>
          <span className="text-xs font-semibold text-neutral-500 group-open:hidden">mostra</span>
          <span className="hidden text-xs font-semibold text-neutral-500 group-open:inline">nascondi</span>
        </summary>
        {filteredComingSoon.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">{ig.noResults}</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {filteredComingSoon.map((app) => (
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
        )}
      </details>
    </div>
  );
}