"use client";

import { useCallback, useEffect, useState } from "react";
import { useOwnedState, type OwnedState } from "@/components/OwnedProvider";

/**
 * Agenti posseduti dall'utente corrente.
 *
 * Se la pagina ha un `OwnedProvider` a monte (pagine agenti), usa quello stato:
 * è già risolto lato server al primo render, quindi nessuna CTA di acquisto
 * lampeggia prima di venire sostituita da "Apri in chat". Senza provider il
 * hook risolve da sé via /api/user/owned (comportamento storico).
 */
export function useOwned(): OwnedState {
  const fromProvider = useOwnedState();
  const standalone = useStandaloneOwned(fromProvider !== null);
  return fromProvider ?? standalone;
}

function useStandaloneOwned(disabled: boolean): OwnedState {
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!disabled);

  const refresh = useCallback(async () => {
    if (disabled) return;
    try {
      const res = await fetch("/api/user/owned", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { owned: string[] };
        setOwned(new Set(data.owned ?? []));
      }
    } catch {}
    setLoading(false);
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    // Caricamento iniziale via .then (non una chiamata diretta a `refresh`):
    // evita il setState sincrono nel body dell'effect.
    fetch("/api/user/owned", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { owned?: string[] } | null) => {
        if (data) setOwned(new Set(data.owned ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("agentcloud:owned-refresh", refresh as EventListener);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("agentcloud:owned-refresh", refresh as EventListener);
    };
  }, [refresh, disabled]);

  return {
    owned,
    loading,
    refresh,
    isOwned: (slug: string) => owned.has(slug),
  };
}
