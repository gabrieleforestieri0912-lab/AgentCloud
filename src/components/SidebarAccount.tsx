"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { avatarThumbnail } from "@/lib/avatar";
import type { Session } from "@supabase/supabase-js";
import type { AccountIdentity } from "@/lib/account-identity";
import AccountMenu from "./AccountMenu";

export default function SidebarAccount({
  account = null,
  sidebarWidth,
  sidebarIsDesktop = false,
}: {
  /** Identità risolta lato server: mostrata subito, senza segnaposto. */
  account?: AccountIdentity | null;
  /** Larghezza corrente della sidebar (da DashboardShell), per il menu laterale. */
  sidebarWidth?: number;
  /** true su desktop: è lì che la larghezza dinamica ha senso. */
  sidebarIsDesktop?: boolean;
}) {
  const [session, setSession] = useState<Session | null>(null);

  // Stesso pattern affidabile della chat AI: onAuthStateChange come fonte primaria + getSession fallback dopo 1s
  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
    });

    const fallback = setTimeout(() => {
      if (!mounted) return;
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (!mounted) return;
          setSession(data.session);
        })
        .catch(() => {});
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(fallback);
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Diagnostica identica alla chat
  useEffect(() => {
    if (!account || session) return;
    const timer = setTimeout(() => {
      console.warn(
        "[account] sessione non leggibile dal browser (cookie sb-* assenti o non aggiornati): l'account è mostrato dai dati del server.",
      );
    }, 3000);
    return () => clearTimeout(timer);
  }, [account, session]);

  // Derivazione identità identica alla chat AI
  const accountEmail = session?.user?.email || account?.email || "";
  const rawAvatarUrl =
    (session?.user?.user_metadata as { avatar_url?: string; picture?: string } | undefined)?.avatar_url ||
    (session?.user?.user_metadata as { picture?: string } | undefined)?.picture ||
    account?.avatarUrl ||
    null;
  const accountAvatarUrl = avatarThumbnail(rawAvatarUrl, 64);
  const accountLabelBase =
    (session?.user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    session?.user?.email ||
    account?.name ||
    account?.email ||
    "";
  const accountTooltip =
    accountLabelBase && accountEmail && accountLabelBase !== accountEmail
      ? `${accountLabelBase} · ${accountEmail}`
      : accountLabelBase || accountEmail || null;

  return (
    <AccountMenu
      email={accountEmail}
      avatarUrl={accountAvatarUrl}
      labelBase={accountLabelBase}
      tooltip={accountTooltip}
      sidebarWidth={sidebarWidth}
      isDesktop={sidebarIsDesktop}
    />
  );
}
