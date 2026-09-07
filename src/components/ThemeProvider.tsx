"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "agentcloud_theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.setAttribute("data-theme", resolved);
  // For Tailwind dark mode class strategy we also toggle "dark" class; light = no dark
  // Keep both for CSS overrides
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (s === "light" || s === "dark" || s === "system") return s;
    }
    return "dark";
  });
  const [resolved, setResolved] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const s = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
      if (s === "system") return getSystemTheme();
      if (s === "light" || s === "dark") return s;
    }
    return "dark";
  });

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
    const valid: Theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "dark";
    setThemeState(valid);
    const r = valid === "system" ? getSystemTheme() : valid;
    setResolved(r);
    applyTheme(valid);
    // Listen system changes when in system mode
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (valid === "system" || localStorage.getItem(STORAGE_KEY) === "system") {
        const sys = mql.matches ? "light" : "dark";
        setResolved(sys);
        applyTheme("system");
      }
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    const r = next === "system" ? getSystemTheme() : next;
    setResolved(r);
    applyTheme(next);
  }, []);

  // Re-apply on theme state change (for system toggling)
  useEffect(() => {
    applyTheme(theme);
    setResolved(theme === "system" ? getSystemTheme() : theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}


