"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, MessageSquare, Store, Plug, ShoppingCart, User, Settings, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import SidebarAccount from "./SidebarAccount";
import AppHeader from "./AppHeader";

export default function DashboardShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/agents", label: "Marketplace", icon: Store },
    { href: "/integrations", label: "Integrazioni", icon: Plug },
    { href: "/cart", label: "Carrello", icon: ShoppingCart },
    { href: "/account", label: "Account", icon: User },
    { href: "/settings", label: "Impostazioni", icon: Settings },
  ];
  return (
    <div className="flex h-dvh bg-neutral-950">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      {/* Sidebar full height */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-72 bg-neutral-950 border-r border-white/5
          flex flex-col h-dvh shrink-0 transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-white/5 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative h-7 w-7 overflow-hidden rounded-lg">
              <Image src="/agentcloud.png" alt="AgentCloud" fill className="object-cover" sizes="28px" />
            </span>
            <span className="text-sm font-bold tracking-tight text-white">AgentCloud</span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden rounded-lg p-1 text-neutral-500 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-white/5 text-white border border-white/5" : "text-neutral-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <SidebarAccount />
        </div>
      </aside>
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/5 bg-neutral-950/90 px-4 py-2 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-neutral-400 hover:text-white"
          >
            <Menu size={16} />
          </button>
          <span className="text-sm font-bold text-white">Dashboard</span>
        </div>
        <div className="hidden lg:block">
          <AppHeader variant="dashboard" subtitle={email} />
        </div>
        <div className="lg:hidden">
          <AppHeader variant="dashboard" subtitle={email} />
        </div>
        <div className="flex-1 overflow-y-auto bg-neutral-950">
          {children}
        </div>
      </div>
    </div>
  );
}
