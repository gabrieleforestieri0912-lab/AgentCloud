import { loadConfig, loadCredentials, saveCredentials, type UserCredentials } from "./config.js";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function baseUrl() { return loadConfig().apiUrl.replace(/\/$/, ""); }

/** URL del sito/API senza slash finale (per i flussi di login). */
export function siteUrl(): string {
  return baseUrl();
}

/**
 * Validazione di un access token contro `/api/extension/session` PRIMA di
 * salvarlo (login con token incollato / AGENTCLOUD_TOKEN in script):
 * distinguye token revocato/scaduto (401) da rete assente (fetch errore).
 */
export async function validateAccessToken(token: string): Promise<{ email: string }> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/api/extension/session`, { headers });
  } catch {
    throw new ApiError(0, "Rete non raggiungibile: controlla la connessione e riprova.");
  }
  if (response.status === 401) {
    throw new ApiError(401, "Token non valido, revocato o scaduto.");
  }
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  const data = await response.json() as { authenticated: boolean; email?: string | null };
  if (!data.authenticated) throw new ApiError(401, "Token non valido o revocato.");
  return { email: data.email || "" };
}

/**
 * Scambio `code`+`code_verifier` (PKCE) con i token, fatto dal server del
 * sito a fine login browser. Il code è usa-e-getta e vive max 2 minuti
 * (firma HMAC lato server): chi intercetta il callback locale non può
 * recuperare token senza il verifier, che resta solo in questa CLI.
 */
export type TokenExchangeResponse = {
  access_token: string;
  refresh_token?: string;
  email?: string;
};

export async function exchangeCliCode(apiUrl: string, code: string, codeVerifier: string): Promise<TokenExchangeResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/cli/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code, code_verifier: codeVerifier }),
    });
  } catch {
    throw new ApiError(0, "Rete non raggiungibile: controlla la connessione e riprova.");
  }
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  const data = await response.json() as Partial<TokenExchangeResponse>;
  if (!data.access_token) throw new ApiError(502, "Risposta di scambio token non valida.");
  return data as TokenExchangeResponse;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    if (body.error) return body.error;
  } catch { /* non-json response */ }
  return `Richiesta fallita (${response.status})`;
}

async function supabasePasswordGrant(email: string, password: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nell'ambiente CLI.");
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  return await response.json() as { access_token: string; refresh_token: string; expires_in: number; user?: { email?: string } };
}

async function supabaseRefreshGrant(refreshToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nell'ambiente CLI.");
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) throw new ApiError(response.status, "Sessione scaduta: esegui di nuovo `agentcloud login`.");
  return await response.json() as { access_token: string; refresh_token: string; expires_in: number };
}

export async function loginUser(email: string, password: string) {
  const data = await supabasePasswordGrant(email, password);
  const credentials: UserCredentials = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Math.max(30, data.expires_in - 30) * 1000,
    email: data.user?.email || email,
  };
  saveCredentials(credentials);
  return credentials;
}

/**
 * Login con token API personale (`act_…`, generato in /account → Token API).
 * Il token non scade e non ha refresh: vale finché non viene revocato.
 * Validazione prima del salvataggio: chiama /api/extension/session così un
 * token revocato non resta "valido" su disco.
 */
export async function loginWithToken(token: string) {
  if (!token.startsWith("act_")) {
    throw new Error("Token non valido: i token API iniziano con `act_` (generali in /account → Token API per la CLI).");
  }
  await validateAccessToken(token);
  const credentials: UserCredentials = {
    accessToken: token,
    refreshToken: "",
    // I token API non scadono: usa un expiresAt lontano così non si tenta mai il refresh.
    expiresAt: Number.MAX_SAFE_INTEGER,
    email: undefined,
  };
  saveCredentials(credentials);
  return credentials;
}

function isApiToken(token: string) {
  return token.startsWith("act_");
}

async function getValidUserToken() {
  // Token via env (CI/server headless): priorità massima, mai rinfrescato.
  const envToken = (process.env.AGENTCLOUD_TOKEN || "").trim();
  if (envToken) {
    if (!isApiToken(envToken)) {
      throw new ApiError(401, "AGENTCLOUD_TOKEN non valido: i token API iniziano con `act_`.");
    }
    return envToken;
  }
  const credentials = loadCredentials();
  if (!credentials) throw new ApiError(401, "Non autenticato: esegui `agentcloud login`.");
  // I token API non scadono né si rinfrescano: usali così come sono.
  if (isApiToken(credentials.accessToken)) return credentials.accessToken;
  if (Date.now() < credentials.expiresAt) return credentials.accessToken;
  if (!credentials.refreshToken) {
    throw new ApiError(401, "Sessione scaduta: esegui di nuovo `agentcloud login`.");
  }
  const refreshed = await supabaseRefreshGrant(credentials.refreshToken);
  const next: UserCredentials = {
    ...credentials,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || credentials.refreshToken,
    expiresAt: Date.now() + Math.max(30, refreshed.expires_in - 30) * 1000,
  };
  saveCredentials(next);
  return next.accessToken;
}

export async function userRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getValidUserToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  return await response.json() as T;
}

export async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.AGENTCLOUD_ADMIN_TOKEN;
  if (!token) throw new Error("Imposta AGENTCLOUD_ADMIN_TOKEN nell'ambiente prima di usare i comandi admin.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  return await response.json() as T;
}

/**
 * Esegue un agente in streaming SSE.
 *
 * `options.approvalToken` riprende una run messa in pausa dal meccanismo di
 * conferma umana (evento `tool_confirm`): il server firma il token, quindi la
 * CLI non può cambiare tool né argomenti — può solo approvare o annullare.
 */
export async function streamAgent(
  agentId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  onEvent: (event: Record<string, unknown>) => void,
  options: { approvalToken?: string; signal?: AbortSignal } = {},
) {
  const token = await getValidUserToken();
  const body: Record<string, unknown> = { agentId, messages };
  if (options.approvalToken) body.approval = { token: options.approvalToken };
  const response = await fetch(`${baseUrl()}/api/agent/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal: options.signal,
  });
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  if (!response.body) throw new Error("Lo stream dell'agente non è disponibile.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try { onEvent(JSON.parse(line.slice(6)) as Record<string, unknown>); } catch { /* incomplete SSE line */ }
    }
  }
}

export async function userWhoAmI() {
  return userRequest<{ authenticated: boolean; owned: string[]; email?: string | null; name?: string | null }>("/api/extension/session");
}

/**
 * Budget giornaliero freemium dell'agente (`GET /api/agent/limit`).
 *
 * `unlimited: true` = abbonato attivo (o admin): niente paywall.
 * Altrimenti `{ used, remaining, limit, resetAt }`: la prova gratuita è
 * ancora attiva e restano `remaining` messaggi gratuiti (5 al giorno in
 * totale, reset a mezzanotte UTC). È la stessa fonte usata dalla chat web.
 */
export type AgentLimit =
  | { unlimited: true }
  | { unlimited: false; used: number; remaining: number; limit: number; resetAt: string };

export async function agentLimit(agentSlug: string): Promise<AgentLimit> {
  const token = await getValidUserToken();
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/api/agent/limit?agent=${encodeURIComponent(agentSlug)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  } catch {
    throw new ApiError(0, "Rete non raggiungibile: controlla la connessione e riprova.");
  }
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  const data = (await response.json()) as {
    unlimited?: boolean;
    used?: number;
    remaining?: number;
    limit?: number;
    resetAt?: string;
  };
  if (data.unlimited) return { unlimited: true };
  return {
    unlimited: false,
    used: data.used ?? 0,
    remaining: data.remaining ?? 0,
    limit: data.limit ?? 5,
    resetAt: data.resetAt ?? "",
  };
}

/**
 * Persistenza best-effort dei file generati (stesso contratto del web client,
 * che posta senza conversationId: upsert per slug con versioni sul server).
 * Ritorna false invece di lanciare: un salvataggio fallito non deve mai
 * rompere una run o un undo.
 */
export async function saveAgentFiles(
  agentSlug: string,
  files: Array<{ name: string; content: string }>,
): Promise<boolean> {
  try {
    await userRequest("/api/chat/files", {
      method: "POST",
      body: JSON.stringify({
        agentSlug,
        files: files.map((f) => ({ slug: f.name, name: f.name, content: f.content })),
      }),
    });
    return true;
  } catch {
    return false;
  }
}

/** Cancellazione best-effort (undo di una creazione). Vedi sopra per il perché. */
export async function deleteAgentFile(name: string): Promise<boolean> {
  try {
    await userRequest(`/api/chat/files?slug=${encodeURIComponent(name)}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}
