"use client";

/**
 * Shell delle impostazioni/account: incornicia le pagine di configurazione nel
 * DashboardShell (stessa sidebar di dashboard e chat) e aggiunge una navigazione
 * interna per categorie. Le voci portano alle sezioni in pagina (#anchor) o alla
 * pagina dell'area riservata (/account/developer).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  CreditCard,
  Plug,
  Shield,
  KeyRound,
  Settings,
  Trash2,
} from "lucide-react";
import type { AccountIdentity } from "@/lib/account-identity";
import DashboardShell from "./DashboardShell";
import { useLanguage } from "./LanguageProvider";

type Item = {
  id: string;
  /** Pagina dedicata: il link punta alla rotta invece che all'ancora. */
  route?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  labelKey: "navProfile" | "navPlan" | "navConnections" | "navSecurity" | "navApi" | "navPreferences" | "navDanger";
};

const ITEMS: Item[] = [
  { id: "profile", icon: User, labelKey: "navProfile" },
  { id: "plan", icon: CreditCard, labelKey: "navPlan" },
  { id: "connections", icon: Plug, labelKey: "navConnections" },
  { id: "security", icon: Shield, labelKey: "navSecurity" },
  { id: "developer", route: "/account/developer", icon: KeyRound, labelKey: "navApi" },
  { id: "preferences", icon: Settings, labelKey: "navPreferences" },
  { id: "danger", icon: Trash2, labelKey: "navDanger" },
];

export default function SettingsShell({
  children,
  email,
  account = null,
}: {
  children: React.ReactNode;
  email: string;
  /** Identità risolta lato server, per la sidebar dell'app. */
  account?: AccountIdentity | null;
}) {
  const { dict } = useLanguage();
  const pathname = usePathname();
  const onDeveloperPage = pathname.startsWith("/account/developer");
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);

  // Scroll-spy: evidenzia la categoria della sezione visibile in pagina.
  // Nella pagina riservata la voce "Token e API key" è semplicemente attiva.
  useEffect(() => {
    // La pagina riservata non dipende dallo scroll-spy: la voce attiva è
    // dedotta dal pathname (vedi `active` più sotto).
    if (onDeveloperPage) return;
    const entries = ITEMS.filter((i) => !i.route)
      .map((i) => [i.id, document.getElementById(i.id)] as const)
      .filter(([, el]) => el !== null);
    if (entries.length === 0) return;
    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (entry.isIntersecting) setActiveAnchor(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    for (const [, el] of entries) observer.observe(el!);
    return () => observer.disconnect();
  }, [onDeveloperPage, dict.accountPage]);

  function hrefFor(item: Item) {
    if (item.route) return item.route;
    return onDeveloperPage ? `/account#${item.id}` : `#${item.id}`;
  }

  const active = onDeveloperPage ? "developer" : activeAnchor;

  return (
    <DashboardShell email={email} account={account}>
      <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:gap-10">
          {/* Sidebar categoria — desktop: colonna sticky; mobile: pill orizzontali */}
          <aside className="lg:w-56 lg:shrink-0">
            <nav
              aria-label={dict.accountPage.settingsTitle}
              className="lg:sticky lg:top-8"
            >
              {/* Mobile */}
              <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
                {ITEMS.map(({ id, route, icon: Icon, labelKey }) => (
                  <Link
                    key={id}
                    href={onDeveloperPage && !route ? `/account#${id}` : route ?? `#${id}`}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                      active === id
                        ? "border-white/[0.08] bg-white/[0.06] text-white"
                        : "border-white/5 bg-neutral-900 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Icon size={13} />
                    {dict.accountPage[labelKey]}
                  </Link>
                ))}
              </div>
              {/* Desktop */}
              <ul className="hidden space-y-0.5 lg:block">
                <li className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  {dict.accountPage.settingsTitle}
                </li>
                {ITEMS.map(({ id, route, icon: Icon, labelKey }) => (
                  <li key={id}>
                    <Link
                      href={hrefFor({ id, labelKey, icon: Icon, route })}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                        active === id
                          ? "bg-white/[0.06] text-white"
                          : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <Icon size={14} className={active === id ? "text-brand-400" : ""} />
                      {dict.accountPage[labelKey]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </section>
    </DashboardShell>
  );
}
