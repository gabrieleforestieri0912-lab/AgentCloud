"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, Globe } from "lucide-react";
import Image from "next/image";
import AgentIcon from "./AgentIcon";
import { AVAILABLE_AGENTS, localizeAgent, type Agent } from "@/lib/agents";
import { useLanguage } from "./LanguageProvider";

type MobileNavProps = {
  marketplaceAgents?: Agent[];
};

export default function MobileNav({ marketplaceAgents }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { locale, setLocale, dict } = useLanguage();

  const agents = (marketplaceAgents ?? AVAILABLE_AGENTS).map((agent) =>
    localizeAgent(agent, locale),
  );

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
    setActiveSection(null);
  }, []);

  // Prevent body scroll when menu is open
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
      children: agents.slice(0, 6).map((agent) => ({
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
      href: "/#integrations",
    },
  ];

  const toggleSection = (id: string) => {
    setActiveSection(activeSection === id ? null : id);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-neutral-400 md:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Menu panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-neutral-950 border-l border-white/10 md:hidden overflow-y-auto"
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
                  className="p-2 text-neutral-400 hover:text-white"
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
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
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

              {/* Language switcher */}
              <div className="border-t border-white/10 p-4">
                <button
                  onClick={() => setLocale(locale === "it" ? "en" : "it")}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-neutral-300 transition-colors hover:bg-white/5"
                >
                  <Globe size={16} className="text-brand-400" />
                  {locale === "it" ? "Italiano" : "English"}
                </button>
              </div>

              {/* Auth buttons */}
              <div className="border-t border-white/10 p-4 space-y-3">
                <Link
                  href="/demo"
                  onClick={() => setIsOpen(false)}
                  className="block w-full rounded-full bg-brand-500 px-4 py-3 text-center text-sm font-bold text-white"
                >
                  {dict.navbar.requestDemo}
                </Link>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full rounded-full border border-white/10 px-4 py-3 text-center text-sm font-bold text-neutral-300 transition-colors hover:bg-white/5"
                >
                  {dict.navbar.signIn}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
