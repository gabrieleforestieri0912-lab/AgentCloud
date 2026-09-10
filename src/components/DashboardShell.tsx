"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, MessageSquare, Store, Plug, ShoppingCart, User, CreditCard, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import SidebarAccount from "./SidebarAccount";
import AppHeader from "./AppHeader";
import DashboardOnboarding from "./DashboardOnboarding";

export default function DashboardShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/user/onboarding")
      .then((r) => r.json())
      .then((data: { dashboard?: boolean }) => {
        if (data.dashboard === false) setShowOnboarding(true);
      })
      .catch(() => {});
  }, []);
  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/agents", label: "Marketplace", icon: Store },
    { href: "/dashboard/integrations", label: "Integrazioni", icon: Plug },
    { href: "/cart", label: "Carrello", icon: ShoppingCart },
    { href: "/dashboard/subscriptions", label: "I miei abbonamenti", icon: CreditCard },
    { href: "/account", label: "Account", icon: User },
  ];
  return (
    <div className="flex h-dvh bg-neutral-950">
      {showOnboarding && (
        <DashboardOnboarding onComplete={() => setShowOnboarding(false)} />
      )}
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      {/* Sidebar — glassmorphism style matching chat */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-72 bg-neutral-950/80 backdrop-blur-2xl border-r border-white/[0.06]
          flex flex-col h-dvh shrink-0 transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between gap-2 border-b border-white/[0.06] px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative h-7 w-7 overflow-hidden rounded-lg">
              <Image src="/agentcloud.png" alt="AgentCloud" fill className="object-cover" sizes="28px" />
            </span>
            <span className="text-sm font-bold tracking-tight text-white">AgentCloud</span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>
        {/* Navigation — clean pill style */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-white/[0.06] text-white border border-white/[0.08]"
                    : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  active ? "bg-brand-500/15" : "bg-white/5"
                }`}>
                  <Icon size={14} className={active ? "text-brand-400" : ""} />
                </div>
                {label}
              </Link>
            );
          })}
        </nav>
        {/* Account */}
        <div className="p-3 border-t border-white/[0.06]">
          <SidebarAccount />
        </div>
      </aside>
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/5 bg-neutral-950/90 px-4 py-2 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-400 hover:text-white"
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
