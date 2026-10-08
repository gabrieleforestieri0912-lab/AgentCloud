/**
 * Runtime delle Competenze: cosa dell'array di skill arriva davvero al modello.
 *
 * Progressive disclosure: al caricamento della chat l'agente vede SOLO nome e
 * descrizione delle skill abilitate. Il corpo della SKILL.md viene caricato on
 * demand quando la descrizione corrisponde alla richiesta. In pratica, il
 * contesto del modello contiene l'indice delle competenze; se ne carica una, il
 * corpo finisce nel contesto del turno successivo (che è la tecnica usata da
 * Claude Skills).
 *
 * Perché una skill non può MAI ampliare i permessi: `filterSkillsByAgent`
 * interseca i permessi dichiarati dalla skill con quelli effettivamente
 * disponibili all'agente (derivati dai tool abilitati). Una skill che chiede
 * `send:email` su un agente senza tool di posta viene degradata, non eseguita.
 */

import { getCatalogSkill, type SkillEntry, type SkillRisk } from "./catalog";

/** Permesso minimo che ogni skill dichiara. */
const BASE_PERMISSION = "read:context";

/** Una competenza pronta per il prompt. */
export type RuntimeSkill = {
  slug: string;
  name: string;
  description: string;
  risk: SkillRisk;
  permissions: string[];
  /** true se il corpo della SKILL.md è stato iniettato in questo turno. */
  loaded: boolean;
  /** true se un permesso richiesto non è disponibile all'agente. */
  degraded: boolean;
  source: "official" | "user";
};

export type SkillIndexEntry = {
  slug: string;
  name: string;
  description: string;
  risk: SkillRisk;
};

/**
 * Indice delle competenze per il system prompt.
 *
 * È l'unico blocco di competenze sempre presente: nome + descrizione +
 * rischio. Nient'altro, così il costo in token è proporzionato al numero di
 * skill e non al loro contenuto.
 */
export function buildSkillIndex(skills: RuntimeSkill[]): string {
  if (skills.length === 0) return "";
  const lines = [
    "## Available skills (progressive disclosure)",
    "",
    "You have the following skills installed. You see ONLY the name and description of each one.",
    "When the user's request matches a description, load that skill's full instructions",
    "before answering, then follow them exactly. Do not load a skill that does not match.",
    "A skill never grants access you do not have: it can only use the tools already available to you.",
    "If a skill is marked degraded, part of its instructions cannot be executed with your current",
    "connections: do what is possible and state plainly what is missing.",
    "",
  ];
  for (const skill of skills) {
    const flags = [
      `risk=${skill.risk}`,
      skill.degraded ? "degraded" : null,
      `source=${skill.source}`,
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(`- \`${skill.slug}\` (${flags}) — ${skill.name}: ${skill.description}`);
  }
  return lines.join("\n");
}

/**
 * Blocchi delle skill caricate in questo turno.
 *
 * Il corpo è il Markdown della SKILL.md, che entra nel contesto come risposta
 * dell'utente per avere la precedenza sull'istruzione di sistema (è il modo in
 * cui il modello tratta il contenuto fornito nel turno, non una direzione).
 */
export function buildLoadedSkillsBlock(skills: RuntimeSkill[]): string {
  const loaded = skills.filter((s) => s.loaded);
  if (loaded.length === 0) return "";
  const parts = loaded.map((skill) => {
    const body = getCatalogSkill(skill.slug);
    const text = body ? skillBody(body) : "";
    return `### Skill: ${skill.name} (\`${skill.slug}\`)\n${text}`;
  });
  return `## Loaded skills (follow these instructions)\n\n${parts.join("\n\n")}`;
}

/** Corpo minimo di una skill: procedure + regole + output. */
function skillBody(skill: SkillEntry): string {
  const sections = [
    skill.procedure.length
      ? `Procedure:\n${skill.procedure.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : null,
    skill.rules.length ? `Rules:\n${skill.rules.map((r) => `- ${r}`).join("\n")}` : null,
    `Expected output: ${skill.output}`,
    skill.risk === "high"
      ? "This skill is HIGH RISK: any action with an external effect (sending, publishing, payments, cancellations) requires the user's explicit approval first. Prepare it and ask."
      : null,
    "Never use an integration that is not connected to this agent.",
  ].filter(Boolean);
  return sections.join("\n\n");
}

/**
 * Il messaggio utente che apre il turno con le skill caricate.
 *
 * Perché sta nel messaggio e non nel system prompt: il corpo di una skill
 * contiene istruzioni operazioni; se fossero nel system prompt, un utente
 * potrebbe sovrascriverle più facilmente. Così l'utente le attiva ma non le
 * modifica, e il modello le tratta come contenuto autorevole del turno.
 */
export function buildSkillTurnMessage(skills: RuntimeSkill[]): string | null {
  const block = buildLoadedSkillsBlock(skills);
  if (!block) return null;
  return `[skills]\n${block}\n[/skills]`;
}

/**
 * Quali skill caricare in questo turno?
 *
 * Decisione deliberatamente conservativa: la description di una skill contiene
 * il suo trigger ("Usare quando l'utente chiede..."), quindi il confronto con
 * la richiesta è quello che l'agente stesso farebbe. Non usiamo un LLM in più:
 * costerebbe una chiamata per ogni messaggio e l'agente ha già il contesto.
 *
 * Se nessuna description corrisponde, si carica comunque la skill più
 * pertinente per token di overlap: meglio un'istruzione in più che una
 * procedura rilevante persa. Il caso limite (nessuna competenza pertinente) non
 * succede perché l'indice le mostra già al modello.
 */
export function selectSkillsToLoad(
  skills: RuntimeSkill[],
  userText: string,
): RuntimeSkill[] {
  if (skills.length === 0) return [];
  const text = normalize(userText);
  const scored = skills.map((skill) => ({ skill, score: overlapScore(text, skill) }));
  const best = scored.reduce((max, s) => Math.max(max, s.score), 0);
  if (best === 0) return [];
  // Soglia alta: solo le skill che parlano davvero della richiesta.
  return scored
    .filter((s) => s.score >= Math.max(3, best * 0.5))
    .slice(0, 3)
    .map((s) => ({ ...s.skill, loaded: true }));
}

/** Token significativi di una stringa (minuscole, senza punteggiatura). */
function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 2);
}

/**
 * Punteggio di overlap tra richiesta e description.
 *
 * Le stopword inglesi e italiane più comuni pesano zero: "vorrei", "please",
 * "grazie" compaiono in ogni messaggio e non discriminano nulla.
 */
const STOPWORDS = new Set([
  "per", "con", "che", "del", "della", "delle", "dello", "gli", "una", "uno", "sono",
  "come", "questo", "questa", "questi", "queste", "molto", "anche", "devo", "posso",
  "vorrei", "potresti", "grazie", "buongiorno", "buonasera", "the", "and", "for",
  "you", "your", "can", "could", "please", "with", "that", "this", "have", "need",
  "want", "would", "from", "about", "there", "what", "when", "then", "some",
]);

function overlapScore(text: string[], skill: RuntimeSkill): number {
  const haystack = normalize(`${skill.name} ${skill.description} ${skill.slug}`);
  const set = new Set(haystack);
  let score = 0;
  for (const token of new Set(text)) {
    if (STOPWORDS.has(token)) continue;
    if (set.has(token)) score += 2;
  }
  // Bonus se la richiesta contiene il nome della skill per esteso ("tracking
  // ordine" → "dove è il mio ordine"): segnale più forte dei token singoli.
  const nameTokens = normalize(skill.name);
  if (nameTokens.length > 1 && nameTokens.every((t) => set.has(t)) && text.length > 0) {
    if (nameTokens.some((t) => text.includes(t))) score += 3;
  }
  return score;
}

/** Permessi che un agente può davvero esercitare, derivati dai suoi tool. */
export function agentAvailablePermissions(toolNames: string[]): Set<string> {
  const permissions = new Set<string>([BASE_PERMISSION]);
  for (const tool of toolNames) {
    const derived = TOOL_PERMISSION_PREFIXES.find((entry) =>
      entry.prefixes.some((prefix) => tool.startsWith(prefix)),
    );
    if (derived) {
      permissions.add(`${derived.domain}:${derived.action}`);
      // Un tool di lettura non autorizza la scrittura sullo stesso dominio.
      if (derived.action === "read") permissions.add(`${derived.domain}:write`);
    }
  }
  return permissions;
}

const TOOL_PERMISSION_PREFIXES: { prefixes: string[]; domain: string; action: "read" | "write" }[] = [
  { prefixes: ["get_", "list_", "search_", "read_"], domain: "context", action: "read" },
  { prefixes: ["create_", "update_"], domain: "content", action: "write" },
  { prefixes: ["send_"], domain: "email", action: "write" },
  { prefixes: ["schedule_"], domain: "calendar", action: "write" },
  { prefixes: ["calendar_"], domain: "calendar", action: "read" },
  { prefixes: ["gmail_"], domain: "email", action: "read" },
  { prefixes: ["shopify_"], domain: "store", action: "read" },
  { prefixes: ["order_"], domain: "orders", action: "read" },
  { prefixes: ["slack_"], domain: "notifications", action: "write" },
  { prefixes: ["notion_"], domain: "kb", action: "read" },
  { prefixes: ["hubspot_"], domain: "contacts", action: "write" },
];

/**
 * Applica il principio di minimo privilegio a una skill.
 *
 * Una skill che chiede un permesso non disponibile non viene rimossa (l'utente
 * l'ha installata di proposito): viene marcata `degraded`, e la direttiva nel
 * prompt le dice di fare il possibile e dichiarare il resto. Così la skill non
 * promette mai più di quanto l'agente possa fare.
 */
export function applyPermissionCeiling(
  skill: RuntimeSkill,
  available: Set<string>,
): RuntimeSkill {
  const missing = skill.permissions.filter((p) => !available.has(p));
  return { ...skill, degraded: missing.length > 0, permissions: skill.permissions };
}
