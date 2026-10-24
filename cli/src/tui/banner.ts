/**
 * Banner "AgentCloud" della schermata iniziale: arte a blocchi con ombra,
 * generata da funzioni PURE (nessun costo né side-effect al render).
 *
 * - Font solido a blocchi (█) disegnato a mano: solo le 10 lettere di
 *   "AGENTCLOUD" servono, due taglie (full ~70 colonne, mini ~55).
 * - L'ombra è una seconda passata scura: ogni cella fill proietta a +1
 *   colonna/+1 riga solo dove il bordo è esposto (niente rumore interno).
 * - Il fill trova il gradiente primario→primaryHi della palette a colonna
 *   per colonna (quantizzato a passi, così decrease spans e resta uguale a
 *   vista). Sotto truecolor l'arte si fa a tinta unita primary.
 * - < 60 colonne o senza Unicode: niente arte, testo semplice (non spezzato).
 *
 * Niente colori hardcoded: chi renderizza legge solo theme + colorLevel().
 */
import { theme, mixHex } from "./theme.js";

/** Cella dell'arte: fill (gradiente) o shadow (tinta scura). */
export type BannerCell = { ch: string; kind: "fill" | "shadow" };

export type BannerDesign = {
  /** Righe di celle; ogni riga è alta esattamente 1 terminale-riga. */
  rows: BannerCell[][];
  /** Larghezza visiva (colonne) della riga più lunga. */
  width: number;
};

/** Glifo a blocchi: '#' = pieno, '.' = vuoto. Tutte le righe stessa larghezza. */
type GlyphMap = Record<string, string[]>;

const FULL_GLYPHS: GlyphMap = {
  A: [".████.", "██..██", "██████", "██..██", "██..██", "██..██"],
  G: [".█████.", "██...██", "██.████", "██.████", "██...██", ".█████."],
  E: ["█████", "██...", "████.", "██...", "██...", "█████"],
  N: ["██..██", "███.██", "███.██", "██████", "██.███", "██..██"],
  T: ["█████", "..██.", "..██.", "..██.", "..██.", "..██."],
  C: [".█████", "██....", "██....", "██....", "██....", ".█████"],
  L: ["██...", "██...", "██...", "██...", "██...", "█████"],
  O: [".████.", "██..██", "██..██", "██..██", "██..██", ".████."],
  U: ["██..██", "██..██", "██..██", "██..██", "██..██", ".████."],
  D: [".█████", "██...██", "██...██", "██...██", "██...██", ".█████."],
};

/** Versione compatta: larghezza ~55, entra dai 60 colonne in su. */
const MINI_GLYPHS: GlyphMap = {
  A: [".██.", "█..█", "████", "█..█", "█..█", "█..█"],
  G: [".███.", "█...█", "█.███", "█.███", "█...█", ".███."],
  E: ["████", "█...", "███.", "█...", "█...", "████"],
  N: ["█..██", "██.██", "██.██", "█████", "█.███", "█..██"],
  T: ["████", ".█..", ".█..", ".█..", ".█..", ".█.."],
  C: [".████", "█....", "█....", "█....", "█....", ".████"],
  L: ["█...", "█...", "█...", "█...", "█...", "████"],
  O: [".██.", "█..█", "█..█", "█..█", "█..█", ".██."],
  U: ["█..█", "█..█", "█..█", "█..█", "█..█", ".██."],
  D: [".███.", "█...█", "█...█", "█...█", "█...█", ".███."],
};

/** Righe del glifo normalizzate alla larghezza del glifo stesso. */
export function normalizeGlyph(rows: string[]): string[] {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, ".").replace(/\./g, " "));
}

/** Composizione orizzontale dei glifi di `text` con gap tra lettere. */
function composeGlyphRows(font: GlyphMap, text: string, gap: number, height: number): string[] {
  const rows: string[] = Array.from({ length: height }, () => "");
  for (const ch of text) {
    const glyph = font[ch];
    if (!glyph) return [];
    for (let y = 0; y < height; y++) {
      rows[y] += (glyph[y] ?? "") + " ".repeat(gap);
    }
  }
  return rows.map((r) => r.replace(/ +$/, ""));
}

const isBlock = (c: string | undefined): boolean => c === "█";

/**
 * Passata d'ombra: aggiunge riga in basso e colonna a destra; la cella
 * (x,y) diventa shadow se (x-1,y-1) è fill, qui/ai lati di copertura è
 * vuoto (bordo esposto: l'ombra non sporca l'interno delle lettere).
 */
function applyShadow(rows: string[], width: number): BannerCell[][] {
  const height = rows.length + 1;
  const out: BannerCell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: BannerCell[] = [];
    for (let x = 0; x < width + 1; x++) {
      const fill = isBlock(rows[y]?.[x]);
      const diagFill = y > 0 && x > 0 && isBlock(rows[y - 1]?.[x - 1]);
      const occluded =
        (y > 0 && isBlock(rows[y - 1]?.[x])) || (x > 0 && isBlock(rows[y]?.[x - 1]));
      row.push(fill ? { ch: "█", kind: "fill" } : diagFill && !occluded ? { ch: "▒", kind: "shadow" } : { ch: " ", kind: "fill" });
    }
    out.push(row);
  }
  return out;
}

/** Design dell'arte in una delle due taglie. Ritorna null se un glifo manca. */
export function bannerDesign(scale: "full" | "mini", logo = "AGENTCLOUD"): BannerDesign | null {
  const font = scale === "full" ? FULL_GLYPHS : MINI_GLYPHS;
  for (const ch of logo) if (!font[ch]) return null;
  const rows = composeGlyphRows(font, logo, scale === "full" ? 1 : 1, 6);
  if (rows.some((r) => r === "")) return null;
  const width = Math.max(...rows.map((r) => r.length));
  if (width === 0) return null;
  // L'ombra sporge di 1 colonna a destra: la larghezza visiva la include.
  return { rows: applyShadow(rows, width), width: width + 1 };
}

/**
 * Che versione mostrare a una data larghezza di terminale:
 * - "full" con spazio abbondante (arte + margini);
 * - "mini" tra 60 e 73;
 * - "plain" sotto i 60 (testo semplice, mai spezzata).
 */
export function bannerVariant(columns: number): "full" | "mini" | "plain" {
  if (columns < 60) return "plain";
  if (columns >= 74) return "full";
  return "mini";
}

const GRADIENT_STEPS = 8;

/**
 * Colore del fill alla colonna x su un'arte larga `width`: gradiente
 * primario→primaryHi quantizzato a GRADIENT_STEPS passi (spans corti,
 * gradiente visivamente continuo). Puro.
 */
export function fillHexAt(x: number, width: number, steps = GRADIENT_STEPS): string {
  const t = width <= 1 ? 0 : Math.min(1, x / (width - 1));
  const q = Math.round(t * (steps - 1)) / (steps - 1);
  return mixHex(theme.primary, theme.primaryHi, q);
}
