"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  Sparkles,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import AgentIcon from "./AgentIcon";
import BrandLogo from "./BrandLogo";
import MobileNav from "./MobileNav";
import { AVAILABLE_AGENTS, localizeAgent, type Agent } from "@/lib/agents";
import { useLanguage } from "./LanguageProvider";
import LanguageToggle from "./LanguageToggle";
import NotificationBell from "./NotificationBell";

type MenuKey = "marketplace" | "solutions" | "integrations" | "pricing";

type NavbarProps = {
  /**
   * Marketplace agents to show in the dropdown/mobile menu. Server pages pass
   * the flag-gated list; when omitted the default vertical's agents are used
   * (client bundles can't read the server-only AGENTCLOUD_* env vars).
   */
  marketplaceAgents?: Agent[];
};

// Apps the platform is already connected to link to the integrations section;
// the rest are not available yet and redirect to the demo request page.
const INTEGRATIONS = [
  { name: "Gmail", brand: "gmail", available: false },
  { name: "Google Calendar", brand: "googlecalendar", available: false },
  { name: "HubSpot", brand: "hubspot", available: false },
  { name: "WhatsApp", brand: "whatsapp", available: false },
  { name: "Shopify", brand: "shopify", available: true },
  { name: "Stripe", brand: "stripe", available: false },
  { name: "Notion", brand: "notion", available: false },
  { name: "Google Sheets", brand: "googlesheets", available: false },
];

export default function Navbar({ marketplaceAgents }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // True once the initial session read settles — prevents a one-frame flash of
  // the "Accedi" button for signed-in users before hydration resolves.
  const [authLoaded, setAuthLoaded] = useState(false);
  const router = useRouter();
  const { locale, dict } = useLanguage();
  // Pages that can resolve the flags server-side pass the authoritative list;
  // otherwise fall back to the default vertical's agents. Either way the
  // agents are overlaid with the active locale so dropdown labels never leak
  // English (localizeAgent is idempotent for already-localized input).
  const agents = (marketplaceAgents ?? AVAILABLE_AGENTS).map((agent) =>
    localizeAgent(agent, locale),
  );

  // Track the Supabase session reactively (initial read + auth state changes).
  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setAuthLoaded(true);
      }
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (mounted) {
          setSession(nextSession);
          setAuthLoaded(true);
        }
      },
    );
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const isSignedIn = Boolean(session);

  const userMeta = session?.user?.user_metadata as
    | { full_name?: string }
    | undefined;
  const accountInitials =
    (userMeta?.full_name || session?.user?.email || "?")
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.refresh();
  }

  const menuItems = [
    { key: "marketplace" as MenuKey, label: dict.navbar.marketplace, href: "/agents" },
    { key: "solutions" as MenuKey, label: dict.navbar.solutions, href: "/#solutions" },
    { key: "integrations" as MenuKey, label: dict.navbar.integrations, href: "/#integrations" },
  ];
  // Solutions link to their agent when the platform already offers it; the
  // rest are not available yet and redirect to the demo request page.
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
    href: SOLUTION_LINKS[s.title] ?? "/demo",
  }));

  // Grace period so the dropdown stays open while the mouse travels from
  // the trigger link to the dropdown panel (they are separated by a small
  // gap that would otherwise fire onMouseLeave and close the menu).
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openMenu(key: MenuKey) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMenu(key);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 120);
  }

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-50"
      >
        <div className="mx-auto mt-3 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between rounded-full border border-white/10 bg-neutral-950/90 px-6 shadow-lg shadow-black/20 backdrop-blur-xl">
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

            <nav className="hidden items-center gap-1 md:flex">
              {menuItems.map((item) => (
                <div
                  key={item.key}
                  className="relative"
                  onMouseLeave={scheduleClose}
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

                  {activeMenu === item.key && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50"
                      onMouseEnter={() => openMenu(item.key)}
                    >
                      <div className="rounded-xl border border-white/5 bg-neutral-950 shadow-xl shadow-black/30 animate-fade-in-up p-3">
                        {item.key === "marketplace" && (
                          <div className="w-80">
                            <div className="grid grid-cols-2 gap-2">
                              {agents.map((agent) => (
                                  <Link
                                    key={agent.slug}
                                    href={`/agents/${agent.slug}`}
                                    className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/5"
                                  >
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${agent.accent}`}>
                                      <AgentIcon icon={agent.icon} brand={agent.brand} size={16} className="text-white" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-white">
                                        {agent.name}
                                      </p>
                                      <p className="truncate text-xs font-semibold text-neutral-400">
                                        {agent.description}
                                      </p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                              <Link
                                href="/agents"
                                className="mt-2 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold text-brand-400 transition-colors hover:bg-brand-500/10"
                              >
                                {dict.navbar.browseAllAgents}
                                <ArrowRight size={14} />
                              </Link>
                            </div>
                          )}

                          {item.key === "solutions" && (
                            <div className="grid grid-cols-2 gap-2 w-72">
                              {solutions.map(({ title, text, href }) => (
                                <Link
                                  key={title}
                                  href={href}
                                  className="rounded-lg p-3 transition-colors hover:bg-white/5"
                                >
                                  <p className="text-sm font-bold text-white">
                                    {title}
                                  </p>
                                  <p className="mt-0.5 text-xs font-semibold text-neutral-400">
                                    {text}
                                  </p>
                                </Link>
                              ))}
                            </div>
                          )}

                          {item.key === "integrations" && (
                            <div className="grid grid-cols-4 gap-1 w-80">
                              {INTEGRATIONS.map((integration) => (
                                <Link
                                  key={integration.name}
                                  href={integration.available ? "/#integrations" : "/demo"}
                                  className="flex flex-col items-center gap-2 rounded-lg px-3 py-4 text-center text-sm font-bold text-neutral-400 transition-colors hover:bg-white/5"
                                >
                                  <span className="h-5 flex items-center justify-center transition-transform group-hover:scale-110">
                                    <BrandLogo slug={integration.brand} size={22} />
                                  </span>
                                  {integration.name}
                                </Link>
                              ))}
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
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageToggle />
              <div className="hidden items-center gap-3 md:flex">
                {authLoaded && (isSignedIn ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    aria-label="Account"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-brand-500/15 text-sm font-bold text-brand-300 transition-colors hover:border-brand-500/40 hover:bg-brand-500/25"
                  >
                    {accountInitials}
                  </Link>
                  <NotificationBell />
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-neutral-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <LogOut size={16} />
                    {dict.navbar.logOut}
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold text-neutral-300 transition-colors hover:bg-white/5"
                  >
                    {dict.navbar.signIn}
                  </Link>
                  <Link
                    href="/demo"
                    className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                  >
                    <Sparkles size={16} />
                    {dict.navbar.requestDemo}
                  </Link>
                </>
              ))}
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
