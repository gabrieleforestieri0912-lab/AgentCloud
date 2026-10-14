"use client";

/**
 * Header dell'area applicativa (chat/dashboard).
 *
 * Volutamente minimale: solo il contenitore fluttuante in alto a destra (il
 * layout overlay con margine negativo resta per non spostare il contenuto).
 * Rotella impostazioni rapide e campanella notifiche sono state rimosse: si
 * gestiscono altrove (pagina /settings, menu account, pagina dedicata).
 */
import type { ChatTextSize } from "@/lib/chat-settings";

export type QuickSettings = {
  /** Agenti che l'utente può usare (stesso elenco del selettore in chat). */
  agents: { slug: string; name: string }[];
  /** Slug dell'agente usato dalle nuove chat; vuoto = chat generica. */
  defaultAgentSlug: string;
  onDefaultAgentChange: (slug: string) => void;
  textSize: ChatTextSize;
  onTextSizeChange: (size: ChatTextSize) => void;
};

type AppHeaderProps = {
  variant: "dashboard" | "chat";
  title?: string;
  subtitle?: string;
  agentLabel?: string;
  /** Accettate ma non renderizzate: le preferenze rapide vivono in /settings. */
  quickSettings?: QuickSettings;
};

export default function AppHeader(_props: AppHeaderProps) {
  void _props;
  return (
    // Header trasparente e sovrapposto: niente barra, niente logo, niente
    // titolo, niente bottoni — solo il guscio che preserva il layout. I link
    // a dashboard, chat e home vivono già nella sidebar: non duplicarli qui.
    <header className="pointer-events-none sticky top-0 z-40 -mb-14 flex h-14 items-start justify-end px-4 pt-3 sm:px-6">
      <div className="pointer-events-auto flex items-center gap-2" />
    </header>
  );
}
