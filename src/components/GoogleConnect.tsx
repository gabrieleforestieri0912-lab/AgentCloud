"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Link2, Mail, Unlink } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";

export type GoogleConnected = {
  googleEmail: string | null;
  scopes: string[];
  connectedAt: string | null;
} | null;

type Props = {
  connected: GoogleConnected;
  s: Dictionary["dashboard"];
  locale: "it" | "en";
  configured: boolean;
};

function scopeLabel(scope: string, s: Dictionary["dashboard"]): string {
  if (scope.includes("gmail.readonly")) return s.scopeGmailReadonly;
  if (scope.includes("calendar.readonly")) return s.scopeCalendarReadonly;
  return s.scopeOther;
}

function formatDate(iso: string | null, locale: "it" | "en"): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(
      locale === "it" ? "it-IT" : "en-US",
      { day: "numeric", month: "long", year: "numeric" },
    );
  } catch {
    return "—";
  }
}

/**
 * Dashboard card (Phase 6) that lets a logged-in user connect (OAuth) or
 * disconnect their Google account. Surfaces the outcome of the OAuth callback
 * (?google=connected | ?google=error&reason=...) without a full reload, then
 * strips the query params from the URL — same pattern as ShopifyConnect.
 */
export default function GoogleConnect({
  connected,
  s,
  locale,
  configured,
}: Props) {
  const [status, setStatus] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("google");
    let next: { kind: "ok" | "err"; msg: string } | null = null;
    if (r === "connected") {
      next = { kind: "ok", msg: s.googleConnectedMsg };
    } else if (r === "error") {
      next = {
        kind: "err",
        msg: t(s.googleConnectFailed, {
          reason: params.get("reason") ?? "error",
        }),
      };
    }
    if (r) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (next) queueMicrotask(() => setStatus(next));
  }, [s]);

  const connect = () => {
    window.location.href = "/api/auth/google/connect";
  };

  const disconnect = async () => {
    if (!window.confirm(s.googleDisconnectConfirm)) return;
    setDisconnecting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      const data = (await res.json()) as { ok: boolean };
      if (res.ok && data.ok) {
        setStatus({ kind: "ok", msg: s.googleDisconnectedMsg });
        setTimeout(() => window.location.reload(), 600);
      } else {
        setStatus({ kind: "err", msg: s.googleDisconnectFailed });
      }
    } catch {
      setStatus({ kind: "err", msg: s.googleDisconnectFailed });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section className="mb-8 rounded-lg border border-white/5 bg-neutral-900 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Google</h2>
        {connected && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-300">
            <CheckCircle2 size={13} />
            {s.googleConnectedBadge}
          </span>
        )}
      </div>

      {status && (
        <div
          className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
            status.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {status.msg}
        </div>
      )}

      <p className="mt-3 text-sm text-neutral-400">{s.googleConnectDesc}</p>

      {!configured && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {s.googleNotConfigured}
        </p>
      )}

      {connected ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                <Mail size={16} className="text-brand-400" />
              </span>
              <div>
                <p className="text-xs text-neutral-500">{s.googleConnectedEmail}</p>
                <p className="text-sm font-bold text-white">
                  {connected.googleEmail ?? "—"}
                </p>
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              {s.googleConnectedAt} {formatDate(connected.connectedAt, locale)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
              {s.googleScopes}
            </p>
            <div className="flex flex-wrap gap-2">
              {(connected.scopes.length > 0
                ? connected.scopes
                : ["gmail.readonly", "calendar.readonly"]
              ).map((scope) => (
                <span
                  key={scope}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300"
                >
                  {scopeLabel(scope, s)}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={disconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-5 py-2 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            <Unlink size={15} />
            {disconnecting ? s.googleDisconnecting : s.googleDisconnect}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={connect}
            disabled={!configured}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 size={15} />
            {s.googleConnectButton}
          </button>
          <p className="mt-3 text-sm text-neutral-500">{s.googleNotConnected}</p>
        </div>
      )}
    </section>
  );
}