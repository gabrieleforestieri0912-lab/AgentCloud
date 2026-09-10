"use client";

/**
 * Menu di navigazione mobile (schermi < lg): overlay full-screen con link
 * principali, dropdown agenti e toggle lingua, renderizzato in un portal per
 * stare sopra ogni contenuto. Chiude su click di un link o del backdrop.
 */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, ShoppingCart, MessageSquare, LayoutDashboard, User, LogOut } from "lucide-react";
import Image from "next/image";
import AgentIcon from "./AgentIcon";
import { AGENTS, AVAILABLE_AGENTS, localizeAgent, type Agent } from "@/lib/agents";
import { useLanguage } from "./LanguageProvider";
import { useCart } from "./CartProvider";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

type MobileNavProps = {
  marketplaceAgents?: Agent[];
};

export default function MobileNav({ marketplaceAgents }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const pathname = usePathname();
  const { locale, dict } = useLanguage();
  const { count: cartCount } = useCart();

  // Session loading with retry mechanism
  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const applySession = (sess: Session | null) => {
      if (!mounted) return;
      setSession(sess);
    };

    const loadSession = (attempt = 0) => {
      supabase.auth.getSession().then(({ data, error }) => {
        if (!mounted) return;
        if (error) console.warn("[MobileNav] getSession error:", error.message);
        const sess = data.session;
        if (!sess && attempt < 3) {
          setTimeout(() => loadSession(attempt + 1), 300 * (attempt + 1));
          return;
        }
        applySession(sess);
      }).catch((err) => {
        if (!mounted) return;
        console.warn("[MobileNav] getSession failed:", err);
        if (attempt < 3) {
          setTimeout(() => loadSession(attempt + 1), 300 * (attempt + 1));
        } else {
          applySession(null);
        }
      });
    };
    loadSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      applySession(next);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isSignedIn = Boolean(session);
  const userMeta = session?.user?.user_metadata as { full_name?: string; avatar_url?: string; picture?: string } | undefined;
  const avatarUrl = userMeta?.avatar_url || userMeta?.picture || null;
  const userEmail = session?.user?.email || null;
  const userInitials = isSignedIn
    ? (userMeta?.full_name || session?.user?.email || "?")
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("") || "?"
    : null;
  // Chiude il menu al cambio di rotta: reset dello stato derivato dal
  // pathname DURANTE il render (pattern React per "aggiustare lo stato quando
  // cambia una prop") invece che in un effect — evita il render sincrono extra
  // segnalato da react-hooks/set-state-in-effect.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setIsOpen(false);
    setActiveSection(null);
  }

  // Le pagine server passano la lista autoritativa; altrimenti si ripiega sul
  // cookie di accesso (chi ha il codice vede il catalogo COMPLETO anche nel
  // menu mobile).
  const fallbackAgents = false ? AGENTS : AVAILABLE_AGENTS;
  const agents = (marketplaceAgents ?? fallbackAgents).map((agent) =>
    localizeAgent(agent, locale),
  );

  // Impedisce lo scroll del body quando il menu è aperto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const menuSections = [
    {
      id: "marketplace",
      label: dict.navbar.marketplace,
      href: "/agents",
      children: agents.map((agent) => ({
        label: agent.shortName,
        href: `/agents/${agent.slug}`,
        icon: agent.icon,
        brand: agent.brand,
        accent: agent.accent,
      })),
    },
    {
      id: "solutions",
      label: dict.navbar.solutions,
      href: "/#solutions",
    },
    {
      id: "integrations",
      label: dict.navbar.integrations,
      href: "/integrations",
    },
  ];

  const toggleSection = (id: string) => {
    setActiveSection(activeSection === id ? null : id);
  };

  return (
    <>
      {/* Bottone menu mobile — lg:hidden per allinearsi a navbar (lg:flex) */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-11 w-11 items-center justify-center text-neutral-400 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Overlay menu mobile.
          Renderizzato di proposito con un portal verso document.body: il
          backdrop-blur della navbar crea un containing block per i discendenti
          fixed, quindi un pannello fixed inline verrebbe dimensionato sulla
          barra della navbar invece che sul viewport (un menu minuscolo e
          "incollato"). Fuori dall'antenato con filtro, inset-0 / h-dvh si
          risolvono sul viewport reale. */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />

            {/* Menu panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 h-dvh w-80 max-w-[85vw] bg-neutral-950 border-l border-white/10 lg:hidden overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="relative h-8 w-8">
                    <Image
                      src="/agentcloud.png"
                      alt="AgentCloud"
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                  <span className="text-lg font-bold tracking-tight text-white">
                    AgentCloud
                  </span>
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-11 w-11 items-center justify-center text-neutral-400 hover:text-white"
                  aria-label="Close navigation"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Menu items */}
              <div className="p-4">
                {menuSections.map((section) => (
                  <div key={section.id} className="mb-2">
                    {section.children ? (
                      <>
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold text-white transition-colors hover:bg-white/5"
                        >
                          {section.label}
                          <ChevronRight
                            size={16}
                            className={`transition-transform ${
                              activeSection === section.id ? "rotate-90" : ""
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {activeSection === section.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-4 border-l border-white/10 pl-4 pb-2">
                                {section.children.map((child) => (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-neutral-400 hover:bg-white/5 hover:text-white"
                                  >
                                    <span
                                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${child.accent}`}
                                    >
                                      <AgentIcon
                                        icon={child.icon}
                                        brand={child.brand}
                                        size={12}
                                        className="text-white"
                                      />
                                    </span>
                                    {child.label}
                                  </Link>
                                ))}
                                <Link
                                  href={section.href}
                                  onClick={() => setIsOpen(false)}
                                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-brand-400 hover:text-brand-300"
                                >
                                  {dict.navbar.browseAllAgents}
                                  <ChevronRight size={14} />
                                </Link>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <Link
                        href={section.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-white/5"
                      >
                        {section.label}
                        <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              {/* Azioni rapide — niente eliminato su mobile, tutto a portata */}
              <div className="border-t border-white/10 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/cart" onClick={() => setIsOpen(false)} className="relative flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-bold text-white hover:bg-white/10">
                    <ShoppingCart size={16} />
                    Carrello
                    {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">{cartCount}</span>}
                  </Link>
                  <Link href="/chat" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-3 text-sm font-bold text-white hover:bg-brand-400">
                    <MessageSquare size={16} />
                    Chat AI
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-neutral-800 px-3 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">
                    <LayoutDashboard size={14} />
                    Dashboard
                  </Link>
                  <Link href="/account" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-neutral-800 px-3 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">
                    <User size={14} />
                    Account
                  </Link>
                </div>
                {isSignedIn ? (
                  <>
                    {/* User info */}
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 text-xs font-bold text-brand-300 shrink-0 overflow-hidden ring-2 ring-white/[0.06]">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : userInitials ? (
                          userInitials
                        ) : (
                          "?"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{userEmail || "…"}</p>
                        <p className="text-[10px] text-neutral-500 font-medium">Account</p>
                      </div>
                    </div>
                    {/* Sign out */}
                    <button
                      onClick={async () => {
                        await createClient().auth.signOut();
                        window.location.href = "/waitlist";
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/15 transition-all"
                    >
                      <LogOut size={16} />
                      Esci
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-neutral-900 hover:bg-neutral-100"
                  >
                    <LogOut size={16} className="rotate-180" />
                    {locale === "it" ? "Inizia Ora" : "Start Now"}
                  </Link>
                )}
                <p className="text-center text-xs text-neutral-500">{dict.chat.everythingOnMobile}</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
