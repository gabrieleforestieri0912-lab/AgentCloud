/**
 * Raccomandazione agenti per il setup guidato — modulo PURO e deterministico.
 *
 * Perché è separato: lo scoring è una decisione di prodotto che va testata
 * senza Supabase, React né bundler. Niente import runtime (i tipi di catalogo
 * arrivano da `import type`, che il compilatore cancella): tutto ciò che serve
 * entra come parametro.
 *
 * Formula (pochi punti, leggibile e raccontabile):
 *   +3  la categoria dell'agente combacia con un obiettivo scelto (schermata 4)
 *   +2  almeno una integrazione dell'agente coincide con un tool scelto (scht. 5)
 *   +1  il ruolo dell'utente è tra i ruoli tipici dell'agente (AGENT_ROLE_FIT)
 *
 * A parità di punti: prima chi è già posseduto, poi chi costa meno, poi slug —
 * così la lista non cambia tra un render e il successivo.
 *
 * Fallback: se NESSUN agente raccoglie punti (es. chi studia, con obiettivi
 * poco incrociati) NON si mostra mai una lista vuota: si parte da un ordine
 * di preferenza di agenti versatili/popolari filtrato sul pool online.
 */

import {
  AGENT_ROLE_FIT,
  GOAL_CATEGORY,
  POPULAR_PREFERENCE,
  STUDENT_PREFERENCE,
  toolLabel,
} from "./constants";
import type { GoalId } from "./constants";

export type RecommendCandidate = {
  slug: string;
  category: string;
  /** Prezzo in cent: usato come tie-breaker "prima i più economici". */
  priceCents: number;
  /** Nomi canonici (inglese) delle integrazioni dell'agente, come nel
   *  catalogo: `Gmail`, `Google Calendar`, `Slack`, … */
  integrations: readonly string[];
};

export type RecommendInput = {
  agents: readonly RecommendCandidate[];
  /** Agenti online (feature flag): il pool consigliato insieme ai posseduti. */
  eligibleSlugs: readonly string[];
  /** Agenti già installati (user_agents): negli ex aequo precedono. */
  ownedSlugs?: readonly string[];
  /** Id degli obiettivi scelti (schermata 4). */
  goals?: readonly string[];
  /** Id dei tool scelti (schermata 5). */
  tools?: readonly string[];
  /** Id del ruolo (schermata 3). Chi studia non ha ruolo: il punteggio resta
   *  su obiettivi+tool, e se tutto resta a zero entra il fallback. */
  role?: string | null;
  occupation?: string | null;
};

export type AgentScore = { slug: string; score: number };

/** Quanti agenti consigliati in schermata 7 (il task chiede 3-4). */
export const TOP_N = 4;

/**
 * Punteggio di un solo agente, dato l'input normalizzato. Esportato per i
 * test: è la funzione da cui tutto il resto deriva.
 */
export function scoreAgent(
  agent: RecommendCandidate,
  matches: {
    goalCategories?: readonly string[];
    toolLabels?: readonly string[];
    role?: string | null;
  },
): number {
  let score = 0;
  if (matches.goalCategories?.includes(agent.category)) score += 3;
  // Il tool non è un feature match al centesimo: basta UNA integrazione
  // corrisponduta a segnalare che l'agente parla con il mondo dell'utente.
  if (matches.toolLabels?.length && agent.integrations.some((i) => matches.toolLabels?.includes(i))) {
    score += 2;
  }
  const roles = AGENT_ROLE_FIT[agent.slug];
  if (matches.role && roles?.some((r) => r === matches.role)) score += 1;
  return score;
}

/**
 * Punteggio di TUTTI i candidati, già ordinati (punti ↓, posseduto ↑,
 * prezzo ↑, slug ↑). Solo agenti online o posseduti: un "coming soon" non è
 * consigliabile.
 */
export function scoreAgents(input: RecommendInput): AgentScore[] {
  const goalCategories = (input.goals ?? [])
    .map((goal) => GOAL_CATEGORY[goal as GoalId])
    .filter((category): category is string => Boolean(category));
  const toolLabels = (input.tools ?? [])
    .map((toolId) => toolLabel(toolId))
    .filter((label): label is string => Boolean(label));
  const role = input.role ?? null;

  const eligible = new Set(input.eligibleSlugs);
  const owned = new Set(input.ownedSlugs ?? []);
  const bySlug = new Map(input.agents.map((a) => [a.slug, a]));

  const results: AgentScore[] = [];
  for (const agent of input.agents) {
    if (!eligible.has(agent.slug) && !owned.has(agent.slug)) continue;
    results.push({
      slug: agent.slug,
      score: scoreAgent(agent, { goalCategories, toolLabels, role }),
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aOwned = owned.has(a.slug) ? 1 : 0;
    const bOwned = owned.has(b.slug) ? 1 : 0;
    if (aOwned !== bOwned) return bOwned - aOwned;
    const priceA = bySlug.get(a.slug)?.priceCents ?? 0;
    const priceB = bySlug.get(b.slug)?.priceCents ?? 0;
    if (priceA !== priceB) return priceA - priceB;
    return a.slug.localeCompare(b.slug);
  });

  return results;
}

/**
 * La lista corta da mostrare (max TOP_N). Governo del caso "zero punti":
 * al posto di una lista vuota (o di agenti casuali) si usa un ordine di
 * prestigio — POPULAR o STUDENT se l'utente studia/esplora — filtrato sul
 * pool online. Gli agenti con punteggio 0 non vanno "accanto" a quelli
 * scelti meglio: o sono consigliati, o non lo sono.
 */
export function recommendAgents(input: RecommendInput): AgentScore[] {
  const all = scoreAgents(input);
  const eligible = new Set(input.eligibleSlugs);

  if (all.some((entry) => entry.score > 0)) {
    return all.filter((entry) => entry.score > 0).slice(0, TOP_N);
  }

  // Fallback: solo agenti online, nell'ordine di prezio preferita; se il
  // pool online blocca quelli preferiti si riempe con il resto (stesso
  // ordine di scoreAgents, stabile).
  const preference =
    input.occupation === "student" || input.occupation === "exploring"
      ? STUDENT_PREFERENCE
      : POPULAR_PREFERENCE;
  const online = all.filter((entry) => eligible.has(entry.slug));
  const preferred = preference
    .map((slug) => online.find((entry) => entry.slug === slug))
    .filter((entry): entry is AgentScore => Boolean(entry));
  const rest = online.filter((entry) => !preferred.includes(entry));
  return [...preferred, ...rest].slice(0, TOP_N);
}
