import type { LLMTool } from "@/lib/llm";
import type { ToolContext } from "./tools";
import {
  githubApiProxy,
  clickupApiProxy,
  asanaApiProxy,
} from "@/lib/integrations/api-proxy";

/**
 * Tool agente per le integrazioni GitHub / ClickUp / Asana.
 *
 * Perché un modulo dedicato: tiene `lib/agents/tools.ts` focalizzato sugli
 * strumenti core e raccoglie qui definizioni + handler delle integrazioni
 * generiche. Gli handler risolvono il tenant e chiamano `lib/integrations/api-proxy`,
 * che decripta il token salvato in `tenant_integrations`, lo rinfresca se serve
 * (Asana) e parla direttamente con l'API del provider. Nessuna Edge Function.
 */

const INTEGRATION_TOOL_NAMES = [
  "github_list_repos",
  "github_list_issues",
  "github_create_issue",
  "clickup_list_spaces",
  "clickup_list_tasks",
  "clickup_create_task",
  "asana_list_workspaces",
  "asana_list_projects",
  "asana_list_tasks",
  "asana_create_task",
] as const;

export function isIntegrationTool(name: string): boolean {
  return (INTEGRATION_TOOL_NAMES as readonly string[]).includes(name);
}

function clean(value: string | undefined, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function parseLimit(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Tenant di riferimento: l'utente autenticato che ha avviato l'agente, con
 * fallback sul tenant condiviso (admin via codice). Stringa vuota per gli anonimi.
 */
function resolveTenant(context: ToolContext): string {
  if (context.userId && context.userId !== "anonymous") return context.userId;
  return context.tenantId ?? "";
}

// ---------------------------------------------------------------------------
// Definizioni tool
// ---------------------------------------------------------------------------

export const INTEGRATION_TOOL_DEFINITIONS: Record<string, LLMTool> = {
  github_list_repos: {
    name: "github_list_repos",
    description:
      "List the connected GitHub account's repositories (most recently updated), with visibility and description.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max repositories to return (default 20, max 50)" },
      },
    },
  },

  github_list_issues: {
    name: "github_list_issues",
    description: "List issues in a GitHub repository (pull requests are filtered out).",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner (user or org), e.g. vercel" },
        repo: { type: "string", description: "Repository name, e.g. next.js" },
        state: { type: "string", description: "Issue state: open (default), closed or all" },
        limit: { type: "integer", description: "Max issues to return (default 20, max 50)" },
      },
      required: ["owner", "repo"],
    },
  },

  github_create_issue: {
    name: "github_create_issue",
    description: "Create an issue in a GitHub repository.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner (user or org)" },
        repo: { type: "string", description: "Repository name" },
        title: { type: "string", description: "Issue title" },
        body: { type: "string", description: "Issue body (markdown, optional)" },
      },
      required: ["owner", "repo", "title"],
    },
  },

  clickup_list_spaces: {
    name: "clickup_list_spaces",
    description:
      "List the connected ClickUp workspace's spaces and their lists (with ids). Call this first: clickup_create_task needs a listId from here.",
    input_schema: { type: "object", properties: {} },
  },

  clickup_list_tasks: {
    name: "clickup_list_tasks",
    description:
      "List the most recently updated tasks in the connected ClickUp workspace. Pass a listId (from clickup_list_spaces) for a single list, otherwise the whole workspace is used.",
    input_schema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "ClickUp list id (optional, from clickup_list_spaces)" },
        limit: { type: "integer", description: "Max tasks to return (default 20, max 50)" },
      },
    },
  },

  clickup_create_task: {
    name: "clickup_create_task",
    description:
      "Create a task in ClickUp. Requires the listId (get it from clickup_list_spaces).",
    input_schema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "ClickUp list id (from clickup_list_spaces)" },
        title: { type: "string", description: "Task name" },
        description: { type: "string", description: "Task description (optional)" },
      },
      required: ["listId", "title"],
    },
  },

  asana_list_workspaces: {
    name: "asana_list_workspaces",
    description: "List the connected Asana workspaces (name and gid).",
    input_schema: { type: "object", properties: {} },
  },

  asana_list_projects: {
    name: "asana_list_projects",
    description: "List the projects in an Asana workspace.",
    input_schema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Asana workspace gid (from asana_list_workspaces)" },
        limit: { type: "integer", description: "Max projects to return (default 20, max 50)" },
      },
      required: ["workspaceId"],
    },
  },

  asana_list_tasks: {
    name: "asana_list_tasks",
    description: "List the tasks in an Asana project.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Asana project gid (from asana_list_projects)" },
        limit: { type: "integer", description: "Max tasks to return (default 20, max 50)" },
      },
      required: ["projectId"],
    },
  },

  asana_create_task: {
    name: "asana_create_task",
    description: "Create a task in Asana. Provide a projectId (preferred) or a workspaceId.",
    input_schema: {
      type: "object",
      properties: {
        taskName: { type: "string", description: "Task name" },
        projectId: { type: "string", description: "Asana project gid to add the task to (optional)" },
        workspaceId: { type: "string", description: "Asana workspace gid (used when no projectId is given)" },
        notes: { type: "string", description: "Task notes/description (optional)" },
      },
      required: ["taskName"],
    },
  },
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function executeIntegrationTool(
  name: string,
  input: Record<string, string>,
  context: ToolContext,
): Promise<string> {
  const tenantId = resolveTenant(context);

  switch (name) {
    case "github_list_repos": {
      const r = await githubApiProxy("listRepos", { limit: parseLimit(input.limit) }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "github_list_issues": {
      const owner = clean(input.owner, 200);
      const repo = clean(input.repo, 200);
      if (!owner || !repo) return "github_list_issues requires owner and repo.";
      const r = await githubApiProxy(
        "listIssues",
        { owner, repo, state: input.state || "open", limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "github_create_issue": {
      const owner = clean(input.owner, 200);
      const repo = clean(input.repo, 200);
      const title = clean(input.title, 300);
      if (!owner || !repo || !title) return "github_create_issue requires owner, repo and title.";
      const r = await githubApiProxy(
        "createIssue",
        { owner, repo, title, body: input.body ? clean(input.body, 8000) : undefined },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "clickup_list_spaces": {
      const r = await clickupApiProxy("listSpaces", {}, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "clickup_list_tasks": {
      const listId = input.listId ? clean(input.listId, 200) : undefined;
      const r = await clickupApiProxy(
        "listTasks",
        { listId, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "clickup_create_task": {
      const listId = clean(input.listId, 200);
      const title = clean(input.title, 300);
      if (!listId || !title) return "clickup_create_task requires listId and title.";
      const r = await clickupApiProxy(
        "createTask",
        { listId, title, description: input.description ? clean(input.description, 8000) : undefined },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "asana_list_workspaces": {
      const r = await asanaApiProxy("listWorkspaces", {}, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "asana_list_projects": {
      const workspaceId = clean(input.workspaceId, 200);
      if (!workspaceId) return "asana_list_projects requires workspaceId.";
      const r = await asanaApiProxy(
        "listProjects",
        { workspaceId, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "asana_list_tasks": {
      const projectId = clean(input.projectId, 200);
      if (!projectId) return "asana_list_tasks requires projectId.";
      const r = await asanaApiProxy(
        "listTasks",
        { projectId, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "asana_create_task": {
      const taskName = clean(input.taskName, 300);
      if (!taskName) return "asana_create_task requires taskName.";
      const projectId = input.projectId ? clean(input.projectId, 200) : undefined;
      const workspaceId = input.workspaceId ? clean(input.workspaceId, 200) : undefined;
      if (!projectId && !workspaceId) return "asana_create_task requires projectId or workspaceId.";
      const r = await asanaApiProxy(
        "createTask",
        {
          taskName,
          projectId,
          workspaceId,
          notes: input.notes ? clean(input.notes, 8000) : undefined,
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    default:
      return `Tool "${name}" is not implemented`;
  }
}
