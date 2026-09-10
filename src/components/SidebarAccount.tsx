"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { User, ShoppingCart, Home, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

function getInitials(session: Session | null): string {
  const e = session?.user?.email ?? null;
  const meta = session?.user?.user_metadata as { full_name?: string } | undefined;
  const base = meta?.full_name || e || "?";
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
}

export default function SidebarAccount() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    // Retry mechanism for session loading after OAuth redirect
    const loadSession = (attempt = 0) => {
      supabase.auth.getSession().then(({ data, error }) => {
        if (!mounted) return;
        if (error) console.warn("[SidebarAccount] getSession error:", error.message);
        const sess = data.session;
        if (!sess && attempt < 3) {
          setTimeout(() => loadSession(attempt + 1), 300 * (attempt + 1));
          return;
        }
        setSession(sess);
        setAuthLoaded(true);
      }).catch((err) => {
        if (!mounted) return;
        console.warn("[SidebarAccount] getSession failed:", err);
        if (attempt < 3) {
          setTimeout(() => loadSession(attempt + 1), 300 * (attempt + 1));
        } else {
          setAuthLoaded(true);
        }
      });
    };
    loadSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (mounted) {
        setSession(next);
        setAuthLoaded(true);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const email = session?.user?.email ?? null;
  const initials = getInitials(session);
  const avatarUrl = (session?.user?.user_metadata as { avatar_url?: string; picture?: string } | undefined)?.avatar_url || (session?.user?.user_metadata as { picture?: string } | undefined)?.picture || null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 text-xs font-bold text-brand-300 shrink-0 overflow-hidden ring-2 ring-white/[0.06]">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : authLoaded ? (
            initials
          ) : (
            <span className="animate-pulse">…</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{email || "…"}</p>
          <p className="text-[10px] text-neutral-500 font-medium">Account</p>
        </div>
      </div>
      <div className="px-3 pb-3 grid grid-cols-3 gap-1.5">
        <Link href="/account" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2 text-xs font-bold text-white hover:bg-white/10 transition-all">
          <User size={12} /> Account
        </Link>
        <Link href="/cart" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2 text-xs font-bold text-white hover:bg-white/10 transition-all">
          <ShoppingCart size={12} /> Carrello
        </Link>
        <Link href="/dashboard" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2 text-xs font-bold text-white hover:bg-white/10 transition-all">
          <Home size={12} /> Dashboard
        </Link>
      </div>
      <div className="px-3 pb-3">
        <button
          onClick={async () => {
            await createClient().auth.signOut();
            window.location.href = "/";
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-500/10 px-2 py-2 text-xs font-bold text-red-300 hover:bg-red-500/15 transition-all"
        >
          <LogOut size={12} /> Esci
        </button>
      </div>
    </div>
  );
}
