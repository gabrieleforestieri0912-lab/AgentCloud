"use client";

import { useEffect, useState } from "react";
import { normalizeShopInput } from "@/lib/shopify-input";

type Connected = { shopDomain: string; connected: boolean };

/**
 * Dashboard card that lets a logged-in user connect (OAuth) and see their
 * Shopify stores. Triggers the server-side install flow at
 * /api/shopify/install?shop=<store>.myshopify.com. Surfaces the outcome of the
 * callback (?shopify=connected | ?shopify=error&reason=...) without a full
 * reload, then strips the query params from the URL.
 */
export default function ShopifyConnect({
  connected,
}: {
  connected: Connected[];
}) {
  const [shop, setShop] = useState("");
  const [status, setStatus] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("shopify");
    let next: { kind: "ok" | "err"; msg: string } | null = null;
    if (r === "connected") {
      next = { kind: "ok", msg: "Store Shopify collegato con successo." };
    } else if (r === "error") {
      next = {
        kind: "err",
        msg: `Collegamento fallito (${params.get("reason") ?? "errore"}).`,
      };
    }
    if (r) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (next) queueMicrotask(() => setStatus(next));
  }, []);

  const connect = () => {
    // Accept full store links (https://…/admin) as well as bare domains.
    const s = normalizeShopInput(shop) ?? shop.trim().toLowerCase();
    if (!s) return;
    const u = new URL("/api/shopify/install", window.location.origin);
    u.searchParams.set("shop", s);
    window.location.href = u.toString();
  };

  return (
    <section className="mb-8 rounded-lg border border-white/5 bg-neutral-900 p-5 shadow-sm">
      <h2 className="text-xl font-bold text-white">Shopify</h2>

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

      <p className="mt-3 text-sm text-neutral-400">
        Collega il tuo store Shopify per far agire gli agenti su prodotti,
        ordini e inventario.
      </p>

      <ul className="mt-4 space-y-2">
        {connected.map((c) => (
          <li
            key={c.shopDomain}
            className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-2"
          >
            <span className="text-sm text-white">{c.shopDomain}</span>
            <span
              className={`text-xs font-bold uppercase ${
                c.connected ? "text-emerald-400" : "text-neutral-500"
              }`}
            >
              {c.connected ? "Attivo" : "Disconnesso"}
            </span>
          </li>
        ))}
        {connected.length === 0 && (
          <li className="text-sm text-neutral-500">Nessuno store collegato.</li>
        )}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") connect();
          }}
          placeholder="tuo-store.myshopify.com"
          className="flex-1 rounded-full border border-white/10 bg-neutral-800 px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500"
        />
        <button
          type="button"
          onClick={connect}
          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-400"
        >
          Collega
        </button>
      </div>
    </section>
  );
}
