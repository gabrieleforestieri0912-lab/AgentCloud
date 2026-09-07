"use client";

/**
 * Header dell'area applicativa (chat/dashboard/impostazioni).
 *
 * Mostra logo, titolo di contesto (es. nome agente attivo o email utente) e
 * controlli condivisi: toggle sidebar, cambio lingua e campanella notifiche.
 * La variante cambia i link di ritorno (back to home/area).
 */
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, LayoutDashboard, MessageSquare, PanelLeft, PanelLeftClose } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import LanguageToggle from "./LanguageToggle";
import NotificationBell from "./NotificationBell";
import CartIcon from "./CartIcon";

type AppHeaderProps = {
  variant: "dashboard" | "chat";
  title?: string;
  subtitle?: string;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  agentLabel?: string;
};

export default function AppHeader({
  variant,
  title,
  subtitle,
  sidebarOpen,
  onToggleSidebar,
  agentLabel,
}: AppHeaderProps) {
  const { dict, locale } = useLanguage();
  const isIt = locale === "it";
  const homeLabel = isIt ? "Torna alla home" : "Back to home";
  const dashboardLabel = isIt ? "Dashboard" : "Dashboard";
  const chatLabel = "Chat";

  const defaultTitle =
    variant === "dashboard"
      ? dashboardLabel
      : (agentLabel ?? chatLabel);

  const displayTitle = title ?? defaultTitle;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-neutral-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 3xl:max-w-[1720px]">
        {/* Sinistra */}
        <div className="flex items-center gap-3 min-w-0">
          {variant === "chat" && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              aria-label={sidebarOpen ? dict.chat.closeSidebar : dict.chat.openSidebar}
              title={sidebarOpen ? dict.chat.closeSidebar : dict.chat.openSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white lg:shrink-0"
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
          )}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="relative h-7 w-7 overflow-hidden rounded-lg">
              <Image src="/agentcloud.png" alt="AgentCloud" fill className="object-cover" sizes="28px" />
            </span>
            <span className="hidden text-sm font-bold tracking-tight text-white sm:inline">
              AgentCloud
            </span>
          </Link>
          <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-white">{displayTitle}</h1>
            {subtitle && (
              <p className="hidden truncate text-xs text-neutral-500 sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Destra */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Passaggio dashboard/chat */}
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                variant === "dashboard"
                  ? "bg-white text-neutral-900"
                  : "border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutDashboard size={14} />
              {dashboardLabel}
            </Link>
            <Link
              href="/chat"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                variant === "chat"
                  ? "bg-white text-neutral-900"
                  : "border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <MessageSquare size={14} />
              {chatLabel}
            </Link>
          </nav>

          <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">{homeLabel}</span>
            <span className="sm:hidden">Home</span>
          </Link>

          <CartIcon />
          <LanguageToggle />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
