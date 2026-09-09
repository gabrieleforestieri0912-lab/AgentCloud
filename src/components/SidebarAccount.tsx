"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { User, ShoppingCart, Home, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SidebarAccount() {
  const [email, setEmail] = useState<string | null>(null);
  const [initials, setInitials] = useState("?");
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const e = data.session?.user?.email ?? null;
      setEmail(e);
      const meta = data.session?.user?.user_metadata as { full_name?: string } | undefined;
      const base = meta?.full_name || e || "?";
      const ini = base
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("") || "?";
      setInitials(ini);
    });
  }, []);
  return (
    <div className="rounded-xl border border-white/5 bg-neutral-900 p-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">{email ?? "Ospite"}</p>
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
          Accedi
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
