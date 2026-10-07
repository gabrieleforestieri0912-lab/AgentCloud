/**
 * Client Microsoft Graph per il provider `microsoft`.
 *
 * Perché un client e non semplici funzioni: token, refresh, retry e gestione
 * della cartella `AgentCloud` sono trasversali a Word, Excel, PowerPoint e
 * OneNote. `createGraphClient(auth)` prende l'Authorization già risolto e
 * restituisce tutte le operazioni; `graphClientForTenant` lo costruisce a partire
 * dal token del tenant.
 *
 * Questo file non importa nulla da `@/` (solo moduli relativi) di proposito: è
 * testabile con i loader dei test. La risoluzione del token del tenant — che
 * tocca Supabase — sta in `./tenant.ts`, che si appoggia a
 * `resolveIntegrationToken` (src/lib/integrations/api-proxy) invece di
 * duplicare decrypt/refresh.
 *
 * Retry/backoff su 429 e 5xx: `providerRequest` (src/lib/integrations/http),
 * unico punto che rispetta `Retry-After`. Graph risponde 429 con una frequenza
 * reale (throttling per-app), quindi il retry non è decorativo.
 */

import { providerRequest, type ProviderResponse } from "../http";

export const GRAPH_API = "https://graph.microsoft.com/v1.0";
/** Cartella dedicata: tutto ciò che l'agente crea finisce qui, mai nella radice. */
export const AGENTCLOUD_FOLDER = "AgentCloud";
/**
 * Limite dell'upload semplice di Graph: oltre i 4 MB serve una upload session
 * (chunk). I documenti generati (docx/xlsx/pptx) stanno ampiamente sotto, e
 * rifiutare presto è meglio che far fallire un PUT a metà.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type GraphResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type DriveItem = {
  id: string;
  name: string;
  webUrl?: string;
  size?: number;
};

export type UploadMode = "rename" | "replace";

type GraphRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  binary?: boolean;
  maxRetries?: number;
};

/** Codifica ogni segmento del path relativo, preservando i separatori `/`. */
export function encodeDrivePath(relPath: string): string {
  return relPath
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

/** Normalizza un DriveItem; se la forma è inattesa restituisce null. */
export function asDriveItem(json: unknown): DriveItem | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  if (typeof j.id !== "string" || typeof j.name !== "string") return null;
  return {
    id: j.id,
    name: j.name,
    webUrl: typeof j.webUrl === "string" ? j.webUrl : undefined,
    size: typeof j.size === "number" ? j.size : undefined,
  };
}

/** Errore pronto per il modello. */
function graphError(res: ProviderResponse): string {
  return res.error ?? `Microsoft Graph error ${res.status}`;
}

export type GraphClient = {
  readonly auth: string;
  request(path: string, opts?: GraphRequestOptions): Promise<ProviderResponse>;
  json<T>(path: string, opts?: GraphRequestOptions): Promise<GraphResult<T>>;
  ensureAgentCloudFolder(): Promise<GraphResult<DriveItem>>;
  getItemByPath(relPath: string): Promise<GraphResult<DriveItem>>;
  uploadFile(
    name: string,
    content: Uint8Array,
    contentType: string,
    mode?: UploadMode,
  ): Promise<GraphResult<DriveItem>>;
  downloadFile(itemId: string): Promise<GraphResult<Uint8Array>>;
};

export function createGraphClient(auth: string): GraphClient {
  const request = async (
    path: string,
    opts: GraphRequestOptions = {},
  ): Promise<ProviderResponse> =>
    providerRequest(path.startsWith("http") ? path : `${GRAPH_API}${path}`, {
      method: opts.method,
      headers: { Authorization: auth, ...(opts.headers ?? {}) },
      body: opts.body,
      binary: opts.binary,
      maxRetries: opts.maxRetries,
      providerLabel: "Microsoft Graph",
    });

  const json = async <T,>(
    path: string,
    opts: GraphRequestOptions = {},
  ): Promise<GraphResult<T>> => {
    const res = await request(path, opts);
    if (!res.ok) return { ok: false, error: graphError(res) };
    return { ok: true, data: (res.json ?? {}) as T };
  };

  const getItemByPath = async (relPath: string): Promise<GraphResult<DriveItem>> => {
    const res = await request(`/me/drive/root:/${encodeDrivePath(relPath)}`);
    if (res.status === 404) {
      return { ok: false, error: `Not found in OneDrive: ${relPath}` };
    }
    if (!res.ok) return { ok: false, error: graphError(res) };
    const item = asDriveItem(res.json);
    if (!item) return { ok: false, error: "Microsoft Graph: risposta item inattesa" };
    return { ok: true, data: item };
  };

  const ensureAgentCloudFolder = async (): Promise<GraphResult<DriveItem>> => {
    const existing = await getItemByPath(AGENTCLOUD_FOLDER);
    if (existing.ok) return existing;
    // Solo un 404 giustifica la creazione: un 401/403 va riportato, non mascherato.
    if (!existing.error.startsWith("Not found")) return existing;

    const created = await request("/me/drive/root/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: AGENTCLOUD_FOLDER, folder: {} }),
    });
    if (!created.ok) {
      // Corsa con un'altra chiamata che l'ha creata nel frattempo: rileggiamo.
      const again = await getItemByPath(AGENTCLOUD_FOLDER);
      if (again.ok) return again;
      return { ok: false, error: graphError(created) };
    }
    const item = asDriveItem(created.json);
    if (!item) return { ok: false, error: "Microsoft Graph: risposta cartella inattesa" };
    return { ok: true, data: item };
  };

  const uploadFile = async (
    name: string,
    content: Uint8Array,
    contentType: string,
    mode: UploadMode = "rename",
  ): Promise<GraphResult<DriveItem>> => {
    if (content.byteLength > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        error: `File troppo grande (${content.byteLength} byte): il limite di upload semplice è ${MAX_UPLOAD_BYTES}.`,
      };
    }
    const folder = await ensureAgentCloudFolder();
    if (!folder.ok) return folder;

    const conflict = mode === "replace" ? "replace" : "rename";
    const path =
      `/me/drive/root:/${encodeDrivePath(`${AGENTCLOUD_FOLDER}/${name}`)}:/content` +
      `?@microsoft.graph.conflictBehavior=${conflict}`;

    const res = await request(path, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: content,
    });
    if (!res.ok) return { ok: false, error: graphError(res) };
    const item = asDriveItem(res.json);
    if (!item) return { ok: false, error: "Microsoft Graph: risposta upload inattesa" };
    return { ok: true, data: item };
  };

  const downloadFile = async (itemId: string): Promise<GraphResult<Uint8Array>> => {
    const res = await request(`/me/drive/items/${encodeURIComponent(itemId)}/content`, {
      binary: true,
    });
    if (!res.ok || !res.bytes) return { ok: false, error: graphError(res) };
    return { ok: true, data: res.bytes };
  };

  return {
    auth,
    request,
    json,
    ensureAgentCloudFolder,
    getItemByPath,
    uploadFile,
    downloadFile,
  };
}
