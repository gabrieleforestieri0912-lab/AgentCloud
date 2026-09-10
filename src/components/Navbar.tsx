"use client";

/**
 * Barra di navigazione principale (pagine marketing e app).
 *
 * Mostra logo, voci (agenti/integrazioni/demo), dropdown agenti in evidenza,
 * toggle lingua, campanella notifiche e stato sessione (login / dashboard).
 * La sessione Supabase viene ascoltata per aggiornare i pulsanti al login.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  LogOut,
  User,
  LayoutDashboard,
  CreditCard,
} from "lucide-react";
import Image from "next/image";
import AgentIcon from "./AgentIcon";
import BrandLogo from "./BrandLogo";
import MobileNav from "./MobileNav";
import {
  AGENTS,
  AVAILABLE_AGENTS,
  getFeaturedAgents,
  localizeAgent,
  type Agent,
} from "@/lib/agents";
import { ShoppingCart, MessageSquare } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import NotificationBell from "./NotificationBell";
import { useCart } from "./CartProvider";

type MenuKey = "marketplace" | "solutions" | "integrations" | "pricing";

type NavbarProps = {
  /**
   * Agenti del marketplace da mostrare nel menu a tendina/mobile. Le pagine
   * server passano la lista filtrata dai flag; se omessa si usano gli agenti
   * del verticale predefinito (i bundle client non possono leggere le env var
   * AGENTCLOUD_* riservate al server).
   */
  marketplaceAgents?: Agent[];
};

import { INTEGRATIONS as ALL_INTEGRATIONS } from "@/lib/integrations";

// Il menu a tendina della navbar mostra un sottoinsieme compatto di 8 elementi
// per un accesso rapido
const INTEGRATIONS = ALL_INTEGRATIONS.slice(0, 8);

export default function Navbar({ marketplaceAgents }: NavbarProps) {
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // True appena la lettura iniziale della sessione è conclusa — evita il
  // flash di un frame del bottone "Accedi" per gli utenti loggati prima che
  // l'hydration risolva.
  const [authLoaded, setAuthLoaded] = useState(true);
  const router = useRouter();
  const { locale, dict } = useLanguage();
  // Le pagine che risolvono i flag lato server passano la lista autoritativa;
  // altrimenti si ripiega sul cookie di accesso (chi ha il codice vede il
  // catalogo COMPLETO, tutti gli altri il verticale di default — i bundle
  // client non possono leggere le env var AGENTCLOUD_* solo server). In ogni
  // caso gli agenti vengono localizzati con la lingua attiva così le etichette
  // del menu non perdono mai inglese (localizeAgent è idempotente per input
  // già localizzati).
  const fallbackAgents = false ? AGENTS : AVAILABLE_AGENTS;
  const agents = (marketplaceAgents ?? fallbackAgents).map((agent) =>
    localizeAgent(agent, locale),
  );
  // Il menu è curato: solo gli agenti in evidenza, nell'ordine scelto, a
  // prescindere da quanto cresce il catalogo (vedi FEATURED_AGENT_SLUGS).
  const featuredAgents = getFeaturedAgents(agents);

  // Tiene traccia della sessione Supabase in modo reattivo (lettura iniziale +
  // cambi di stato dell'auth). Include retry per gestire race conditions
  // post-redirect OAuth dove i cookie di sessione non sono ancora disponibili.
  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const applySession = (sess: Session | null) => {
      if (!mounted) return;
      setSession(sess);
      setAuthLoaded(true);
    };

    // Retry mechanism: up to 3 attempts with progressive delay
    const loadSession = (attempt = 0) => {
      supabase.auth.getSession().then(({ data, error }) => {
        if (!mounted) return;
        if (error) console.warn("[Navbar] getSession error:", error.message);
        const sess = data.session;
        if (!sess && attempt < 3) {
          setTimeout(() => loadSession(attempt + 1), 300 * (attempt + 1));
          return;
        }
        applySession(sess);
      }).catch((err) => {
        if (!mounted) return;
        console.warn("[Navbar] getSession failed:", err);
        if (attempt < 3) {
          setTimeout(() => loadSession(attempt + 1), 300 * (attempt + 1));
        } else {
          applySession(null);
        }
      });
    };
    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        applySession(nextSession);
      },
    );
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const isSignedIn = Boolean(session);
  const isAccessVisitor = false;
  const showAsLoggedIn = isSignedIn || isAccessVisitor;
  const { count: cartCount } = useCart();

  const userMeta = session?.user?.user_metadata as
    | { full_name?: string; avatar_url?: string; picture?: string }
    | undefined;
  const avatarUrl = userMeta?.avatar_url || userMeta?.picture || null;
  const accountInitials = isSignedIn
    ? (userMeta?.full_name || session?.user?.email || "?")
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("") || "?"
    : "AD";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  async function handleSignOut() {
    try { await createClient().auth.signOut(); } catch {}
    window.location.href = "/waitlist";
  }

  const menuItems = [
    { key: "marketplace" as MenuKey, label: dict.navbar.marketplace, href: "/agents" },
    { key: "solutions" as MenuKey, label: dict.navbar.solutions, href: "/#solutions" },
    { key: "integrations" as MenuKey, label: dict.navbar.integrations, href: "/integrations" },
  ];
  // Le soluzioni puntano al proprio agente quando la piattaforma lo offre già;
  // le altre non sono ancora disponibili e rimandano alla richiesta agente personalizzato.
  const SOLUTION_LINKS: Record<string, string> = {
    "E-commerce & Shopify": "/agents/shopify-agent",
    "Shopify & E-commerce": "/agents/shopify-agent",
    "Acquisizione lead": "/agents/lead-capture",
    "Lead Capture": "/agents/lead-capture",
    "Assistenza prodotti e ordini": "/agents/shopify-agent",
    "Product & Order Support": "/agents/shopify-agent",
  };
  const solutions = dict.navbar.solutionsItems.map((s) => ({
    title: s.title,
    text: s.text,
    href: SOLUTION_LINKS[s.title] ?? "/contact",
  }));

  // Periodo di grazia: il menu resta aperto mentre il mouse viaggia dal link
  // trigger al pannello (sono separati da un piccolo spazio che altrimenti
  // farebbe scattare onMouseLeave e chiudere il menu).
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Posizione del pannello (coordinate viewport del menu aperto). Il menu è
  // renderizzato tramite un portal verso <body> — vedi sotto — e posizionato
  // qui.
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
  const triggerRefs = useRef<Partial<Record<MenuKey, HTMLDivElement | null>>>({});

  // Larghezza approssimativa del menu per voce (combacia con i pannelli w-80 /
  // w-72) così il pannello centrato può essere limitato dentro il viewport.
  const PANEL_WIDTH: Record<MenuKey, number> = {
    marketplace: 320,
    solutions: 288,
    integrations: 420,
    pricing: 320,
  };

  function openMenu(key: MenuKey) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMenu(key);
    // Centra il pannello sul suo trigger; l'header è `fixed`, quindi queste
    // coordinate viewport restano corrette mentre la pagina scorre.
    const trigger = triggerRefs.current[key];
    if (trigger && typeof window !== "undefined") {
      const rect = trigger.getBoundingClientRect();
      const half = PANEL_WIDTH[key] / 2 + 12;
      const center = rect.left + rect.width / 2;
      const left = Math.min(Math.max(center, half), window.innerWidth - half);
      setPanelPos({ left, top: rect.bottom + 10 });
    }
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 120);
  }

  // Se la finestra viene ridimensionata con un menu aperto, chiudilo — il
  // portal è posizionato in coordinate viewport che potrebbero non combaciare
  // più.
  useEffect(() => {
    if (!activeMenu) return;
    const close = () => setActiveMenu(null);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [activeMenu]);

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-50"
      >
        <div className="mx-auto mt-3 max-w-7xl 3xl:max-w-[1720px] px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12">
          <div className="flex h-16 items-center justify-between rounded-full border border-white/10 bg-neutral-950 px-6 shadow-lg shadow-black/20">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="relative h-9 w-9">
                <Image
                  src="/agentcloud.png"
                  alt="AgentCloud"
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                AgentCloud
              </span>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {menuItems.map((item) => (
                <div
                  key={item.key}
                  className="relative"
                  onMouseLeave={scheduleClose}
                  ref={(el) => {
                    triggerRefs.current[item.key] = el;
                  }}
                >
                  <Link
                    href={item.href}
                    onMouseEnter={() => openMenu(item.key)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${
                      activeMenu === item.key
                        ? "bg-white/10 text-white"
                        : "text-neutral-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${activeMenu === item.key ? "rotate-180" : ""}`}
                    />
                  </Link>

                  {activeMenu === item.key &&
                    panelPos &&
                    typeof document !== "undefined" &&
                    createPortal(
                      <div
                        className="fixed z-[60]"
                        style={{
                          left: panelPos.left,
                          top: panelPos.top,
                          transform: "translateX(-50%)",
                        }}
                        onMouseEnter={() => openMenu(item.key)}
                        onMouseLeave={scheduleClose}
                      >
                        <div className="rounded-2xl border border-white/10 bg-neutral-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 animate-fade-in-up p-4">
                          {item.key === "marketplace" && (
                            <div className="w-80">
                              <p className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-neutral-500">
                                {dict.chat.featuredAgents}
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {featuredAgents.map((agent) => (
                                    <Link
                                      key={agent.slug}
                                      href={`/agents/${agent.slug}`}
                                      className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all hover:border-white/10 hover:bg-white/5 hover:shadow-sm"
                                    >
                                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${agent.accent} shadow-sm`}>
                                        <AgentIcon icon={agent.icon} brand={agent.brand} size={16} className="text-white" />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold leading-tight text-white">
                                          {agent.name}
                                        </p>
                                        <p className="truncate text-xs font-medium text-neutral-500">
                                          {agent.description}
                                        </p>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                                <Link
                                  href="/agents"
                                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                                >
                                  {dict.navbar.browseAllAgents}
                                  <ArrowRight size={14} />
                                </Link>
                              </div>
                            )}

                            {item.key === "solutions" && (
                              <div className="w-80">
                                <p className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-neutral-500">
                                  {dict.chat.solutions}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {solutions.map(({ title, text, href }) => (
                                    <Link
                                      key={title}
                                      href={href}
                                      className="group rounded-xl border border-transparent p-3 transition-all hover:border-white/10 hover:bg-white/5"
                                    >
                                      <p className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                                        {title}
                                      </p>
                                      <p className="mt-1 text-xs font-medium leading-relaxed text-neutral-500">
                                        {text}
                                      </p>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.key === "integrations" && (
                              <div className="w-[420px] max-w-[90vw]">
                                <p className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-neutral-500">
                                  {t(dict.chat.integrationsCount, { count: INTEGRATIONS.filter((i) => i.available).length })}
                                </p>
                                <div className="grid max-h-[320px] grid-cols-4 gap-1 overflow-y-auto pr-1 scrollbar-thin">
                                  {INTEGRATIONS.map((integration) => {
                                    const href =
                                      integration.available && integration.agentSlug
                                        ? `/agents/${integration.agentSlug}`
                                        : "/integrations";
                                    return (
                                      <Link
                                        key={integration.name}
                                        href={href}
                                        className="group flex flex-col items-center gap-1 rounded-xl border border-transparent px-2 py-3 text-center transition-all hover:border-white/10 hover:bg-white/5"
                                      >
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                          <BrandLogo slug={integration.brand} size={20} />
                                        </span>
                                        <span className="text-xs font-bold leading-tight text-neutral-300 group-hover:text-white">{integration.name}</span>
                                        {!integration.available && (
                                          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                            {dict.chat.comingSoon}
                                          </span>
                                        )}
                                      </Link>
                                    );
                                  })}
                                </div>
                                <Link
                                  href="/integrations"
                                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                                >
                                  {dict.chat.viewAllIntegrations}
                                  <ArrowRight size={14} />
                                </Link>
                              </div>
                            )}

                            {item.key === "pricing" && (
                              <div className="grid grid-cols-3 gap-2 w-80">
                                {dict.navbar.pricingItems.map(({ plan, price, text }) => (
                                  <Link
                                    key={plan}
                                    href="/#demo"
                                    className="rounded-lg p-3 text-center transition-colors hover:bg-white/5"
                                  >
                                    <p className="text-sm font-bold text-white">
                                      {plan}
                                    </p>
                                    <p className="mt-2 text-lg font-bold text-white">
                                      {price}
                                    </p>
                                    <p className="mt-0.5 text-xs font-semibold text-neutral-400">
                                      {text}
                                    </p>
                                  </Link>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>,
                      document.body,
                    )}
                </div>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* Mobile: cart sempre visibile, poi gruppo desktop */}
              <Link
                href="/cart"
                aria-label="Carrello"
                className="relative flex h-8 w-8 items-center justify-center text-neutral-400 transition-colors hover:text-white lg:hidden"
              >
                <ShoppingCart size={18} strokeWidth={1.75} />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                    {cartCount}
                  </span>
                )}
              </Link>
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="hidden items-center gap-3 lg:flex">
                {authLoaded && (showAsLoggedIn ? (
                <div className="flex items-center gap-3">
                  {showAsLoggedIn && (
                    <Link
                      href="/chat"
                      className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                    >
                      <MessageSquare size={14} />
                      {dict.chat.aiChat}
                    </Link>
                  )}
                  <Link
                    href="/cart"
                    aria-label="Carrello"
                    className="relative flex h-8 w-8 items-center justify-center text-neutral-400 transition-colors hover:text-white"
                  >
                    <ShoppingCart size={18} strokeWidth={1.75} />
                    {cartCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <NotificationBell />
                  <div ref={userMenuRef} className="relative">
                    <button
                      onClick={() => setUserMenuOpen((v) => !v)}
                      aria-label="Account"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-brand-500/15 text-sm font-bold text-brand-300 transition-colors hover:border-brand-500/40 hover:bg-brand-500/25 overflow-hidden"
                    >
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt="Account"
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        accountInitials
                      )}
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-2 shadow-xl"
                      >
                        <div className="px-3 py-2">
                          <p className="truncate text-sm font-bold text-white">
                            {isSignedIn ? session?.user?.email : "admin@agentcloud.agency"}
                          </p>
                          <p className="truncate text-xs text-neutral-500">
                            {isSignedIn ? "Account" : dict.chat.adminMockLogged}
                          </p>
                        </div>
                        <div className="my-1 h-px bg-white/5" />
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-300 hover:bg-white/5 hover:text-white"
                        >
                          <LayoutDashboard size={14} />
                          Dashboard
                        </Link>
                        <Link
                          href="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-300 hover:bg-white/5 hover:text-white"
                        >
                          <User size={14} />
                          Account
                        </Link>
                        <Link
                          href="/api/billing/portal"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-300 hover:bg-white/5 hover:text-white"
                        >
                          <CreditCard size={14} />
                          {dict.navbar.subscriptions}
                        </Link>
                        <div className="my-1 h-px bg-white/5" />
                        {isSignedIn ? (
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              handleSignOut();
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                          >
                            <LogOut size={14} />
                            {dict.navbar.logOut}
                          </button>
                        ) : (
                          <Link
                            href="/login"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-300 hover:bg-brand-500/10"
                          >
                            {dict.navbar.signIn}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                >
                  {locale === "it" ? "Inizia Ora" : "Start Now"}
                </Link>
              ))}
              </div>
              </div>
            </div>

            <MobileNav marketplaceAgents={marketplaceAgents} />
          </div>
        </div>
      </header>
    </>
  );
}

function ChevronDown({
  size,
  className,
}: {
  size: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
