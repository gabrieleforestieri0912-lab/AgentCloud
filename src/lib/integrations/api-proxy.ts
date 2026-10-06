/**
 * Integrations API proxy — provider con token usati dagli agenti.
 *
 * Perché esiste: gli agenti non devono mai toccare OAuth o token. Questo modulo
 * è il gemello di `lib/google/api-proxy.ts` e `lib/google/sheets.ts` per il
 * layer `tenant_integrations`: decripta l'access token del tenant, lo rinfresca
 * se scaduto (tramite l'hook `refreshToken` dell'adapter, vedi `getProvider`) e
 * chiama l'API del provider restituendo testo compatto e leggibile per il
 * modello.
 *
 * Attenzione: il refresh NON è hardcoded per provider. Ogni adapter espone il
 * proprio `refreshToken` (HubSpot dura 6h, Asana 1h, Google 1h) e questo proxy
 * lo usa. Prima esisteva solo `refreshAsana`: le connessioni HubSpot si
 * rompevano in silenzio dopo 6 ore con un 401 incomprensibile per il modello.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptMaybe, encryptToken } from "@/lib/integrations/encryption";
import { getProvider } from "./registry";
import { getCatalogEntry, PROVIDER_CATALOG, type ProviderCatalogEntry } from "./catalog";
import { authHeader } from "./http";
import type { SupportedProvider, TokenUsage } from "./types";

/**
 * Provider serviti dal proxy condiviso. `google_sheets` è escluso di proposito:
 * ha un modulo dedicato (src/lib/google/sheets.ts) e le sue tool stanno in
 * tools.ts, non in integration-tools.ts.
 *
 * Derivato dal catalogo invece che scritto a mano: aggiungere un provider con
 * `hasApiProxy: true` senza scrivere il proxy non passa il typecheck.
 */
type WithApiProxy = ProviderCatalogEntry & { readonly hasApiProxy: true };

const API_PROXY_ENTRIES: readonly WithApiProxy[] = PROVIDER_CATALOG.filter(
  (p): p is WithApiProxy => p.hasApiProxy,
);

export type GenericProvider = (typeof API_PROXY_ENTRIES)[number]["id"];

export type IntegrationApiResult =
  | { ok: true; data: string }
  | { ok: false; error: string };

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // rinfresca 5 minuti prima della scadenza
const MAX_ITEMS = 50;

type IntegrationRow = {
  status: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  external_account_id: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Credenziali pronte per una chiamata. `secretToken` serve solo ai provider
 * `keypair` (WooCommerce: Consumer Secret accanto alla Consumer Key); per gli
 * altri è sempre null.
 */
type ResolvedToken = {
  accessToken: string;
  account: string | null;
  secretToken: string | null;
  usage: TokenUsage;
  metadata: Record<string, unknown>;
};

/**
 * Esito della risoluzione del token. `ok: false` porta già il messaggio d'errore
 * pronto per il modello (non connesso / da riconnettere), così i proxy non devono
 * dedurlo da un `null` ambiguo.
 */
export type ResolvedIntegration =
  | { ok: true; token: ResolvedToken }
  | { ok: false; error: string };

function notConnectedError(name: string): string {
  return `No ${name} account connected. Ask the user to connect ${name} from the dashboard (Integrations), then retry.`;
}

/** Etichetta umana del provider, presa dal catalogo (usata nei messaggi al modello). */
function providerLabel(provider: GenericProvider): string {
  return getCatalogEntry(provider)?.label ?? provider;
}

/** True se un token con questa scadenza va rinfrescato ora (null = non scade). */
function shouldRefresh(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return false;
  return expiry - Date.now() <= REFRESH_MARGIN_MS;
}

function clampLimit(limit: number | undefined, fallback = 20): number {
  return Math.min(MAX_ITEMS, Math.max(1, limit ?? fallback));
}

/**
 * Rinfresca l'access token tramite l'adapter del provider. Restituisce null se il
 * provider non espone `refreshToken` (GitHub / ClickUp / Notion / Slack: token
 * senza scadenza) o se le credenziali OAuth mancano.
 */
async function refreshViaAdapter(
  provider: GenericProvider,
  refreshToken: string,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
} | null> {
  const adapter = getProvider(provider);
  if (!adapter?.refreshToken) return null;
  try {
    const r = await adapter.refreshToken({ refreshToken });
    return {
      accessToken: r.accessToken,
      refreshToken: r.refreshToken ?? null,
      expiresAt: r.expiresAt ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Recupera (e se serve rinfresca) l'access token di un provider generico per un
 * tenant. Restituisce null quando la connessione non esiste, non è `connected`
 * o i token non sono decifrabili.
 */
export async function resolveIntegrationToken(
  tenantId: string,
  provider: GenericProvider,
): Promise<ResolvedIntegration> {
  const label = providerLabel(provider);
  const none = (): ResolvedIntegration => ({ ok: false, error: notConnectedError(label) });

  if (!tenantId) return none();
  const admin = createAdminClient();
  if (!admin) return none();

  const { data, error } = await admin
    .from("tenant_integrations")
    .select("status, access_token, refresh_token, expires_at, external_account_id, metadata")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !data) return none();

  const row = data as IntegrationRow;
  if (row.status && row.status !== "connected") return none();

  const accessToken = decryptMaybe(row.access_token);
  if (!accessToken) return none();

  const metadata = row.metadata ?? {};
  const usage = getCatalogEntry(provider)?.authType === "keypair" ? "keypair" : "bearer";

  // Refresh solo se il token scade E c'è un refresh token salvato: i provider
  // senza scadenza (GitHub, ClickUp, Notion, Slack) hanno expires_at e
  // refresh_token null, quindi qui non vengono toccati.
  //
  // Per i provider `keypair` (WooCommerce) NON è un refresh: refresh_token è la
  // seconda credenziale (Consumer Secret) e expires_at è null, quindi `shouldRefresh`
  // è false e la coppia va semplicemente consegnata.
  const refreshToken = decryptMaybe(row.refresh_token);
  if (refreshToken && shouldRefresh(row.expires_at)) {
    const refreshed = await refreshViaAdapter(provider, refreshToken);
    // Rinnovo fallito (refresh token revocato o scaduto): riusare il token vecchio
    // darebbe solo un 401 oscuro, quindi chiediamo di riconnettere l'account.
    if (!refreshed?.accessToken) {
      return {
        ok: false,
        error: `The ${label} connection has expired and could not be refreshed. Ask the user to reconnect ${label} from the dashboard (Integrations), then retry.`,
      };
    }
    const update: Record<string, unknown> = {
      access_token: encryptToken(refreshed.accessToken),
      expires_at: refreshed.expiresAt,
      status: "connected",
      updated_at: new Date().toISOString(),
    };
    if (refreshed.refreshToken) update.refresh_token = encryptToken(refreshed.refreshToken);
    await admin
      .from("tenant_integrations")
      .update(update)
      .eq("tenant_id", tenantId)
      .eq("provider", provider);
    return {
      ok: true,
      token: {
        accessToken: refreshed.accessToken,
        account: row.external_account_id,
        secretToken: null,
        usage,
        metadata,
      },
    };
  }

  return {
    ok: true,
    token: {
      accessToken,
      account: row.external_account_id,
      secretToken: refreshToken,
      usage,
      metadata,
    },
  };
}

/**
 * Header Authorization per un provider. Centralizza i due formati supportati:
 * Bearer (default) e Basic base64(key:secret) per i provider `keypair`
 * (WooCommerce), dove la seconda credenziale arriva in `secretToken`.
 */
export function integrationAuth(token: ResolvedToken): string {
  return authHeader(token.usage, token.accessToken, token.secretToken);
}

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

export type GithubAction = "getUser" | "listRepos" | "listIssues" | "createIssue";

export type GithubParams = {
  owner?: string;
  repo?: string;
  title?: string;
  body?: string;
  state?: string;
  limit?: number;
};

function formatGithub(action: GithubAction, json: unknown): string {
  if (action === "getUser") {
    const u = json as { login?: string; name?: string; public_repos?: number };
    return `GitHub user: ${u.login ?? "unknown"}${u.name ? ` (${u.name})` : ""} — public repos: ${u.public_repos ?? 0}`;
  }
  if (action === "listRepos") {
    const repos = (Array.isArray(json) ? json : []) as Array<{
      full_name?: string;
      private?: boolean;
      description?: string | null;
      html_url?: string;
    }>;
    if (repos.length === 0) return "No GitHub repositories found.";
    return repos
      .map(
        (r) =>
          `- ${r.full_name ?? "?"}${r.private ? " [private]" : ""}${r.description ? ` — ${r.description}` : ""}${r.html_url ? `\n  ${r.html_url}` : ""}`,
      )
      .join("\n");
  }
  if (action === "listIssues") {
    const issues = (Array.isArray(json) ? json : []) as Array<{
      number?: number;
      title?: string;
      state?: string;
      html_url?: string;
      pull_request?: unknown;
    }>;
    const real = issues.filter((i) => !i.pull_request);
    if (real.length === 0) return "No GitHub issues found.";
    return real
      .map(
        (i) =>
          `- #${i.number ?? "?"} ${i.title ?? ""} [${i.state ?? "open"}]${i.html_url ? `\n  ${i.html_url}` : ""}`,
      )
      .join("\n");
  }
  const created = json as { number?: number; title?: string; html_url?: string };
  return `Created GitHub issue #${created.number ?? "?"}: ${created.title ?? ""}${created.html_url ? ` — ${created.html_url}` : ""}`;
}

export async function githubApiProxy(
  action: GithubAction,
  params: GithubParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "github");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.accessToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const limit = clampLimit(params.limit);

  let url = "";
  let method = "GET";
  let body: string | undefined;

  if (action === "getUser") {
    url = "https://api.github.com/user";
  } else if (action === "listRepos") {
    url = `https://api.github.com/user/repos?per_page=${limit}&sort=updated`;
  } else if (action === "listIssues") {
    if (!params.owner || !params.repo) {
      return { ok: false, error: "github_list_issues requires owner and repo." };
    }
    url = `https://api.github.com/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/issues?per_page=${limit}&state=${encodeURIComponent(params.state || "open")}`;
  } else {
    if (!params.owner || !params.repo || !params.title) {
      return { ok: false, error: "github_create_issue requires owner, repo and title." };
    }
    url = `https://api.github.com/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/issues`;
    method = "POST";
    body = JSON.stringify({ title: params.title, body: params.body ?? "" });
  }

  try {
    const res = await fetch(url, { method, headers, body });
    const json = (await res.json().catch(() => ({}))) as unknown;
    if (!res.ok) {
      const message = (json as { message?: string }).message || `${res.status} ${res.statusText}`;
      return { ok: false, error: `GitHub API error: ${message}` };
    }
    return { ok: true, data: formatGithub(action, json) };
  } catch (e) {
    return {
      ok: false,
      error: `GitHub network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// ClickUp (REST v2) — sostituisce Linear (OAuth Linear richiede piano a pagamento)
// ---------------------------------------------------------------------------

export type ClickupAction = "listSpaces" | "listTasks" | "createTask";

export type ClickupParams = {
  teamId?: string;
  listId?: string;
  title?: string;
  description?: string;
  limit?: number;
};

const CLICKUP_API = "https://api.clickup.com/api/v2";

type ClickupTeam = { id?: string; name?: string };
type ClickupSpace = { id?: string; name?: string };
type ClickupFolder = { id?: string; name?: string };
type ClickupList = { id?: string; name?: string };
type ClickupTask = {
  id?: string;
  name?: string;
  url?: string;
  status?: { status?: string };
  list?: { name?: string };
};

/** Messaggio d'errore compatto dalle risposte ClickUp ({ err } oppure { error }). */
function clickupErrorMessage(json: unknown, status: number, statusText: string): string {
  const j = json as { err?: string; error?: string };
  return j?.err || j?.error || `${status} ${statusText}`;
}

/**
 * Riga di avviso per un sotto-livello non caricato: un 404 su space/cartelle non
 * deve sparire in silenzio, altrimenti il modello vede un albero incompleto senza
 * sapere perché (e non trova i listId per clickup_create_task).
 */
function clickupWarningLine(
  indent: string,
  label: string,
  json: unknown,
  status: number,
  statusText: string,
): string {
  return `${indent}! ${label}: ${clickupErrorMessage(json, status, statusText)}`;
}

function formatClickupTasks(tasks: ClickupTask[], limit: number): string {
  const slice = tasks.slice(0, limit);
  if (slice.length === 0) return "No ClickUp tasks found.";
  return slice
    .map((t) => {
      const link = t.url || (t.id ? `https://app.clickup.com/t/${t.id}` : "");
      return `- ${t.name ?? "?"} [${t.status?.status ?? "?"}]${t.list?.name ? ` · ${t.list.name}` : ""}${link ? `\n  ${link}` : ""}`;
    })
    .join("\n");
}

export async function clickupApiProxy(
  action: ClickupAction,
  params: ClickupParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "clickup");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const limit = clampLimit(params.limit);

  const get = async (path: string) => {
    const res = await fetch(`${CLICKUP_API}${path}`, { headers });
    const json = (await res.json().catch(() => ({}))) as unknown;
    return { res, json };
  };

  /** Primo workspace autorizzato: usato quando il modello non passa un teamId. */
  const resolveTeamId = async (): Promise<string | null> => {
    if (params.teamId) return params.teamId;
    const { res, json } = await get("/team");
    if (!res.ok) return null;
    const teams = ((json as { teams?: ClickupTeam[] })?.teams ?? []).filter((t) => t.id);
    return teams[0]?.id ?? null;
  };

  try {
    if (action === "listSpaces") {
      const { res, json } = await get("/team");
      if (!res.ok) {
        return {
          ok: false,
          error: `ClickUp API error: ${clickupErrorMessage(json, res.status, res.statusText)}`,
        };
      }
      const teams = ((json as { teams?: ClickupTeam[] })?.teams ?? []).filter((t) => t.id);
      if (teams.length === 0) {
        return {
          ok: true,
          data: "No ClickUp workspace authorized. Reconnect ClickUp and select at least one Workspace.",
        };
      }
      // Poche chiamate per workspace/space: la risposta resta compatta ma contiene
      // tutti gli id (listId) che servono a clickup_create_task. Attenzione agli
      // endpoint: le liste stanno in `/space/{id}/list` (senza cartella) oppure in
      // `/folder/{id}/list` — NON esiste `/team/{id}/space/{id}/list`.
      const lines: string[] = [];
      for (const team of teams.slice(0, 5)) {
        lines.push(`Workspace "${team.name ?? "?"}" (id: ${team.id})`);
        const spacesCall = await get(`/team/${team.id}/space?archived=false`);
        if (!spacesCall.res.ok) {
          lines.push(
            clickupWarningLine(
              "  ",
              "Could not load spaces",
              spacesCall.json,
              spacesCall.res.status,
              spacesCall.res.statusText,
            ),
          );
          continue;
        }
        const spaces = ((spacesCall.json as { spaces?: ClickupSpace[] })?.spaces ?? []).filter(
          (s) => s.id,
        );
        for (const space of spaces.slice(0, 10)) {
          lines.push(`  Space "${space.name ?? "?"}" (id: ${space.id})`);

          // Liste che stanno direttamente nello space (senza cartella).
          const folderlessCall = await get(`/space/${space.id}/list?archived=false`);
          if (folderlessCall.res.ok) {
            const lists = (
              (folderlessCall.json as { lists?: ClickupList[] })?.lists ?? []
            ).filter((l) => l.id);
            for (const list of lists.slice(0, 20)) {
              lines.push(`    List "${list.name ?? "?"}" (id: ${list.id})`);
            }
          } else {
            lines.push(
              clickupWarningLine(
                "    ",
                "Could not load folderless lists",
                folderlessCall.json,
                folderlessCall.res.status,
                folderlessCall.res.statusText,
              ),
            );
          }

          // Cartelle dello space e liste contenute (in ClickUp è il caso più comune).
          const foldersCall = await get(`/team/${team.id}/space/${space.id}/folder?archived=false`);
          if (!foldersCall.res.ok) {
            lines.push(
              clickupWarningLine(
                "    ",
                "Could not load folders",
                foldersCall.json,
                foldersCall.res.status,
                foldersCall.res.statusText,
              ),
            );
            continue;
          }
          const folders = ((foldersCall.json as { folders?: ClickupFolder[] })?.folders ?? []).filter(
            (f) => f.id,
          );
          for (const folder of folders.slice(0, 10)) {
            lines.push(`    Folder "${folder.name ?? "?"}" (id: ${folder.id})`);
            const listsCall = await get(`/folder/${folder.id}/list?archived=false`);
            if (!listsCall.res.ok) {
              lines.push(
                clickupWarningLine(
                  "      ",
                  "Could not load lists",
                  listsCall.json,
                  listsCall.res.status,
                  listsCall.res.statusText,
                ),
              );
              continue;
            }
            const lists = ((listsCall.json as { lists?: ClickupList[] })?.lists ?? []).filter(
              (l) => l.id,
            );
            for (const list of lists.slice(0, 20)) {
              lines.push(`      List "${list.name ?? "?"}" (id: ${list.id})`);
            }
          }
        }
      }
      return { ok: true, data: lines.join("\n") };
    }

    if (action === "listTasks") {
      let tasks: ClickupTask[] = [];
      if (params.listId) {
        const { res, json } = await get(
          `/list/${encodeURIComponent(params.listId)}/task?archived=false&subtasks=true&include_closed=false&order_by=updated&reverse=true&page=0`,
        );
        if (!res.ok) {
          return {
            ok: false,
            error: `ClickUp API error: ${clickupErrorMessage(json, res.status, res.statusText)}`,
          };
        }
        tasks = (json as { tasks?: ClickupTask[] })?.tasks ?? [];
      } else {
        const teamId = await resolveTeamId();
        if (!teamId) {
          return {
            ok: false,
            error:
              "clickup_list_tasks needs a listId (from clickup_list_spaces) or at least one authorized ClickUp workspace.",
          };
        }
        const { res, json } = await get(
          `/team/${encodeURIComponent(teamId)}/task?subtasks=true&include_closed=false&order_by=updated&reverse=true&page=0`,
        );
        if (!res.ok) {
          return {
            ok: false,
            error: `ClickUp API error: ${clickupErrorMessage(json, res.status, res.statusText)}`,
          };
        }
        tasks = (json as { tasks?: ClickupTask[] })?.tasks ?? [];
      }
      return { ok: true, data: formatClickupTasks(tasks, limit) };
    }

    // createTask
    if (!params.listId || !params.title) {
      return { ok: false, error: "clickup_create_task requires listId and title." };
    }
    const res = await fetch(`${CLICKUP_API}/list/${encodeURIComponent(params.listId)}/task`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: params.title, description: params.description ?? "" }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      name?: string;
      url?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: `ClickUp API error: ${clickupErrorMessage(json, res.status, res.statusText)}`,
      };
    }
    const link = json.url || (json.id ? `https://app.clickup.com/t/${json.id}` : "");
    return {
      ok: true,
      data: `Created ClickUp task: ${json.name ?? params.title}${json.id ? ` (id: ${json.id})` : ""}${link ? ` — ${link}` : ""}`,
    };
  } catch (e) {
    return {
      ok: false,
      error: `ClickUp network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Asana
// ---------------------------------------------------------------------------

export type AsanaAction = "listWorkspaces" | "listProjects" | "listTasks" | "createTask";

export type AsanaParams = {
  workspaceId?: string;
  projectId?: string;
  taskName?: string;
  notes?: string;
  limit?: number;
};

type AsanaEntity = {
  gid?: string;
  name?: string;
  completed?: boolean;
  due_on?: string;
  permalink_url?: string;
};

function formatAsana(action: AsanaAction, data: unknown): string {
  const items = (Array.isArray(data) ? data : []) as AsanaEntity[];
  if (action === "listWorkspaces") {
    if (items.length === 0) return "No Asana workspaces found.";
    return items.map((w) => `- ${w.name ?? "?"} — gid: ${w.gid ?? "?"}`).join("\n");
  }
  if (action === "listProjects") {
    if (items.length === 0) return "No Asana projects found.";
    return items
      .map(
        (p) => `- ${p.name ?? "?"} — gid: ${p.gid ?? "?"}${p.permalink_url ? `\n  ${p.permalink_url}` : ""}`,
      )
      .join("\n");
  }
  if (action === "listTasks") {
    if (items.length === 0) return "No Asana tasks found.";
    return items
      .map(
        (t) =>
          `- [${t.completed ? "x" : " "}] ${t.name ?? "?"}${t.due_on ? ` (due ${t.due_on})` : ""} — gid: ${t.gid ?? "?"}`,
      )
      .join("\n");
  }
  const task = data as AsanaEntity;
  return `Created Asana task: ${task.name ?? ""} — gid: ${task.gid ?? "?"}${task.permalink_url ? `\n${task.permalink_url}` : ""}`;
}

export async function asanaApiProxy(
  action: AsanaAction,
  params: AsanaParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "asana");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const limit = clampLimit(params.limit);

  let url = "";
  let method = "GET";
  let body: string | undefined;

  if (action === "listWorkspaces") {
    url = "https://app.asana.com/api/1.0/workspaces";
  } else if (action === "listProjects") {
    if (!params.workspaceId) {
      return { ok: false, error: "asana_list_projects requires workspaceId." };
    }
    // `name` e `permalink_url` sono gli unici campi usati da formatAsana (il gid c'è sempre).
    url = `https://app.asana.com/api/1.0/projects?workspace=${encodeURIComponent(params.workspaceId)}&limit=${limit}&opt_fields=name,permalink_url`;
  } else if (action === "listTasks") {
    if (!params.projectId) {
      return { ok: false, error: "asana_list_tasks requires projectId." };
    }
    // Solo i campi che formatAsana legge davvero: name, completed e due_on.
    url = `https://app.asana.com/api/1.0/tasks?project=${encodeURIComponent(params.projectId)}&limit=${limit}&opt_fields=name,completed,due_on`;
  } else {
    if (!params.taskName) {
      return { ok: false, error: "asana_create_task requires taskName." };
    }
    if (!params.projectId && !params.workspaceId) {
      return { ok: false, error: "asana_create_task requires projectId or workspaceId." };
    }
    url = "https://app.asana.com/api/1.0/tasks";
    method = "POST";
    const data: Record<string, unknown> = { name: params.taskName, notes: params.notes ?? "" };
    if (params.projectId) data.projects = [params.projectId];
    else data.workspace = params.workspaceId;
    body = JSON.stringify({ data });
  }

  try {
    const res = await fetch(url, { method, headers, body });
    const json = (await res.json().catch(() => ({}))) as {
      data?: unknown;
      errors?: Array<{ message?: string }>;
    };
    if (!res.ok) {
      const message =
        json.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
        `${res.status} ${res.statusText}`;
      return { ok: false, error: `Asana API error: ${message}` };
    }
    return { ok: true, data: formatAsana(action, json.data) };
  } catch (e) {
    return {
      ok: false,
      error: `Asana network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Notion
// ---------------------------------------------------------------------------

const NOTION_API = "https://api.notion.com/v1";
// 2022-06-28 è la versione stabile e ampiamente supportata: non introduce
// cambiamenti di schema che romperebbero i blocchi (code/heading/paragraph).
const NOTION_VERSION = process.env.NOTION_API_VERSION || "2022-06-28";

export type NotionAction = "search" | "readPage" | "createPage" | "appendBlocks";

export type NotionParams = {
  query?: string;
  pageId?: string;
  title?: string;
  content?: string;
  limit?: number;
};

type NotionRichText = { plain_text?: string; text?: { content?: string } };

/** Testo di un blocco Notion: `rich_text` (parola) o `title` (heading), entrambi come array. */
function notionBlockText(block: Record<string, unknown>): string {
  const type = typeof block.type === "string" ? block.type : "";
  const payload = type
    ? (block[type] as { rich_text?: NotionRichText[]; title?: NotionRichText[] } | undefined)
    : undefined;
  const parts = payload?.rich_text ?? payload?.title ?? [];
  return parts.map((p) => p?.plain_text ?? p?.text?.content ?? "").join("").trim();
}

/** Estrae il titolo di una pagina Notion dalla property `title` (nome varia per database). */
function notionPageTitle(page: Record<string, unknown>): string {
  const props = (page.properties ?? {}) as Record<string, Record<string, unknown>>;
  for (const key of ["title", "Name", "Nome"]) {
    const prop = props[key];
    const t = prop?.title as NotionRichText[] | undefined;
    if (Array.isArray(t) && t.length > 0) {
      return t.map((p) => p?.plain_text ?? p?.text?.content ?? "").join("").trim();
    }
  }
  // Database con property title chiamata diversamente: prendo la prima che contiene testo.
  for (const prop of Object.values(props)) {
    const t = prop?.title as NotionRichText[] | undefined;
    if (Array.isArray(t) && t.length > 0) {
      return t.map((p) => p?.plain_text ?? p?.text?.content ?? "").join("").trim();
    }
  }
  return "";
}

/** Spezza il testo in paragrafi Notion (limite 2000 caratteri per rich_text). */
function notionParagraphs(text: string, max = 100): unknown[] {
  const chunks = text
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, max);
  return chunks.map((c) => {
    const content = c.slice(0, 2000);
    return {
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content } }] },
    };
  });
}

export async function notionApiProxy(
  action: NotionAction,
  params: NotionParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "notion");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const limit = clampLimit(params.limit);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${resolved.token.accessToken}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };

  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${NOTION_API}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { res, json };
  };

  const errorOf = (json: Record<string, unknown>, status: number, statusText: string) => {
    const j = json as { message?: string; code?: string };
    return `Notion API error: ${j.message || j.code || `${status} ${statusText}`}`;
  };

  try {
    if (action === "search") {
      const q = (params.query ?? "").trim();
      if (!q) return { ok: false, error: "notion_search requires a query." };
      const { res, json } = await call("POST", "/search", {
        query: q,
        page_size: limit,
        filter: { property: "object", value: "page" },
      });
      if (!res.ok) return { ok: false, error: errorOf(json, res.status, res.statusText) };
      const results = (json.results ?? []) as Record<string, unknown>[];
      if (results.length === 0) return { ok: true, data: `No Notion pages matching "${q}".` };
      return {
        ok: true,
        data: results
          .map((p) => {
            const title = notionPageTitle(p) || "(senza titolo)";
            const url = (p.url as string) || "";
            const edited = (p.last_edited_time as string) || "";
            return `- ${title} (id: ${p.id ?? "?"})${edited ? ` — aggiornata ${edited.slice(0, 10)}` : ""}${url ? `\n  ${url}` : ""}`;
          })
          .join("\n"),
      };
    }

    if (action === "readPage") {
      if (!params.pageId) return { ok: false, error: "notion_read_page requires pageId." };
      const pageId = params.pageId.replace(/-/g, "");
      const pageRes = await call("GET", `/pages/${pageId}`);
      if (!pageRes.res.ok) {
        return { ok: false, error: errorOf(pageRes.json, pageRes.res.status, pageRes.res.statusText) };
      }
      const title = notionPageTitle(pageRes.json) || "(senza titolo)";
      // I blocchi figli paginano: due richieste bastano per ~200 blocchi.
      let cursor: string | undefined;
      const lines: string[] = [];
      for (let page = 0; page < 2; page++) {
        const qs = new URLSearchParams({ page_size: "100" });
        if (cursor) qs.set("start_cursor", cursor);
        const childRes = await call("GET", `/blocks/${pageId}/children?${qs.toString()}`);
        if (!childRes.res.ok) break;
        const blocks = (childRes.json.results ?? []) as Record<string, unknown>[];
        for (const b of blocks) {
          const t = notionBlockText(b);
          if (t) lines.push(t);
        }
        cursor = childRes.json.next_cursor as string | undefined;
        if (!cursor || !childRes.json.has_more) break;
      }
      const body = lines.length > 0 ? lines.join("\n") : "(pagina vuota o solo blocchi non testuali)";
      const capped = body.length > 12000 ? `${body.slice(0, 12000)}\n… (contenuto troncato)` : body;
      const url = (pageRes.json.url as string) || "";
      return {
        ok: true,
        data: `Notion page: ${title}\n${url ? `${url}\n` : ""}\n${capped}`,
      };
    }

    if (action === "createPage") {
      if (!params.pageId) {
        return { ok: false, error: "notion_create_page requires pageId (the parent page)." };
      }
      if (!params.title?.trim()) {
        return { ok: false, error: "notion_create_page requires a title." };
      }
      const parentId = params.pageId.replace(/-/g, "");
      const title = params.title.trim().slice(0, 200);
      const { res, json } = await call("POST", "/pages", {
        parent: { type: "page_id", page_id: parentId },
        properties: { title: { title: [{ type: "text", text: { content: title } }] } },
        icon: { type: "emoji", emoji: "📄" },
        ...(params.content ? { children: notionParagraphs(params.content) } : {}),
      });
      if (!res.ok) {
        // Se il parent è un database, la property del titolo non si chiama
        // "title": l'errore di Notion lo dice, e va riportato al modello così
        // usa la property giusta invece di riprovare alla cieca.
        return { ok: false, error: errorOf(json, res.status, res.statusText) };
      }
      const url = (json.url as string) || "";
      return {
        ok: true,
        data: `Created Notion page: ${title} (id: ${json.id ?? "?"})${url ? ` — ${url}` : ""}`,
      };
    }

    // appendBlocks
    if (!params.pageId) return { ok: false, error: "notion_append_blocks requires pageId." };
    if (!params.content?.trim()) {
      return { ok: false, error: "notion_append_blocks requires content." };
    }
    const targetId = params.pageId.replace(/-/g, "");
    const { res, json } = await call("PATCH", `/blocks/${targetId}/children`, {
      children: notionParagraphs(params.content),
    });
    if (!res.ok) return { ok: false, error: errorOf(json, res.status, res.statusText) };
    return { ok: true, data: `Appended content to Notion block ${targetId}.` };
  } catch (e) {
    return {
      ok: false,
      error: `Notion network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Slack (Web API, bot token xoxb-)
// ---------------------------------------------------------------------------

const SLACK_API = "https://slack.com/api";

export type SlackAction = "listChannels" | "postMessage" | "readChannel";

export type SlackParams = {
  channel?: string;
  text?: string;
  threadTs?: string;
  limit?: number;
};

/**
 * Slack risponde sempre HTTP 200: il vero esito è in `ok:false` + `error`.
 * Riportare l'errore Slack verbatim è il modo più onesto — `missing_scope` e
 * `channel_not_found` spiegano esattamente cosa sistemare.
 */
function slackErrorMessage(json: Record<string, unknown>): string {
  const j = json as { error?: string; needed?: string; provided?: string };
  let msg = `Slack API error: ${j.error || "unknown_error"}`;
  if (j.needed) msg += ` (needed scope: ${j.needed}, provided: ${j.provided ?? "none"})`;
  if (j.error === "channel_not_found") {
    msg += " — the bot is not in that channel. Ask the user to invite the AgentCloud app to the channel, then retry.";
  }
  return msg;
}

export async function slackApiProxy(
  action: SlackAction,
  params: SlackParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "slack");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const limit = clampLimit(params.limit, 30);

  const call = async (method: "GET" | "POST", path: string, body?: URLSearchParams) => {
    const url = method === "GET" ? `${SLACK_API}${path}` : `${SLACK_API}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${resolved.token.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: body?.toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { res, json };
  };

  try {
    if (action === "listChannels") {
      const { res, json } = await call(
        "GET",
        `/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=${limit}`,
      );
      if (!res.ok) return { ok: false, error: slackErrorMessage(json) };
      if (json.ok === false) return { ok: false, error: slackErrorMessage(json) };
      const channels = (json.channels ?? []) as Array<{ id?: string; name?: string; is_private?: boolean; num_members?: number }>;
      if (channels.length === 0) {
        return {
          ok: true,
          data: "No Slack channels visible to the AgentCloud app. Ask the user to invite the app to a channel (e.g. /invite @AgentCloud), then retry.",
        };
      }
      return {
        ok: true,
        data: channels
          .map(
            (c) =>
              `- #${c.name ?? "?"} (id: ${c.id ?? "?"})${c.is_private ? " [private]" : ""}${c.num_members ? ` — ${c.num_members} membri` : ""}`,
          )
          .join("\n"),
      };
    }

    if (action === "postMessage") {
      if (!params.channel) return { ok: false, error: "slack_post_message requires channel." };
      if (!params.text?.trim()) return { ok: false, error: "slack_post_message requires text." };
      const body = new URLSearchParams({
        channel: params.channel,
        text: params.text.slice(0, 3800),
      });
      if (params.threadTs) body.set("thread_ts", params.threadTs);
      const { res, json } = await call("POST", "/chat.postMessage", body);
      if (!res.ok) return { ok: false, error: slackErrorMessage(json) };
      if (json.ok === false) return { ok: false, error: slackErrorMessage(json) };
      const permalink = (json as { message?: { permalink?: string } }).message?.permalink;
      const ts = (json as { ts?: string }).ts;
      return {
        ok: true,
        data: `Message sent to Slack channel ${params.channel}${ts ? ` (ts ${ts})` : ""}${permalink ? ` — ${permalink}` : ""}`,
      };
    }

    // readChannel
    if (!params.channel) return { ok: false, error: "slack_read_channel requires channel." };
    const { res, json } = await call(
      "GET",
      `/conversations.history?channel=${encodeURIComponent(params.channel)}&limit=${limit}`,
    );
    if (!res.ok) return { ok: false, error: slackErrorMessage(json) };
    if (json.ok === false) return { ok: false, error: slackErrorMessage(json) };
    const messages = (json.messages ?? []) as Array<{
      text?: string;
      user?: string;
      ts?: string;
      bot_id?: string;
    }>;
    if (messages.length === 0) return { ok: true, data: "No messages found in that channel." };
    return {
      ok: true,
      data: messages
        .map((m) => {
          const who = m.bot_id ? "bot" : m.user ?? "?";
          return `- [${who}] ${(m.text ?? "").replace(/\s+/g, " ").slice(0, 400)}`;
        })
        .join("\n"),
    };
  } catch (e) {
    return {
      ok: false,
      error: `Slack network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// HubSpot (CRM v3)
// ---------------------------------------------------------------------------

const HUBSPOT_API = "https://api.hubapi.com";

export type HubspotAction =
  | "searchContacts"
  | "getContact"
  | "createContact"
  | "updateContact"
  | "listCompanies";

export type HubspotParams = {
  query?: string;
  email?: string;
  contactId?: string;
  properties?: string;
  values?: string;
  limit?: number;
};

/** Proprietà contatto restituite quando il modello non ne specifica: il minimo per capire un lead. */
const DEFAULT_CONTACT_PROPS = [
  "email",
  "firstname",
  "lastname",
  "company",
  "phone",
  "lifecyclestage",
  "hs_lead_status",
  "createdate",
];

const HUBSPOT_STATUS_LABEL: Record<string, string> = {
  new: "new",
  open: "open (non contattato)",
  in_progress: "in progress",
  open_deal: "open deal",
  connected: "connected",
  bad_timing: "bad timing",
  unqualified: "unqualified",
  attempt_to_contact: "attempt to contact",
  connected_to_sales: "connected to sales",
};

function hubspotErrorMessage(json: unknown, status: number, statusText: string): string {
  const j = json as { message?: string; category?: string; errors?: Array<{ message?: string }> };
  const detail = j.errors?.map((e) => e.message).filter(Boolean).join("; ") || j.message;
  return `HubSpot API error: ${detail || `${status} ${statusText}`}`;
}

/** `values` è una lista `chiave=valore` (separate da `;`) per non far passare JSON grezzo dal modello. */
function parseHubspotValues(raw: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of (raw ?? "").split(";")) {
    const i = pair.indexOf("=");
    if (i <= 0) continue;
    const k = pair.slice(0, i).trim();
    const v = pair.slice(i + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}

function formatHubspotContact(props: Record<string, unknown>): string {
  const g = (k: string) => {
    const v = props[k];
    return v === null || v === undefined || v === "" ? "-" : String(v);
  };
  const name = [g("firstname"), g("lastname")].filter((x) => x !== "-").join(" ") || "-";
  const stage = g("lifecyclestage");
  const stageLabel = HUBSPOT_STATUS_LABEL[stage] ?? stage;
  return `- ${g("email")} | ${name} | company: ${g("company")} | phone: ${g("phone")} | stage: ${stageLabel}${g("id") ? ` | id: ${g("id")}` : ""}`;
}

export async function hubspotApiProxy(
  action: HubspotAction,
  params: HubspotParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "hubspot");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const limit = clampLimit(params.limit, 20);
  const props = (params.properties?.trim() || DEFAULT_CONTACT_PROPS.join(","))
    .split(/[,\s]+/)
    .filter(Boolean);

  const call = async (method: "GET" | "POST" | "PATCH", path: string, body?: unknown) => {
    const res = await fetch(`${HUBSPOT_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${resolved.token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as unknown;
    return { res, json };
  };

  try {
    if (action === "searchContacts") {
      const q = (params.query ?? "").trim();
      // Senza query: filtro esplicito per non far fallire la ricerca (HubSpot
      // rifiuta un filterGroups vuoto con 400).
      const filterGroups = q
        ? [
            {
              filters: [
                {
                  propertyName: "email",
                  operator: "CONTAINS_TOKEN",
                  value: q,
                },
              ],
            },
          ]
        : [{ filters: [] }];
      const { res, json } = await call("POST", "/crm/v3/objects/contacts/search", {
        filterGroups,
        properties: props,
        limit,
      });
      if (!res.ok) return { ok: false, error: hubspotErrorMessage(json, res.status, res.statusText) };
      const results = (json as { results?: Array<{ id?: string; properties?: Record<string, unknown> }> }).results ?? [];
      if (results.length === 0) {
        return { ok: true, data: `No HubSpot contacts matching "${q}".` };
      }
      return {
        ok: true,
        data: results
          .map((c) => formatHubspotContact({ ...(c.properties ?? {}), id: c.id }))
          .join("\n"),
      };
    }

    if (action === "getContact") {
      const id = params.contactId?.trim() || params.email?.trim();
      if (!id) return { ok: false, error: "hubspot_get_contact requires contactId or email." };
      const path = id.includes("@")
        ? `/crm/v3/objects/contacts/${encodeURIComponent(id)}?idProperty=email&properties=${props.join(",")}`
        : `/crm/v3/objects/contacts/${encodeURIComponent(id)}?properties=${props.join(",")}`;
      const { res, json } = await call("GET", path);
      if (!res.ok) return { ok: false, error: hubspotErrorMessage(json, res.status, res.statusText) };
      const c = json as { id?: string; properties?: Record<string, unknown> };
      return { ok: true, data: formatHubspotContact({ ...(c.properties ?? {}), id: c.id }) };
    }

    if (action === "createContact") {
      const values = parseHubspotValues(params.values);
      const email = params.email?.trim() || values.email;
      if (!email) {
        return { ok: false, error: "hubspot_create_contact requires an email (use values=email=...;firstname=...)." };
      }
      if (!email.includes("@")) {
        return { ok: false, error: `Invalid email "${email}": a contact cannot be created without a valid email.` };
      }
      const properties: Record<string, string> = { ...values, email };
      const { res, json } = await call("POST", "/crm/v3/objects/contacts", { properties });
      if (!res.ok) {
        // Conflict su email: il modello deve saperlo e non creare duplicati.
        const msg = hubspotErrorMessage(json, res.status, res.statusText);
        if (res.status === 409) {
          return {
            ok: false,
            error: `${msg} — a contact with this email already exists. Use hubspot_get_contact (email) to read it instead of creating a duplicate.`,
          };
        }
        return { ok: false, error: msg };
      }
      const c = json as { id?: string; properties?: Record<string, unknown> };
      return {
        ok: true,
        data: `Created HubSpot contact: ${formatHubspotContact({ ...(c.properties ?? {}), id: c.id })}`,
      };
    }

    if (action === "updateContact") {
      const id = params.contactId?.trim() || params.email?.trim();
      if (!id) return { ok: false, error: "hubspot_update_contact requires contactId or email." };
      const values = parseHubspotValues(params.values);
      if (Object.keys(values).length === 0) {
        return { ok: false, error: "hubspot_update_contact requires values (key=value;key=value)." };
      }
      const path = id.includes("@")
        ? `/crm/v3/objects/contacts/${encodeURIComponent(id)}?idProperty=email`
        : `/crm/v3/objects/contacts/${encodeURIComponent(id)}`;
      const { res, json } = await call("PATCH", path, { properties: values });
      if (!res.ok) return { ok: false, error: hubspotErrorMessage(json, res.status, res.statusText) };
      const c = json as { id?: string; properties?: Record<string, unknown> };
      return {
        ok: true,
        data: `Updated HubSpot contact: ${formatHubspotContact({ ...(c.properties ?? {}), id: c.id })}`,
      };
    }

    // listCompanies
    const { res, json } = await call(
      "GET",
      `/crm/v3/objects/companies?limit=${limit}&properties=name,domain,industry,city,country`,
    );
    if (!res.ok) return { ok: false, error: hubspotErrorMessage(json, res.status, res.statusText) };
    const results = (json as { results?: Array<{ id?: string; properties?: Record<string, unknown> }> }).results ?? [];
    if (results.length === 0) return { ok: true, data: "No HubSpot companies found." };
    return {
      ok: true,
      data: results
        .map((c) => {
          const p = c.properties ?? {};
          return `- ${p.name ?? p.domain ?? "?"}${p.domain ? ` (${p.domain})` : ""}${p.industry ? ` — ${p.industry}` : ""}${p.city ? `, ${p.city}` : ""}${c.id ? ` | id: ${c.id}` : ""}`;
        })
        .join("\n"),
    };
  } catch (e) {
    return {
      ok: false,
      error: `HubSpot network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
