"use client";

/**
 * Menu account della sidebar (chat e dashboard).
 *
 * Struttura del menu (richiesta dal design):
 *   email
 *   Impostazioni (con scorciatoia di tastiera) | Lingua | Assistenza
 *   ───────────
 *   Cambia piano | Scarica app ed estensioni | Scopri di più >
 *   ───────────
 *   Esci
 *
 * "Lingua" e "Scopri di più" sono sotto-menu a espansione inline: cliccandoli
 * si apre la lista subito sotto, così il pannello resta sempre ancorato alla
 * sidebar e non serve calcolare la posizione di un pannello volante.
 *
 * Il menu è renderizzato in un portale su `document.body`: la sidebar ha
 * `overflow` nascosti, quindi un pannello posizionato dentro verrebbe
 * tagliato.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AppWindow,
  Check,
  ChevronRight,
  CircleArrowUp,
  CircleHelp,
  Info,
  Languages,
  LogOut,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "./LanguageProvider";
import { useKeyboardShortcuts } from "./KeyboardShortcutsProvider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/constants";

export type AccountMenuProps = {
  /** Email mostrata nell'intestazione del menu. */
  email: string;
  /** Avatar (URL già ridotto) mostrato nel bottone della sidebar. */
  avatarUrl?: string | null;
  /** Nome o email usata per le iniziali quando l'utente non ha un avatar. */
  labelBase?: string;
  /** Tooltip del bottone (nome + email). */
  tooltip?: string | null;
  /** Larghezza corrente della sidebar, per posizionare il menu di fianco. */
  sidebarWidth?: number;
  /** true su desktop: è lì che la larghezza dinamica ha senso. */
  isDesktop?: boolean;
  /** Stato controllato (opzionale): se passato, il menu lo governa il genitore. */
  open?: boolean;
  /** Notifica apertura/chiusura (usato dalla chat per lo stato del menu). */
  onOpenChange?: (open: boolean) => void;
};

export default function AccountMenu({
  email,
  avatarUrl = null,
  labelBase = "",
  tooltip = null,
  sidebarWidth,
  isDesktop = false,
  open: openProp,
  onOpenChange,
}: AccountMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { dict, locale, setLocale } = useLanguage();
  const { openShortcuts } = useKeyboardShortcuts();

  // Comportamento controllato se il padre passa `open`, altrimenti autonomo.
  const open = openProp ?? internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      setInternalOpen(next);
      if (!next) {
        setLangOpen(false);
        setMoreOpen(false);
      }
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  // La scorciatoia cambia con il sistema operativo: su macOS è ⌘⇧.
  // (Il rendering lato server non ha `navigator`: lì resta la forma PC, e la
  // differenza viene silenziata con suppressHydrationWarning.)
  const [isMac] = useState(
    () => typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent),
  );
  const shortcut = isMac ? "⌘⇧," : "Ctrl+Shift+,";
  const shortcutsShortcut = isMac ? "⌘/" : "Ctrl+/";

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);

  // Escape chiude il menu (e i sotto-menu aperti).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const initials =
    labelBase
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s: string) => s[0]?.toUpperCase())
      .join("") || "?";

  const itemBase =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-neutral-200 transition-colors hover:bg-white/[0.07] hover:text-white";
  const iconBase = "shrink-0 text-neutral-400";

  // "Scopri di più": link alle informazioni sul servizio. Le ancore
  // corrispondono alle sezioni generate da src/app/{privacy,terms}/page.tsx
  // (id="sezione-N").
  const learnMoreItems = [
    { href: "/#chi-siamo", label: dict.accountMenu.about },
    { href: "/terms#sezione-7", label: dict.accountMenu.usagePolicy },
    { href: "/privacy", label: dict.accountMenu.privacyPolicy },
    { href: "/terms", label: dict.accountMenu.termsOfService },
    { href: "/privacy#sezione-8", label: dict.accountMenu.privacyChoices },
  ];

  return (
    <>
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        title={tooltip ?? undefined}
        className="w-full flex items-center gap-2.5 rounded-2xl p-2 hover:bg-white/[0.05] transition-all"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 text-xs font-bold text-brand-300 shrink-0 overflow-hidden ring-2 ring-white/[0.06]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : labelBase ? (
            initials
          ) : (
            <span className="animate-pulse">...</span>
          )}
        </div>
        <p className="min-w-0 flex-1 truncate text-left text-sm font-bold text-white">
          {email || "..."}
        </p>
      </button>

      {open &&
        createPortal(
          <>
            <button
              type="button"
              aria-label={dict.chat.close}
              tabIndex={-1}
              onClick={close}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              role="menu"
              style={isDesktop && sidebarWidth ? { left: sidebarWidth + 12 } : undefined}
              className="fixed z-50 w-72 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-1.5 shadow-2xl shadow-black/60 left-[268px] bottom-4 max-lg:left-4 max-lg:right-4 max-lg:w-auto max-lg:bottom-28"
            >
              <div className="px-2.5 py-2">
                <p
                  className="truncate text-xs font-semibold text-neutral-300"
                  title={tooltip ?? undefined}
                >
                  {email || "..."}
                </p>
              </div>

              <Link
                href="/settings"
                role="menuitem"
                onClick={close}
                className={itemBase}
              >
                <Settings size={15} className={iconBase} aria-hidden />
                <span className="flex-1 truncate">{dict.accountMenu.settings}</span>
                <span
                  className="ml-auto shrink-0 font-mono text-[11px] font-medium text-neutral-500"
                  suppressHydrationWarning
                >
                  {shortcut}
                </span>
              </Link>

              <button
                type="button"
                role="menuitem"
                aria-expanded={langOpen}
                onClick={() => {
                  setLangOpen((v) => !v);
                  setMoreOpen(false);
                }}
                className={itemBase}
              >
                <Languages size={15} className={iconBase} aria-hidden />
                <span className="flex-1 truncate">{dict.accountMenu.language}</span>
              </button>
              {langOpen && (
                <div className="mb-1 ml-7 border-l border-white/[0.08] pl-1.5">
                  {LOCALES.map((code) => {
                    const isActive = locale === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        onClick={() => {
                          setLocale(code);
                          close();
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-semibold transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-neutral-400 hover:bg-white/[0.07] hover:text-white"
                        }`}
                      >
                        <span className="truncate">{LOCALE_LABELS[code].long}</span>
                        {isActive && (
                          <Check size={14} className="shrink-0 text-brand-300" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <Link
                href="/contact"
                role="menuitem"
                onClick={close}
                className={itemBase}
              >
                <CircleHelp size={15} className={iconBase} aria-hidden />
                <span className="flex-1 truncate">{dict.accountMenu.support}</span>
              </Link>

              <div className="my-1 h-px bg-white/[0.08]" />

              <Link
                href="/dashboard/subscriptions"
                role="menuitem"
                onClick={close}
                className={itemBase}
              >
                <CircleArrowUp size={15} className={iconBase} aria-hidden />
                <span className="flex-1 truncate">{dict.accountMenu.changePlan}</span>
              </Link>

              <Link
                href="/apps"
                role="menuitem"
                onClick={close}
                className={itemBase}
              >
                <AppWindow size={15} className={iconBase} aria-hidden />
                <span className="flex-1 truncate">{dict.accountMenu.downloadApp}</span>
              </Link>

              <button
                type="button"
                role="menuitem"
                aria-expanded={moreOpen}
                onClick={() => {
                  setMoreOpen((v) => !v);
                  setLangOpen(false);
                }}
                className={itemBase}
              >
                <Info size={15} className={iconBase} aria-hidden />
                <span className="flex-1 truncate">{dict.accountMenu.learnMore}</span>
                <ChevronRight
                  size={15}
                  aria-hidden
                  className={`ml-auto shrink-0 text-neutral-500 transition-transform ${
                    moreOpen ? "rotate-90" : ""
                  }`}
                />
              </button>
              {moreOpen && (
                <div className="mb-1 ml-6 border-l border-white/[0.08] pl-1.5">
                  {learnMoreItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={close}
                      className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] font-semibold text-neutral-400 transition-colors hover:bg-white/[0.07] hover:text-white"
                    >
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                  <div className="my-1 h-px bg-white/[0.08]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      openShortcuts();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-semibold text-neutral-400 transition-colors hover:bg-white/[0.07] hover:text-white"
                  >
                    <span className="flex-1 truncate">{dict.accountMenu.keyboardShortcuts}</span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] font-medium text-neutral-500">
                      {shortcutsShortcut}
                    </span>
                  </button>
                </div>
              )}

              <div className="my-1 h-px bg-white/[0.08]" />

              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  close();
                  try {
                    await createClient().auth.signOut();
                  } catch {}
                  window.location.replace("/login");
                }}
                className="flex w-full items-center gap-2.5 rounded-lg bg-white/[0.06] px-2.5 py-2 text-left text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.12]"
              >
                <LogOut size={15} className="shrink-0 text-neutral-300" aria-hidden />
                <span className="flex-1 truncate">{dict.accountMenu.signOut}</span>
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
