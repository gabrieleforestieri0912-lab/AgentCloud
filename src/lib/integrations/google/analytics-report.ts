/**
 * Logica pura dei report Google Analytics 4 (whitelist, anomalie, formato).
 *
 * Modulo senza token né rete, testabile in isolamento. Il proxy con cache e
 * chiamate HTTP vive in api-proxy.ts.
 *
 * Privacy by construction: solo metriche aggregate (niente userId, niente
 * identificativi). La whitelist impedisce al modello di chiedere dimensioni
 * ad alta cardinalità che esploderebbero quota e contesto.
 */

/** Dimensioni consentite nei report (bassa cardinalità, utili al prodotto). */
export const GA_ALLOWED_DIMENSIONS = [
  "date",
  "pagePath",
  "pageTitle",
  "sessionSource",
  "sessionMedium",
  "sessionCampaign",
  "deviceCategory",
  "country",
  "city",
] as const;

/** Metriche consentite nei report. */
export const GA_ALLOWED_METRICS = [
  "sessions",
  "totalUsers",
  "newUsers",
  "screenPageViews",
  "engagementRate",
  "bounceRate",
  "averageSessionDuration",
  "conversions",
  "eventCount",
] as const;

export type GaReportInput = {
  property: string;
  dimensions: string[];
  metrics: string[];
  startDate: string;
  endDate: string;
  limit: number;
};

/**
 * Valida e normalizza l'input del modello. La proprietà deve essere
 * `properties/<id>` (solo cifre); dimensioni/metriche fuori whitelist vengono
 * scartate con avviso invece di un 400 della API; le date accettano anche
 * `7daysAgo`/`yesterday`/`today` (sintassi GA4).
 */
export function sanitizeGaReportInput(raw: {
  property?: unknown;
  dimensions?: unknown;
  metrics?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  limit?: unknown;
}): { ok: true; input: GaReportInput; dropped: string[] } | { ok: false; error: string } {
  const prop = String(raw.property ?? "").trim();
  if (!/^properties\/\d+$/.test(prop)) {
    return {
      ok: false,
      error: 'ga tool requires property as "properties/<id>" (get it from ga_list_properties).',
    };
  }
  const dimList = (Array.isArray(raw.dimensions) ? raw.dimensions : raw.dimensions ? [raw.dimensions] : []).map(String);
  const metList = (Array.isArray(raw.metrics) ? raw.metrics : raw.metrics ? [raw.metrics] : []).map(String);
  const allowedDims = new Set<string>(GA_ALLOWED_DIMENSIONS);
  const allowedMets = new Set<string>(GA_ALLOWED_METRICS);
  const dimensions = dimList.filter((d) => allowedDims.has(d)).slice(0, 5);
  const metrics = metList.filter((m) => allowedMets.has(m)).slice(0, 8);
  const dropped = [...dimList.filter((d) => !allowedDims.has(d)), ...metList.filter((m) => !allowedMets.has(m))];
  if (metrics.length === 0) {
    return {
      ok: false,
      error: `No valid metrics. Allowed: ${GA_ALLOWED_METRICS.join(", ")}.`,
    };
  }
  const dateRe = /^(\d{4}-\d{2}-\d{2}|today|yesterday|\d+daysAgo)$/;
  const startDate = String(raw.startDate ?? "28daysAgo").trim();
  const endDate = String(raw.endDate ?? "today").trim();
  if (!dateRe.test(startDate) || !dateRe.test(endDate)) {
    return { ok: false, error: "Dates must be YYYY-MM-DD or today/yesterday/NdaysAgo." };
  }
  const n = Number(raw.limit);
  const limit = Number.isFinite(n) ? Math.min(50, Math.max(1, Math.floor(n))) : 10;
  return { ok: true, input: { property: prop, dimensions, metrics, startDate, endDate, limit }, dropped };
}

export type GaRow = { dimensions: string[]; metrics: string[] };

/** Formatta le righe della Data API in tabella leggibile dal modello. */
export function formatGaRows(
  dimensionHeaders: string[],
  metricHeaders: string[],
  rows: GaRow[],
  maxRows: number,
): string {
  if (rows.length === 0) return "Nessun dato in questo intervallo.";
  const head = [...dimensionHeaders, ...metricHeaders].join(" | ");
  const lines = rows.slice(0, maxRows).map((r) => [...r.dimensions, ...r.metrics].join(" | "));
  const more = rows.length > maxRows ? `\n…e altre ${rows.length - maxRows} righe.` : "";
  return `${head}\n${lines.join("\n")}${more}`;
}

/**
 * Rilevamento anomalie su serie giornaliera (z-score su media mobile):
 * segnala i giorni con |z| >= 2. Calcolo lato AgentCloud sui dati scaricati,
 * come da specifica (nessuna API aggiuntiva, costo zero).
 */
export function detectGaAnomalies(
  series: { date: string; value: number }[],
  threshold = 2,
): { date: string; value: number; z: number; direction: "picco" | "calo" }[] {
  const clean = series.filter((p) => Number.isFinite(p.value));
  if (clean.length < 7) return [];
  const mean = clean.reduce((s, p) => s + p.value, 0) / clean.length;
  const variance = clean.reduce((s, p) => s + (p.value - mean) ** 2, 0) / clean.length;
  const std = Math.sqrt(variance);
  if (std === 0) return [];
  return clean
    .map((p) => ({ ...p, z: (p.value - mean) / std }))
    .filter((p) => Math.abs(p.z) >= threshold)
    .map((p) => ({
      date: p.date,
      value: p.value,
      z: Math.round(p.z * 100) / 100,
      direction: (p.z > 0 ? "picco" : "calo") as "picco" | "calo",
    }));
}
