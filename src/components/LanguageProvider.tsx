"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/constants";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: Dictionary;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Provides the active locale (read from the cookie by the server layout) and
 * a setter that switches the language in place, with no page reload and no
 * state loss:
 *
 * 1. The React context updates immediately, so every client component
 *    (navbars, hero, chat, forms…) re-renders in the new language at once.
 * 2. The choice is persisted in a cookie.
 * 3. A debounced `router.refresh()` re-fetches the server components of the
 *    current route in the background, so content rendered on the server
 *    (page headings, legal pages, agent pages…) catches up in the new
 *    language. It is a soft in-place refresh — not a full page reload — and
 *    rapid toggling is coalesced into a single refresh.
 */
export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // Coalesce rapid toggling into a single background refresh.
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 200);
    },
    [router],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, dict: getDictionary(locale) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
