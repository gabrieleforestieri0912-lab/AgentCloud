"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  ArrowRight,
  Cloud,
  Menu,
  Sparkles,
  X,
  Calendar,
  BookOpen,
  Table,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGoogle,
  faSlack,
  faShopify,
  faStripe,
} from "@fortawesome/free-brands-svg-icons";
import AgentIcon from "./AgentIcon";
import { AVAILABLE_AGENTS } from "@/lib/agents";

type MenuKey = "marketplace" | "solutions" | "integrations" | "pricing";

const MENU_ITEMS: Array<{ key: MenuKey; label: string; href: string }> = [
  { key: "marketplace", label: "Marketplace", href: "/agents" },
  { key: "solutions", label: "Solutions", href: "/#solutions" },
  { key: "integrations", label: "Integrations", href: "/#integrations" },
];

const SOLUTIONS = [
  [
    "Customer Support",
    "Answer tickets, route issues, and summarize support spikes.",
  ],
  ["Sales", "Find leads, enrich contacts, and qualify replies automatically."],
  ["Finance", "Process invoices, track payments, and generate reports."],
  ["Restaurant", "Forecast stock, prepare supplier orders, and reduce waste."],
];

const INTEGRATIONS = [
  { name: "Gmail", icon: () => <FontAwesomeIcon icon={faGoogle} size="lg" /> },
  { name: "Google Calendar", icon: () => <Calendar size={18} /> },
  { name: "HubSpot", icon: () => <Cloud size={18} /> },
  { name: "Slack", icon: () => <FontAwesomeIcon icon={faSlack} size="lg" /> },
  {
    name: "Shopify",
    icon: () => <FontAwesomeIcon icon={faShopify} size="lg" />,
  },
  { name: "Stripe", icon: () => <FontAwesomeIcon icon={faStripe} size="lg" /> },
  { name: "Notion", icon: () => <BookOpen size={18} /> },
  { name: "Sheets", icon: () => <Table size={18} /> },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const { isSignedIn, isLoaded } = useUser();

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-50"
        onMouseLeave={() => setActiveMenu(null)}
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
              {MENU_ITEMS.map((item) => (
                <div key={item.key} className="relative">
                  <Link
                    href={item.href}
                    onMouseEnter={() => setActiveMenu(item.key)}
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
                      onMouseEnter={() => setActiveMenu(item.key)}
                    >
                      <div className="rounded-xl border border-white/5 bg-neutral-950 shadow-xl shadow-black/30 animate-fade-in-up p-3">
                        {item.key === "marketplace" && (
                          <div className="w-80">
                            <div className="grid grid-cols-2 gap-2">
                              {AVAILABLE_AGENTS.map((agent) => (
                                  <Link
                                    key={agent.slug}
                                    href={`/agents/${agent.slug}`}
                                    className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/5"
                                  >
                                    <span className="text-brand-500 shrink-0">
                                      <AgentIcon icon={agent.icon} size={20} />
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
                                Browse all agents
                                <ArrowRight size={14} />
                              </Link>
                            </div>
                          )}

                          {item.key === "solutions" && (
                            <div className="grid grid-cols-2 gap-2 w-72">
                              {SOLUTIONS.map(([title, text]) => (
                                <Link
                                  key={title}
                                  href="/agents"
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
                                  href="/#integrations"
                                  className="flex flex-col items-center gap-2 rounded-lg px-3 py-4 text-center text-sm font-bold text-neutral-400 transition-colors hover:bg-white/5"
                                >
                                  <span className="text-neutral-500">
                                    {integration.icon()}
                                  </span>
                                  {integration.name}
                                </Link>
                              ))}
                            </div>
                          )}

                          {item.key === "pricing" && (
                            <div className="grid grid-cols-3 gap-2 w-80">
                              {[
                                ["Starter", "€290/mo", "One workflow agent"],
                                [
                                  "Growth",
                                  "€590/mo",
                                  "Agent plus integrations",
                                ],
                                ["Custom", "Custom", "Multi-agent systems"],
                              ].map(([plan, price, text]) => (
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

            <div className="hidden items-center gap-4 md:flex">
              {isLoaded && isSignedIn ? (
                <div className="flex items-center gap-3">
                  <SignOutButton>
                    <button className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-neutral-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400">
                      <LogOut size={16} />
                      Log out
                    </button>
                  </SignOutButton>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold text-neutral-300 transition-colors hover:bg-white/5"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/demo"
                    className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                  >
                    <Sparkles size={16} />
                    Request demo
                  </Link>
                </>
              )}
            </div>

            <button
              className="p-2 text-neutral-400 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/5 bg-neutral-950 px-4 py-4 md:hidden max-h-[calc(100vh-5rem)] overflow-y-auto">
            <div className="space-y-1">
              <div className="mb-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
                Menu
              </div>
              <Link
                href="/agents"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/5"
              >
                Marketplace
              </Link>
              <div className="grid grid-cols-2 gap-1 px-3 pb-2">
                {AVAILABLE_AGENTS.map((agent) => (
                  <Link
                    key={agent.slug}
                    href={`/agents/${agent.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-neutral-400 hover:bg-white/5 hover:text-white"
                  >
                    <span className="text-brand-500 shrink-0">
                      <AgentIcon icon={agent.icon} size={14} />
                    </span>
                    <span className="truncate">{agent.shortName}</span>
                  </Link>
                ))}
              </div>
              <Link
                href="/#solutions"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/5"
              >
                Solutions
              </Link>
              <div className="grid grid-cols-2 gap-1 px-3 pb-2">
                {SOLUTIONS.map(([title]) => (
                  <Link
                    key={title}
                    href="/agents"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-2 py-2 text-xs font-semibold text-neutral-400 hover:bg-white/5 hover:text-white"
                  >
                    {title}
                  </Link>
                ))}
              </div>
              <Link
                href="/#integrations"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/5"
              >
                Integrations
              </Link>
            </div>
            <div className="mt-4 border-t border-white/5 pt-4">
              {isLoaded && isSignedIn ? (
                <div className="space-y-2">
                  <SignOutButton>
                    <button className="block w-full rounded-full border border-white/10 px-4 py-2.5 text-center text-sm font-bold text-neutral-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400">
                      Log out
                    </button>
                  </SignOutButton>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/demo"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-full bg-brand-500 px-4 py-2.5 text-center text-sm font-bold text-white"
                  >
                    Request demo
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-full border border-white/10 px-4 py-2.5 text-center text-sm font-bold text-neutral-300 transition-colors hover:bg-white/5"
                  >
                    Sign in
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
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
