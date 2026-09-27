import { createAdminClient } from "@/lib/supabase/admin";
import { decryptMaybe, encryptToken } from "@/lib/integrations/encryption";

/**
 * Integrations API proxy — GitHub / Linear / Asana (chiamate dirette, no Edge).
 *
 * Perché esiste: gli agenti non devono mai toccare OAuth o token. Questo modulo
 * è il gemello di `lib/google/api-proxy.ts` e `lib/google/sheets.ts` per il
 * layer `tenant_integrations`: decripta l'access token del tenant, lo rinfresca
 * se scaduto (solo Asana, gli altri non scadono) e chiama l'API del provider
 * restituendo testo compatto e leggibile per il modello.
 */

export type GenericProvider = "github" | "linear" | "asana";

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

function notConnected(name: string): IntegrationApiResult {
  return {
    ok: false,
    error: `No ${name} account connected. Ask the user to connect ${name} from the dashboard (Integrations), then retry.`,
  };
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
): Promise<ResolvedToken | null> {
  if (!tenantId) return null;
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("tenant_integrations")
    .select("status, access_token, refresh_token, expires_at, external_account_id")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as IntegrationRow;
  if (row.status && row.status !== "connected") return null;

  let accessToken = decryptMaybe(row.access_token);
  if (!accessToken) return null;

  const refreshToken = decryptMaybe(row.refresh_token);
  if (refreshToken && shouldRefresh(row.expires_at)) {
    const refreshed = provider === "asana" ? await refreshAsana(refreshToken) : null;
    if (refreshed?.accessToken) {
      accessToken = refreshed.accessToken;
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
    }
  }

  return { accessToken, account: row.external_account_id };
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
  const token = await resolveIntegrationToken(tenantId, "github");
  if (!token) return notConnected("GitHub");

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
// Linear (GraphQL)
// ---------------------------------------------------------------------------

export type LinearAction = "listTeams" | "listIssues" | "createIssue";

export type LinearParams = {
  teamId?: string;
  title?: string;
  description?: string;
  limit?: number;
};

function formatLinear(action: LinearAction, data: unknown): string {
  if (action === "listTeams") {
    const teams =
      (data as { teams?: { nodes?: Array<{ id?: string; name?: string; key?: string }> } })?.teams
        ?.nodes ?? [];
    if (teams.length === 0) return "No Linear teams found.";
    return teams.map((t) => `- ${t.name ?? "?"} (${t.key ?? "?"}) — id: ${t.id ?? "?"}`).join("\n");
  }
  if (action === "listIssues") {
    const issues =
      (data as {
        issues?: {
          nodes?: Array<{
            title?: string;
            state?: { name?: string };
            team?: { name?: string };
            url?: string;
          }>;
        };
      })?.issues?.nodes ?? [];
    if (issues.length === 0) return "No Linear issues found.";
    return issues
      .map(
        (i) =>
          `- ${i.title ?? "?"} [${i.state?.name ?? "?"}]${i.team?.name ? ` · ${i.team.name}` : ""}${i.url ? `\n  ${i.url}` : ""}`,
      )
      .join("\n");
  }
  const issue = (
    data as { issueCreate?: { success?: boolean; issue?: { title?: string; url?: string } } }
  )?.issueCreate;
  if (issue?.success && issue.issue) {
    return `Created Linear issue: ${issue.issue.title ?? ""}${issue.issue.url ? ` — ${issue.issue.url}` : ""}`;
  }
  return "Linear issue creation failed.";
}

export async function linearApiProxy(
  action: LinearAction,
  params: LinearParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const token = await resolveIntegrationToken(tenantId, "linear");
  if (!token) return notConnected("Linear");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.accessToken}`,
    "Content-Type": "application/json",
  };

  let query = "";
  let variables: Record<string, unknown> = {};

  if (action === "listTeams") {
    query = `query { teams { nodes { id name key description } } }`;
  } else if (action === "listIssues") {
    query = `query ListIssues($first: Int) { issues(first: $first) { nodes { id title state { name } team { id name key } assignee { name email } updatedAt url } } }`;
    variables = { first: clampLimit(params.limit) };
  } else {
    if (!params.title || !params.teamId) {
      return { ok: false, error: "linear_create_issue requires title and teamId." };
    }
    query = `mutation CreateIssue($title: String!, $teamId: ID!, $description: String) { issueCreate(input: { title: $title, teamId: $teamId, description: $description }) { success issue { id title url } } }`;
    variables = { title: params.title, teamId: params.teamId, description: params.description ?? "" };
  }

  try {
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: unknown;
      errors?: Array<{ message?: string }>;
    };
    if (!res.ok || json.errors) {
      const message =
        json.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
        `${res.status} ${res.statusText}`;
      return { ok: false, error: `Linear API error: ${message}` };
    }
    return { ok: true, data: formatLinear(action, json.data) };
  } catch (e) {
    return {
      ok: false,
      error: `Linear network error: ${e instanceof Error ? e.message : String(e)}`,
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
  const token = await resolveIntegrationToken(tenantId, "asana");
  if (!token) return notConnected("Asana");

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
    url = `https://app.asana.com/api/1.0/projects?workspace=${encodeURIComponent(params.workspaceId)}&limit=${limit}&opt_fields=name,archived,permalink_url`;
  } else if (action === "listTasks") {
    if (!params.projectId) {
      return { ok: false, error: "asana_list_tasks requires projectId." };
    }
    url = `https://app.asana.com/api/1.0/tasks?project=${encodeURIComponent(params.projectId)}&limit=${limit}&opt_fields=name,completed,assignee,due_on,permalink_url`;
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
