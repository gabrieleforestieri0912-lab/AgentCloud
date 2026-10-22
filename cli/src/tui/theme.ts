/**
 * Tema unico della TUI AgentCloud: TUTTI i colori passano da qui.
 *
 * Palette estratta dal sito (`src/app/globals.css`, Tailwind v4 `@theme`):
 * i valori qui sotto NON sono inventati, corrispondono ai token reali:
 *   primary   = --color-brand-500  (#038BFE) — colore primario del sito
 *   primaryHi = --color-brand-400  (#2EA3FF) — puntata chiara del gradiente
 *   highest   = --color-brand-300  (#5CB8FF) — più chiara, per accenti inline
 *   background = themeColor del sito (#0A0A0F, vedi src/app/layout.tsx)
 *   panel     = pannello card del sito (#13131A usato in /cli/auth)
 *   muted     = grigio secondario sito (neutral-400 #8E8FA4)
 *   success   = verde "Online/Active" (#10B981, usato in /cli/auth)
 *   error     = rosso errori sito (red-400 #F87171)
 *   warning   = ambra warning sito (amber-500/amber-300 #FBBF24)
 *
 * Degradazione colore: per i componenti Ink stampiamo sempre hex, è chalk
 * (dipendenza di Ink) a degradare truecolor → 256 → 16 in base al terminale e
 * a rispettare `NO_COLOR`. Per le scritture dirette di escape (gradiente del
 * logo) usa `colorLevel()` / `gradient()` qui sotto, che replicano la stessa
 * logica: truecolor se supportato, altrimenti colore piatto del tema.
 */
export type Theme = {
  primary: string;
  primaryHi: string;
  accent: string;
  background: string;
  panel: string;
  text: string;
  muted: string;
  success: string;
  error: string;
  warning: string;
  border: string;
  /**
   * Sfondo pieno della voce selezionata (stile OpenCode): il riempimento
   * è il colore brand, il testo sopra diventa bianco.
   */
  selectBg: string;
  selectFg: string;
  /** Sfondo pieno dei pannelli (input, riquadri di output). */
  panelBg: string;
  /** Sfondo pieno dei badge piccoli (nome agente, stato connessione). */
  chipBg: string;
  chipFg: string;
};

export const agentCloudTheme: Theme = {
  primary: "#038BFE",
  primaryHi: "#2EA3FF",
  accent: "#5CB8FF",
  background: "#0A0A0F",
  panel: "#13131A",
  text: "#F4F4F5",
  muted: "#8E8FA4",
  success: "#10B981",
  error: "#F87171",
  warning: "#FBBF24",
  border: "#27272A",
  // Stile "a riempimento": la selezione è un blocco brand pieno, i pannelli
  // hanno uno sfondo proprio e i badge sono chip scuri con testo colorato.
  selectBg: "#038BFE",
  selectFg: "#FFFFFF",
  panelBg: "#15151D",
  chipBg: "#10304F",
  chipFg: "#7CC4FF",
};

/** Temi disponibili per `/theme`. Oggi solo dark: il chiaro arriverà quando
 *  anche il sito lo supporterà davvero (ora produrrebbe testo illeggibile). */
export const themes: Record<string, Theme> = {
  dark: agentCloudTheme,
};

export function themeNames(): string[] {
  return Object.keys(themes);
}

/** Livello colore rilevato: 0 = niente colore, 1 = 16, 2 = 256, 3 = truecolor. */
export function colorLevel(): 0 | 1 | 2 | 3 {
  if (process.env.NO_COLOR) return 0;
  if (process.env.TERM === "dumb" && !process.env.FORCE_COLOR) return 0;
  const force = Number.parseInt(process.env.FORCE_COLOR || "", 10);
  if (Number.isInteger(force)) return Math.max(0, Math.min(3, force)) as 0 | 1 | 2 | 3;
  const colorterm = (process.env.COLORTERM || "").toLowerCase();
  if (colorterm === "truecolor" || colorterm === "24bit") return 3;
  const term = (process.env.TERM || "").toLowerCase();
  if (term.includes("direct") || term.includes("truecolor")) return 3;
  if (!process.stdout.isTTY && !colorterm && !term) return 0;
  if (term.includes("256") || process.env.WT_SESSION || process.env.TERMINAL_EMULATOR) return 2;
  // Windows Terminal e i moderni Windows 11 supportano truecolor ma non sempre
  // dichiarano COLORTERM: WT_SESSION è il marker affidabile (gestito sopra).
  return term ? 1 : 0;
}

/**
 * Escape SGR per un hex, compilato una volta al livello rilevato. Con
 * truecolor produce 38;2;R;G;B. Sotto truecolor ritorna undefined: chi
 * disegna sfumature ripiega su un colore piatto del tema (nessun mosaico
 * brutto fornito da quantizzazioni fai-da-te).
 */
function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function trueColor(hex: string): string {
  if (colorLevel() < 3) return "";
  const [r, g, b] = hexToRgb(hex);
  return `38;2;${r};${g};${b}`;
}

/**
 * Gradiente riga-per-carattere primario→primaryHi (brand), come array di hex
 * (per i componenti Ink). Con livelli < truecolor ritorna null: chi usa la
 * funzione renderizza con il colore piatto del tema — quantizzare hex a 256
 * a mano produce mosaici brutti, meglio una tinta unita.
 */
export function gradientHexes(text: string, from = agentCloudTheme.primary, to = agentCloudTheme.primaryHi): string[] | null {
  if (colorLevel() < 3 || text.length === 0) return null;
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const t = text.length === 1 ? 0 : i / (text.length - 1);
    const to2 = (n1: number, n2: number) => Math.round(n1 + (n2 - n1) * t);
    out.push("#" + [to2(r1, r2), to2(g1, g2), to2(b1, b2)].map((n) => n.toString(16).padStart(2, "0")).join(""));
  }
  return out;
}

/**
 * Codici SGR raw (38;2;R;G;B) per scritture dirette di escape fuori da Ink.
 * Con livelli < truecolor ritorna null (usare il colore piatto del tema).
 */
export function gradientRow(text: string, from = agentCloudTheme.primary, to = agentCloudTheme.primaryHi): string[] | null {
  if (colorLevel() < 3 || text.length === 0) return null;
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const codes: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const t = text.length === 1 ? 0 : i / (text.length - 1);
    codes.push(`38;2;${Math.round(r1 + (r2 - r1) * t)};${Math.round(g1 + (g2 - g1) * t)};${Math.round(b1 + (b2 - b1) * t)}`);
  }
  return codes;
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
