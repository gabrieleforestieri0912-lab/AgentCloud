/**
 * Risoluzione del "bersaglio" di una connessione MCP.
 *
 * Un bersaglio può venire da due posti:
 *   - il REGISTRO (voci note: Notion, Linear, ...);
 *   - una riga di `mcp_connections` creata dall'utente (server MCP
 *     personalizzato, indicato con un id `custom:…`).
 *
 * In entrambi i casi il resto del sistema vede la stessa struttura, così
 * l'agente, le route OAuth e la UI non devono distinguere i due casi.
 */

import { getMcpEntry, type McpAuth, type McpRegistryEntry, type McpTransport } from "./registry";
import { getMcpConnection, type McpConnectionRow } from "./store";

export type McpResolved = {
  serverId: string;
  name: string;
  transport: McpTransport;
  url: string | null;
  auth: McpAuth;
  apiKeyHeader?: string;
  scopes: string[];
  staticClient: { clientId: string; clientSecret?: string | null } | null;
  native?: { provider: string; toolPrefix: string };
  /** Voce del registro, se il server è noto. */
  entry?: McpRegistryEntry;
  /** Riga del DB (se esiste). */
  row: McpConnectionRow | null;
};

/** Prefisso degli id dei server personalizzati. */
export const CUSTOM_SERVER_PREFIX = "custom:";

/** True se l'id è di un server personalizzato creato dall'utente. */
export function isCustomServerId(serverId: string): boolean {
  return serverId.startsWith(CUSTOM_SERVER_PREFIX);
}

/**
 * Risolve il bersaglio di una connessione.
 * `null` se il server non è nel registro e non c'è una riga per l'utente.
 */
export async function resolveMcpTarget(
  tenantId: string,
  serverId: string,
): Promise<McpResolved | null> {
  const entry = getMcpEntry(serverId);
  const row = tenantId ? await getMcpConnection(tenantId, serverId) : null;

  if (entry) {
    const staticClient = entry.staticClient
      ? {
          clientId: process.env[entry.staticClient.clientIdEnv] ?? "",
          clientSecret: entry.staticClient.clientSecretEnv
            ? process.env[entry.staticClient.clientSecretEnv] ?? null
            : null,
        }
      : null;
    return {
      serverId: entry.id,
      name: entry.name,
      transport: entry.transport,
      url: entry.url ?? null,
      auth: entry.auth,
      apiKeyHeader: entry.apiKeyHeader,
      scopes: [...(entry.scopes ?? [])],
      staticClient: staticClient?.clientId ? staticClient : null,
      native: entry.native
        ? { provider: entry.native.provider, toolPrefix: entry.native.toolPrefix }
        : undefined,
      entry,
      row,
    };
  }

  // Server personalizzato: tutto sta nella riga.
  if (!row) return null;
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    serverId: row.server_id,
    name: (metadata.name as string) || row.server_id,
    transport: (row.transport || "streamable_http") as McpTransport,
    url: row.url,
    auth: (metadata.auth as McpAuth) || "none",
    apiKeyHeader: metadata.api_key_header as string | undefined,
    scopes: typeof metadata.scopes === "string" ? metadata.scopes.split(" ") : [],
    staticClient: null,
    row,
  };
}
