/**
 * Persistenza delle connessioni MCP (tabella `mcp_connections`).
 *
 * Server-only: usa il client Supabase con service role, che bypassa la RLS.
 * Le righe sono già per utente (`tenant_id`), quindi ogni query è filtrata
 * sul tenant: un utente non vede e non tocca le connessioni di un altro.
 *
 * I segreti (access token, refresh token, client secret, API key) NON
 * entrano mai in chiaro: passano sempre da `encryptToken`/`decryptMaybe` di
 * `src/lib/integrations/encryption.ts` (AES-256-GCM).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptMaybe, encryptToken } from "../integrations/encryption";

/** Stati possibili di una connessione. */
export type McpConnectionStatus =
  /** L'utente ha autorizzato, i token sono validi. */
  | "connected"
  /** In attesa del rientro dal provider (OAuth in corso). */
  | "pending"
  /** Errore (provider rifiutato, server irraggiungibile). */
  | "error"
  /** Il provider ha revocato il token: l'utente deve riautorizzare. */
  | "reconnect_required"
  /** Disconnessa esplicita. */
  | "disconnected";

export type McpConnectionRow = {
  tenant_id: string;
  server_id: string;
  status: McpConnectionStatus;
  transport: string;
  url: string | null;
  /** Cifrato a riposo. */
  access_token: string | null;
  /** Cifrato a riposo. */
  refresh_token: string | null;
  expires_at: string | null;
  scope: string | null;
  client_id: string | null;
  /** Cifrato a riposo. */
  client_secret: string | null;
  /** Cifrato a riposo. */
  api_key: string | null;
  /** Tool abilitati dall'utente. `null` = default (solo lettura). */
  enabled_tools: string[] | null;
  /** Ultima lista di tool vista dal server (cache per la UI). */
  tools_snapshot: McpToolSnapshot[] | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

/** Tool come viene descritto dal server MCP. */
export type McpToolSnapshot = {
  name: string;
  description?: string;
  /** Annotazioni MCP: `readOnlyHint`, `destructiveHint`, ... */
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
};

type Db = NonNullable<ReturnType<typeof createAdminClient>>;

function db(): Db | null {
  return createAdminClient();
}

/** Tutte le connessioni di un utente. */
export async function listMcpConnections(tenantId: string): Promise<McpConnectionRow[]> {
  const admin = db();
  if (!admin || !tenantId) return [];
  const { data, error } = await admin
    .from("mcp_connections")
    .select("*")
    .eq("tenant_id", tenantId);
  if (error || !data) return [];
  return (data as unknown as McpConnectionRow[]) ?? [];
}

/** Una connessione. */
export async function getMcpConnection(
  tenantId: string,
  serverId: string,
): Promise<McpConnectionRow | null> {
  const admin = db();
  if (!admin || !tenantId) return null;
  const { data, error } = await admin
    .from("mcp_connections")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("server_id", serverId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as McpConnectionRow;
}

export type McpConnectionUpsert = {
  tenantId: string;
  serverId: string;
  status?: McpConnectionStatus;
  transport?: string;
  url?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scope?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  apiKey?: string | null;
  enabledTools?: string[] | null;
  toolsSnapshot?: McpToolSnapshot[] | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Crea o aggiorna una connessione.
 * `onConflict: tenant_id,server_id` fa della riga una sola per utente+server.
 */
export async function upsertMcpConnection(opts: McpConnectionUpsert): Promise<void> {
  const admin = db();
  if (!admin) throw new Error("Supabase admin unavailable");
  const payload: Record<string, unknown> = {
    tenant_id: opts.tenantId,
    server_id: opts.serverId,
    status: opts.status ?? "connected",
    transport: opts.transport ?? "streamable_http",
    url: opts.url ?? null,
    scope: opts.scope ?? null,
    expires_at: opts.expiresAt ?? null,
    client_id: opts.clientId ?? null,
    metadata: opts.metadata ?? {},
    updated_at: new Date().toISOString(),
  };
  // I toggle dei tool e la cache dei tool NON vengono toccati se non sono
  // esplicitamente indicati: un nuovo OAuth (o una disconnessione) non deve
  // azzerare le scelte dell'utente.
  if (opts.enabledTools !== undefined) payload.enabled_tools = opts.enabledTools;
  if (opts.toolsSnapshot !== undefined) payload.tools_snapshot = opts.toolsSnapshot;
  // I segreti si scrivono solo se valorizzati: un upsert che non li tocca
  // non deve cancellare il token già salvato.
  if (opts.accessToken !== undefined && opts.accessToken !== null) {
    payload.access_token = encryptToken(opts.accessToken);
  }
  if (opts.refreshToken !== undefined && opts.refreshToken !== null) {
    payload.refresh_token = encryptToken(opts.refreshToken);
  }
  if (opts.clientSecret !== undefined && opts.clientSecret !== null) {
    payload.client_secret = encryptToken(opts.clientSecret);
  }
  if (opts.apiKey !== undefined && opts.apiKey !== null) {
    payload.api_key = encryptToken(opts.apiKey);
  }

  const { error } = await admin
    .from("mcp_connections")
    .upsert(payload as never, { onConflict: "tenant_id,server_id" });
  if (error) throw new Error(`mcp_connections upsert failed: ${error.message}`);
}

/** Aggiorna solo lo stato (nessun segreto). */
export async function setMcpConnectionStatus(
  tenantId: string,
  serverId: string,
  status: McpConnectionStatus,
): Promise<void> {
  const admin = db();
  if (!admin) return;
  await admin
    .from("mcp_connections")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("server_id", serverId);
}

/** Salva la lista dei tool abilitati (toggle dalla UI). */
export async function setMcpEnabledTools(
  tenantId: string,
  serverId: string,
  enabledTools: string[] | null,
): Promise<void> {
  const admin = db();
  if (!admin) return;
  await admin
    .from("mcp_connections")
    .update({ enabled_tools: enabledTools, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("server_id", serverId);
}

/**
 * Salva la registrazione del client OAuth (Dynamic Client Registration).
 * Va nel `metadata` perché non è un segreto del tutto: il `client_id` è
 * pubblico, il `client_secret` invece sì e viene cifrato.
 */
export async function saveMcpClientRegistration(
  tenantId: string,
  serverId: string,
  registration: {
    client_id: string;
    client_secret?: string | null;
    issuer?: string | null;
  },
): Promise<void> {
  const admin = db();
  if (!admin) return;
  const { data: current } = await admin
    .from("mcp_connections")
    .select("metadata")
    .eq("tenant_id", tenantId)
    .eq("server_id", serverId)
    .maybeSingle();
  const metadata = ((current as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
  await admin
    .from("mcp_connections")
    .update({
      metadata: {
        ...metadata,
        client_registration: {
          client_id: registration.client_id,
          client_secret: registration.client_secret ? encryptToken(registration.client_secret) : null,
          issuer: registration.issuer ?? null,
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("server_id", serverId);
}

/**
 * Salva i token rinnovati dal provider (chiamato dall'SDK durante il refresh
 * automatico a 401).
 */
export async function saveMcpTokens(
  tenantId: string,
  serverId: string,
  tokens: {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
    scope?: string | null;
    issuer?: string | null;
  },
): Promise<void> {
  const admin = db();
  if (!admin) return;
  const { data: current } = await admin
    .from("mcp_connections")
    .select("metadata")
    .eq("tenant_id", tenantId)
    .eq("server_id", serverId)
    .maybeSingle();
  const metadata = ((current as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;

  const payload: Record<string, unknown> = {
    metadata: { ...metadata, token_issuer: tokens.issuer ?? metadata.token_issuer ?? null },
    status: "connected",
    updated_at: new Date().toISOString(),
  };
  if (tokens.accessToken) payload.access_token = encryptToken(tokens.accessToken);
  if (tokens.refreshToken) payload.refresh_token = encryptToken(tokens.refreshToken);
  if (tokens.expiresAt !== undefined) payload.expires_at = tokens.expiresAt;
  if (tokens.scope !== undefined) payload.scope = tokens.scope;

  await admin
    .from("mcp_connections")
    .update(payload)
    .eq("tenant_id", tenantId)
    .eq("server_id", serverId);
}

/** Salva la cache dei tool esposti dal server. */
export async function setMcpToolsSnapshot(
  tenantId: string,
  serverId: string,
  snapshot: McpToolSnapshot[],
): Promise<void> {
  const admin = db();
  if (!admin) return;
  await admin
    .from("mcp_connections")
    .update({ tools_snapshot: snapshot, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("server_id", serverId);
}

/**
 * Cancella la connessione e TUTTI i suoi segreti.
 * La disconnessione non lascia tracce: token, refresh token, client secret e
 * API key spariscono con la riga.
 */
export async function deleteMcpConnection(tenantId: string, serverId: string): Promise<void> {
  const admin = db();
  if (!admin) return;
  await admin
    .from("mcp_connections")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("server_id", serverId);
}

/** Riga con i segreti decifrati. Usata solo dal server, mai esposta. */
export type McpSecrets = {
  accessToken: string | null;
  refreshToken: string | null;
  clientSecret: string | null;
  apiKey: string | null;
};

/** Decifra i segreti di una riga. */
export function decryptMcpSecrets(row: McpConnectionRow): McpSecrets {
  return {
    accessToken: decryptMaybe(row.access_token),
    refreshToken: decryptMaybe(row.refresh_token),
    clientSecret: decryptMaybe(row.client_secret),
    apiKey: decryptMaybe(row.api_key),
  };
}
