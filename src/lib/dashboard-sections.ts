/**
 * Sezioni personalizzabili della dashboard — modulo SHARED.
 *
 * L'utente può nascondere/mostrare e riordinare le sezioni della dashboard
 * (/dashboard): la configurazione è una preferenza utente (chiave
 * `agentcloud_dashboard_sections`), che vive in `localStorage` con copia sul
 * DB tramite la pipeline esistente delle preferenze.
 *
 * Il valore memorizzato è una stringa semplice ("stats,-charts,agents"):
 * ogni sezione compare sempre, nell'ordine scelto; il segno "-" davanti a
 * un id significa che è nascosta. Tutti gli id restano elencati (valore mai
 * vuoto: anche "tutto nascosto" si serializza) e il formato resta un
 * primitivo, così tutta la pipeline delle preferenze resta valida senza
 * estendere `isPreferenceValue`. Note: un valore senza "-" (es. il default
 * "budget,stats,…") elenca solo le visibili, gli id mancanti sono nascosti.
 *
 * Niente import di componenti né client Supabase: se il layout viene letto
 * sia dal server component della pagina sia dal client che lo riedita.
 */

export const DASHBOARD_SECTION_IDS = [
  "budget",
  "stats",
  "skills",
  "charts",
  "agents",
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

/** Layout di default: tutte le sezioni visibili, nell'ordine storico. */
export const DEFAULT_DASHBOARD_LAYOUT = DASHBOARD_SECTION_IDS.join(",");

/** Elemento del layout: una sezione e se è visibile. */
export type DashboardSectionItem = { id: DashboardSectionId; visible: boolean };

/**
 * Legge il valore della preferenza e lo normalizza: dedupe, id sconosciuti
 * scartati, sezioni mancanti accodate come nascoste nell'ordine di default.
 * Un input invalido o vuoto ricade sul default (nessuna eccezione).
 */
export function parseDashboardLayout(
  raw: string | null | undefined,
): DashboardSectionItem[] {
  const source =
    typeof raw === "string" && raw.trim().length > 0
      ? raw
      : DEFAULT_DASHBOARD_LAYOUT;
  const seen = new Set<DashboardSectionId>();
  const items: DashboardSectionItem[] = [];
  for (const token of source.split(",")) {
    const clean = token.trim();
    if (clean.length === 0) continue;
    const hidden = clean.startsWith("-");
    const id = (hidden ? clean.slice(1) : clean) as DashboardSectionId;
    if (!(DASHBOARD_SECTION_IDS as readonly string[]).includes(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({ id, visible: !hidden });
  }
  for (const id of DASHBOARD_SECTION_IDS) {
    if (!seen.has(id)) items.push({ id, visible: false });
  }
  return items;
}

/**
 * Serializza il layout: tutte le sezioni nell'ordine corrente, con "-" davanti
 * alle nascoste. Il risultato non è mai vuoto (almeno un id), quindi la
 * preferenza salvata non si confonde con l'assenza di configurazione.
 */
export function serializeDashboardLayout(
  items: DashboardSectionItem[],
): string {
  return items
    .map((item) => (item.visible ? "" : "-") + item.id)
    .join(",");
}
