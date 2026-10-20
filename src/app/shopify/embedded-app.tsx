"use client";

/**
 * Pannello dell'app dentro l'amministratore Shopify.
 *
 * Perché è un client component: il pezzo che conta qui è la sessione con
 * App Bridge. Lo script di Shopify (caricato dal layout, primo script della
 * pagina) espone l'oggetto globale `shopify`, che sa di essere dentro
 * l'admin e può emettere un **session token**: un JWT di breve durata
 * firmato da Shopify che prova "questa richiesta viene dal pannello admin
 * dello store X, aperto dall'utente Y".
 *
 * Il token non viene usato per autorizzare: viene solo inviato al nostro
 * endpoint, che lo verifica lato server (firma HS256, audience, scadenza)
 * prima di rispondere. Nessun segreto viaggia nel browser.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Store,
} from "lucide-react";
import type { ShopifyAppContent } from "@/lib/i18n/shopifyApp";

declare global {
  interface Window {
    /** App Bridge espone questo oggetto globale. */
    shopify?: {
      idToken: () => Promise<string>;
    };
  }
}

type PanelState =
  | { status: "checking" }
  | {
      status: "ok";
      shop: string;
      shopName: string | null;
      userId: string;
      scope: string | null;
    }
  | { status: "error" }
  | { status: "not-embedded" };

/** App Bridge è uno script esterno: può arrivare dopo il mount. */
async function waitForShopify(timeoutMs = 8000): Promise<NonNullable<Window["shopify"]>> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (typeof window !== "undefined" && window.shopify?.idToken) {
      return window.shopify;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("App Bridge non disponibile");
}

export default function EmbeddedApp({
  content,
  embedded,
  shopParam,
}: {
  content: ShopifyAppContent;
  /** true quando Shopify ha aperto l'app dentro l'admin (`embedded=1`). */
  embedded: boolean;
  /** Dominio del negozio passato da Shopify nell'URL (solo informative:
   *  la verifica autorevole avviene sul token firmato). */
  shopParam: string;
}) {
  // Fuori dall'amministratore non c'è niente da verificare: lo stato
  // iniziale lo dice già, senza aspettare un effetto.
  const [state, setState] = useState<PanelState>(
    embedded ? { status: "checking" } : { status: "not-embedded" },
  );

  useEffect(() => {
    if (!embedded) return;
    let cancelled = false;

    (async () => {
      try {
        const bridge = await waitForShopify();
        const sessionToken = await bridge.idToken();
        const res = await fetch("/api/shopify/session", {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json().catch(() => null)) as {
          shop?: string;
          shopName?: string | null;
          userId?: string;
          scope?: string | null;
          connected?: boolean;
        } | null;
        if (cancelled) return;
        if (!res.ok || !data?.connected) {
          setState({ status: "error" });
          return;
        }
        setState({
          status: "ok",
          shop: data.shop ?? "",
          shopName: data.shopName ?? null,
          userId: data.userId ?? "",
          scope: data.scope ?? null,
        });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [embedded]);

  return (
    <main className="min-h-dvh bg-neutral-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-300">
          {content.badge}
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          {content.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          {content.subtitle}
        </p>

        {/* Stato della verifica */}
        <div className="mt-7 rounded-2xl border border-white/10 bg-neutral-900/70 p-5">
          {state.status === "checking" && (
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <Loader2 size={18} className="animate-spin text-brand-400" />
              {content.checking}
            </div>
          )}

          {state.status === "not-embedded" && (
            <div className="flex items-start gap-3">
              <Store size={18} className="mt-0.5 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-bold">{content.notEmbeddedTitle}</p>
                <p className="mt-1 text-sm text-neutral-400">
                  {content.notEmbeddedText}
                </p>
                <Link
                  href="/"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300"
                >
                  {content.openSite}
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          )}

          {state.status === "error" && (
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-bold">{content.errorTitle}</p>
                <p className="mt-1 text-sm text-neutral-400">
                  {content.errorText}
                </p>
              </div>
            </div>
          )}

          {state.status === "ok" && (
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                <CheckCircle2 size={17} />
                {content.verifiedTitle}
              </div>
              <p className="mt-1.5 text-sm text-neutral-400">
                {content.verifiedText}
              </p>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                  <dt className="text-xs text-neutral-500">
                    {content.shopLabel}
                  </dt>
                  <dd className="truncate font-semibold">
                    {state.shopName || state.shop || shopParam}
                  </dd>
                </div>
                <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                  <dt className="text-xs text-neutral-500">
                    {content.userLabel}
                  </dt>
                  <dd className="truncate font-mono text-xs font-semibold">
                    {state.userId || "—"}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Attivazione del widget: è l'embed dell'app (theme app extension). */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-neutral-900/70 p-5">
          <h2 className="text-sm font-bold">{content.stepsTitle}</h2>
          <ol className="mt-3 space-y-2">
            {content.steps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-neutral-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-[11px] font-bold text-neutral-300">
                  {i + 1}
                </span>
                <span className="leading-6">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
          >
            {content.ctaConnect}
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full border border-white/10 bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:border-white/20"
          >
            {content.ctaDashboard}
          </Link>
        </div>

        <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-neutral-500">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
          {content.securityNote}
        </p>
      </div>
    </main>
  );
}
