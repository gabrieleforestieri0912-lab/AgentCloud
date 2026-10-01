"use client";

/**
 * Sessione Supabase letta nel browser, esposta come identità dell'account.
 *
 * Perché esiste: l'avatar utente nei messaggi (chat completa, hero, chat
 * pubbliche) deve comparire appena la sessione è disponibile e aggiornarsi su
 * login/logout senza ricaricare la pagina. Un unico hook evita di duplicare
 * `getSession` + `onAuthStateChange` in ogni componente.
 */
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { avatarThumbnail } from "@/lib/avatar";

export type AccountSession = {
  /** Avatar dell'account (Google `avatar_url`/`picture`), null se assente. */
  avatarUrl: string | null;
  /** Email dell'utente autenticato, null se anonimo. */
  email: string | null;
  /** Nome dai metadata (`full_name`/`name`), null se assente. */
  name: string | null;
  /** True quando esiste una sessione. */
  isAuthed: boolean;
  /** False finché la prima lettura della sessione non è completata. */
  ready: boolean;
};

function identityFromSession(session: Session | null): Omit<AccountSession, "ready"> {
  const user = session?.user;
  const meta = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
  return {
    // Thumbnail piccolo: l'avatar è mostrato a ~28–36px, non serve il formato originale.
    avatarUrl: avatarThumbnail(meta.avatar_url ?? meta.picture ?? null, 64),
    email: user?.email ?? null,
    name: meta.full_name ?? meta.name ?? null,
    isAuthed: Boolean(user),
  };
}

/** Etichetta del tooltip dell'avatar: nome e email quando entrambi presenti. */
export function accountTooltipLabel(name: string | null, email: string | null): string | null {
  if (name && email) return `${name} · ${email}`;
  return name || email || null;
}

export function useAccountSession(): AccountSession {
  const [state, setState] = useState<AccountSession>({
    avatarUrl: null,
    email: null,
    name: null,
    isAuthed: false,
    ready: false,
  });

  useEffect(() => {
    const supabase = createClient();
    const apply = (session: Session | null) =>
      setState({ ...identityFromSession(session), ready: true });

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}
