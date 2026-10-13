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
import crypto from "crypto";
import { checkUpsertConsent, checkCampaignCompliance } from "./mailchimp/compliance";
import { decryptMaybe, encryptToken } from "@/lib/integrations/encryption";
import { getProvider } from "./registry";
import { getCatalogEntry, PROVIDER_CATALOG } from "./catalog";
import { authHeader, providerRequest } from "./http";
import { normalizeTenantUrl, assertPublicHost, type UrlValidation } from "./safe-url";
import type { TokenUsage } from "./types";
import {
  formatOrder,
  formatProduct,
  fromWooOrder,
  fromWooProduct,
  parseAmount,
} from "@/lib/commerce/normalize";

/**
 * Provider serviti dal proxy condiviso. `google_sheets` è escluso di proposito:
 * ha un modulo dedicato (src/lib/google/sheets.ts) e le sue tool stanno in
 * tools.ts, non in integration-tools.ts.
 *
 * Derivato dal catalogo invece che scritto a mano, così aggiungere un provider
 * con `hasApiProxy: true` senza scrivere il proxy non passa il typecheck.
 *
 * Nota: funziona perché `PROVIDER_CATALOG` è `as const` e NON ha
 * l'annotazione `: readonly ProviderCatalogEntry[]`: quell'annotazione
 * allargherebbe `hasApiProxy` a `boolean` e `Extract` darebbe `never`.
 */
export type GenericProvider = Extract<
  (typeof PROVIDER_CATALOG)[number],
  { hasApiProxy: true }
>["id"];

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
  /** Scadenza salvata, null se il token non scade. Utile per i provider senza rinnovo. */
  expiresAt: string | null;
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
function providerLabel(provider: string): string {
  return getCatalogEntry(provider)?.label ?? provider;
}

/** True se un token con questa scadenza va rinfrescato ora (null = non scade). */
function shouldRefresh(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return false;
  return expiry - Date.now() <= REFRESH_MARGIN_MS;
}

/** True se la scadenza è nel passato. Usata per i provider senza refresh token. */
function isPast(iso: string): boolean {
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t <= Date.now();
}

function clampLimit(limit: number | undefined, fallback = 20): number {
  return Math.min(MAX_ITEMS, Math.max(1, limit ?? fallback));
}

/**
 * Rinfresca l'access token tramite l'adapter del provider. Restituisce null se il
 * provider non espone `refreshToken` (GitHub / ClickUp / Notion / Slack: token
 * senza scadenza) o se le credenziali OAuth mancano.
 *
 * `metadata` viene passato all'adapter: alcuni provider rinnovano su un endpoint
 * che dipende da un dato noto solo al momento dell'autorizzazione (Mailchimp
 * usa il data center nella URL del refresh).
 */
async function refreshViaAdapter(
  provider: string,
  refreshToken: string,
  metadata: Record<string, unknown>,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
} | null> {
  const adapter = getProvider(provider);
  if (!adapter?.refreshToken) return null;
  try {
    const r = await adapter.refreshToken({ refreshToken, metadata });
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
  // `string` e non `GenericProvider` di proposito: anche i provider con modulo
  // dedicato (google_sheets, microsoft_outlook) riusano decrypt/refresh da qui.
  // `getProvider`/`getCatalogEntry` accettano già stringhe, quindi nessun
  // controllo si perde: un provider sconosciuto dà riga assente → "non connesso".
  provider: string,
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
    const refreshed = await refreshViaAdapter(provider, refreshToken, metadata);
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
        expiresAt: row.expires_at,
      },
    };
  }

  // Token scaduto e NIENTE con cui rinnovarlo: alcuni provider non emettono
  // refresh token (Trello scade dopo 30 giorni e non ha rinnovo). Prima si
  // restituiva `ok` con il token morto e il proxy mandava la richiesta,
  // arrivando a un 401 che il modello non può spiegare all'utente. Qui si
  // dice subito cosa fare, che è la stessa forma del messaggio già usata
  // quando il refresh fallisce.
  if (!refreshToken && row.expires_at && isPast(row.expires_at)) {
    const when = new Date(row.expires_at).toISOString().slice(0, 10);
    return {
      ok: false,
      error: `The ${label} connection expired on ${when} and ${label} does not issue refresh tokens. Ask the user to reconnect ${label} from the dashboard (Integrations), then retry.`,
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
      expiresAt: row.expires_at,
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

// ---------------------------------------------------------------------------
// Google Drive
// ---------------------------------------------------------------------------

export type DriveAction = "searchFiles" | "readFile" | "listFolder";

export type DriveParams = {
  /** Testo libero per drive.files.list (q) o contenuto da cercare. */
  query?: string;
  /** ID del file/cartella. */
  fileId?: string;
  /** ID della cartella per listFolder. */
  folderId?: string;
  limit?: number;
};

const DRIVE_API = "https://www.googleapis.com/drive/v3";
/** I campi minimi per descrivere un file. `webViewLink` è il link "apri in Drive". */
const DRIVE_FIELDS = "files(id,name,mimeType,size,modifiedTime,webViewLink,parents)";

/** Limite di caratteri per un file letto: il modello non deve ricevere 5 MB di testo. */
const MAX_READ_CHARS = 20_000;

/**
 * I Google Docs/Sheets/Slides non si scaricano: `files.get?alt=media` restituisce
 * il binario. Per quelli va usato `export`, che converte in testo/CSV/PDF.
 */
function exportMimeType(mimeType: string): string | null {
  if (mimeType === "application/vnd.google-apps.document") {
    return "text/plain";
  }
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    // export di uno Sheet: la prima scheda in CSV è la forma più leggibile
    return "text/csv";
  }
  if (mimeType === "application/vnd.google-apps.presentation") {
    return "text/plain";
  }
  return null;
}

/** File che non ha senso restituire come testo (immagini, video, archivi). */
function isBinaryMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType.includes("zip") ||
    mimeType.includes("compressed") ||
    mimeType.includes("application/x-")
  );
}

function formatDriveFile(f: {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}): string {
  const kind = f.mimeType === "application/vnd.google-apps.folder" ? "folder" : f.mimeType;
  return [
    `- ${f.name ?? "?"} (${kind})`,
    f.id ? `  id: ${f.id}` : "",
    f.size ? `  size: ${f.size}B` : "",
    f.modifiedTime ? `  modified: ${f.modifiedTime}` : "",
    f.webViewLink ? `  ${f.webViewLink}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Traduce una ricerca in linguaggio naturale nella sintassi di Drive (`q`).
 * Senza questo il modello dovrebbe ricordarsi la sintassi (`name contains 'x'`,
 * `mimeType = '...'`) a ogni chiamata: è fragile e produce query sbagliate.
 * Con contiene solo AND di termini, che è il 90% delle richieste reali.
 */
function buildDriveQuery(query: string, folderId?: string): string {
  const parts: string[] = ["trashed = false"];
  const terms = query
    .split(/\s+/)
    .map((t) => t.replace(/["\\]/g, " ").trim())
    .filter(Boolean);
  for (const t of terms) parts.push(`name contains '${t}'`);
  // Se il tenant ha indicato una cartella, restringiamo la ricerca a quella.
  if (folderId) parts.push(`'${folderId}' in parents`);
  return parts.join(" and ");
}

export async function driveApiProxy(
  action: DriveAction,
  params: DriveParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "google_drive");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;

  const limit = clampLimit(params.limit);
  const headers = {
    Authorization: integrationAuth(token),
    Accept: "application/json",
  };

  if (action === "searchFiles" || action === "listFolder") {
    // listFolder senza cartella = ricerca in "My Drive" (assenti i parent).
    const q = action === "listFolder"
      ? `trashed = false${params.folderId ? ` and '${params.folderId}' in parents` : ""}`
      : buildDriveQuery(params.query ?? "", params.folderId);
    const url = new URL(`${DRIVE_API}/files`);
    url.searchParams.set("q", q);
    url.searchParams.set("fields", `files(${DRIVE_FIELDS}),nextPageToken`);
    url.searchParams.set("pageSize", String(limit));
    url.searchParams.set("orderBy", "modifiedTime desc");
    // Coroutine: i risultati senza padroni non appaiono nel riquadro sinistro e
    // sono quasi sempre ciò che l'utente sta cercando ("i miei documenti").
    url.searchParams.set("corpora", "user");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");

    const res = await providerRequest(url.toString(), {
      headers,
      providerLabel: "Google Drive",
    });
    if (!res.ok) return { ok: false, error: res.error! };

    const files = (res.json as { files?: DriveFile[] } | undefined)?.files ?? [];
    if (files.length === 0) {
      return {
        ok: true,
        data: action === "listFolder"
          ? "The folder is empty (or not accessible with this account)."
          : "No Google Drive files matched.",
      };
    }
    const header =
      action === "listFolder"
        ? `${files.length} item(s) in the folder:`
        : `${files.length} file(s) matching "${params.query ?? ""}":`;
    return { ok: true, data: `${header}\n${files.map(formatDriveFile).join("\n")}` };
  }

  // readFile
  const fileId = (params.fileId ?? "").trim();
  if (!fileId) return { ok: false, error: "drive_read_file requires fileId." };

  // 1. Metadati: servono nome, mimeType (per scegliere export vs download) e link.
  const metaRes = await providerRequest(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(DRIVE_FIELDS)}`,
    { headers, providerLabel: "Google Drive" },
  );
  if (!metaRes.ok) return { ok: false, error: metaRes.error! };

  const meta = metaRes.json as DriveFile | undefined;
  const mimeType = meta?.mimeType ?? "";
  const name = meta?.name ?? fileId;

  if (isBinaryMimeType(mimeType)) {
    return {
      ok: true,
      data: `"${name}" is a ${mimeType} file, not text — its content cannot be read as text. Link: ${meta?.webViewLink ?? "n/a"}`,
    };
  }

  // 2. Contenuto: export per i Google-native, download diretto per il resto.
  const exportType = exportMimeType(mimeType);
  const contentUrl = exportType
    ? `${DRIVE_API}/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportType)}`
    : `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`;

  const contentRes = await providerRequest(contentUrl, {
    headers: { Authorization: integrationAuth(token) },
    providerLabel: "Google Drive",
  });
  if (!contentRes.ok) return { ok: false, error: contentRes.error! };

  const text = contentRes.text;
  if (!text.trim()) {
    return { ok: true, data: `"${name}" is empty.` };
  }

  // 3. Troncamento esplicito: il modello deve sapere che sta leggendo un estratto,
  //    altrimenti risponderebbe con la certezza di aver letto tutto il file.
  const truncated = text.length > MAX_READ_CHARS;
  const body = truncated ? text.slice(0, MAX_READ_CHARS) : text;
  const notice = truncated
    ? `\n\n[Content truncated at ${MAX_READ_CHARS} characters of ${text.length} total. Ask for a specific section to read further.]`
    : "";

  return {
    ok: true,
    data: `"${name}" (${mimeType || "unknown"})${meta?.webViewLink ? ` — ${meta.webViewLink}` : ""}\n\n${body}${notice}`,
  };
}

type DriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
};

// ---------------------------------------------------------------------------
// Google Docs
// ---------------------------------------------------------------------------

export type DocsAction =
  | "createDocument"
  | "readDocument"
  | "appendContent"
  | "replaceText"
  | "insertTable"
  | "exportPdf";

export type DocsParams = {
  /** Titolo per createDocument. */
  title?: string;
  /** Contenuto Markdown per createDocument/appendContent. */
  markdown?: string;
  /** ID documento (da create o comunicato dall'utente). */
  documentId?: string;
  /** Testo da sostituire (replaceText). */
  find?: string;
  /** Testo sostitutivo (replaceText). */
  replace?: string;
  /** Tabella: righe di celle (insertTable). */
  rows?: string[][];
  limit?: number;
};

const DOCS_API = "https://docs.googleapis.com/v1/documents";
const DRIVE_FILES_API = "https://www.googleapis.com/drive/v3/files";

/** Limite di caratteri restituiti al modello in lettura (come Drive). */
const DOCS_MAX_READ_CHARS = 20_000;

/**
 * Convertitore Markdown -> richieste Docs API (modulo puro e testabile senza
 * token: ./google/docs-markdown.ts). Qui restano import e re-export per chi
 * importava da questo modulo.
 */
import {
  parseDocsMarkdown,
  textBlocksToDocsRequests,
  docsBodyToText,
  type DocsBlock,
  type DocsTableBlock,
  type DocsTextBlock,
} from "./google/docs-markdown";
import {
  buildAddQuestionRequest,
  summarizeResponses,
  type FormsRequest,
} from "./google/forms-questions";
import {
  sanitizeGaReportInput,
  formatGaRows,
  detectGaAnomalies,
  type GaRow,
} from "./google/analytics-report";

export { parseDocsMarkdown, textBlocksToDocsRequests, docsBodyToText };
export type { DocsBlock, DocsTableBlock, DocsTextBlock };

type DocsRequest = Record<string, unknown>;

function docsError(status: number, json: unknown, fallback: string): string {
  const msg = (json as { error?: { message?: string } } | null)?.error?.message;
  if (status === 403) {
    return `${msg ?? fallback} — Se hai collegato solo Google Drive, collega anche Google Docs dalla dashboard Integrazioni: serve il permesso sui documenti.`;
  }
  return msg ?? `${fallback} (${status})`;
}

async function docsGetEndIndex(
  documentId: string,
  headers: Record<string, string>,
): Promise<{ ok: true; endIndex: number } | { ok: false; error: string }> {
  const res = await providerRequest(
    `${DOCS_API}/${encodeURIComponent(documentId)}?fields=body.content.endIndex`,
    { headers, providerLabel: "Google Docs" },
  );
  if (!res.ok) {
    return { ok: false, error: docsError(res.status, res.json, "Google Docs: lettura documento fallita") };
  }
  const content = (res.json as { body?: { content?: { endIndex?: number }[] } } | undefined)?.body?.content;
  const last = content?.[content.length - 1];
  const endIndex = typeof last?.endIndex === "number" ? last.endIndex : 1;
  return { ok: true, endIndex };
}

async function docsBatchUpdate(
  documentId: string,
  headers: Record<string, string>,
  requests: DocsRequest[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await providerRequest(`${DOCS_API}/${encodeURIComponent(documentId)}:batchUpdate`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
    providerLabel: "Google Docs",
  });
  if (!res.ok) {
    return { ok: false, error: docsError(res.status, res.json, "Google Docs: scrittura fallita") };
  }
  return { ok: true };
}

function docsLink(documentId: string): string {
  return `https://docs.google.com/document/d/${documentId}/edit`;
}

export async function docsApiProxy(
  action: DocsAction,
  params: DocsParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "google_docs");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;
  const headers = {
    Authorization: integrationAuth(token),
    Accept: "application/json",
  };
  const label = "Google Docs";

  // --- createDocument -------------------------------------------------------
  if (action === "createDocument") {
    const title = (params.title ?? "").trim() || "Documento senza titolo";
    const createRes = await providerRequest(DRIVE_FILES_API, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: title.slice(0, 200),
        mimeType: "application/vnd.google-apps.document",
      }),
      providerLabel: label,
    });
    if (!createRes.ok) {
      return { ok: false, error: docsError(createRes.status, createRes.json, "Google Docs: creazione fallita") };
    }
    const documentId = (createRes.json as { id?: string } | undefined)?.id;
    if (!documentId) return { ok: false, error: "Google Docs: risposta creazione inattesa" };

    // Contenuto iniziale: i blocchi di testo in un batch, le tabelle una a una
    // in fondo (con endIndex riletto: gli indici delle tabelle non sono
    // calcolabili in anticipo in modo affidabile).
    const blocks = parseDocsMarkdown(params.markdown ?? "");
    const textBlocks = blocks.filter((b): b is DocsTextBlock => b.kind !== "table");
    const tableBlocks = blocks.filter((b): b is DocsTableBlock => b.kind === "table");
    if (textBlocks.length > 0) {
      const { requests } = textBlocksToDocsRequests(textBlocks, 1);
      const w = await docsBatchUpdate(documentId, headers, requests);
      if (!w.ok) return { ok: false, error: w.error };
    }
    for (const t of tableBlocks) {
      const w = await docsInsertTable(documentId, headers, t.rows);
      if (!w.ok) return { ok: false, error: w.error };
    }
    return {
      ok: true,
      data: `Documento creato: "${title}"\n${docsLink(documentId)}\nid: ${documentId}`,
    };
  }

  const documentId = (params.documentId ?? "").trim();
  if (!documentId) return { ok: false, error: "docs tool requires documentId (create one first with docs_create_document)." };

  // --- readDocument ----------------------------------------------------------
  if (action === "readDocument") {
    const res = await providerRequest(
      `${DOCS_API}/${encodeURIComponent(documentId)}?fields=title,body`,
      { headers, providerLabel: label },
    );
    if (!res.ok) {
      return { ok: false, error: docsError(res.status, res.json, "Google Docs: lettura fallita") };
    }
    const title = (res.json as { title?: string } | undefined)?.title ?? documentId;
    const { text, truncated } = docsBodyToText(res.json, DOCS_MAX_READ_CHARS);
    if (!text.trim()) return { ok: true, data: `"${title}" è vuoto.` };
    return {
      ok: true,
      data: `"${title}"\n${docsLink(documentId)}\n\n${text}${truncated ? `\n\n[Contenuto troncato a ${DOCS_MAX_READ_CHARS} caratteri. Chiedi una sezione specifica per continuare.]` : ""}`,
    };
  }

  // --- appendContent ----------------------------------------------------------
  if (action === "appendContent") {
    const blocks = parseDocsMarkdown(params.markdown ?? "");
    const textBlocks = blocks.filter((b): b is DocsTextBlock => b.kind !== "table");
    const tableBlocks = blocks.filter((b): b is DocsTableBlock => b.kind === "table");
    if (textBlocks.length === 0 && tableBlocks.length === 0) {
      return { ok: false, error: "docs_append_to_document requires markdown content." };
    }
    if (textBlocks.length > 0) {
      const end = await docsGetEndIndex(documentId, headers);
      if (!end.ok) return { ok: false, error: end.error };
      const { requests } = textBlocksToDocsRequests(textBlocks, Math.max(1, end.endIndex - 1));
      const w = await docsBatchUpdate(documentId, headers, requests);
      if (!w.ok) return { ok: false, error: w.error };
    }
    for (const t of tableBlocks) {
      const w = await docsInsertTable(documentId, headers, t.rows);
      if (!w.ok) return { ok: false, error: w.error };
    }
    return { ok: true, data: `Contenuto aggiunto.\n${docsLink(documentId)}` };
  }

  // --- replaceText -------------------------------------------------------------
  if (action === "replaceText") {
    const find = (params.find ?? "").trim();
    const replace = params.replace ?? "";
    if (!find) return { ok: false, error: "docs_replace_text requires find." };
    const w = await docsBatchUpdate(documentId, headers, [
      { replaceAllText: { containsText: { text: find, matchCase: false }, replaceText: replace } },
    ]);
    if (!w.ok) return { ok: false, error: w.error };
    return { ok: true, data: `Testo sostituito ("${find.slice(0, 80)}").\n${docsLink(documentId)}` };
  }

  // --- insertTable --------------------------------------------------------------
  if (action === "insertTable") {
    const rows = (params.rows ?? [])
      .map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "").slice(0, 2000)) : []))
      .filter((r) => r.length > 0)
      .slice(0, 30);
    if (rows.length === 0) return { ok: false, error: "docs_insert_table requires rows (array of arrays of strings)." };
    const cols = Math.min(10, Math.max(...rows.map((r) => r.length)));
    const norm = rows.map((r) => [...r, ...Array(Math.max(0, cols - r.length)).fill("")].slice(0, cols));
    const w = await docsInsertTable(documentId, headers, norm);
    if (!w.ok) return { ok: false, error: w.error };
    return { ok: true, data: `Tabella inserita (${norm.length}×${cols}).\n${docsLink(documentId)}` };
  }

  // --- exportPdf ------------------------------------------------------------------
  // Il binario PDF non può transitare dal risultato testuale del tool: si
  // restituisce il link al documento con le istruzioni di download (File >
  // Scarica > PDF). Onesto invece di un link export che richiederebbe il token.
  const metaRes = await providerRequest(
    `${DRIVE_FILES_API}/${encodeURIComponent(documentId)}?fields=id,name,webViewLink`,
    { headers, providerLabel: label },
  );
  if (!metaRes.ok) {
    return { ok: false, error: docsError(metaRes.status, metaRes.json, "Google Docs: export fallito") };
  }
  const meta = metaRes.json as { name?: string; webViewLink?: string } | undefined;
  return {
    ok: true,
    data: `Per scaricare "${meta?.name ?? documentId}" in PDF: apri ${meta?.webViewLink ?? docsLink(documentId)} → File → Scarica → PDF (.pdf).`,
  };
}

/**
 * Inserisce una tabella vera in fondo al documento: insertTable + testi delle
 * celle (indirizzamento strutturale tableCellLocation, stabile nel batch) +
 * grassetto sulla riga di intestazione. L'endIndex viene riletto perché la
 * lunghezza occupata dalla tabella non è calcolabile in anticipo.
 */
async function docsInsertTable(
  documentId: string,
  headers: Record<string, string>,
  rows: string[][],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const end = await docsGetEndIndex(documentId, headers);
  if (!end.ok) return end;
  const at = Math.max(1, end.endIndex - 1);
  const tableStart = at;
  const requests: DocsRequest[] = [
    { insertTable: { location: { index: at }, rows: rows.length, columns: Math.max(...rows.map((r) => r.length)) } },
  ];
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell) return;
      requests.push({
        insertText: {
          text: cell,
          tableCellLocation: {
            tableStartLocation: { index: tableStart },
            rowIndex: r,
            columnIndex: c,
          },
        },
      });
    });
  });
  // Intestazione in grassetto (indirizzamento strutturale sulla prima riga).
  requests.push({
    updateTextStyle: {
      tableRange: {
        tableCellLocation: {
          tableStartLocation: { index: tableStart },
          rowIndex: 0,
          columnIndex: 0,
        },
        rowSpan: 1,
        columnSpan: Math.max(...rows.map((r) => r.length)),
      },
      textStyle: { bold: true },
      fields: "bold",
    },
  });
  return docsBatchUpdate(documentId, headers, requests);
}

// ---------------------------------------------------------------------------
// Google Forms
// ---------------------------------------------------------------------------

export type FormsAction =
  | "createForm"
  | "addQuestion"
  | "updateForm"
  | "getForm"
  | "listResponses"
  | "getResponseSummary"
  | "exportToSheet";

export type FormsParams = {
  /** ID form (tutte le azioni tranne createForm). */
  formId?: string;
  /** Titolo per createForm/updateForm. */
  title?: string;
  /** Descrizione per createForm/updateForm. */
  description?: string;
  /**
   * Domande in forma grezza (dal modello: stringhe/array generici). La
   * normalizzazione in FormQuestionSpec avviene dentro il proxy, così il tipo
   * exported resta permissivo e il dispatcher non deve importare i tipi puri.
   */
  questions?: Array<Record<string, unknown>>;
  /** Singola domanda per addQuestion (forma grezza, come sopra). */
  question?: Record<string, unknown>;
  limit?: number;
  /** ID spreadsheet per exportToSheet (se assente, ne crea uno nuovo). */
  spreadsheetId?: string;
};

const FORMS_API = "https://forms.googleapis.com/v1/forms";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

function formsError(status: number, json: unknown, fallback: string): string {
  const msg = (json as { error?: { message?: string } } | null)?.error?.message;
  if (status === 403) {
    return `${msg ?? fallback} — Collega Google Forms dalla dashboard Integrazioni: servono i permessi sui moduli e sulle risposte.`;
  }
  return msg ?? `${fallback} (${status})`;
}

function formsLink(formId: string): string {
  return `https://docs.google.com/forms/d/${formId}/edit`;
}

type FormsApiForm = {
  formId?: string;
  info?: { title?: string; description?: string };
  items?: { itemId?: string; title?: string; questionItem?: { question?: { questionId?: string } } }[];
  responderUri?: string;
};

async function formsGetForm(
  formId: string,
  headers: Record<string, string>,
): Promise<{ ok: true; form: FormsApiForm } | { ok: false; error: string }> {
  const res = await providerRequest(
    `${FORMS_API}/${encodeURIComponent(formId)}`,
    { headers, providerLabel: "Google Forms" },
  );
  if (!res.ok) return { ok: false, error: formsError(res.status, res.json, "Google Forms: lettura form fallita") };
  return { ok: true, form: (res.json ?? {}) as FormsApiForm };
}

async function formsBatchUpdate(
  formId: string,
  headers: Record<string, string>,
  requests: FormsRequest[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await providerRequest(`${FORMS_API}/${encodeURIComponent(formId)}:batchUpdate`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ requests, includeFormInResponse: false }),
    providerLabel: "Google Forms",
  });
  if (!res.ok) return { ok: false, error: formsError(res.status, res.json, "Google Forms: scrittura fallita") };
  return { ok: true };
}

type FormsApiResponse = {
  responseId?: string;
  answers?: Record<string, { textAnswers?: { answers?: { value?: string }[] } }>;
};

async function formsListResponses(
  formId: string,
  headers: Record<string, string>,
  limit: number,
): Promise<{ ok: true; responses: FormsApiResponse[] } | { ok: false; error: string }> {
  const url = new URL(`${FORMS_API}/${encodeURIComponent(formId)}/responses`);
  url.searchParams.set("pageSize", String(Math.min(100, Math.max(1, limit))));
  const res = await providerRequest(url.toString(), {
    headers,
    providerLabel: "Google Forms",
  });
  if (!res.ok) {
    // Form senza risposte: la API risponde 200 con oggetto vuoto, non 404.
    return { ok: false, error: formsError(res.status, res.json, "Google Forms: lettura risposte fallita") };
  }
  const list = (res.json as { responses?: FormsApiResponse[] } | undefined)?.responses ?? [];
  return { ok: true, responses: list };
}

/** Mappa questionId → titolo domanda, per leggere le risposte in chiaro. */
function formsQuestionTitles(form: FormsApiForm): { itemId: string; title: string }[] {
  const out: { itemId: string; title: string }[] = [];
  for (const item of form.items ?? []) {
    const qid = item.questionItem?.question?.questionId;
    if (qid) out.push({ itemId: qid, title: item.title ?? qid });
  }
  return out;
}

function formsResponseAnswers(r: FormsApiResponse): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [qid, ans] of Object.entries(r.answers ?? {})) {
    const vals = (ans.textAnswers?.answers ?? [])
      .map((a) => (typeof a.value === "string" ? a.value : ""))
      .filter(Boolean);
    if (vals.length > 0) out[qid] = vals;
  }
  return out;
}

export async function formsApiProxy(
  action: FormsAction,
  params: FormsParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "google_forms");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;
  const headers = {
    Authorization: integrationAuth(token),
    Accept: "application/json",
  };
  const label = "Google Forms";

  // --- createForm --------------------------------------------------------------
  if (action === "createForm") {
    const title = (params.title ?? "").trim().slice(0, 300) || "Modulo senza titolo";
    // Ogni form creato dall'AI include l'informativa privacy di default: il
    // titolare la adatta, ma non parte mai senza.
    const description =
      (params.description ?? "").trim().slice(0, 2000) ||
      "Informativa: i dati inseriti saranno usati solo per gestire la tua richiesta. Puoi chiedere in qualsiasi momento la correzione o la cancellazione scrivendo al titolare del modulo.";
    const createRes = await providerRequest(FORMS_API, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ info: { title, documentTitle: title } }),
      providerLabel: label,
    });
    if (!createRes.ok) {
      return { ok: false, error: formsError(createRes.status, createRes.json, "Google Forms: creazione fallita") };
    }
    const formId = (createRes.json as { formId?: string } | undefined)?.formId;
    if (!formId) return { ok: false, error: "Google Forms: risposta creazione inattesa" };

    const requests: FormsRequest[] = [
      { updateFormInfo: { info: { description }, updateMask: "description" } },
    ];
    // Prima domanda di consenso configurabile (disattivabile con updateForm):
    // senza un sì esplicito il flusso Lead non deve trattare il contatto.
    const questions = (params.questions ?? []).slice(0, 30);
    let index = 0;
    for (const q of questions) {
      const built = buildAddQuestionRequest(
        {
          title: q.title,
          type: q.type ?? "text",
          description: q.description,
          required: q.required === true,
          options: q.options,
        },
        index,
      );
      if (!built.ok) return { ok: false, error: built.error };
      requests.push(built.request);
      index++;
    }
    const w = await formsBatchUpdate(formId, headers, requests);
    if (!w.ok) return { ok: false, error: w.error };
    const form = await formsGetForm(formId, headers);
    const responder = form.ok ? form.form.responderUri : undefined;
    return {
      ok: true,
      data: `Form creato: "${title}" (${questions.length} domande + informativa privacy).\nModifica: ${formsLink(formId)}${responder ? `\nCompila: ${responder}` : ""}\nid: ${formId}`,
    };
  }

  const formId = (params.formId ?? "").trim();
  if (!formId) return { ok: false, error: "forms tool requires formId (create one first with forms_create_form)." };

  // --- getForm --------------------------------------------------------------------
  if (action === "getForm") {
    const f = await formsGetForm(formId, headers);
    if (!f.ok) return { ok: false, error: f.error };
    const items = (f.form.items ?? []).map((it, i) => `${i + 1}. ${it.title ?? "(senza titolo)"}`).join("\n");
    return {
      ok: true,
      data: `"${f.form.info?.title ?? formId}"${f.form.info?.description ? `\n${f.form.info.description}` : ""}\nDomande:\n${items || "(nessuna)"}\nModifica: ${formsLink(formId)}${f.form.responderUri ? `\nCompila: ${f.form.responderUri}` : ""}`,
    };
  }

  // --- addQuestion ------------------------------------------------------------------
  if (action === "addQuestion") {
    if (!params.question) return { ok: false, error: "forms_add_question requires question {title, type, ...}." };
    const f = await formsGetForm(formId, headers);
    if (!f.ok) return { ok: false, error: f.error };
    const q = params.question;
    const built = buildAddQuestionRequest(
      {
        title: q.title,
        type: q.type ?? "text",
        description: q.description,
        required: q.required === true,
        options: q.options,
        scaleLow: q.scaleLow,
        scaleHigh: q.scaleHigh,
      },
      (f.form.items ?? []).length,
    );
    if (!built.ok) return { ok: false, error: built.error };
    const w = await formsBatchUpdate(formId, headers, [built.request]);
    if (!w.ok) return { ok: false, error: w.error };
    return { ok: true, data: `Domanda aggiunta a "${f.form.info?.title ?? formId}".\n${formsLink(formId)}` };
  }

  // --- updateForm ---------------------------------------------------------------------
  if (action === "updateForm") {
    const title = (params.title ?? "").trim().slice(0, 300);
    const description = params.description !== undefined ? params.description.trim().slice(0, 2000) : undefined;
    if (!title && description === undefined) {
      return { ok: false, error: "forms_update_form requires title and/or description." };
    }
    const info: Record<string, string> = {};
    if (title) info.title = title;
    if (description !== undefined) info.description = description;
    const w = await formsBatchUpdate(formId, headers, [
      { updateFormInfo: { info, updateMask: Object.keys(info).join(",") } },
    ]);
    if (!w.ok) return { ok: false, error: w.error };
    return { ok: true, data: `Form aggiornato.\n${formsLink(formId)}` };
  }

  // --- listResponses / getResponseSummary -------------------------------------------------
  if (action === "listResponses" || action === "getResponseSummary") {
    const limit = clampLimit(params.limit, 20);
    const [f, r] = await Promise.all([
      formsGetForm(formId, headers),
      formsListResponses(formId, headers, action === "getResponseSummary" ? 100 : limit),
    ]);
    if (!f.ok) return { ok: false, error: f.error };
    if (!r.ok) return { ok: false, error: r.error };
    const questions = formsQuestionTitles(f.form);
    const titles = new Map(questions.map((q) => [q.itemId, q.title]));
    if (action === "getResponseSummary") {
      const mapped = r.responses.map((resp) => ({
        responseId: resp.responseId ?? "",
        answers: formsResponseAnswers(resp),
      }));
      return {
        ok: true,
        data: summarizeResponses(f.form.info?.title ?? formId, questions, mapped) + `\n${formsLink(formId)}`,
      };
    }
    if (r.responses.length === 0) return { ok: true, data: "Nessuna risposta ancora." };
    const lines = r.responses.slice(0, limit).map((resp) => {
      const bits = Object.entries(formsResponseAnswers(resp))
        .map(([qid, vals]) => `${titles.get(qid) ?? qid}: ${vals.join(", ").slice(0, 200)}`);
      return `- ${resp.responseId ?? "?"}: ${bits.join(" | ").slice(0, 500) || "(vuota)"}`;
    });
    return { ok: true, data: `${r.responses.length} risposte (mostrate ${lines.length}):\n${lines.join("\n")}` };
  }

  // --- exportToSheet ------------------------------------------------------------------------
  // Richiede anche Google Sheets collegato: due connessioni, due consensi
  // separati (niente scope Sheets nel consenso Forms, per minimo privilegio).
  const sheetToken = await resolveIntegrationToken(tenantId, "google_sheets");
  if (!sheetToken.ok) {
    return {
      ok: false,
      error: "Per esportare su Sheets collega anche Google Sheets dalla dashboard Integrazioni, poi riprova (dimmi l'id del foglio oppure ne creo uno nuovo).",
    };
  }
  const sheetHeaders = {
    Authorization: integrationAuth(sheetToken.token),
    Accept: "application/json",
  };
  let spreadsheetId = (params.spreadsheetId ?? "").trim();
  if (!spreadsheetId) {
    const f = await formsGetForm(formId, headers);
    const name = f.ok ? (f.form.info?.title ?? formId) : formId;
    const created = await providerRequest(SHEETS_API, {
      method: "POST",
      headers: { ...sheetHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title: `Risposte — ${name}`.slice(0, 100) } }),
      providerLabel: "Google Sheets",
    });
    if (!created.ok) {
      return { ok: false, error: formsError(created.status, created.json, "Sheets: creazione foglio fallita") };
    }
    spreadsheetId = (created.json as { spreadsheetId?: string } | undefined)?.spreadsheetId ?? "";
    if (!spreadsheetId) return { ok: false, error: "Sheets: risposta creazione inattesa" };
  }
  const [f, r] = await Promise.all([
    formsGetForm(formId, headers),
    formsListResponses(formId, headers, 100),
  ]);
  if (!f.ok) return { ok: false, error: f.error };
  if (!r.ok) return { ok: false, error: r.error };
  const questions = formsQuestionTitles(f.form);
  const header = ["responseId", ...questions.map((q) => q.title)];
  const values = [
    header,
    ...r.responses.map((resp) => {
      const ans = formsResponseAnswers(resp);
      return [resp.responseId ?? "", ...questions.map((q) => (ans[q.itemId] ?? []).join(", "))];
    }),
  ];
  const appended = await providerRequest(
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/Foglio1!A1:append?valueInputOption=RAW`,
    {
      method: "POST",
      headers: { ...sheetHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
      providerLabel: "Google Sheets",
    },
  );
  if (!appended.ok) {
    return { ok: false, error: formsError(appended.status, appended.json, "Sheets: scrittura fallita") };
  }
  return {
    ok: true,
    data: `${r.responses.length} risposte esportate su https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit (foglio Foglio1).`,
  };
}

// ---------------------------------------------------------------------------
// Google Analytics 4 (sola lettura)
// ---------------------------------------------------------------------------

export type GaAction =
  | "listProperties"
  | "runReport"
  | "getTrafficSummary"
  | "getTopPages"
  | "getConversions"
  | "comparePeriods"
  | "detectAnomalies";

export type GaParams = {
  /** Proprietà come "properties/<id>" (da listProperties). */
  property?: string;
  dimensions?: string[];
  metrics?: string[];
  startDate?: string;
  endDate?: string;
  /** Secondo intervallo per comparePeriods. */
  compareStartDate?: string;
  compareEndDate?: string;
  limit?: number;
};

const GA_DATA_API = "https://analyticsdata.googleapis.com/v1beta";
const GA_ADMIN_API = "https://analyticsadmin.googleapis.com/v1alpha";

/**
 * Cache dei report: i dati GA4 non cambiano ogni minuto e la quota gratuita è
 * in token/giorno per proprietà (200k/giorno standard). TTL 30 minuti per
 * proprietà+parametri: dimezza le chiamate ripetute (es. l'agente rilegge lo
 * stesso report nel turno dopo).
 *
 * Limite dichiarato: la cache è in memoria per istanza (niente store esterno,
 * costo zero). Su istanze multiple un report può essere rifatto: al massimo un
 * 429 di Google, gestito con backoff da providerRequest e messaggio leggibile.
 */
const GA_CACHE_TTL_MS = 30 * 60 * 1000;
const gaCache = new Map<string, { at: number; data: string }>();

function gaCacheGet(key: string): { data: string; cachedAt: number } | null {
  const hit = gaCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > GA_CACHE_TTL_MS) {
    gaCache.delete(key);
    return null;
  }
  return { data: hit.data, cachedAt: hit.at };
}

function gaCacheSet(key: string, data: string): void {
  if (gaCache.size > 500) gaCache.clear();
  gaCache.set(key, { at: Date.now(), data });
}

function gaError(status: number, json: unknown, fallback: string): string {
  const msg = (json as { error?: { message?: string } } | null)?.error?.message;
  if (status === 429) {
    return "Google Analytics: quota momentaneamente esaurita, riprova tra qualche minuto (i report restano in cache 30 minuti).";
  }
  if (status === 403) {
    return `${msg ?? fallback} — Collega Google Analytics dalla dashboard Integrazioni con l'account che ha accesso alla proprietà.`;
  }
  return msg ?? `${fallback} (${status})`;
}

function gaUpdatedNote(cachedAt: number | null): string {
  const when = cachedAt
    ? new Date(cachedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `\n(Dati aggiornati alle ${when}.)`;
}

type GaApiRow = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};

async function gaRunReport(
  property: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<
  | { ok: true; dimHeaders: string[]; metHeaders: string[]; rows: GaRow[] }
  | { ok: false; error: string }
> {
  const res = await providerRequest(`${GA_DATA_API}/${property}:runReport`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, returnPropertyQuota: true }),
    providerLabel: "Google Analytics",
  });
  if (!res.ok) return { ok: false, error: gaError(res.status, res.json, "Analytics: report fallito") };
  const json = (res.json ?? {}) as {
    dimensionHeaders?: { name?: string }[];
    metricHeaders?: { name?: string; type?: string }[];
    rows?: GaApiRow[];
  };
  const dimHeaders = (json.dimensionHeaders ?? []).map((h) => h.name ?? "?");
  const metHeaders = (json.metricHeaders ?? []).map((h) => h.name ?? "?");
  const rows = (json.rows ?? []).map((r) => ({
    dimensions: (r.dimensionValues ?? []).map((v) => v.value ?? ""),
    metrics: (r.metricValues ?? []).map((v) => v.value ?? ""),
  }));
  return { ok: true, dimHeaders, metHeaders, rows };
}

export async function gaApiProxy(
  action: GaAction,
  params: GaParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "google_analytics");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;
  const headers = {
    Authorization: integrationAuth(token),
    Accept: "application/json",
  };

  // --- listProperties ------------------------------------------------------------
  // Onboarding: l'agente mostra le proprietà e chiede all'utente quali collegare
  // (checkbox in chat: "usa la 123 per i report"). La scelta resta nella
  // conversazione: niente stato server aggiuntivo.
  if (action === "listProperties") {
    const res = await providerRequest(`${GA_ADMIN_API}/accountSummaries?pageSize=200`, {
      headers,
      providerLabel: "Google Analytics",
    });
    if (!res.ok) return { ok: false, error: gaError(res.status, res.json, "Analytics: elenco proprietà fallito") };
    const summaries = (res.json as { accountSummaries?: { name?: string; propertySummaries?: { property?: string; displayName?: string; propertyType?: string }[] }[] } | undefined)?.accountSummaries ?? [];
    const lines: string[] = [];
    for (const acc of summaries) {
      for (const p of acc.propertySummaries ?? []) {
        if (!p.property) continue;
        lines.push(`- ${p.displayName ?? p.property} (${acc.name ?? "?"}) — ${p.property}${p.propertyType ? ` [${p.propertyType}]` : ""}`);
      }
    }
    if (lines.length === 0) {
      return { ok: true, data: "Nessuna proprietà GA4 accessibile con questo account. Verifica l'accesso in analytics.google.com." };
    }
    return {
      ok: true,
      data: `Proprietà GA4 (usa l'id "properties/..." nei report):\n${lines.join("\n")}`,
    };
  }

  const prop = (params.property ?? "").trim();
  if (!/^properties\/\d+$/.test(prop)) {
    return { ok: false, error: 'ga tool requires property as "properties/<id>" (get it from ga_list_properties).' };
  }
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));

  const runCached = async (
    cacheKey: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: true; result: string; cachedAt: number | null } | { ok: false; error: string }> => {
    const hit = gaCacheGet(cacheKey);
    if (hit) return { ok: true, result: hit.data, cachedAt: hit.cachedAt };
    const r = await gaRunReport(prop, headers, body);
    if (!r.ok) return r;
    const text = formatGaRows(r.dimHeaders, r.metHeaders, r.rows, limit);
    gaCacheSet(cacheKey, text);
    return { ok: true, result: text, cachedAt: null };
  };

  // --- getTrafficSummary --------------------------------------------------------------
  if (action === "getTrafficSummary") {
    const startDate = (params.startDate ?? "28daysAgo").trim() || "28daysAgo";
    const endDate = (params.endDate ?? "today").trim() || "today";
    const key = `${tenantId}|traffic|${prop}|${startDate}|${endDate}`;
    const r = await runCached(key, {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" }, { name: "screenPageViews" }, { name: "engagementRate" }],
    });
    if (!r.ok) return r;
    return { ok: true, data: `Traffico ${startDate} → ${endDate}:\n${r.result}${gaUpdatedNote(r.cachedAt)}` };
  }

  // --- getTopPages -----------------------------------------------------------------------
  if (action === "getTopPages") {
    const startDate = (params.startDate ?? "28daysAgo").trim() || "28daysAgo";
    const endDate = (params.endDate ?? "today").trim() || "today";
    const key = `${tenantId}|toppages|${prop}|${startDate}|${endDate}|${limit}`;
    const r = await runCached(key, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit,
    });
    if (!r.ok) return r;
    return { ok: true, data: `Pagine top ${startDate} → ${endDate}:\n${r.result}${gaUpdatedNote(r.cachedAt)}` };
  }

  // --- getConversions -----------------------------------------------------------------------
  if (action === "getConversions") {
    const startDate = (params.startDate ?? "28daysAgo").trim() || "28daysAgo";
    const endDate = (params.endDate ?? "today").trim() || "today";
    const key = `${tenantId}|conv|${prop}|${startDate}|${endDate}`;
    const r = await runCached(key, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "conversions" }, { name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 100,
    });
    if (!r.ok) return r;
    return { ok: true, data: `Conversioni giornaliere ${startDate} → ${endDate}:\n${r.result}${gaUpdatedNote(r.cachedAt)}` };
  }

  // --- runReport (generico, da whitelist) ---------------------------------------------------------
  if (action === "runReport") {
    const checked = sanitizeGaReportInput({
      property: prop,
      dimensions: params.dimensions,
      metrics: params.metrics,
      startDate: params.startDate,
      endDate: params.endDate,
      limit,
    });
    if (!checked.ok) return { ok: false, error: checked.error };
    const { input, dropped } = checked;
    const key = `${tenantId}|report|${prop}|${input.dimensions.join(",")}|${input.metrics.join(",")}|${input.startDate}|${input.endDate}|${limit}`;
    const r = await runCached(key, {
      dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
      dimensions: input.dimensions.map((name) => ({ name })),
      metrics: input.metrics.map((name) => ({ name })),
      limit,
    });
    if (!r.ok) return r;
    const warn = dropped.length > 0 ? `\n(Ignorati, fuori whitelist: ${dropped.join(", ")}.)` : "";
    return { ok: true, data: `Report ${input.startDate} → ${input.endDate}:\n${r.result}${warn}${gaUpdatedNote(r.cachedAt)}` };
  }

  // --- comparePeriods -------------------------------------------------------------------------------
  if (action === "comparePeriods") {
    const s1 = (params.startDate ?? "").trim();
    const e1 = (params.endDate ?? "").trim();
    const s2 = (params.compareStartDate ?? "").trim();
    const e2 = (params.compareEndDate ?? "").trim();
    if (!s1 || !e1 || !s2 || !e2) {
      return { ok: false, error: "ga_compare_periods requires startDate, endDate, compareStartDate, compareEndDate." };
    }
    const body = (s: string, e: string) => ({
      dateRanges: [{ startDate: s, endDate: e }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }, { name: "conversions" }],
    });
    const [a, b] = await Promise.all([
      gaRunReport(prop, headers, body(s1, e1)),
      gaRunReport(prop, headers, body(s2, e2)),
    ]);
    if (!a.ok) return a;
    if (!b.ok) return b;
    const val = (rows: GaRow[], i: number) => Number(rows[0]?.metrics[i] ?? 0) || 0;
    const names = ["Sessioni", "Utenti", "Visualizzazioni", "Conversioni"];
    const lines = names.map((label, i) => {
      const cur = val(a.rows, i);
      const prev = val(b.rows, i);
      const delta = prev === 0 ? (cur > 0 ? "+∞" : "0%") : `${cur >= prev ? "+" : ""}${Math.round(((cur - prev) / prev) * 1000) / 10}%`;
      return `- ${label}: ${cur} vs ${prev} (${delta})`;
    });
    return { ok: true, data: `Confronto ${s1}→${e1} vs ${s2}→${e2}:\n${lines.join("\n")}${gaUpdatedNote(null)}` };
  }

  // --- detectAnomalies ----------------------------------------------------------------------------------
  // Serie giornaliera sessioni 90 giorni → z-score lato AgentCloud.
  const r = await gaRunReport(prop, headers, {
    dateRanges: [{ startDate: "90daysAgo", endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
    limit: 100,
  });
  if (!r.ok) return r;
  const series = r.rows.map((row) => ({
    date: row.dimensions[0] ?? "",
    value: Number(row.metrics[0] ?? 0) || 0,
  }));
  const anomalies = detectGaAnomalies(series);
  if (anomalies.length === 0) {
    return { ok: true, data: `Nessuna anomalia nelle sessioni giornaliere (ultimi 90 giorni).${gaUpdatedNote(null)}` };
  }
  return {
    ok: true,
    data: `Anomalie sessioni giornaliere (ultimi 90 giorni):\n${anomalies.map((a) => `- ${a.date}: ${a.value} (${a.direction}, z=${a.z})`).join("\n")}${gaUpdatedNote(null)}`,
  };
}

// ---------------------------------------------------------------------------
// Airtable
// ---------------------------------------------------------------------------

export type AirtableAction = "listBases" | "listTables" | "listRecords";

export type AirtableParams = {
  /** baseId (app...) per listTables/listRecords. */
  baseId?: string;
  /** tableId (tbl...) per listRecords. */
  tableId?: string;
  /** Filtro in linguaggio naturale per listRecords. */
  filter?: string;
  limit?: number;
};

const AIRTABLE_API = "https://api.airtable.com/v0";

/** Escape per i valori dentro una formula Airtable (stringa con apici singoli). */
function airtableFormulaString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Traduce un filtro in linguaggio naturale in una `filterByFormula` di Airtable.
 *
 * Airtable non ha una sintassi di query tipo Drive: accetta solo formule. Senza
 * questa traduzione il modello dovrebbe comporre formule a ogni chiamata, ed è
 * la sorgente numero uno di query sbagliate (virgolette, nomi di campo con
 * spazi). Qui si coprono i casi realmente frequenti:
 *   "stato: aperto"        → {stato}="aperto"
 *   "stato = chiuso"       → {stato}="chiuso"
 *   "priorità alta"        → contiene "alta" in un campo qualsiasi
 *   "cliente Acme"         → SEARCH("acme", {cliente})
 * Se non si riconosce nulla, si passa la stringa come SEARCH su un campo
 * esplicito, che è il fallback più onesto.
 */
function buildAirtableFormula(filter: string): string {
  const raw = filter.trim();
  if (!raw) return "";

  // forma "campo: valore" o "campo = valore"
  const kv = raw.match(/^([^:=]+?)\s*[:=]\s*(.+)$/);
  if (kv) {
    const field = kv[1].replace(/^["']|["']$/g, "").trim();
    const value = kv[2].trim();
    return `{${field}}=${airtableFormulaString(value)}`;
  }

  // singolo termine: lo cerchiamo ovunque nel record
  const term = raw.replace(/^["']|["']$/g, "").trim();
  if (term) return `SEARCH(${airtableFormulaString(term.toLowerCase())}, LOWER({Name} & " " & {Notes} & " " & {Email}))`;
  return "";
}

function formatAirtableRecord(r: {
  id?: string;
  fields?: Record<string, unknown>;
  createdTime?: string;
}): string {
  const fields = r.fields ?? {};
  const body = Object.entries(fields)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 6)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" | ");
  const more = Object.keys(fields).length > 6 ? " | …" : "";
  return `- ${r.id ?? "?"}: ${body}${more}`;
}

export async function airtableApiProxy(
  action: AirtableAction,
  params: AirtableParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "airtable");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;
  const headers = { Authorization: integrationAuth(token), Accept: "application/json" };
  const limit = clampLimit(params.limit);

  if (action === "listBases") {
    const res = await providerRequest(`${AIRTABLE_API}/meta/bases`, {
      headers,
      providerLabel: "Airtable",
    });
    if (!res.ok) return { ok: false, error: res.error! };
    const bases = (res.json as { bases?: Array<{ id?: string; name?: string; permissionLevel?: string }> } | undefined)?.bases ?? [];
    if (bases.length === 0) return { ok: true, data: "No Airtable bases shared with this account." };
    return {
      ok: true,
      data: bases
        .map((b) => `- ${b.name ?? "?"} | id: ${b.id ?? "?"}${b.permissionLevel ? ` (${b.permissionLevel})` : ""}`)
        .join("\n"),
    };
  }

  const baseId = (params.baseId ?? "").trim();
  if (!baseId) return { ok: false, error: "airtable tool requires baseId." };

  if (action === "listTables") {
    const res = await providerRequest(
      `${AIRTABLE_API}/meta/bases/${encodeURIComponent(baseId)}/tables`,
      { headers, providerLabel: "Airtable" },
    );
    if (!res.ok) return { ok: false, error: res.error! };
    const tables = (res.json as { tables?: Array<{ id?: string; name?: string; primaryFieldId?: string }> } | undefined)?.tables ?? [];
    if (tables.length === 0) return { ok: true, data: "The Airtable base has no tables, or the token cannot see them." };
    return {
      ok: true,
      data: tables
        .map((t) => `- ${t.name ?? "?"} | id: ${t.id ?? "?"}`)
        .join("\n"),
    };
  }

  // listRecords
  const tableId = (params.tableId ?? "").trim();
  if (!tableId) return { ok: false, error: "airtable_list_records requires tableId." };
  const url = new URL(`${AIRTABLE_API}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`);
  url.searchParams.set("maxRecords", String(limit));
  const formula = buildAirtableFormula(params.filter ?? "");
  if (formula) url.searchParams.set("filterByFormula", formula);

  const res = await providerRequest(url.toString(), { headers, providerLabel: "Airtable" });
  if (!res.ok) return { ok: false, error: res.error! };
  const records = (res.json as { records?: Array<{ id?: string; fields?: Record<string, unknown> }> } | undefined)?.records ?? [];
  if (records.length === 0) {
    return {
      ok: true,
      data: params.filter
        ? `No Airtable records matched "${params.filter}".`
        : "No records in this table.",
    };
  }
  return { ok: true, data: records.map(formatAirtableRecord).join("\n") };
}

// ---------------------------------------------------------------------------
// Trello
// ---------------------------------------------------------------------------

export type TrelloAction = "listBoards" | "listCards";

export type TrelloParams = {
  boardId?: string;
  listId?: string;
  limit?: number;
};

const TRELLO_API = "https://api.trello.com/1";

/**
 * Trello non accetta l'header Authorization su quasi tutti gli endpoint: la
 * key dell'app e il token dell'utente vanno come query param `key` e `token`.
 *
 * Nota di sicurezza: il token finisce quindi nell'URL. È il protocollo di
 * Trello, non una scelta. Per questo providerRequest non logga mai la URL e i
 * suoi errori riportano solo status + estratto del corpo, mai la richiesta.
 */
function trelloUrl(path: string, token: ResolvedToken, extra?: Record<string, string>): URL {
  const appKey = process.env.TRELLO_API_KEY || "";
  const url = new URL(`${TRELLO_API}${path}`);
  url.searchParams.set("key", appKey);
  url.searchParams.set("token", token.accessToken);
  for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v);
  return url;
}

function formatTrelloCard(c: {
  id?: string;
  name?: string;
  desc?: string;
  due?: string | null;
  closed?: boolean;
  url?: string;
  idList?: string;
}): string {
  const bits = [`- ${c.name ?? "?"}`];
  if (c.due) bits.push(`due: ${c.due}`);
  if (c.closed) bits.push("(archived)");
  if (c.desc) bits.push(`- ${c.desc.replace(/\s+/g, " ").slice(0, 120)}`);
  if (c.id) bits.push(`| id: ${c.id}`);
  if (c.idList) bits.push(`| list: ${c.idList}`);
  if (c.url) bits.push(`| ${c.url}`);
  return bits.join(" ");
}

export async function trelloApiProxy(
  action: TrelloAction,
  params: TrelloParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "trello");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;
  const limit = clampLimit(params.limit);

  if (action === "listBoards") {
    const url = trelloUrl("/members/me/boards", token, {
      fields: "id,name,url,closed",
      filter: "open",
    });
    const res = await providerRequest(url.toString(), {
      headers: { Accept: "application/json" },
      providerLabel: "Trello",
    });
    if (!res.ok) return { ok: false, error: res.error! };
    const boards = (res.json as Array<{ id?: string; name?: string; url?: string }> | undefined) ?? [];
    if (boards.length === 0) return { ok: true, data: "No Trello boards for this account." };
    return {
      ok: true,
      data: boards.map((b) => `- ${b.name ?? "?"} | id: ${b.id ?? "?"}${b.url ? ` | ${b.url}` : ""}`).join("\n"),
    };
  }

  // listCards: o per board o per list. Un board senza listId restituisce tutte
  // le card del board, che è il comportamento atteso da "elenca le card".
  const boardId = (params.boardId ?? "").trim();
  const listId = (params.listId ?? "").trim();
  if (!boardId && !listId) {
    return { ok: false, error: "trello_list_cards requires boardId or listId." };
  }
  const path = listId
    ? `/lists/${encodeURIComponent(listId)}/cards`
    : `/boards/${encodeURIComponent(boardId)}/cards`;
  const url = trelloUrl(path, token, {
    fields: "id,name,desc,due,closed,url,idList",
    limit: String(limit),
  });
  const res = await providerRequest(url.toString(), {
    headers: { Accept: "application/json" },
    providerLabel: "Trello",
  });
  if (!res.ok) return { ok: false, error: res.error! };
  const cards = (res.json as Array<Parameters<typeof formatTrelloCard>[0]> | undefined) ?? [];
  if (cards.length === 0) {
    return { ok: true, data: "No Trello cards found." };
  }
  return { ok: true, data: cards.map(formatTrelloCard).join("\n") };
}

// ---------------------------------------------------------------------------
// WooCommerce
// ---------------------------------------------------------------------------

export type WooAction =
  | "listProducts"
  | "getProduct"
  | "listOrders"
  | "getOrder"
  | "getCustomer";

export type WooParams = {
  productId?: string;
  orderId?: string;
  /** WooCommerce: customer id (numero) o email. */
  customer?: string;
  search?: string;
  status?: string;
  limit?: number;
};

/**
 * Base URL dello store, già validata e firmata dentro lo `state` al momento della
 * connessione. Non si rifa la validazione sintattica a ogni chiamata, ma il
 * controllo SSRF sul DNS (assertPublicHost) va ripetuto: il DNS può cambiare fra
 * il momento della connessione e la chiamata di adesso, e un host che al
 * momento della connessione risolveva a un IP pubblico potrebbe oggi risolvere a
 * 169.254.169.254. Per questo la risoluzione avviene qui, subito prima del fetch.
 */
async function wooStoreBase(token: ResolvedToken): Promise<UrlValidation> {
  const raw = typeof token.metadata.store_url === "string" ? token.metadata.store_url : "";
  if (!raw) return { ok: false, error: "WooCommerce: store URL mancante nella connessione" };
  const normalized = normalizeTenantUrl(raw);
  if (!normalized.ok) {
    return { ok: false, error: `WooCommerce: store URL non valido (${normalized.error})` };
  }
  return assertPublicHost(normalized.url.hostname);
}

export async function wooApiProxy(
  action: WooAction,
  params: WooParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "woocommerce");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;

  // Controllo SSRF immediato, prima di qualunque chiamata verso l'host del tenant.
  const base = await wooStoreBase(token);
  if (!base.ok) return { ok: false, error: `WooCommerce: ${base.error}. Reconnect the store.` };

  const limit = clampLimit(params.limit);
  // Authorization Basic: la coppia key:secret. Va nell'header e NON nella query
  // string, così non finisce nei log né nell'errore (a differenza di Trello, dove
  // il protocollo non lascia scelta).
  const headers = {
    Authorization: integrationAuth(token),
    Accept: "application/json",
  };

  const get = async (path: string, query?: Record<string, string>) => {
    const url = new URL(`${base.url.origin}/wp-json/wc/v3${path}`);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    return providerRequest(url.toString(), {
      headers,
      providerLabel: "WooCommerce",
    });
  };

  if (action === "listProducts") {
    const q: Record<string, string> = {
      per_page: String(limit),
      status: "publish",
      orderby: "date",
      order: "desc",
    };
    if (params.search) q.search = params.search;
    const res = await get("/products", q);
    if (!res.ok) return { ok: false, error: res.error! };
    const items = (res.json as unknown[] | undefined) ?? [];
    if (items.length === 0) return { ok: true, data: "No WooCommerce products found." };
    return {
      ok: true,
      data: items.map((p) => formatProduct(fromWooProduct(p as never))).join("\n"),
    };
  }

  if (action === "getProduct") {
    const id = (params.productId ?? "").trim();
    if (!id) return { ok: false, error: "woo_get_product requires productId." };
    const res = await get(`/products/${encodeURIComponent(id)}`);
    if (!res.ok) return { ok: false, error: res.error! };
    return { ok: true, data: formatProduct(fromWooProduct(res.json as never)) };
  }

  if (action === "listOrders") {
    const q: Record<string, string> = {
      per_page: String(limit),
      orderby: "date",
      order: "desc",
    };
    if (params.status) q.status = params.status;
    const res = await get("/orders", q);
    if (!res.ok) return { ok: false, error: res.error! };
    const items = (res.json as unknown[] | undefined) ?? [];
    if (items.length === 0) {
      return { ok: true, data: params.status ? `No WooCommerce orders with status "${params.status}".` : "No WooCommerce orders found." };
    }
    return {
      ok: true,
      data: items.map((o) => formatOrder(fromWooOrder(o as never))).join("\n\n"),
    };
  }

  if (action === "getOrder") {
    const id = (params.orderId ?? "").trim();
    if (!id) return { ok: false, error: "woo_get_order requires orderId." };
    const res = await get(`/orders/${encodeURIComponent(id)}`);
    if (!res.ok) return { ok: false, error: res.error! };
    return { ok: true, data: formatOrder(fromWooOrder(res.json as never)) };
  }

  // getCustomer
  const customer = (params.customer ?? "").trim();
  if (!customer) {
    return { ok: false, error: "woo_get_customer requires customer (id or email)." };
  }
  const path = customer.includes("@")
    ? `/customers?search=${encodeURIComponent(customer)}&per_page=1`
    : `/customers/${encodeURIComponent(customer)}`;
  const res = await get(path);
  if (!res.ok) return { ok: false, error: res.error! };

  const raw = customer.includes("@")
    ? ((res.json as unknown[] | undefined)?.[0] as Record<string, unknown> | undefined)
    : (res.json as Record<string, unknown> | undefined);
  if (!raw) return { ok: true, data: `No WooCommerce customer matched "${customer}".` };

  const first = (raw.first_name as string) || "";
  const last = (raw.last_name as string) || "";
  const spend = parseAmount(raw.total_spent);
  return {
    ok: true,
    data: [
      `- ${[first, last].filter(Boolean).join(" ") || "(senza nome)"}`,
      raw.email ? `  email: ${raw.email}` : "",
      raw.username ? `  username: ${raw.username}` : "",
      spend !== null && spend > 0 ? `  totale speso: ${spend.toFixed(2)} ${(raw.currency as string) || "EUR"}` : "",
      raw.date_created ? `  cliente dal: ${raw.date_created}` : "",
      raw.id ? `  id: ${raw.id}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Mailchimp
// ---------------------------------------------------------------------------

export type MailchimpAction =
  | "listAudiences"
  | "getAudienceStats"
  | "listCampaigns"
  | "upsertContact"
  | "addTags"
  | "createCampaignDraft"
  | "setCampaignContent"
  | "getCampaignReport"
  | "scheduleCampaign"
  | "sendCampaign";

export type MailchimpParams = {
  /** id della lista/audience. */
  listId?: string;
  limit?: number;
  /** Email contatto (upsertContact/addTags). */
  email?: string;
  /** Stato desiderato: subscribed (solo con consenso), pending, unsubscribed, transactional. */
  status?: string;
  /** Base del consenso esplicito (obbligatoria per subscribed). */
  consentBasis?: string;
  /** Data del consenso AAAA-MM-GG (obbligatoria per subscribed). */
  consentDate?: string;
  firstName?: string;
  lastName?: string;
  /** Tag da applicare (addTags). */
  tags?: string[];
  /** Oggetto email (createCampaignDraft). */
  subject?: string;
  /** Nome mittente (createCampaignDraft, obbligatorio nel footer). */
  fromName?: string;
  /** Reply-to (createCampaignDraft). */
  replyTo?: string;
  /** Titolo interno campagna (createCampaignDraft). */
  title?: string;
  /** ID campagna (setCampaignContent/getCampaignReport/schedule/send). */
  campaignId?: string;
  /** HTML contenuto (setCampaignContent). */
  html?: string;
  /** ISO datetime per scheduleCampaign. */
  scheduleTime?: string;
};

/**
 * Base API del datacenter dell'account. Viene dai metadata salvati al momento
 * dello scambio del token: Mailchimp non ha un host unico, e `dc` non è
 * deducibile dal dominio con cui l'utente ha autorizzato.
 *
 * Se manca, si tenta la ricostruzione da `api_url`; senza nessuno dei due non
 * c'è un endpoint noto, quindi si dice di riconnettersi invece di colpire un
 * host generico che potrebbe essere il datacenter sbagliato.
 */
function mailchimpBase(token: ResolvedToken): string | null {
  const apiUrl = typeof token.metadata.api_url === "string" ? token.metadata.api_url : "";
  if (apiUrl && /^https:\/\/[a-z0-9-]+\.api\.mailchimp\.com\//i.test(apiUrl)) {
    return apiUrl.replace(/\/+$/, "");
  }
  const dc = typeof token.metadata.dc === "string" ? token.metadata.dc : "";
  if (dc && /^[a-z0-9-]+$/i.test(dc)) return `https://${dc}.api.mailchimp.com/3.0`;
  return null;
}

/**
 * Mailchimp autentica con HTTP Basic dove lo username è una stringa qualsiasi
 * (`anystring`) e la password è l'access token. Non è Bearer, quindi qui non si
 * usa integrationAuth.
 */
function mailchimpAuth(token: ResolvedToken): string {
  const user = typeof token.metadata.basic_username === "string"
    ? token.metadata.basic_username
    : "anystring";
  return `Basic ${Buffer.from(`${user}:${token.accessToken}`, "utf8").toString("base64")}`;
}

function formatMailchimpStats(s: Record<string, unknown> | undefined): string {
  if (!s) return "";
  const num = (v: unknown, digits = 2) =>
    typeof v === "number" ? v.toFixed(digits) : "n/d";
  return [
    `  iscritti: ${s.member_count ?? "n/d"}`,
    `  iscritti attivi: ${s.open_rate !== undefined ? s.open_rate : "n/d"}`,
    typeof s.open_rate === "number" ? `  open rate: ${num((s.open_rate as number) * 100, 1)}%` : "",
    typeof s.click_rate === "number" ? `  click rate: ${num((s.click_rate as number) * 100, 1)}%` : "",
    `  nuovi iscritti questo mese: ${s.unsubscribe_count !== undefined ? `unsubscribe ${s.unsubscribe_count}` : "n/d"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function mailchimpApiProxy(
  action: MailchimpAction,
  params: MailchimpParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "mailchimp");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;

  const base = mailchimpBase(token);
  if (!base) {
    return {
      ok: false,
      error: "Mailchimp: data center sconosciuto. Ask the user to reconnect Mailchimp from the dashboard (Integrations), then retry.",
    };
  }

  const headers = { Authorization: mailchimpAuth(token), Accept: "application/json" };
  const limit = clampLimit(params.limit);

  if (action === "listAudiences") {
    const res = await providerRequest(`${base}/lists?count=${limit}&fields=lists.id,lists.name,lists.stats`, {
      headers,
      providerLabel: "Mailchimp",
    });
    if (!res.ok) return { ok: false, error: res.error! };
    const lists =
      (res.json as { lists?: Array<{ id?: string; name?: string; stats?: Record<string, unknown> }> } | undefined)?.lists ?? [];
    if (lists.length === 0) return { ok: true, data: "No Mailchimp audiences found." };
    return {
      ok: true,
      data: lists
        .map((l) => `- ${l.name ?? "?"} | id: ${l.id ?? "?"}\n${formatMailchimpStats(l.stats)}`)
        .join("\n"),
    };
  }

  const listId = (params.listId ?? "").trim();
  if (!listId && action !== "getCampaignReport" && action !== "setCampaignContent" && action !== "scheduleCampaign" && action !== "sendCampaign") {
    return { ok: false, error: "Mailchimp tool requires listId." };
  }

  if (action === "getAudienceStats") {
    const res = await providerRequest(`${base}/lists/${encodeURIComponent(listId)}`, {
      headers,
      providerLabel: "Mailchimp",
    });
    if (!res.ok) return { ok: false, error: res.error! };
    const l = res.json as { id?: string; name?: string; stats?: Record<string, unknown> } | undefined;
    if (!l) return { ok: true, data: `No Mailchimp audience matched "${listId}".` };
    return {
      ok: true,
      data: `${l.name ?? "?"} (id: ${l.id ?? listId})\n${formatMailchimpStats(l.stats)}`,
    };
  }

  // listCampaigns
  const res = await providerRequest(
    `${base}/campaigns?count=${limit}&sort_field=send_time&sort_dir=DESC&fields=campaigns.id,campaigns.settings.title,campaigns.status,campaigns.send_time,campaigns.emails_sent,campaigns.open_rate,campaigns.click_rate`,
    { headers, providerLabel: "Mailchimp" },
  );
  if (!res.ok) return { ok: false, error: res.error! };
  const campaigns =
    (res.json as {
      campaigns?: Array<{
        id?: string;
        status?: string;
        send_time?: string;
        emails_sent?: number;
        open_rate?: number;
        click_rate?: number;
        settings?: { title?: string };
      }>;
    } | undefined)?.campaigns ?? [];
  if (campaigns.length === 0) return { ok: true, data: "No Mailchimp campaigns found." };
  return {
    ok: true,
    data: campaigns
      .map((c) => {
        const bits = [`- ${c.settings?.title ?? "(senza titolo)"} | ${c.status ?? "?"}`];
        if (c.send_time) bits.push(`| inviata: ${c.send_time}`);
        if (typeof c.emails_sent === "number") bits.push(`| inviati: ${c.emails_sent}`);
        if (typeof c.open_rate === "number") bits.push(`| open: ${(c.open_rate * 100).toFixed(1)}%`);
        if (typeof c.click_rate === "number") bits.push(`| click: ${(c.click_rate * 100).toFixed(1)}%`);
        if (c.id) bits.push(`| id: ${c.id}`);
        return bits.join(" ");
      })
      .join("\n"),
  };
}

/**
 * Hash MD5 lowercase dell'email: è l'id del member nelle API Mailchimp.
 * (MD5 qui è solo chiave di lookup, non sicurezza.)
 */
function mailchimpMemberHash(email: string): string {
  return crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
}

async function mailchimpRequest(
  base: string,
  headers: Record<string, string>,
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<{ status: number; json: unknown }> {
  const res = await providerRequest(`${base}${path}`, {
    method: (opts.method ?? "GET") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    headers: opts.body !== undefined ? { ...headers, "Content-Type": "application/json" } : headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    providerLabel: "Mailchimp",
  });
  return { status: res.status, json: res.json };
}

export async function mailchimpWriteProxy(
  action: Exclude<MailchimpAction, "listAudiences" | "getAudienceStats" | "listCampaigns">,
  params: MailchimpParams,
  tenantId: string,
): Promise<IntegrationApiResult> {
  const resolved = await resolveIntegrationToken(tenantId, "mailchimp");
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const { token } = resolved;
  const base = mailchimpBase(token);
  if (!base) {
    return {
      ok: false,
      error: "Mailchimp: data center sconosciuto. Ask the user to reconnect Mailchimp from the dashboard (Integrations), then retry.",
    };
  }
  // Coda per account (max 10 connessioni concorrenti per account Mailchimp):
  // le scritture dello stesso tenant si accodano in serie. Best-effort per
  // istanza (niente lock distribuito: costo zero); in più il 429 di Mailchimp
  // resta gestito con backoff da providerRequest.
  const headers = { Authorization: mailchimpAuth(token), Accept: "application/json" };

  // --- upsertContact ---------------------------------------------------------------
  // PUT idempotente sullo stesso member: rieseguire non duplica.
  if (action === "upsertContact") {
    const listId = (params.listId ?? "").trim();
    const email = (params.email ?? "").trim().toLowerCase();
    if (!listId) return { ok: false, error: "mailchimp_upsert_contact requires listId." };
    // Stato corrente per rispettare unsubscribe/cleaned.
    const existing = await mailchimpRequest(base, headers, `/lists/${encodeURIComponent(listId)}/members/${mailchimpMemberHash(email || "none")}`);
    const currentStatus =
      existing.status === 200
        ? (existing.json as { status?: string } | undefined)?.status ?? null
        : null;
    const check = checkUpsertConsent({
      email,
      status: params.status ?? "pending",
      currentStatus,
      consentBasis: params.consentBasis,
      consentDate: params.consentDate,
    });
    if (!check.ok) return { ok: false, error: check.error };
    const body: Record<string, unknown> = {
      email_address: email,
      status: check.status,
      ...(params.firstName || params.lastName
        ? { merge_fields: { ...(params.firstName ? { FNAME: params.firstName.slice(0, 50) } : {}), ...(params.lastName ? { LNAME: params.lastName.slice(0, 50) } : {}) } }
        : {}),
      ...(check.status === "subscribed"
        ? { marketing_permissions: [], notes: `Consenso: ${params.consentBasis} (${params.consentDate})` }
        : {}),
    };
    if (params.tags?.length) {
      body.tags = params.tags.slice(0, 10).map(String);
    }
    const put = await mailchimpRequest(base, headers, `/lists/${encodeURIComponent(listId)}/members/${mailchimpMemberHash(email)}`, {
      method: "PUT",
      body,
    });
    if (put.status >= 400) {
      const msg = (put.json as { detail?: string; title?: string } | null)?.detail
        ?? (put.json as { title?: string } | null)?.title
        ?? `Mailchimp upsert failed (${put.status})`;
      return { ok: false, error: msg };
    }
    return {
      ok: true,
      data: `Contatto ${email} registrato come "${check.status}" nella lista ${listId}.`,
    };
  }

  // --- addTags --------------------------------------------------------------------------
  if (action === "addTags") {
    const listId = (params.listId ?? "").trim();
    const email = (params.email ?? "").trim().toLowerCase();
    const tags = (params.tags ?? []).map((t) => String(t).trim()).filter(Boolean).slice(0, 10);
    if (!listId) return { ok: false, error: "mailchimp_add_tags requires listId." };
    if (!email) return { ok: false, error: "mailchimp_add_tags requires email." };
    if (tags.length === 0) return { ok: false, error: "mailchimp_add_tags requires at least one tag." };
    const r = await mailchimpRequest(
      base,
      headers,
      `/lists/${encodeURIComponent(listId)}/members/${mailchimpMemberHash(email)}/tags`,
      { method: "POST", body: { tags: tags.map((name) => ({ name, status: "active" })) } },
    );
    if (r.status >= 400) {
      const msg = (r.json as { detail?: string } | null)?.detail ?? `Mailchimp add tags failed (${r.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, data: `Tag aggiunti a ${email}: ${tags.join(", ")}.` };
  }

  // --- createCampaignDraft --------------------------------------------------------------------
  if (action === "createCampaignDraft") {
    const listId = (params.listId ?? "").trim();
    const subject = (params.subject ?? "").trim().slice(0, 200);
    const fromName = (params.fromName ?? "").trim().slice(0, 100);
    const replyTo = (params.replyTo ?? "").trim().slice(0, 100);
    if (!listId) return { ok: false, error: "mailchimp_create_campaign_draft requires listId." };
    if (!subject) return { ok: false, error: "mailchimp_create_campaign_draft requires subject." };
    if (!fromName) return { ok: false, error: "mailchimp_create_campaign_draft requires fromName (identità mittente obbligatoria)." };
    if (!replyTo) return { ok: false, error: "mailchimp_create_campaign_draft requires replyTo." };
    const r = await mailchimpRequest(base, headers, "/campaigns", {
      method: "POST",
      body: {
        type: "regular",
        recipients: { list_id: listId },
        settings: {
          subject_line: subject,
          title: (params.title ?? subject).slice(0, 200),
          from_name: fromName,
          reply_to: replyTo,
        },
      },
    });
    if (r.status >= 400) {
      const msg = (r.json as { detail?: string } | null)?.detail ?? `Mailchimp create campaign failed (${r.status})`;
      return { ok: false, error: msg };
    }
    const id = (r.json as { id?: string } | undefined)?.id ?? "?";
    return { ok: true, data: `Bozza campagna creata (id: ${id}). Non inviata: imposta il contenuto con mailchimp_set_campaign_content, poi chiedi approvazione.` };
  }

  const campaignId = (params.campaignId ?? "").trim();
  if (!campaignId) return { ok: false, error: "Mailchimp campaign tool requires campaignId." };

  // --- setCampaignContent --------------------------------------------------------------------------
  if (action === "setCampaignContent") {
    const html = (params.html ?? "").trim();
    if (!html) return { ok: false, error: "mailchimp_set_campaign_content requires html." };
    const r = await mailchimpRequest(base, headers, `/campaigns/${encodeURIComponent(campaignId)}/content`, {
      method: "PUT",
      body: { html },
    });
    if (r.status >= 400) {
      const msg = (r.json as { detail?: string } | null)?.detail ?? `Mailchimp set content failed (${r.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, data: `Contenuto impostato per la campagna ${campaignId}. Verifica il compliance-check con mailchimp_get_campaign_report prima di programmare/inviare.` };
  }

  // --- getCampaignReport --------------------------------------------------------------------------------
  if (action === "getCampaignReport") {
    const [c, rep] = await Promise.all([
      mailchimpRequest(base, headers, `/campaigns/${encodeURIComponent(campaignId)}?fields=id,status,send_time,emails_sent,settings,recipients`),
      mailchimpRequest(base, headers, `/reports/${encodeURIComponent(campaignId)}`),
    ]);
    if (c.status >= 400) {
      const msg = (c.json as { detail?: string } | null)?.detail ?? `Mailchimp campaign not found (${c.status})`;
      return { ok: false, error: msg };
    }
    const camp = c.json as Record<string, unknown>;
    const settings = (camp.settings ?? {}) as Record<string, unknown>;
    const report = rep.status < 400 ? (rep.json as Record<string, unknown>) : {};
    const opens = report.opens as Record<string, unknown> | undefined;
    const lines = [
      `Campagna "${String(settings.title ?? "?")}" — stato: ${String(camp.status ?? "?")}`,
      `Oggetto: ${String(settings.subject_line ?? "?")} | Da: ${String(settings.from_name ?? "?")} <${String(settings.reply_to ?? "?")}>`,
      typeof camp.emails_sent === "number" ? `Inviati: ${camp.emails_sent}` : "",
      typeof opens?.open_rate === "number" ? `Open rate: ${(Number(opens.open_rate) * 100).toFixed(1)}%` : "",
      typeof report.click_rate === "number" ? `Click rate: ${(Number(report.click_rate) * 100).toFixed(1)}%` : "",
    ].filter(Boolean);
    // Compliance-check live sulla bozza (stesse regole dell'invio).
    const content = await mailchimpRequest(base, headers, `/campaigns/${encodeURIComponent(campaignId)}/content?fields=html`);
    const html = (content.json as { html?: string } | undefined)?.html ?? "";
    const compliance = checkCampaignCompliance({
      settings: {
        subject: String(settings.subject_line ?? ""),
        title: String(settings.title ?? ""),
        fromName: String(settings.from_name ?? ""),
        replyTo: String(settings.reply_to ?? ""),
      },
      html,
    });
    lines.push(
      compliance.ok
        ? "Compliance: VERDE — pronta per programmazione/invio (con approvazione)."
        : `Compliance: ROSSA — invio bloccato: ${compliance.issues.join("; ")}`,
    );
    return { ok: true, data: lines.join("\n") };
  }

  // --- scheduleCampaign / sendCampaign ---------------------------------------------------------------------------
  // Entrambi high + approvazione (tool-confirmation.ts). L'invio è bloccato se
  // il compliance-check è rosso: il rifiuto spiega cosa manca.
  const content = await mailchimpRequest(base, headers, `/campaigns/${encodeURIComponent(campaignId)}/content?fields=html`);
  const camp = await mailchimpRequest(base, headers, `/campaigns/${encodeURIComponent(campaignId)}?fields=id,status,settings`);
  if (camp.status >= 400) {
    return { ok: false, error: `Mailchimp campaign not found (${camp.status})` };
  }
  const settings = ((camp.json as Record<string, unknown>).settings ?? {}) as Record<string, unknown>;
  const compliance = checkCampaignCompliance({
    settings: {
      subject: String(settings.subject_line ?? ""),
      title: String(settings.title ?? ""),
      fromName: String(settings.from_name ?? ""),
      replyTo: String(settings.reply_to ?? ""),
    },
    html: (content.json as { html?: string } | undefined)?.html ?? "",
  });
  if (!compliance.ok) {
    return {
      ok: false,
      error: `Invio BLOCCATO (compliance rosso): ${compliance.issues.join("; ")}. Sistema la bozza e riprova.`,
    };
  }
  if (action === "scheduleCampaign") {
    const scheduleTime = (params.scheduleTime ?? "").trim();
    if (!scheduleTime) return { ok: false, error: "mailchimp_schedule_campaign requires scheduleTime (ISO, futuro)." };
    const r = await mailchimpRequest(base, headers, `/campaigns/${encodeURIComponent(campaignId)}/actions/schedule`, {
      method: "POST",
      body: { schedule_time: scheduleTime },
    });
    if (r.status >= 400) {
      const msg = (r.json as { detail?: string } | null)?.detail ?? `Mailchimp schedule failed (${r.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, data: `Campagna ${campaignId} programmata per ${scheduleTime}.` };
  }
  // sendCampaign (l'approvazione è già avvenuta via tool_confirm prima di arrivare qui).
  const r = await mailchimpRequest(base, headers, `/campaigns/${encodeURIComponent(campaignId)}/actions/send`, {
    method: "POST",
    body: {},
  });
  if (r.status >= 400) {
    const msg = (r.json as { detail?: string } | null)?.detail ?? `Mailchimp send failed (${r.status})`;
    return { ok: false, error: msg };
  }
  return { ok: true, data: `Campagna ${campaignId} inviata.` };
}
