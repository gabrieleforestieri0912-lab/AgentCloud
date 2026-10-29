"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, MessageSquare, Store, Plug, ShoppingCart, User, CreditCard, Menu, ChevronDown, Sparkles, Blocks, AppWindow, CalendarClock, ShieldCheck, Activity, PanelLeftClose } from "lucide-react";
import { usePathname } from "next/navigation";
import SidebarAccount from "./SidebarAccount";
import type { AccountIdentity } from "@/lib/account-identity";
import AppHeader from "./AppHeader";
import DashboardOnboarding from "./DashboardOnboarding";
import { useLanguage } from "./LanguageProvider";
import { useResizableSidebar, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from "@/lib/useResizableSidebar";
import { hydrateMissingPreferences } from "@/lib/preferences-sync";

/** Larghezza della sidebar del dashboard in px (preferenza, vedi il hook). */
const SIDEBAR_WIDTH_KEY = "agentcloud_dashboard_sidebar_width";

export default function DashboardShell({
  children,
  email,
  account = null,
}: {
  children: React.ReactNode;
  email: string;
  /** Identità risolta lato server, per la sidebar account. */
  account?: AccountIdentity | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const pathname = usePathname();
  const { dict } = useLanguage();
  const ds = dict.dashboardShell;

  useEffect(() => {
    fetch("/api/user/onboarding")
      .then((r) => r.json())
      .then((data: { dashboard?: boolean }) => {
        if (data.dashboard === false) setShowOnboarding(true);
      })
      .catch(() => {});
  }, []);

  // Scroll lock del body mentre il drawer laterale è aperto su mobile.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);
  const nav = [
    { href: "/dashboard", label: ds.navDashboard, icon: LayoutDashboard },
    { href: "/chat", label: ds.navChat, icon: MessageSquare },
    { href: "/dashboard/schedules", label: ds.navSchedules, icon: CalendarClock },
    { href: "/dashboard/runs", label: ds.navRuns, icon: Activity },
    { href: "/dashboard/approvals", label: ds.navApprovals, icon: ShieldCheck },
    { href: "/agents", label: ds.navMarketplace, icon: Store },
    { href: "/cart", label: ds.navCart, icon: ShoppingCart },
    { href: "/dashboard/subscriptions", label: ds.navSubscriptions, icon: CreditCard },
    { href: "/account", label: ds.navAccount, icon: User },
  ];
  // Gruppo Personalizzazione (come Claude): integrazioni, competenze e plugin
  // sotto un'unica voce espandibile, aperta quando una pagina figlia è attiva.
  const personalization = [
    { href: "/dashboard/integrations", label: ds.navIntegrations, icon: Plug },
    { href: "/dashboard/apps", label: ds.navApps, icon: AppWindow },
    { href: "/skills", label: ds.navSkills, icon: Sparkles },
    { href: "/plugins", label: ds.navPlugins, icon: Blocks },
  ];
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const personalizationActive = personalization.some(
    ({ href }) => pathname === href || pathname.startsWith(href + "/"),
  );
  // Larghezza della sidebar: regolabile trascinando il bordo destro (come su
  // Claude), persistita in localStorage. Solo desktop: su mobile è un drawer.
  const sidebarResize = useResizableSidebar(SIDEBAR_WIDTH_KEY, 288);
  // Sync preferenze uguale alla chat: le larghezze e i toggle della shell
  // arrivano dal DB se mancano nel browser.
  useEffect(() => {
    void hydrateMissingPreferences();
  }, []);
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
      <div className="relative shrink-0 lg:flex">
        <aside
          style={sidebarResize.isDesktop ? { width: sidebarResize.width } : undefined}
          className={`
            fixed lg:static inset-y-0 left-0 z-40 w-72 bg-neutral-950/80 backdrop-blur-2xl border-r border-white/[0.06]
            flex flex-col h-dvh shrink-0 transition-transform duration-300
            ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
        {/* Header — stesso stile della sidebar della chat: logo a sinistra,
            pillola di chiusura a destra. */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
            aria-label="AgentCloud"
          >
            <span className="relative h-7 w-7 overflow-hidden rounded-lg">
              <Image src="/agentcloud.png" alt="AgentCloud" fill className="object-cover" sizes="28px" />
            </span>
            <span className="text-sm font-bold tracking-tight text-white">AgentCloud</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label={dict.chat.closeSidebar}
            title={dict.chat.closeSidebar}
            className="lg:hidden flex h-9 w-11 items-center justify-center rounded-full text-neutral-500 transition-all hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        {/* Navigation — stile identico alla sidebar della chat: item bassi
            con solo icona+testo, attivo = pillola bianca. */}
        <nav data-onboard="dashboard-nav" className="flex-1 overflow-y-auto px-3 pt-3 pb-2 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-all ${
                  active
                    ? "bg-white text-neutral-900"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={13} className="shrink-0" />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setPersonalizationOpen((v) => !v)}
            aria-expanded={personalizationOpen || personalizationActive}
            className={`flex h-9 w-full items-center gap-2 rounded-xl px-3 text-xs font-bold transition-all ${
              personalizationActive
                ? "bg-white text-neutral-900"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles size={13} className="shrink-0" />
            <span className="flex-1 text-left">{ds.navPersonalization}</span>
            <ChevronDown size={13} className={`shrink-0 transition-transform duration-200 ${(personalizationOpen || personalizationActive) ? "rotate-180" : ""}`} />
          </button>
          {(personalizationOpen || personalizationActive) && (
            <div className="ml-5 space-y-1 border-l border-white/[0.06] pl-2">
              {personalization.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      active
                        ? "text-white"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon size={12} className="shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
        {/* Account */}
        <div data-onboard="dashboard-account" className="p-2 border-t border-white/[0.06]">
          <SidebarAccount
            account={account}
            sidebarWidth={sidebarResize.width}
            sidebarIsDesktop={sidebarResize.isDesktop}
          />
        </div>
      </aside>
        {/* Maniglia di ridimensionamento (solo desktop). */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={dict.chat.resizeSidebar}
          aria-valuenow={sidebarResize.width}
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          tabIndex={0}
          onPointerDown={sidebarResize.startResize}
          onKeyDown={sidebarResize.onKeyDown}
          className={`absolute inset-y-0 right-0 z-40 w-1.5 cursor-col-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 hidden lg:block ${
            sidebarResize.dragging ? "bg-brand-500/40" : "hover:bg-brand-500/20"
          }`}
        />
      </div>
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile: solo il bottone menu fluttuante, senza barra né titolo —
            stessa regola dell'header desktop trasparente. */}
        <div className="pointer-events-none sticky top-0 z-40 -mb-[60px] flex items-start justify-start px-4 pt-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            data-onboard="dashboard-mobile-menu"
            aria-label={dict.navbar.menu}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-neutral-900/80 text-neutral-400 backdrop-blur hover:text-white"
          >
            <Menu size={16} />
          </button>
        </div>
        <AppHeader variant="dashboard" subtitle={email} />
        <div className="flex-1 overflow-y-auto bg-neutral-950">
          {children}
        </div>
      </div>
    </div>
  );
}
