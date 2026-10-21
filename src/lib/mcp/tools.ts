/**
 * I tool MCP visti dal modello.
 *
 * Due compiti:
 *
 *  1. `loadMcpToolsForTenant` — costruisce la lista dei tool che il modello
 *     può usare, a partire dalle connessioni dell'utente. I tool sono
 *     rinominati con il namespace `mcp__<server>__<tool>` (vedi `naming.ts`)
 *     così due server con tool omonimi non si confondono.
 *
 *  2. `executeMcpTool` — esegue un tool MCP e restituisce il testo del
 *     risultato, delimitato come dato non fidato.
 *
 * Un tool che scrive (crea, modifica, cancella, invia messaggi) viene
 * marcato come "write" e richiede la conferma esplicita dell'utente prima
 * di girare. Il segnale, in ordine di priorità:
 *   - la lista esplicita `writeTools` nella voce del registro;
 *   - le annotation MCP del tool (`readOnlyHint`, `destructiveHint`);
 *   - il nome del tool, se contiene un verbo di scrittura.
 */

import type { LLMTool } from "@/lib/llm/types";

import { logAudit } from "@/lib/audit";

import { callMcpTool, connectMcp, listMcpTools, type McpTarget, type McpToolInfo } from "./client";
import { getMcpEntry, type McpRegistryEntry } from "./registry";
import { isMcpToolName, mcpToolName, parseMcpToolName } from "./naming";
import { checkMcpRateLimit, truncateToolOutput, wrapToolOutput } from "./security";
import { getMcpConnection, listMcpConnections, type McpConnectionRow } from "./store";

/** Come un tool viene descritto al modello. */
export type McpExposedTool = {
  /** Nome esposto al modello, con namespace. */
  name: string;
  /** Nome originale del tool sul server. */
  sourceName: string;
  serverId: string;
  serverName: string;
  description: string;
  inputSchema: LLMTool["input_schema"];
  /** True se il tool modifica dati e richiede conferma. */
  write: boolean;
};

export type McpToolCatalog = {
  tools: McpExposedTool[];
  /** Nomi (namespaced) dei tool che richiedono conferma. */
  writeToolNames: Set<string>;
};

/** Verbi che fanno sospettare una scrittura, quando il server non dichiara nulla. */
const WRITE_NAME_PATTERN =
  /(create|update|delete|remove|write|send|post|put|patch|publish|merge|close|reopen|archive|trash|invite|share|assign|move|transfer|rename|set|add|edit|comment|reply|forward|approve|reject|cancel|complete|mark|upload|import|replace|clear|reset)/i;

/**
 * Un tool scrive? Tre segnali, in ordine.
 */
export function isWriteTool(
  tool: { name: string; readOnlyHint?: boolean; destructiveHint?: boolean },
  entry?: McpRegistryEntry,
): boolean {
  // 1. Lista esplicita nel registro.
  if (entry?.writeTools && entry.writeTools !== "auto") {
    if (entry.writeTools.includes(tool.name)) return true;
  }
  // 2. Annotation del server MCP.
  if (tool.destructiveHint === true) return true;
  if (tool.readOnlyHint === false) return true;
  if (tool.readOnlyHint === true) return false;
  // 3. Nei nomi del registro c'è una lista esplicita: se il tool non è in
  //    lista e non c'è "auto", non è di scrittura.
  if (entry?.writeTools && entry.writeTools !== "auto") return false;
  // 4. Ultimo risorso: il nome.
  return WRITE_NAME_PATTERN.test(tool.name);
}

/** Normalizza lo `inputSchema` del server MCP in uno schema Anthropic. */
export function normalizeInputSchema(raw: unknown): LLMTool["input_schema"] {
  const empty: LLMTool["input_schema"] = { type: "object", properties: {} };
  if (!raw || typeof raw !== "object") return empty;
  const schema = raw as {
    type?: unknown;
    properties?: unknown;
    required?: unknown;
    additionalProperties?: unknown;
  };
  const properties =
    schema.properties && typeof schema.properties === "object"
      ? (schema.properties as Record<string, unknown>)
      : {};
  const required = Array.isArray(schema.required)
    ? schema.required.filter((r): r is string => typeof r === "string")
    : [];
  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
  };
}

/** Descrizione: il modello ha un budget di contesto, la descrizione no. */
function clampDescription(description: string | undefined, fallback: string): string {
  const text = (description ?? "").trim();
  if (!text) return fallback;
  return text.length > 1000 ? `${text.slice(0, 1000)}…` : text;
}

/**
 * Costruisce il descrittore di un tool a partire dai dati del server.
 */
export function toExposedTool(
  serverId: string,
  serverName: string,
  tool: McpToolInfo,
  entry?: McpRegistryEntry,
): McpExposedTool {
  return {
    name: mcpToolName(serverId, tool.name),
    sourceName: tool.name,
    serverId,
    serverName,
    description: clampDescription(
      tool.description,
      `Tool "${tool.name}" exposed by ${serverName}.`,
    ),
    inputSchema: normalizeInputSchema(tool.inputSchema),
    write: isWriteTool(tool, entry),
  };
}

/** Descrive una connessione in modo che il client MCP la sappia usare. */
function targetFromRow(row: McpConnectionRow): McpTarget | null {
  const entry = getMcpEntry(row.server_id);
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const url = row.url ?? entry?.url ?? null;
  const transport = (row.transport || entry?.transport || "streamable_http") as McpTarget["transport"];
  const auth = (metadata.auth as McpTarget["auth"]) ?? entry?.auth ?? "none";
  return {
    serverId: row.server_id,
    name: entry?.name ?? (metadata.name as string) ?? row.server_id,
    transport,
    url,
    auth,
    apiKeyHeader: entry?.apiKeyHeader ?? (metadata.api_key_header as string | undefined),
    row,
  };
}

/** Tool già in cache per una connessione (nessuna chiamata di rete). */
function toolsFromSnapshot(row: McpConnectionRow): McpToolInfo[] {
  const snapshot = row.tools_snapshot;
  if (!Array.isArray(snapshot)) return [];
  return snapshot.map((t) => ({
    name: t.name,
    description: t.description,
    readOnlyHint: t.readOnlyHint,
    destructiveHint: t.destructiveHint,
    idempotentHint: t.idempotentHint,
  }));
}

/**
 * Tool attivi per una connessione.
 *
 * `enabled_tools` null = default: solo i tool di lettura. La lista esplicita
 * è ciò che l'utente ha abilitato dalla UI, quindi può includere anche
 * tool di scrittura (che chiederanno conferma al momento dell'uso).
 */
export function filterEnabledTools(
  all: McpToolInfo[],
  enabled: string[] | null,
): McpToolInfo[] {
  if (enabled === null || enabled === undefined) {
    return all.filter((t) => !isWriteTool(t));
  }
  const set = new Set(enabled);
  return all.filter((t) => set.has(t.name));
}

/**
 * Carica i tool MCP disponibili per un utente.
 *
 * Se il server è irraggiungibile si continua con gli altri: un tool mancante
 * non deve far fallire la conversazione, l'agente lo segnala e prosegue.
 */
export async function loadMcpToolsForTenant(tenantId: string): Promise<McpToolCatalog> {
  const tools: McpExposedTool[] = [];
  const writeToolNames = new Set<string>();
  if (!tenantId) return { tools, writeToolNames };

  const rows = await listMcpConnections(tenantId);
  for (const row of rows) {
    if (row.status !== "connected") continue;
    const target = targetFromRow(row);
    if (!target) continue;
    const entry = getMcpEntry(row.server_id);

    let available = toolsFromSnapshot(row);

    // Se non abbiamo una cache, o il server è "nativo", chiediamo i tool
    // al server. Il nativo non ha un server MCP: i suoi tool sono descritti
    // dalla voce del registro.
    if (entry?.type === "native") {
      available = nativeToolsFor(entry);
    } else if (available.length === 0) {
      const live = await listToolsLive(target);
      if (live.length === 0) continue;
      available = live;
    }

    const enabled = filterEnabledTools(available, row.enabled_tools);
    for (const tool of enabled) {
      const exposed = toExposedTool(row.server_id, target.name, tool, entry);
      tools.push(exposed);
      if (exposed.write) writeToolNames.add(exposed.name);
    }
  }

  return { tools, writeToolNames };
}

/** Tool dichiarati da un connettore nativo. */
function nativeToolsFor(entry: McpRegistryEntry): McpToolInfo[] {
  const declared = entry.nativeTools ?? [];
  return declared.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    // `write: true` diventa `readOnlyHint: false`, che `isWriteTool`
    // interpreta come "questo tool scrive".
    readOnlyHint: t.write !== true,
  }));
}

/** Chiede i tool al server MCP (e aggiorna la cache). */
async function listToolsLive(target: McpTarget): Promise<McpToolInfo[]> {
  const connected = await connectMcp(target);
  if (!connected.ok) {
    logAudit("mcp_tools_unavailable", {
      serverId: target.serverId,
      code: connected.code,
    });
    return [];
  }
  try {
    const tools = await listMcpTools(connected.session);
    if (tools.length > 0) {
      const { setMcpToolsSnapshot } = await import("./store");
      await setMcpToolsSnapshot(
        target.row?.tenant_id ?? "",
        target.serverId,
        tools.map((t) => ({
          name: t.name,
          description: t.description,
          readOnlyHint: t.readOnlyHint,
          destructiveHint: t.destructiveHint,
          idempotentHint: t.idempotentHint,
        })),
      ).catch(() => {});
    }
    return tools;
  } catch {
    return [];
  } finally {
    await connected.session.close();
  }
}

/** Converte il catalogo nei tool da passare al provider LLM. */
export function toLlmTools(catalog: McpToolCatalog): LLMTool[] {
  return catalog.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

/**
 * Nome originale del tool sul server.
 *
 * Il nome esposto al modello è ripulito (`mcpToolName`), quindi non sempre
 * coincide con quello del server: per chiamarlo davvero serve il nome
 * originale, che si recupera dal registro (connettori nativi) o dalla cache
 * dei tool (server MCP).
 */
function resolveSourceToolName(
  serverId: string,
  exposedName: string,
  row: McpConnectionRow,
): string {
  const entry = getMcpEntry(serverId);
  for (const t of entry?.nativeTools ?? []) {
    if (mcpToolName(serverId, t.name) === exposedName) return t.name;
  }
  for (const t of row.tools_snapshot ?? []) {
    if (mcpToolName(serverId, t.name) === exposedName) return t.name;
  }
  return exposedName;
}

/** Esegue un tool MCP. Ritorna il testo da passare al modello. */
export async function executeMcpTool(
  name: string,
  input: Record<string, unknown>,
  context: { userId: string; tenantId?: string; ephemeral?: boolean },
): Promise<string> {
  const parsed = parseMcpToolName(name);
  if (!parsed) return `Tool "${name}" is not a valid MCP tool.`;

  const tenantId = context.tenantId || context.userId;
  if (!tenantId) return "This app is not connected.";

  const row = await getMcpConnection(tenantId, parsed.serverId);
  if (!row) return "This app is not connected.";

  const sourceName = resolveSourceToolName(parsed.serverId, name, row);
  const target = targetFromRow(row);
  if (!target) return "This app is not connected.";

  // Rate limit per utente e per integrazione.
  const limit = await checkMcpRateLimit({ tenantId, serverId: parsed.serverId });
  if (!limit.allowed) {
    return `Too many requests to ${target.name}. Try again in ${limit.retryAfterSeconds}s.`;
  }

  // I connettori nativi non hanno un server MCP: eseguono il tool nativo.
  const entry = getMcpEntry(parsed.serverId);
  if (entry?.type === "native") {
    const { executeNativeTool } = await import("./native/execute");
    return executeNativeTool(entry, sourceName, input, {
      tenantId,
      row,
      ephemeral: context.ephemeral,
    });
  }

  const connected = await connectMcp(target);
  if (!connected.ok) {
    if (connected.code === "reconnect_required") {
      await markReconnect(tenantId, parsed.serverId);
      return `${target.name}: ${connected.error}`;
    }
    return `${target.name} is not reachable right now, so its tools are unavailable. Continue without them.`;
  }

  const startedAt = Date.now();
  try {
    const result = await callMcpTool(connected.session, sourceName, input);
    // Modalità Ghost: nessun audit (è metadata della conversazione).
    if (!context.ephemeral) {
      logAudit("mcp_tool_exec", {
        tenantId,
        serverId: parsed.serverId,
        tool: sourceName,
        durationMs: Date.now() - startedAt,
        ok: result.ok,
        resultBytes: result.ok ? result.text.length : 0,
      });
    }
    if (!result.ok) {
      if (result.code === "reconnect_required") {
        await markReconnect(tenantId, parsed.serverId);
      }
      return `${target.name}: ${result.error}`;
    }
    return wrapToolOutput(target.name, sourceName, truncateToolOutput(result.text));
  } finally {
    await connected.session.close();
  }
}

/** Segnala la connessione come "da riautorizzare". */
async function markReconnect(tenantId: string, serverId: string) {
  const { setMcpConnectionStatus } = await import("./store");
  await setMcpConnectionStatus(tenantId, serverId, "reconnect_required").catch(() => {});
}

/** True se il nome è di un tool MCP. */
export { isMcpToolName };
