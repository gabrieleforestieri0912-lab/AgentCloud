"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
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
 * a setter that persists the choice in a cookie and updates the React context
 * immediately, so the UI switches language in place with no server round-trip.
 * The cookie keeps the choice for server-rendered pages on the next navigation.
 */
export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    },
    [],
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
