"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { User, ShoppingCart, Home, LogOut, Settings, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { AccountIdentity } from "@/lib/account-identity";
import { useLanguage } from "./LanguageProvider";

export default function SidebarAccount({
  account = null,
}: {
  /** Identità risolta lato server: mostrata subito, senza segnaposto. */
  account?: AccountIdentity | null;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { dict } = useLanguage();

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
  const accountAvatarUrl = rawAvatarUrl ? rawAvatarUrl.replace(/=s\d+-c$/, "=s200-c") : null;
  const accountLabelBase =
    (session?.user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    session?.user?.email ||
    account?.name ||
    account?.email ||
    "";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setAccountMenuOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.04] transition-all"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 text-xs font-bold text-brand-300 shrink-0 overflow-hidden ring-2 ring-white/[0.06]">
          {accountAvatarUrl ? (
            <img
              src={accountAvatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : accountLabelBase ? (
            accountLabelBase
              .split(/[\s@.]+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((s: string) => s[0]?.toUpperCase())
              .join("") || "?"
          ) : (
            <span className="animate-pulse">...</span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-bold text-white">{accountEmail || "..."}</p>
          <p className="text-[10px] text-neutral-500 font-medium">{dict.sidebarAccount.account}</p>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-neutral-500 transition-transform duration-200 ${accountMenuOpen ? "rotate-180" : ""}`}
        />
      </button>
      {accountMenuOpen && (
        <div className="px-3 pb-3 space-y-1 border-t border-white/[0.06]">
          <div className="grid grid-cols-2 gap-1.5 pt-2">
            <Link
              href="/account"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-all"
            >
              <User size={12} /> {dict.sidebarAccount.account}
            </Link>
            <Link
              href="/settings"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-all"
            >
              <Settings size={12} /> {dict.navbar.settings}
            </Link>
            <Link
              href="/cart"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-all"
            >
              <ShoppingCart size={12} /> {dict.sidebarAccount.cart}
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-all"
            >
              <Home size={12} /> Dashboard
            </Link>
          </div>
          <button
            onClick={async () => {
              try {
                await createClient().auth.signOut();
              } catch {}
              window.location.replace("/login");
            }}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-500/10 px-2 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/15 transition-all"
          >
            <LogOut size={12} /> {dict.sidebarAccount.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
