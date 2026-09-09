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
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setAuthLoaded(true);
      }
    });
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
  return (
    <div className="rounded-xl border border-white/5 bg-neutral-900 p-3">        <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
          {authLoaded ? initials : "…"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">{authLoaded ? (email ?? "Ospite") : "Caricamento…"}</p>
          <p className="text-[11px] text-neutral-500">Account</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Link href="/account" className="flex items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs font-bold text-white hover:bg-white/10">
          <User size={12} /> Account
        </Link>
        <Link href="/cart" className="flex items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs font-bold text-white hover:bg-white/10">
          <ShoppingCart size={12} /> Carrello
        </Link>
        <Link href="/dashboard" className="flex items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs font-bold text-white hover:bg-white/10">
          <Home size={12} /> Dashboard
        </Link>
      </div>
      {email ? (
        <button
          onClick={async () => {
            await createClient().auth.signOut();
            window.location.href = "/";
          }}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-red-500/10 px-2 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/15"
        >
          <LogOut size={12} /> Esci
        </button>
      ) : (
        <Link href="/login" className="mt-2 flex w-full items-center justify-center rounded-lg bg-brand-500 px-2 py-1.5 text-xs font-bold text-white hover:bg-brand-400">
          Inizia Ora
        </Link>
      )}
      <div className="mt-3 flex items-center gap-2 px-1">
        <Image src="/agentcloud.png" alt="AgentCloud" width={14} height={14} />
        <span className="text-xs font-semibold text-neutral-600">
          AgentCloud <span className="text-purple-400">v2.1</span>
        </span>
      </div>
    </div>
  );
}
