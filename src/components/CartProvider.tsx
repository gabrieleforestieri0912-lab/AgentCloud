"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Agent } from "@/lib/agents";
import { getAgentBySlug } from "@/lib/agents";
import type { BundlePeriod } from "@/lib/bundles";
import { getBundleBySlug, getBundleAgents, formatPrice } from "@/lib/bundles";

export type CartItemType = "agent" | "bundle";

export type CartItem = {
  agent_slug: string;
  quantity: number;
  name: string;
  shortName: string;
  priceCents: number;
  price: string;
  accent: string;
  icon: Agent["icon"];
  brand?: Agent["brand"];
  type: CartItemType;
  bundleSlug?: string;
  agentSlugs?: string[];
  period?: BundlePeriod;
};

type CartContextType = {
  items: CartItem[];
  totalCents: number;
  totalDisplay: string;
  count: number;
  loading: boolean;
  add: (slug: string) => Promise<{ ok: boolean; error?: string }>;
  addBundle: (bundleSlug: string, period: BundlePeriod) => Promise<{ ok: boolean; error?: string }>;
  remove: (slug: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
  isInCart: (slug: string) => boolean;
  isBundleInCart: (slug: string) => boolean;
};

const CartContext = createContext<CartContextType | null>(null);

const LOCAL_KEY = "agentcloud_cart_v1";

function formatTotal(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function parseStoredBundleSlug(stored: string): { bundleSlug: string; period: BundlePeriod } | null {
  if (!stored.startsWith("bundle:")) return null;
  const rest = stored.slice(7);
  const [slug, per] = rest.split(":");
  const period = (per as BundlePeriod) || "monthly";
  const valid: BundlePeriod[] = ["monthly", "quarterly", "yearly"];
  return { bundleSlug: slug, period: valid.includes(period) ? period : "monthly" };
}

function bundleDbSlug(bundleSlug: string, period: BundlePeriod): string {
  return `bundle:${bundleSlug}:${period}`;
}

function enrichLocal(slug: string, quantity = 1): CartItem | null {
  // supporta sia agent che bundle con periodo già codificato
  if (slug.startsWith("bundle:")) {
    const parsed = parseStoredBundleSlug(slug);
    if (!parsed) return null;
    return enrichBundleLocal(parsed.bundleSlug, parsed.period, quantity);
  }
  const ag = getAgentBySlug(slug);
  if (!ag) return null;
  return {
    agent_slug: slug,
    quantity,
    name: ag.name,
    shortName: ag.shortName,
    priceCents: ag.priceCents,
    price: ag.price,
    accent: ag.accent,
    icon: ag.icon,
    brand: ag.brand,
    type: "agent",
  };
}

function enrichBundleLocal(bundleSlug: string, period: BundlePeriod, quantity = 1): CartItem | null {
  const bundle = getBundleBySlug(bundleSlug);
  if (!bundle) return null;
  const agents = getBundleAgents(bundle);
  const totalCents = period === "quarterly" ? bundle.pricing.quarterlyTotal : period === "yearly" ? bundle.pricing.yearlyTotal : bundle.pricing.monthly;
  const displayMonthly = period === "monthly" ? bundle.pricing.monthly : period === "quarterly" ? bundle.pricing.quarterly : bundle.pricing.yearly;
  return {
    agent_slug: bundleDbSlug(bundleSlug, period),
    quantity,
    name: bundle.name,
    shortName: bundle.name,
    priceCents: totalCents,
    price: formatPrice(displayMonthly) + "/mo",
    accent: agents[0]?.accent || "bg-brand-500",
    icon: agents[0]?.icon || "bot",
    type: "bundle",
    bundleSlug,
    agentSlugs: bundle.agentSlugs,
    period,
  };
}

// Migra vecchi record: bundle:slug + bundle_period_* → bundle:slug:period
function normalizeStoredSlugs(slugs: string[]): string[] {
  return slugs.map((s) => {
    if (s.startsWith("bundle:") && !s.split(":").at(2)) {
      const bSlug = s.slice(7);
      try {
        const per = (localStorage.getItem(`bundle_period_${bSlug}`) as BundlePeriod) || "monthly";
        const valid: BundlePeriod[] = ["monthly", "quarterly", "yearly"];
        const p = valid.includes(per) ? per : "monthly";
        return bundleDbSlug(bSlug, p);
      } catch {
        return s;
      }
    }
    return s;
  });
}

function cleanupLegacyBundlePeriodKeys() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("bundle_period_")) localStorage.removeItem(k);
    }
  } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return [];
      let slugs = JSON.parse(raw) as string[];
      slugs = normalizeStoredSlugs(slugs);
      // salva normalizzato
      if (JSON.stringify(slugs) !== raw) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(slugs));
        cleanupLegacyBundlePeriodKeys();
      }
      return slugs.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const authedRef = useRef(false);
  // La migrazione anonimo→server deve avvenire UNA volta sola. Prima girava a
  // ogni refresh(): dopo una rimozione riuscita, lo slug rimaneva in
  // localStorage e la refresh successiva lo reinseriva nel carrello server,
  // rendendo impossibile rimuovere un agente.
  const migratedRef = useRef(false);

  const readLocalSlugs = useCallback((): string[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return normalizeStoredSlugs(parsed as string[]);
    } catch {
      return [];
    }
  }, []);

  const writeLocalSlugs = useCallback((slugs: string[]) => {
    try {
      if (slugs.length === 0) {
        localStorage.removeItem(LOCAL_KEY);
        cleanupLegacyBundlePeriodKeys();
      } else {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(slugs));
      }
    } catch {
      /* storage pieno o non disponibile: lo stato React resta la fonte UI */
    }
  }, []);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const authed = !!data.session;
    authedRef.current = authed;
    try {
      if (authed && !migratedRef.current) {
        migratedRef.current = true;
        const slugs = readLocalSlugs();
        if (slugs.length > 0) {
          for (const slug of slugs) {
            await fetch("/api/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ agentSlug: slug }),
            }).catch(() => {});
          }
          writeLocalSlugs([]);
        }
      }
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        const apiItems = (data.items ?? []) as Array<{ agent_slug: string; quantity: number }>;
        const enrichedApi = apiItems.map((it) => enrichLocal(it.agent_slug, it.quantity)).filter(Boolean) as CartItem[];
        // Anonimo: il server risponde 401, quindi si ricostruisce da localStorage.
        let merged = enrichedApi;
        if (!authed) {
          const localItems = readLocalSlugs()
            .map((s) => enrichLocal(s))
            .filter(Boolean) as CartItem[];
          const apiSlugs = new Set(enrichedApi.map((i) => i.agent_slug));
          // Per bundle, evita duplicati per stesso bundleSlug (qualsiasi periodo) — l'API ha già il periodo corretto
          const bundleSlugsInApi = new Set(enrichedApi.filter((i) => i.type === "bundle").map((i) => i.bundleSlug));
          merged = [
            ...enrichedApi,
            ...localItems.filter(
              (b) => !apiSlugs.has(b.agent_slug) && !bundleSlugsInApi.has(b.bundleSlug!),
            ),
          ];
        }
        setItems(merged);
      } else if (res.status === 401) {
        setItems(readLocalSlugs().map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [readLocalSlugs, writeLocalSlugs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const supabase = createClient();
    // Un cambio di sessione invalida la migrazione: al prossimo login il
    // carrello anonimo va di nuovo trasferito (ora la guardia è per-sessione).
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      migratedRef.current = false;
      refresh();
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    const onCartUpdate = () => refresh();
    window.addEventListener("cart:updated", onCartUpdate);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:updated", onCartUpdate);
    };
  }, [refresh]);

  const add = useCallback(
    async (slug: string) => {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSlug: slug }),
      }).catch(() => null as unknown as Response);
      if (res && res.ok) {
        await refresh();
        window.dispatchEvent(new CustomEvent("cart:updated"));
        return { ok: true };
      }
      if (res) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "already_owned") return { ok: false, error: "already_owned" };
        if (res.status === 401) {
          const norm = readLocalSlugs();
          if (norm.includes(slug)) return { ok: false, error: "already_in_cart" };
          const next = [...norm, slug];
          writeLocalSlugs(next);
          setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
          window.dispatchEvent(new CustomEvent("cart:updated"));
          return { ok: true };
        }
        if (data.error && data.error !== "unauthorized") {
          return { ok: false, error: data.error ?? "error" };
        }
      }
      const norm = readLocalSlugs();
      if (norm.includes(slug)) return { ok: false, error: "already_in_cart" };
      const next = [...norm, slug];
      writeLocalSlugs(next);
      setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
      window.dispatchEvent(new CustomEvent("cart:updated"));
      return { ok: true };
    },
    [refresh, readLocalSlugs, writeLocalSlugs],
  );

  const remove = useCallback(
    async (slug: string) => {
      // Rimozione ottimistica: l'UI non deve aspettare la rete per
      // sparire, e la riga non deve "resuscitare" se la chiamata è lenta.
      const withoutSlug = (list: string[]) => {
        const parsed = parseStoredBundleSlug(slug);
        if (!parsed) return list.filter((s) => s !== slug);
        // Un bundle si rimuove per bundleSlug: il periodo non conta, perché
        // il server cancella tutte le righe dello stesso bundle.
        return list.filter((s) => parseStoredBundleSlug(s)?.bundleSlug !== parsed.bundleSlug);
      };

      setItems((prev) =>
        prev.filter((i) => {
          const parsed = parseStoredBundleSlug(slug);
          if (parsed) return parseStoredBundleSlug(i.agent_slug)?.bundleSlug !== parsed.bundleSlug;
          return i.agent_slug !== slug;
        }),
      );
      // localStorage è la sorgente per gli anonimi: va allineato sempre, o
      // la refresh successiva riporta indietro l'elemento rimosso.
      writeLocalSlugs(withoutSlug(readLocalSlugs()));

      const res = await fetch(`/api/cart?agentSlug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      }).catch(() => null);
      // 401 = anonimo: niente server da aggiornare, lo stato locale basta.
      if (res && res.status === 401) return;
      await refresh().catch(() => {});
    },
    [refresh, readLocalSlugs, writeLocalSlugs],
  );

  const clear = useCallback(async () => {
    writeLocalSlugs([]);
    setItems([]);
    window.dispatchEvent(new CustomEvent("cart:updated"));
    try {
      await fetch("/api/cart", { method: "DELETE" });
    } catch {}
    await refresh().catch(() => {});
  }, [refresh, writeLocalSlugs]);

  const isInCart = useCallback((slug: string) => items.some((i) => i.agent_slug === slug && i.type === "agent"), [items]);

  const isBundleInCart = useCallback((bundleSlug: string) => items.some((i) => i.type === "bundle" && i.bundleSlug === bundleSlug), [items]);

  const addBundle = useCallback(
    async (bundleSlug: string, period: BundlePeriod) => {
      const bundleKey = bundleDbSlug(bundleSlug, period);
      if (isBundleInCart(bundleSlug)) return { ok: false, error: "already_in_cart" } as const;
      const alreadyLocal = () =>
        readLocalSlugs().some((s) => parseStoredBundleSlug(s)?.bundleSlug === bundleSlug);
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentSlug: bundleKey }),
        }).catch(() => null as unknown as Response);
        if (res && res.ok) {
          await refresh();
          window.dispatchEvent(new CustomEvent("cart:updated"));
          return { ok: true } as const;
        }
        if (res && res.status === 401) {
          if (alreadyLocal()) return { ok: false, error: "already_in_cart" } as const;
          const next = [...readLocalSlugs(), bundleKey];
          writeLocalSlugs(next);
          setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
          window.dispatchEvent(new CustomEvent("cart:updated"));
          return { ok: true } as const;
        }
        if (res) {
          const data = await res.json().catch(() => ({}));
          if (data.error) return { ok: false, error: data.error } as const;
        }
      } catch {}
      if (alreadyLocal()) return { ok: false, error: "already_in_cart" } as const;
      const next = [...readLocalSlugs(), bundleKey];
      writeLocalSlugs(next);
      setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
      window.dispatchEvent(new CustomEvent("cart:updated"));
      refresh().catch(() => {});
      return { ok: true } as const;
    },
    [refresh, isBundleInCart, readLocalSlugs, writeLocalSlugs],
  );

  const totalCents = items.reduce((sum, it) => sum + it.priceCents * it.quantity, 0);
  const totalDisplay = formatTotal(totalCents);

  return (
    <CartContext.Provider
      value={{ items, totalCents, totalDisplay, count: items.length, loading, add, addBundle, remove, clear, refresh, isInCart, isBundleInCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
