/**
 * Tema unico della TUI AgentCloud: TUTTI i colori passano da qui.
 *
 * Per cambiare tema si toccano solo questi valori (al passo 4 `/theme`
 * leggerà da una mappa di temi con questa stessa forma).
 *
 * Palette dall'identità del progetto: primario = brand-500 del sito
 * (`--color-brand-500`), sfondo/testo attenuato/successo/avviso dagli stessi
 * toni della pagina `/cli/auth`.
 *
 * Rilevamento colori: Ink (via chalk/supports-color) degrada da solo
 * truecolor → 256 → 16 colori in base al terminale e rispetta `NO_COLOR`.
 * Qui dichiariamo sempre hex: nessuna logica di fallback sparsa nei
 * componenti.
 */
export type Theme = {
  primary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  success: string;
  error: string;
  warning: string;
  border: string;
};

export const agentCloudTheme: Theme = {
  primary: "#038BFE",
  accent: "#22D3EE",
  background: "#0A0A0F",
  text: "#F4F4F5",
  muted: "#9CA3AF",
  success: "#10B981",
  error: "#F87171",
  warning: "#FBBF24",
  border: "#27272A",
};

export const lightTheme: Theme = {
  // Su fondo bianco i toni chiari del dark spariscono: qui ogni colore è
  // scelto per un contrasto ≥ ~4.5:1 sul bianco (testo piccolo leggibile).
  // Il primario resta in famiglia brand (600 invece di 500).
  primary: "#026FCB",
  accent: "#0E7490",
  background: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  success: "#047857",
  error: "#DC2626",
  warning: "#B45309",
  border: "#D1D5DB",
};

/** Temi disponibili per `/theme`. L'oggetto `theme` resta l'unico import. */
export const themes: Record<string, Theme> = {
  dark: agentCloudTheme,
  light: lightTheme,
};

export function themeNames(): string[] {
  return Object.keys(themes);
}

/**
 * Cambia tema a runtime: sovrascrive l'oggetto live, i componenti lo
 * rileggono al render successivo (l'App forza un re-render). Ritorna false
 * se il nome non esiste.
 */
export function setTheme(name: string): boolean {
  const t = themes[name];
  if (!t) return false;
  Object.assign(theme, t);
  return true;
}

export function currentThemeName(): string {
  for (const [name, t] of Object.entries(themes)) {
    if (t.background === theme.background) return name;
  }
  return "dark";
}

export const theme: Theme = { ...agentCloudTheme };
