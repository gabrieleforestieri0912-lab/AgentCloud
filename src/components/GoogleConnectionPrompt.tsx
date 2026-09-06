"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, ExternalLink, CheckCircle2 } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import { readableConnectReason } from "@/lib/connect-errors";

type GoogleStatus = {
  authenticated: boolean;
  connected: boolean;
  email: string | null;
  scopes: string[];
  connectedAt: string | null;
};

/**
 * In-chat prompt shown when the active agent needs Gmail/Calendar access and
 * no Google account is connected yet. One action: start the OAuth flow
 * (/api/auth/google/connect). Self-fetches the connection status and
 * refreshes when the window regains focus (e.g. after the OAuth redirect
 * returns), and surfaces the OAuth outcome (?google=connected|error) inline.
 * Same pattern as ShopifyConnectionPrompt.
 */
export default function GoogleConnectionPrompt() {
  const { dict, locale } = useLanguage();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  // Outcome of a just-finished OAuth round-trip, read from the URL.
  const [outcome, setOutcome] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/google/status");
      const data = (await res.json()) as GoogleStatus;
      setStatus(data);
    } catch {
      setStatus({ authenticated: false, connected: false, email: null, scopes: [], connectedAt: null });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);
    window.addEventListener("focus", refresh);

    const params = new URLSearchParams(window.location.search);
    const val = params.get("google");
    const stripParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.pathname + url.search);
    };
    if (val === "connected") {
      setOutcome({ kind: "ok", msg: dict.common.connectSuccess });
      stripParams();
    } else if (val === "error") {
      const reason = params.get("reason");
      setOutcome({
        kind: "err",
        msg: t(dict.common.connectFailed, {
          reason: readableConnectReason(reason, locale),
        }),
      });
      stripParams();
    }

    return () => window.removeEventListener("focus", refresh);
  }, [refresh, dict.common.connectSuccess, dict.common.connectFailed, locale]);

  if (!status && !outcome) return null;

  if (status?.connected) {
    return (
      <div className="mx-4 sm:mx-6 mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        <CheckCircle2 size={16} className="shrink-0" />
        <span>
          {t(dict.chat.googleConnectedLine, {
            email: status.email ?? "Google",
          })}
        </span>
      </div>
    );
  }

  const startConnect = () => {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/api/auth/google/connect?returnTo=${returnTo}`);
  };

  return (
    <div className="mx-4 sm:mx-6 mb-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-4 text-sm">
      {outcome && (
        <div
          className={`mb-3 rounded-lg border px-3 py-2 text-sm font-semibold ${
            outcome.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {outcome.msg}
        </div>
      )}
      <div className="flex items-center gap-2 text-brand-200">
        <Mail size={16} className="shrink-0" />
        <span className="font-bold text-white">{dict.chat.googleConnectTitle}</span>
      </div>
      <p className="mt-2 text-neutral-300">{dict.chat.googleConnectDesc}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startConnect}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
        >
          <ExternalLink size={15} />
          {dict.chat.googleConnectAction}
        </button>
        <span className="text-xs font-semibold text-neutral-500">
          {dict.chat.googleReadOnlyHint}
        </span>
      </div>
    </div>
  );
}
