"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { User, ShoppingCart, Home, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { avatarThumbnail } from "@/lib/avatar";
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
  // Menu account di fianco alla sidebar (non un popup al centro).
  const [menuOpen, setMenuOpen] = useState(false);
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
  const accountAvatarUrl = avatarThumbnail(rawAvatarUrl, 64);
  const accountLabelBase =
    (session?.user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    session?.user?.email ||
    account?.name ||
    account?.email ||
    "";

  return (
    <>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="w-full flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2 hover:bg-white/[0.05] transition-all"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 text-xs font-bold text-brand-300 shrink-0 overflow-hidden ring-2 ring-white/[0.06]">
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
        <p className="min-w-0 flex-1 truncate text-left text-sm font-bold text-white">{accountEmail || "..."}</p>
      </button>
      {menuOpen && createPortal(
        <>
          <button
            type="button"
            aria-label={dict.chat.close}
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="fixed z-50 w-60 rounded-2xl border border-white/10 bg-neutral-900 p-2 shadow-2xl shadow-black/60 left-[300px] bottom-4 max-lg:left-4 max-lg:right-4 max-lg:w-auto max-lg:bottom-28"
          >
            <div className="flex items-center gap-2.5 px-2 pt-1 pb-2">
              <p className="min-w-0 flex-1 truncate text-xs font-bold text-white">
                {accountEmail || "..."}
              </p>
            </div>
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] font-bold text-white hover:bg-white/10 transition-all"
            >
              <User size={14} className="shrink-0 text-neutral-400" /> {dict.sidebarAccount.account}
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] font-bold text-white hover:bg-white/10 transition-all"
            >
              <Settings size={14} className="shrink-0 text-neutral-400" /> {dict.navbar.settings}
            </Link>
            <Link
              href="/cart"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] font-bold text-white hover:bg-white/10 transition-all"
            >
              <ShoppingCart size={14} className="shrink-0 text-neutral-400" /> {dict.sidebarAccount.cart}
            </Link>
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] font-bold text-white hover:bg-white/10 transition-all"
            >
              <Home size={14} className="shrink-0 text-neutral-400" /> Dashboard
            </Link>
            <button
              role="menuitem"
              onClick={async () => {
                try {
                  await createClient().auth.signOut();
                } catch {}
                window.location.replace("/login");
              }}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] font-bold text-red-300 hover:bg-red-500/15 transition-all"
            >
              <LogOut size={14} className="shrink-0" /> {dict.sidebarAccount.signOut}
            </button>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
