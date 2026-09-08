"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/constants";
import BrandLogo from "./BrandLogo";
import { CheckCircle2, Plug, Unplug, Clock3, AlertCircle, Loader2 } from "lucide-react";

type Row = {
  provider: string;
  status: string;
  external_account_id: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
  scope: string | null;
};

const PROVIDERS = [
  {
    id: "stripe" as const,
    name: "Stripe Connect",
    brand: "stripe",
    descIt: "Account Stripe del tenant (Express). Lettura saldo/movimenti via proxy.",
    descEn: "Tenant Stripe account (Express). Read balance/charges via proxy.",
  },
  {
    id: "notion" as const,
    name: "Notion",
    brand: "notion",
    descIt: "Workspace Notion concesso. Query/crea pagine via proxy.",
    descEn: "Authorized Notion workspace. Query/create pages via proxy.",
  },
  {
    id: "slack" as const,
    name: "Slack",
    brand: "slack",
    descIt: "Workspace Slack. Post messaggi / lista canali.",
    descEn: "Slack workspace. Post messages / list channels.",
  },
  {
    id: "hubspot" as const,
    name: "HubSpot",
    brand: "hubspot",
    descIt: "Portale HubSpot. Contatti read/write minimal.",
    descEn: "HubSpot portal. Contacts read/write minimal.",
  },
  {
    id: "google_sheets" as const,
    name: "Google Sheets",
    brand: "google",
    descIt: "Foglio di test dell'utente Google esistente. Lettura/scrittura range.",
    descEn: "Test spreadsheet of existing Google user. Read/write ranges.",
  },
];

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

export default function IntegrationsGrid({ rows, locale }: { rows: Row[]; locale: Locale }) {
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {PROVIDERS.map((p) => {
        const row = byProvider.get(p.id);
        const connected = row?.status === "connected";
        const pending = row?.status === "pending";
        const error = row?.status === "error";
        const workspace = metaLabel(row);
        return (
          <div key={p.id} className="rounded-xl border border-white/5 bg-neutral-900 p-5 shadow-sm flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                  <BrandLogo slug={p.brand} size={20} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">{p.name}</h3>
                  <p className="text-xs font-semibold text-neutral-500">{p.id}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
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
                {row?.status ?? (locale === "it" ? "Non connesso" : "Not connected")}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-neutral-400">{locale === "it" ? p.descIt : p.descEn}</p>

            {row && (
              <div className="mt-3 space-y-1 text-xs text-neutral-500">
                {workspace && (
                  <p>
                    <span className="font-semibold text-neutral-400">{locale === "it" ? "Account:" : "Account:"}</span> {workspace}
                  </p>
                )}
                <p className="flex items-center gap-1">
                  <Clock3 size={12} /> {formatDate(row.updated_at, locale)}
                </p>
                {row.scope && <p className="truncate">Scope: {row.scope}</p>}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {connected ? (
                <button
                  onClick={() => onDisconnect(p.id)}
                  disabled={busy === p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {busy === p.id ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                  {locale === "it" ? "Disconnetti" : "Disconnect"}
                </button>
              ) : (
                <a
                  href={`/api/integrations/${p.id}/authorize`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
                >
                  <Plug size={14} /> {locale === "it" ? "Connetti" : "Connect"}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
