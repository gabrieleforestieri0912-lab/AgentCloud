/**
 * Descrizione delle integrazioni viste dall'utente: cosa c'è nel registro,
 * cosa è collegato, quali tool espone.
 *
 * È l'unico posto che costruisce la "vista" che la UI consuma, così la
 * pagina e l'API dicono sempre la stessa cosa.
 *
 * Niente segreti: qui compaiono solo stato, nomi dei tool e metadati
 * pubblici. I token non entrano mai in questa struttura.
 */

import { getMcpEntry, listMcpEntries, type McpRegistryEntry } from "./registry";
import { isWriteTool, filterEnabledTools } from "./tools";
import { listMcpConnections, type McpConnectionRow, type McpToolSnapshot } from "./store";
import { isCustomServerId } from "./target";

export type McpToolView = {
  /** Nome originale sul server. */
  name: string;
  description: string;
  /** True se il tool scrive: richiede conferma. */
  write: boolean;
  /** True se l'utente lo ha abilitato. */
  enabled: boolean;
};

export type McpServerView = {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  type: "mcp" | "native";
  transport: string;
  auth: "oauth2" | "api_key" | "none";
  scopes: string[];
  /** URL del server (per i server personalizzati). */
  url: string | null;
  /** true se l'utente ha aggiunto il server a mano. */
  custom: boolean;
  /** Stato della connessione. `null` = mai collegata. */
  status: string | null;
  /** Il server è pronto all'uso? */
  connected: boolean;
  /** Serve una chiave API per collegarlo? */
  requiresApiKey: boolean;
  /** Tool esposti dal server. */
  tools: McpToolView[];
  /** Numero di tool abilitati. */
  enabledToolCount: number;
  /** Ultimo errore noto (per il badge "Errore"). */
  error: string | null;
};

function toolsForRow(row: McpConnectionRow | null): McpToolSnapshot[] {
  if (!row || !Array.isArray(row.tools_snapshot)) return [];
  return row.tools_snapshot;
}

/** Vista di una voce del registro, con la connessione dell'utente. */
function viewForEntry(entry: McpRegistryEntry, row: McpConnectionRow | null): McpServerView {
  const snapshot = toolsForRow(row);
  const declared: McpToolSnapshot[] = entry.nativeTools
    ? entry.nativeTools.map((t) => ({
        name: t.name,
        description: t.description,
        readOnlyHint: t.write !== true,
      }))
    : [];
  const all = declared.length > 0 ? declared : snapshot;
  const enabled = filterEnabledTools(
    all.map((t) => ({
      name: t.name,
      description: t.description,
      readOnlyHint: t.readOnlyHint,
      destructiveHint: t.destructiveHint,
    })),
    row?.enabled_tools ?? null,
  );
  const enabledNames = new Set(enabled.map((t) => t.name));

  return {
    id: entry.id,
    name: entry.name,
    icon: entry.icon,
    description: entry.description,
    category: entry.category,
    type: entry.type,
    transport: entry.transport,
    auth: entry.auth,
    scopes: [...(entry.scopes ?? [])],
    url: entry.url ?? null,
    custom: false,
    status: row?.status ?? null,
    connected: row?.status === "connected",
    requiresApiKey: entry.auth === "api_key",
    tools: all.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      write: isWriteTool(t, entry),
      enabled: enabledNames.has(t.name),
    })),
    enabledToolCount: enabledNames.size,
    error: row?.status === "error" ? "connection_failed" : null,
  };
}

/** Vista di un server personalizzato. */
function viewForCustom(row: McpConnectionRow): McpServerView {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const snapshot = toolsForRow(row);
  const enabled = filterEnabledTools(
    snapshot.map((t) => ({
      name: t.name,
      description: t.description,
      readOnlyHint: t.readOnlyHint,
      destructiveHint: t.destructiveHint,
    })),
    row.enabled_tools ?? null,
  );
  const enabledNames = new Set(enabled.map((t) => t.name));
  const auth = (metadata.auth as McpServerView["auth"]) ?? "none";

  return {
    id: row.server_id,
    name: (metadata.name as string) || row.server_id,
    icon: "plug",
    description: (metadata.description as string) || "Custom MCP server.",
    category: (metadata.category as string) || "Custom",
    type: "mcp",
    transport: row.transport || "streamable_http",
    auth,
    scopes: [],
    url: row.url,
    custom: true,
    status: row.status,
    connected: row.status === "connected",
    requiresApiKey: auth === "api_key",
    tools: snapshot.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      write: isWriteTool(t),
      enabled: enabledNames.has(t.name),
    })),
    enabledToolCount: enabledNames.size,
    error: row.status === "error" ? "connection_failed" : null,
  };
}

/**
 * Vista completa per un utente: registro + server personalizzati.
 */
export async function describeMcpServers(tenantId: string): Promise<McpServerView[]> {
  const rows = tenantId ? await listMcpConnections(tenantId) : [];
  const byId = new Map(rows.map((r) => [r.server_id, r]));

  const views: McpServerView[] = listMcpEntries().map((entry) =>
    viewForEntry(entry, byId.get(entry.id) ?? null),
  );

  for (const row of rows) {
    if (!isCustomServerId(row.server_id)) continue;
    if (getMcpEntry(row.server_id)) continue;
    views.push(viewForCustom(row));
  }

  return views;
}
