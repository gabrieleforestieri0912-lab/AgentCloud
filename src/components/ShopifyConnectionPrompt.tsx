"use client";

import { useEffect, useState, useCallback } from "react";
import { Store, Plus, ExternalLink } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import { readableConnectReason } from "@/lib/connect-errors";
import { normalizeShopInput } from "@/lib/shopify-input";

/**
 * In-chat prompt shown when the Shopify agent is active and no store is
 * connected. Two options per the agreed design:
 *   1. "Collega store esistente" → OAuth flow (/api/shopify/install?shop=...)
 *   2. "Crea un nuovo store"      → opens the Shopify signup page in a new tab
 * Self-fetches connection status and refreshes when the window regains focus
 * (e.g. after returning from the OAuth redirect), and surfaces the OAuth
 * outcome (?shopify=connected|error) inline.
 */
export default function ShopifyConnectionPrompt() {
  const { dict, locale } = useLanguage();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [shops, setShops] = useState<string[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [shop, setShop] = useState("");
  // Outcome of a just-finished OAuth round-trip, read from the URL.
  const [outcome, setOutcome] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/shopify/status");
      const data = await res.json();
      setConnected(Boolean(data.connected));
      setShops(Array.isArray(data.shops) ? data.shops : []);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);
    window.addEventListener("focus", refresh);
    // Read ?shopify=connected|error&reason=... (set on the returnTo page after
    // the OAuth round-trip) and strip it so it only shows once.
    const params = new URLSearchParams(window.location.search);
    const val = params.get("shopify");
    const stripParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("shopify");
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

  if (connected === null && !outcome) return null;

  if (connected) {
    return (
      <div className="mx-4 sm:mx-6 mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        <Store size={16} className="shrink-0" />
        <span>
          Store Shopify collegato{shops[0] ? `: ${shops[0]}` : ""}.
        </span>
      </div>
    );
  }

  const connectExisting = () => {
    // Accept full store links (https://…/admin) as well as bare domains.
    const s = normalizeShopInput(shop) ?? shop.trim().toLowerCase();
    if (!s) return;
    const u = new URL("/api/shopify/install", window.location.origin);
    u.searchParams.set("shop", s);
    u.searchParams.set("returnTo", window.location.pathname + window.location.search);
    window.location.href = u.toString();
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
        <Store size={16} className="shrink-0" />
        <span className="font-bold text-white">Collega il tuo store Shopify</span>
      </div>
      <p className="mt-2 text-neutral-300">
        Per far agire l&apos;agente sul tuo store, collegalo ora. Puoi collegarne
        uno esistente o crearne uno nuovo.
      </p>

      {showInput ? (
        <div className="mt-3 flex gap-2">
          <input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") connectExisting();
            }}
            placeholder="tuo-store.myshopify.com"
            className="flex-1 rounded-full border border-white/10 bg-neutral-800 px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={connectExisting}
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
          >
            Autorizza
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
          >
            <Plus size={15} />
            Collega store esistente
          </button>
          <button
            type="button"
            onClick={() =>
              window.open("https://www.shopify.com/", "_blank", "noopener")
            }
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-neutral-800 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            <ExternalLink size={15} />
            Crea un nuovo store
          </button>
        </div>
      )}
    </div>
  );
}
