import { createAdminClient } from "@/lib/supabase/admin";
import { decryptMaybe, encryptToken } from "@/lib/integrations/encryption";

/**
 * Integrations API proxy — GitHub / ClickUp / Asana (chiamate dirette, no Edge).
 *
 * Perché esiste: gli agenti non devono mai toccare OAuth o token. Questo modulo
 * è il gemello di `lib/google/api-proxy.ts` e `lib/google/sheets.ts` per il
 * layer `tenant_integrations`: decripta l'access token del tenant, lo rinfresca
 * se scaduto (solo Asana, gli altri non scadono) e chiama l'API del provider
 * restituendo testo compatto e leggibile per il modello.
 */

export type GenericProvider = "github" | "clickup" | "asana";

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
};

type ResolvedToken = { accessToken: string; account: string | null };

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

/** Etichetta umana del provider, usata nei messaggi che il modello riporta all'utente. */
const PROVIDER_LABEL: Record<GenericProvider, string> = {
  github: "GitHub",
  clickup: "ClickUp",
  asana: "Asana",
};

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

/** Rinfresca l'access token Asana (unico provider con token a scadenza tra questi). */
async function refreshAsana(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: string | null } | null> {
  const clientId = process.env.ASANA_CLIENT_ID;
  const clientSecret = process.env.ASANA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://app.asana.com/-/oauth_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) return null;
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
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
  const label = PROVIDER_LABEL[provider];
  const none = (): ResolvedIntegration => ({ ok: false, error: notConnectedError(label) });

  if (!tenantId) return none();
  const admin = createAdminClient();
  if (!admin) return none();

  const { data, error } = await admin
    .from("tenant_integrations")
    .select("status, access_token, refresh_token, expires_at, external_account_id")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !data) return none();

  const row = data as IntegrationRow;
  if (row.status && row.status !== "connected") return none();

  const accessToken = decryptMaybe(row.access_token);
  if (!accessToken) return none();

  const refreshToken = decryptMaybe(row.refresh_token);
  if (provider === "asana" && refreshToken && shouldRefresh(row.expires_at)) {
    const refreshed = await refreshAsana(refreshToken);
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
      token: { accessToken: refreshed.accessToken, account: row.external_account_id },
    };
  }

  return { ok: true, token: { accessToken, account: row.external_account_id } };
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
