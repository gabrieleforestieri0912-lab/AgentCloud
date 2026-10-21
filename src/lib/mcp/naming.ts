/**
 * Namespacing dei tool MCP.
 *
 * Due server MCP diversi possono esporre tool con lo stesso nome
 * (`create_page` esiste sia su Notion sia su Linear). Se passassero al
 * modello così come sono, il modello non saprebbe quale chiamare e noi
 * non sapremmo a chi recapitare la risposta.
 *
 * Regola: il tool esposto al modello si chiama
 *
 *     mcp__<serverId>__<toolName>
 *
 * dove `<serverId>` usa solo lettere minuscole, cifre e `-` (mai `_`, così
 * il parsing è senza ambiguità) e `<toolName>` viene ripulito dai caratteri
 * che Anthropic non accetta nei nomi dei tool (`[a-zA-Z0-9_-]`).
 *
 * Vincoli del nome (Anthropic li applica come regex sui nomi dei tool):
 *   - lunghezza 1..64
 *   - solo `[a-zA-Z0-9_-]`
 * Per questo il nome finale viene accorciato con un hash quando supera 64
 * caratteri: troncare senza hash produrrebbe due nomi diversi per due tool
 * diversi dello stesso server.
 */

import crypto from "crypto";

/** Prefisso che distingue i tool MCP dai tool nativi del repository. */
export const MCP_TOOL_PREFIX = "mcp__";

/** Massimo numero di caratteri ammesso per il nome di un tool (Anthropic). */
export const MAX_TOOL_NAME_LENGTH = 64;

/** Rende un id di server utilizzabile dentro un nome di tool. */
export function sanitizeServerId(serverId: string): string {
  return (
    serverId
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "server"
  );
}

/** Ripulisce il nome di un tool del server. */
export function sanitizeToolName(toolName: string): string {
  return toolName.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "tool";
}

/** Hash breve e stabile, usato per disambiguare i nomi troncati. */
function shortHash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 8);
}

/**
 * Nome del tool esposto al modello.
 * `mcpToolName("notion", "create_page")` → `mcp__notion__create_page`
 */
export function mcpToolName(serverId: string, toolName: string): string {
  const server = sanitizeServerId(serverId);
  const tool = sanitizeToolName(toolName);
  const full = `${MCP_TOOL_PREFIX}${server}__${tool}`;
  if (full.length <= MAX_TOOL_NAME_LENGTH) return full;

  // Troppo lungo: si accorcia la parte del tool e si aggiunge un hash del
  // nome originale, così due tool diversi non possono collidere.
  const suffix = `_${shortHash(`${server}:${tool}`)}`;
  const keep = MAX_TOOL_NAME_LENGTH - MCP_TOOL_PREFIX.length - server.length - 2 - suffix.length;
  const trimmed = tool.slice(0, Math.max(1, keep));
  return `${MCP_TOOL_PREFIX}${server}__${trimmed}${suffix}`;
}

/** True se il nome è di un tool MCP. */
export function isMcpToolName(name: string): boolean {
  return name.startsWith(MCP_TOOL_PREFIX);
}

export type ParsedMcpToolName = {
  serverId: string;
  toolName: string;
};

/**
 * Ricostruisce (serverId, toolName) dal nome esposto al modello.
 * `null` se il nome non è un tool MCP valido.
 */
export function parseMcpToolName(name: string): ParsedMcpToolName | null {
  if (!isMcpToolName(name)) return null;
  const rest = name.slice(MCP_TOOL_PREFIX.length);
  const sep = rest.indexOf("__");
  if (sep <= 0) return null;
  const serverId = rest.slice(0, sep);
  const toolName = rest.slice(sep + 2);
  if (!serverId || !toolName) return null;
  return { serverId, toolName };
}
