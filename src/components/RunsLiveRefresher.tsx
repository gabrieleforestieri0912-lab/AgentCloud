"use client";

/**
 * Refresher realtime di Mission Control (Fase 5).
 *
 * Iscrive il browser ai canali di cambio delle tabelle `agent_runs` e
 * `agent_run_steps` (publication `supabase_realtime`, schema-agents.sql
 * §8) e, a ogni evento, chiede a Next di ri-renderizzare il Server
 * Component: lo stato della pagina resta derivato dalla query, non da uno
 * snapshot client che divergerebbe. Supabase Realtime applica le RLS alle
 * postgres_changes: un tenant non vede i run di un altro anche via socket.
 *
 * Best-effort: senza realtime (auth/locale) la pagina resta funzionale con
 * il refresh manuale — il canale è un extra, non una dipendenza.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RunsLiveRefresher({ runId }: { runId?: string }) {
  const router = useRouter();
  // Il router NON cambia ma l'istinto "unsubscribe al mount" niente: qui la
  // subscription vive per tutta la vita della pagina della component.
  const busy = useRef(false);

  useEffect(() => {
    const client = createClient();
    const refreshSoon = () => {
      if (busy.current) return;
      busy.current = true;
      setTimeout(() => {
        router.refresh();
        busy.current = false;
      }, 300);
    };
    const channel = client
      .channel(`mission-control${runId ? `:${runId}` : ""}`)
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "agent_runs" },
        (payload: { new: { id?: string } }) => {
          // Con runId: solo i cambi del run aperto; nella lista, tutti.
          if (!runId || payload?.new?.id === runId) refreshSoon();
        },
      )
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "agent_run_steps",
          ...(runId ? { filter: `run_id=eq.${runId}` } : {}),
        },
        refreshSoon,
      );
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [router, runId]);

  return null;
}
