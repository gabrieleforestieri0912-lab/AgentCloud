/**
 * Client MCP: connessione a un server, elenco dei tool, invocazione.
 *
 * Perché non una sessione lunga: AgentCloud gira su un runtime serverless
 * (Vercel). Una connessione MCP tenuta aperta non sopravvive alla richiesta
 * che l'ha aperta, e non è condivisibile tra utenti. Quindi la connessione
 * viene aperta e chiusa per ogni operazione: il costo è una handshake per
 * tool, ma il modello è stateless e ogni utente resta isolato.
 *
 * Il trasporto scelto dipende dalla connessione:
 *   - `streamable_http` → StreamableHTTPClientTransport (standard attuale)
 *   - `sse`             → SSEClientTransport (legacy)
 *   - `stdio`           → StdioClientTransport (disabilitato di default)
 *
 * L'autenticazione OAuth2 è affidata all'SDK: passando un `OAuthClientProvider`
 * il trasporto chiama `auth()` quando riceve un 401, che rinnova il token e
 * ritenta. Se il rinnovo non è possibile, il provider segnala che serve una
 * riautorizzazione e l'agente lo dice all'utente.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";

import type { McpAuth, McpTransport } from "./registry";
import { safeMcpFetch } from "./security";
import { decryptMcpSecrets, type McpConnectionRow } from "./store";

/** Timeout del handshake e delle singole chiamate. */
export const MCP_CONNECT_TIMEOUT_MS = Number(process.env.MCP_CONNECT_TIMEOUT_MS || 15_000);
export const MCP_CALL_TIMEOUT_MS = Number(process.env.MCP_CALL_TIMEOUT_MS || 30_000);

/** Il server ha risposto 401: l'utente deve riautorizzare. */
export class McpNeedsReconnectError extends Error {
  constructor(message = "The app authorization has expired. Please reconnect it.") {
    super(message);
    this.name = "McpNeedsReconnectError";
  }
}

/** Errore generico di connessione (server irraggiungibile, handshake fallito). */
export class McpUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpUnavailableError";
  }
}

/** Come connettersi a una data integrazione. */
export type McpTarget = {
  serverId: string;
  name: string;
  transport: McpTransport;
  url: string | null;
  auth: McpAuth;
  apiKeyHeader?: string;
  /** Client OAuth statico (server senza Dynamic Client Registration). */
  staticClient?: { clientId: string; clientSecret?: string | null } | null;
  /** Riga del DB con i segreti (per i connettori nativi e i server custom). */
  row?: McpConnectionRow | null;
};

/**
 * `OAuthClientProvider` backed dal DB.
 *
 * - `tokens()` restituisce i token salvati (decifrati). Se non ce ne sono
 *   lancia `McpNeedsReconnectError`: far partire un autorizzazione dal
 *   provider qui sarebbe una richiesta HTTP dentro una richiesta HTTP, e
 *   l'utente non potrebbe autorizzare nulla.
 * - `saveTokens()` scrive i token rinnovati.
 * - `redirectToAuthorization()` non può reindirizzare (siamo dentro una
 *   chiamata server-to-server): segnala che serve il flusso autorizzato.
 */
class DbOAuthProvider implements OAuthClientProvider {
  private readonly row: McpConnectionRow;
  private readonly serverId: string;
  private readonly tenantId: string;

  constructor(row: McpConnectionRow, serverId: string, tenantId: string) {
    this.row = row;
    this.serverId = serverId;
    this.tenantId = tenantId;
  }

  get redirectUrl(): undefined {
    // Nessun redirect dal server: il flusso OAuth è gestito a parte
    // (route /api/mcp/authorize + /api/mcp/callback).
    return undefined;
  }

  get clientMetadata() {
    return {
      client_name: "AgentCloud",
      redirect_uris: [],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
  }

  clientInformation() {
    const registration = this.row.metadata?.client_registration as
      | { client_id: string; client_secret?: string | null; issuer?: string | null }
      | undefined;
    if (!registration?.client_id) return undefined;
    return {
      client_id: registration.client_id,
      client_secret: registration.client_secret ?? undefined,
      issuer: registration.issuer ?? undefined,
    };
  }

  async saveClientInformation(info: { client_id: string; client_secret?: string; issuer?: string }) {
    const { saveMcpClientRegistration } = await import("./store");
    await saveMcpClientRegistration(this.tenantId, this.serverId, {
      client_id: info.client_id,
      client_secret: info.client_secret ?? null,
      issuer: info.issuer ?? null,
    });
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const secrets = decryptMcpSecrets(this.row);
    if (!secrets.accessToken) {
      throw new McpNeedsReconnectError(
        "This app is not authorized. Please connect it again.",
      );
    }
    const expiresIn = this.row.expires_at
      ? Math.max(0, Math.round((Date.parse(this.row.expires_at) - Date.now()) / 1000))
      : undefined;
    const issuer = (this.row.metadata?.token_issuer as string | undefined) ?? undefined;
    return {
      access_token: secrets.accessToken,
      refresh_token: secrets.refreshToken ?? undefined,
      token_type: "Bearer",
      ...(expiresIn !== undefined ? { expires_in: expiresIn } : {}),
      ...(issuer ? { issuer } : {}),
    };
  }

  async saveTokens(tokens: OAuthTokens) {
    const { saveMcpTokens } = await import("./store");
    const expiresAt =
      typeof tokens.expires_in === "number"
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;
    await saveMcpTokens(this.tenantId, this.serverId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      scope: tokens.scope ?? null,
      issuer: tokens.issuer ?? null,
    });
  }

  async saveCodeVerifier() {
    // Il PKCE lo gestiamo noi nel flusso /api/mcp/authorize: il verifier
    // resta sul server e non viene mai passato al trasporto.
  }

  async codeVerifier(): Promise<string> {
    throw new McpNeedsReconnectError("Authorization must be restarted from the app settings.");
  }

  async redirectToAuthorization(): Promise<void> {
    throw new McpNeedsReconnectError(
      "The app authorization has expired. Please reconnect it.",
    );
  }
}

/** Costruisce il trasporto giusto per la connessione. */
function buildTransport(target: McpTarget) {
  const auth = target.auth;
  const secrets = target.row ? decryptMcpSecrets(target.row) : null;

  if (target.transport === "stdio") {
    const allowed = (process.env.MCP_STDIO_ALLOWED_COMMANDS || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const command = target.row?.metadata?.stdio_command as string | undefined;
    if (!command || !allowed.includes(command)) {
      throw new McpUnavailableError(
        "Local (stdio) MCP servers are disabled on this deployment.",
      );
    }
    const args = (target.row?.metadata?.stdio_args as string[] | undefined) ?? [];
    const env = (target.row?.metadata?.stdio_env as Record<string, string> | undefined) ?? {};
    return new StdioClientTransport({
      command,
      args,
      env: { ...(process.env as Record<string, string>), ...env },
      stderr: "ignore",
    });
  }

  if (!target.url) {
    throw new McpUnavailableError("This app has no server URL.");
  }
  const url = new URL(target.url);

  const requestInit: RequestInit = {};
  if (auth === "api_key" && secrets?.apiKey) {
    const header = target.apiKeyHeader ?? "Authorization";
    requestInit.headers =
      header.toLowerCase() === "authorization"
        ? { Authorization: `Bearer ${secrets.apiKey}` }
        : { [header]: secrets.apiKey };
  }

  if (target.transport === "sse") {
    return new SSEClientTransport(url, {
      requestInit,
      fetch: safeMcpFetch as never,
      ...(auth === "oauth2" && target.row
        ? { authProvider: new DbOAuthProvider(target.row, target.serverId, target.row.tenant_id) }
        : {}),
    });
  }

  return new StreamableHTTPClientTransport(url, {
    requestInit,
    fetch: safeMcpFetch as never,
    ...(auth === "oauth2" && target.row
      ? { authProvider: new DbOAuthProvider(target.row, target.serverId, target.row.tenant_id) }
      : {}),
  });
}

/** Sessione MCP aperta. */
export type McpSession = {
  client: Client;
  close(): Promise<void>;
};

export type ConnectResult =
  | { ok: true; session: McpSession }
  | { ok: false; error: string; code: "unavailable" | "reconnect_required" | "forbidden" };

/**
 * Apre una sessione MCP.
 * Non lancia: il chiamante è il loop dei tool, dove un'eccezione
 * ucciderebbe l'intera conversazione.
 */
export async function connectMcp(target: McpTarget): Promise<ConnectResult> {
  // Refresh PRIMA della scadenza: il trasporto dell'SDK rinnova solo quando
  // riceve un 401, ma aspettare il 401 significa una chiamata fallita e un
  // giro in più. Qui il token viene rinnovato in anticipo, se necessario.
  let effectiveTarget = target;
  if (target.auth === "oauth2" && target.row) {
    const { resolveAccessToken } = await import("./tokens");
    const { getMcpConnection } = await import("./store");
    const tenantId = target.row.tenant_id;
    const resolved = await resolveAccessToken(tenantId, target.serverId);
    if (!resolved.ok && resolved.code === "reconnect_required") {
      return { ok: false, error: resolved.error, code: "reconnect_required" };
    }
    if (resolved.ok && resolved.refreshed) {
      const fresh = await getMcpConnection(tenantId, target.serverId);
      if (fresh) effectiveTarget = { ...target, row: fresh };
    }
  }

  let transport;
  try {
    transport = buildTransport(effectiveTarget);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Connection failed",
      code: "unavailable",
    };
  }

  const client = new Client(
    { name: "agentcloud", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport, { timeout: MCP_CONNECT_TIMEOUT_MS });
  } catch (e) {
    await client.close().catch(() => {});
    if (e instanceof McpNeedsReconnectError) {
      return { ok: false, error: e.message, code: "reconnect_required" };
    }
    if (isUnauthorized(e)) {
      return {
        ok: false,
        error: "The app authorization has expired. Please reconnect it.",
        code: "reconnect_required",
      };
    }
    return {
      ok: false,
      error: `Could not reach ${target.name}: ${shortError(e)}`,
      code: "unavailable",
    };
  }

  return {
    ok: true,
    session: {
      client,
      close: async () => {
        await client.close().catch(() => {});
      },
    },
  };
}

/** Un 401/403 del server MCP. */
function isUnauthorized(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return /\b(401|403)\b/.test(message) || /unauthorized|forbidden/i.test(message);
}

function shortError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  return message.length > 160 ? `${message.slice(0, 160)}…` : message;
}

export type McpToolInfo = {
  name: string;
  description?: string;
  inputSchema?: unknown;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
};

/** Elenco dei tool esposti dal server. */
export async function listMcpTools(session: McpSession): Promise<McpToolInfo[]> {
  const result = await session.client.listTools({}, { timeout: MCP_CONNECT_TIMEOUT_MS });
  return (result.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    readOnlyHint: t.annotations?.readOnlyHint,
    destructiveHint: t.annotations?.destructiveHint,
    idempotentHint: t.annotations?.idempotentHint,
  }));
}

export type McpCallResult =
  | { ok: true; text: string }
  | { ok: false; error: string; code: "unavailable" | "reconnect_required" | "tool_error" };

/** Invoca un tool e restituisce il testo del risultato. */
export async function callMcpTool(
  session: McpSession,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpCallResult> {
  try {
    const result = await session.client.callTool(
      { name: toolName, arguments: args },
      undefined,
      { timeout: MCP_CALL_TIMEOUT_MS },
    );

    const parts: string[] = [];
    const content = (result.content ?? []) as Array<{
      type?: string;
      text?: string;
      data?: string;
      mimeType?: string;
      resource?: { text?: string };
    }>;
    for (const item of content) {
      if (item.type === "text" && typeof item.text === "string") parts.push(item.text);
      else if (item.type === "image" && item.data) {
        parts.push(`[image ${item.mimeType ?? "image/png"} omitted from the model context]`);
      } else if (item.type === "resource" && typeof item.resource?.text === "string") {
        parts.push(item.resource.text);
      }
    }
    const text = parts.join("\n");
    if (result.isError) {
      return { ok: false, error: text || "The tool reported an error.", code: "tool_error" };
    }
    return { ok: true, text };
  } catch (e) {
    if (e instanceof McpNeedsReconnectError) {
      return { ok: false, error: e.message, code: "reconnect_required" };
    }
    if (isUnauthorized(e)) {
      return {
        ok: false,
        error: "The app authorization has expired. Please reconnect it.",
        code: "reconnect_required",
      };
    }
    return { ok: false, error: shortError(e), code: "tool_error" };
  }
}
