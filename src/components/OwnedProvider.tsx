"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type OwnedState = {
  /** Slug degli agenti posseduti (abbonamento attivo). */
  owned: Set<string>;
  /** True solo se il set non è ancora stato risolto (nessun seed dal server). */
  loading: boolean;
  refresh: () => Promise<void>;
  isOwned: (slug: string) => boolean;
};

const OwnedContext = createContext<OwnedState | null>(null);

/** Lettura di /api/user/owned — null se la richiesta fallisce (si tiene il set corrente). */
async function fetchOwnedSlugs(): Promise<string[] | null> {
  try {
    const res = await fetch("/api/user/owned", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { owned: string[] };
    return data.owned ?? [];
  } catch {
    return null;
  }
}

/**
 * Stato "agenti già acquistati" condiviso da card e CTA di acquisto.
 *
 * Perché esiste: il set viene risolto lato server (`getOwnedAgentSlugs`) e
 * passato qui come `initialOwned`, così al primo paint le card mostrano subito
 * "Apri in chat" / "Già acquistato" invece di far lampeggiare per un istante la
 * CTA di acquisto mentre il fetch client è ancora in volo (visibile soprattutto
 * per admin e beta tester, che hanno accesso a tutto il catalogo).
 *
 * Il refresh in background (mount, focus, evento `agentcloud:owned-refresh`)
 * tiene il set aggiornato dopo un acquisto senza mai svuotarlo.
 */
export function OwnedProvider({
  initialOwned = [],
  children,
}: {
  initialOwned?: string[];
  children: ReactNode;
}) {
  const [owned, setOwned] = useState<Set<string>>(() => new Set(initialOwned));
  const [loading] = useState(false);

  const applyOwned = useCallback((slugs: string[] | null) => {
    if (slugs) setOwned(new Set(slugs));
  }, []);

  const refresh = useCallback(async () => {
    applyOwned(await fetchOwnedSlugs());
  }, [applyOwned]);

  useEffect(() => {
    // Ricarica iniziale via .then (non una chiamata diretta): evita il setState
    // sincrono nel body dell'effect.
    fetchOwnedSlugs().then(applyOwned, () => {});
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("agentcloud:owned-refresh", refresh as EventListener);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("agentcloud:owned-refresh", refresh as EventListener);
    };
  }, [refresh, applyOwned]);

  const value = useMemo<OwnedState>(
    () => ({
      owned,
      loading,
      refresh,
      isOwned: (slug: string) => owned.has(slug),
    }),
    [owned, loading, refresh],
  );

  return <OwnedContext.Provider value={value}>{children}</OwnedContext.Provider>;
}

/** Stato del provider a monte, o null se la pagina non ne ha uno. */
export function useOwnedState(): OwnedState | null {
  return useContext(OwnedContext);
}
