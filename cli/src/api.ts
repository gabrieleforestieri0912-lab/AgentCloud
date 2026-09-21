import { loadConfig, loadCredentials, saveCredentials, type UserCredentials } from "./config.js";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function baseUrl() { return loadConfig().apiUrl.replace(/\/$/, ""); }

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

async function getValidUserToken() {
  const credentials = loadCredentials();
  if (!credentials) throw new ApiError(401, "Non autenticato: esegui `agentcloud login`.");
  if (Date.now() < credentials.expiresAt) return credentials.accessToken;
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

export async function streamAgent(agentId: string, messages: Array<{ role: "user" | "assistant"; content: string }>, onEvent: (event: Record<string, unknown>) => void) {
  const token = await getValidUserToken();
  const response = await fetch(`${baseUrl()}/api/agent/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ agentId, messages }),
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
