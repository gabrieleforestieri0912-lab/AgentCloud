/**
 * Google Looker Studio (Data Studio) Integration.
 *
 * Fornisce:
 * - Endpoint API che espone i dati dashboard in formato Looker Studio
 * - Formattazione dati per Google Sheets connector
 * - Generazione CSV ottimizzato per import Looker Studio
 *
 * Looker Studio può connettersi a:
 * 1. Google Sheets (via API o CSV upload)
 * 2. Endpoint JSON pubblici (Community Connectors)
 * 3. BigQuery (per datasets grandi)
 *
 * Questo modulo implementa l'opzione 1 (Google Sheets via CSV) e
 * fornisce un endpoint JSON per connector custom.
 */

export type LookerStudioRow = {
  data: string;          // YYYY-MM-DD
  agent_slug: string;
  agent_name: string;
  executions: number;
  tokens: number;
  cost_eur: number;
  status: string;
  plan: string;
};

export type LookerStudioDataset = {
  metadata: {
    generatedAt: string;
    agentName: string;
    period: string;
  };
  rows: LookerStudioRow[];
};

/**
 * Converte i dati dashboard in formato Looker Studio.
 */
export function formatForLookerStudio(
  daily: Array<{ date: string; runs: number; tokens: number }>,
  agentName: string,
  agentSlug: string,
  plan: string = "monthly",
): LookerStudioDataset {
  const rows: LookerStudioRow[] = daily.map((d) => ({
    data: d.date,
    agent_slug: agentSlug,
    agent_name: agentName,
    executions: d.runs,
    tokens: d.tokens,
    cost_eur: parseFloat((d.tokens * 0.000003).toFixed(6)),
    status: "active",
    plan,
  }));

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      agentName,
      period: "last_30_days",
    },
    rows,
  };
}

/**
 * Genera CSV ottimizzato per import in Google Sheets / Looker Studio.
 * Prima riga = intestazioni, poi dati. UTF-8 con BOM per Excel compatibilità.
 */
export function generateLookerStudioCsv(
  dataset: LookerStudioDataset,
): string {
  const BOM = "\uFEFF";
  const headers = [
    "Data",
    "Agent Slug",
    "Agent Name",
    "Esecuzioni",
    "Token",
    "Costo (EUR)",
    "Status",
    "Piano",
  ];

  const rows = dataset.rows.map((r) =>
    [
      r.data,
      r.agent_slug,
      r.agent_name,
      r.executions,
      r.tokens,
      r.cost_eur.toFixed(6),
      r.status,
      r.plan,
    ].join(","),
  );

  return BOM + headers.join(",") + "\n" + rows.join("\n");
}

/**
 * Genera il JSON per un Looker Studio Community Connector.
 * Endpoint: GET /api/looker-studio/data?agent=slug&period=30d
 */
export function generateLookerStudioJson(
  dataset: LookerStudioDataset,
): Record<string, unknown>[] {
  return dataset.rows.map((r) => ({
    "Data": r.data,
    "Agente": r.agent_name,
    "Slug": r.agent_slug,
    "Esecuzioni": r.executions,
    "Token": r.tokens,
    "Costo": r.cost_eur,
    "Stato": r.status,
    "Piano": r.plan,
  }));
}

/**
 * Genera uno schema per Looker Studio Community Connector.
 * Definisce i tipi di campo per ogni colonna.
 */
export function getLookerStudioSchema(): Record<string, { dataType: string; aggregable: boolean; label: string }> {
  return {
    "Data": { dataType: "STRING", aggregable: false, label: "Data" },
    "Agente": { dataType: "STRING", aggregable: true, label: "Nome Agente" },
    "Slug": { dataType: "STRING", aggregable: true, label: "Slug Agente" },
    "Esecuzioni": { dataType: "NUMBER", aggregable: true, label: "Esecuzioni" },
    "Token": { dataType: "NUMBER", aggregable: true, label: "Token" },
    "Costo": { dataType: "NUMBER", aggregable: true, label: "Costo (EUR)" },
    "Stato": { dataType: "STRING", aggregable: true, label: "Stato" },
    "Piano": { dataType: "STRING", aggregable: true, label: "Piano" },
  };
}
