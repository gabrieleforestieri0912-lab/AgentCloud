/**
 * Validazione dell'input del setup guidato — modulo PURO (equivalente zod).
 *
 * Perché esiste: il body arriva da /api/user/setup e NON dobbiamo fidarci.
 * Zod non è tra le dipendenze del progetto e aggiungerlo solo per questo
 * endpoint peserebbe nel bundle per niente: le funzioni qui sotto fanno la
 * stessa cosa (normalizza o scarta) in tipi TS, riutilizzati anche dal client
 * per non avere due regole diverse.
 *
 * Convenzione: `normalizePatch` non lancia MAI — scarta i valori invalidi e
 * ritorna solo ciò che è corretto. Un input malefformo produce quindi un
 * merge parziale, mai un 500: è il comportamento richiesto ("l'utente non
 * perde mai le risposte già date").
 */

import {
  FREE_TEXT_MAX,
  GOALS,
  LANGUAGES,
  NAME_MAX,
  OCCUPATIONS,
  ROLES,
  STUDY_LEVELS,
  TONES,
  TOOL_IDS,
  type OnboardingPatch,
} from "./constants";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** Lista di string piccole (goal/tool): dedup, solo valori conosciuti, tetto
 *  difensivo (GOALS_MAX element + margine per tools). */
function cleanList(value: unknown, allowed: readonly string[], max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !allowed.includes(item)) continue;
    if (!out.includes(item)) out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

const PATCH_KEYS = [
  "displayName",
  "occupation",
  "occupationOther",
  "role",
  "roleOther",
  "studyLevel",
  "studyArea",
  "goals",
  "tools",
  "tone",
  "language",
  "defaultAgentSlug",
] as const;

export type PatchKey = (typeof PATCH_KEYS)[number];

/**
 * Normalizza un patch: chiavi sconosciute scartate, valori puliti o di fait.
 * `defaultAgentSlug` ammette stringhe libere (slug dell'agente: la validità
 * *reale* la verifica l'API col catalogo runtime, qui ci protegge solo da
 * attacchi di lunghezza/garbage).
 */
export function normalizePatch(input: unknown): OnboardingPatch {
  if (!isObject(input)) return {};
  const out: OnboardingPatch = {};

  const displayName = cleanText(input.displayName, NAME_MAX);
  if (displayName !== null) out.displayName = displayName;

  const occupation = oneOf(input.occupation, OCCUPATIONS);
  if (occupation) out.occupation = occupation;

  const occupationOther = cleanText(input.occupationOther, FREE_TEXT_MAX);
  if (occupationOther !== null) out.occupationOther = occupationOther;

  const role = oneOf(input.role, ROLES);
  if (role) out.role = role;
  // "other" non è tra i ROLES fissi: arriva come stringa nel campo libero.
  if (typeof input.role === "string" && !role) {
    const roleOther = cleanText(input.roleOther, FREE_TEXT_MAX);
    if (roleOther !== null) out.roleOther = roleOther;
  }

  const studyLevel = oneOf(input.studyLevel, STUDY_LEVELS);
  if (studyLevel) out.studyLevel = studyLevel;

  const studyArea = cleanText(input.studyArea, FREE_TEXT_MAX);
  if (studyArea !== null) out.studyArea = studyArea;

  const goals = cleanList(input.goals, GOALS, 3);
  if (goals.length > 0) out.goals = goals as OnboardingPatch["goals"];

  const tools = cleanList(input.tools, TOOL_IDS, 10);
  if (tools.length > 0) out.tools = tools as OnboardingPatch["tools"];

  const tone = oneOf(input.tone, TONES);
  if (tone) out.tone = tone;

  const language = oneOf(input.language, LANGUAGES);
  if (language) out.language = language;

  const defaultAgentSlug = cleanText(input.defaultAgentSlug, FREE_TEXT_MAX);
  if (defaultAgentSlug !== null) out.defaultAgentSlug = defaultAgentSlug;

  return out;
}

/** Le chiavi di patch realmente valide (serve alla risposta API per dire cosa
 *  è stato accettato). */
export function patchKeys(patch: OnboardingPatch): PatchKey[] {
  return PATCH_KEYS.filter((key) => key in patch);
}
