/**
 * Esecuzione dei tool dei connettori nativi (fallback per le app che non
 * espongono un server MCP).
 *
 * Un connettore nativo è un adapter OAuth già esistente in
 * `src/lib/integrations/providers/` più un paio di chiamate API. Il resto
 * del sistema (namespace, conferma, rate limit, output non fidato) è
 * condiviso con i tool MCP.
 */

import { providerRequest } from "../../integrations/http";
import { logAudit } from "@/lib/audit";

import type { McpRegistryEntry } from "../registry";
import { truncateToolOutput, wrapToolOutput } from "../security";
import { decryptMcpSecrets, type McpConnectionRow } from "../store";

/** Come viene implementato un tool nativo. */
export type NativeHandler = (
  args: Record<string, unknown>,
  ctx: NativeContext,
) => Promise<string>;

export type NativeContext = {
  tenantId: string;
  row: McpConnectionRow;
  accessToken: string;
  /** Modalità Ghost: nessun audit (è metadata della conversazione). */
  ephemeral?: boolean;
};

/**
 * Tool nativi implementati, per id del connettore.
 * È una funzione e non una costante perché i handler stanno più in bassi
 * nel file: una `const` che li referenzia prima della dichiarazione
 * fallirebbe a runtime (zona morta temporale).
 */
function nativeHandlers(providerId: string): Record<string, NativeHandler> {
  switch (providerId) {
    case "github":
      return githubHandlers;
    default:
      return {};
  }
}

/**
 * Esegue un tool di un connettore nativo.
 * Restituisce il testo da passare al modello.
 */
export async function executeNativeTool(
  entry: McpRegistryEntry,
  toolName: string,
  args: Record<string, unknown>,
  ctx: { tenantId: string; row: McpConnectionRow; ephemeral?: boolean },
): Promise<string> {
  const secrets = decryptMcpSecrets(ctx.row);
  const accessToken = secrets.accessToken;
  if (!accessToken) {
    return `${entry.name}: this app is not authorized. Please connect it again.`;
  }

  const handlers = nativeHandlers(entry.native?.provider ?? "");
  const handler = handlers[toolName];
  if (!handler) {
    return `Tool "${toolName}" is not available for ${entry.name}.`;
  }

  const startedAt = Date.now();
  try {
    const text = await handler(args, {
      tenantId: ctx.tenantId,
      row: ctx.row,
      accessToken,
      ephemeral: ctx.ephemeral,
    });
    if (!ctx.ephemeral) {
      logAudit("mcp_tool_exec", {
        tenantId: ctx.tenantId,
        serverId: entry.id,
        tool: toolName,
        durationMs: Date.now() - startedAt,
        native: true,
        ok: true,
      });
    }
    return wrapToolOutput(entry.name, toolName, truncateToolOutput(text));
  } catch (e) {
    const message = e instanceof Error ? e.message : "The tool failed.";
    if (!ctx.ephemeral) {
      logAudit("mcp_tool_exec", {
        tenantId: ctx.tenantId,
        serverId: entry.id,
        tool: toolName,
        durationMs: Date.now() - startedAt,
        native: true,
        ok: false,
      });
    }
    return `${entry.name}: ${message}`;
  }
}

/** Helper: chiamata all'API REST di GitHub con il token dell'utente. */
async function githubApi(
  accessToken: string,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<unknown> {
  const res = await providerRequest(`https://api.github.com${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    providerLabel: "GitHub",
  });
  if (!res.ok) {
    throw new Error(res.error ?? `GitHub request failed (${res.status})`);
  }
  return res.json;
}

/** Tool nativi di GitHub. */
const githubHandlers: Record<string, NativeHandler> = {
  async github_list_repositories(args, ctx) {
    const perPage = Math.min(Number(args.per_page ?? 30) || 30, 100);
    const sort = typeof args.sort === "string" ? args.sort : "updated";
    const data = await githubApi(
      ctx.accessToken,
      `/user/repos?per_page=${perPage}&sort=${encodeURIComponent(sort)}`,
    );
    const repos = Array.isArray(data) ? data : [];
    if (repos.length === 0) return "No repositories found.";
    return repos
      .map((r) => {
        const repo = r as {
          full_name?: string;
          description?: string | null;
          default_branch?: string;
          stargazers_count?: number;
          private?: boolean;
        };
        const visibility = repo.private ? "private" : "public";
        return `- ${repo.full_name} (${visibility}, default branch ${repo.default_branch}, ${repo.stargazers_count ?? 0} stars)${repo.description ? `: ${repo.description}` : ""}`;
      })
      .join("\n");
  },

  async github_create_issue(args, ctx) {
    const owner = String(args.owner ?? "").trim();
    const repo = String(args.repo ?? "").trim();
    const title = String(args.title ?? "").trim();
    if (!owner || !repo || !title) {
      throw new Error("owner, repo and title are required.");
    }
    const labels = Array.isArray(args.labels)
      ? args.labels.filter((l): l is string => typeof l === "string")
      : [];
    const body = typeof args.body === "string" ? args.body : undefined;
    const data = await githubApi(ctx.accessToken, `/repos/${owner}/${repo}/issues`, {
      method: "POST",
      body: { title, ...(body ? { body } : {}), ...(labels.length ? { labels } : {}) },
    });
    const issue = data as { html_url?: string; number?: number } | null;
    return `Issue #${issue?.number ?? "?"} created in ${owner}/${repo}${issue?.html_url ? `: ${issue.html_url}` : ""}.`;
  },
};
