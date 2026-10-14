/**
 * Progetti: contenitori nominati per organizzare le chat (come i Projects di
 * Claude). Un progetto ha agenti predefiniti e istruzioni sempre incluse nel
 * contesto delle sue conversazioni.
 *
 * Storage locale (stessa scelta delle conversazioni in chat): niente backend
 * dedicato, niente costi. Le istruzioni viaggiano solo verso l'API (mai
 * salvate nei messaggi), così la cronologia resta pulita.
 */

export type Project = {
  id: string;
  name: string;
  /** Istruzioni di progetto, anteposte a ogni messaggio inviato all'API. */
  instructions?: string;
  /** Agenti predefiniti delle nuove chat del progetto. */
  agentSlugs: string[];
  created_at: string;
  updated_at: string;
};

const PROJECTS_KEY = "agentcloud_projects_v1";
const MAX_PROJECTS = 50;

export function generateProjectId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).substring(2, 15);
  }
}

function cleanName(name: string): string {
  return name.trim().slice(0, 80);
}

/** Legge i progetti (array vuoto fuori dal browser o su storage corrotto). */
export function readProjects(): Project[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is Project => !!p && typeof p === "object" && typeof (p as Project).id === "string")
      .map((p) => ({
        id: String((p as Project).id),
        name: cleanName(String((p as Project).name ?? "")) || "Senza nome",
        instructions: typeof (p as Project).instructions === "string" ? String((p as Project).instructions).slice(0, 4000) : undefined,
        agentSlugs: Array.isArray((p as Project).agentSlugs)
          ? (p as Project).agentSlugs.filter((s): s is string => typeof s === "string").slice(0, 10)
          : [],
        created_at: typeof (p as Project).created_at === "string" ? String((p as Project).created_at) : new Date().toISOString(),
        updated_at: typeof (p as Project).updated_at === "string" ? String((p as Project).updated_at) : new Date().toISOString(),
      }))
      .slice(0, MAX_PROJECTS);
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, MAX_PROJECTS)));
  } catch {
    // Storage pieno o non disponibile: i progetti restano in memoria.
  }
}

export function createProject(name: string, instructions?: string, agentSlugs: string[] = []): Project | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const now = new Date().toISOString();
  return {
    id: generateProjectId(),
    name: clean,
    instructions: instructions?.trim() ? instructions.trim().slice(0, 4000) : undefined,
    agentSlugs: agentSlugs.filter((s) => typeof s === "string" && s).slice(0, 10),
    created_at: now,
    updated_at: now,
  };
}

/**
 * Blocco istruzioni anteposto ai messaggi API delle conversazioni di progetto.
 * Solo API: non viene mai salvato nei messaggi né mostrato in chat.
 */
export function projectContextBlock(project: Project | null | undefined): string {
  if (!project) return "";
  const instructions = project.instructions?.trim();
  if (!instructions) return "";
  return `[Istruzioni del progetto "${project.name}"]\n${instructions}`;
}
