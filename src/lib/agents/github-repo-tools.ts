/**
 * Tool che fanno lavorare l'agente DENTRO un repository GitHub collegato.
 *
 * Il repository non è un parametro del modello: è il repository "collegato"
 * dalla chat (scelto dal menu "+"), che viaggia nel contesto del tool. Il
 * modello può comunque indicarlo esplicitamente, ma solo se coincide con
 * quello collegato: un agente non deve poter scrivere in un repository a caso.
 *
 * I tool di scrittura (file, branch, pull request) sono in
 * `tool-confirmation.ts`: modificano il codice dell'utente, quindi il client
 * chiede conferma prima che il tool venga eseguito.
 */

import type { LLMTool } from "@/lib/llm";
import type { ToolContext } from "./tool-context";
import { resolveIntegrationToken } from "@/lib/integrations/api-proxy";
import {
  createBranch,
  createPullRequest,
  getRepoInfo,
  listBranches,
  listFiles,
  readFile,
  writeFile,
  type GithubRepoRef,
} from "@/lib/integrations/github-repo";

export const GITHUB_REPO_TOOL_NAMES = [
  "github_repo_info",
  "github_repo_list_files",
  "github_repo_read_file",
  "github_repo_write_file",
  "github_repo_create_branch",
  "github_repo_create_pull_request",
  "github_repo_list_branches",
] as const;

/** Tool che scrivono nel repository: l'elenco ufficiale è in tool-confirmation.ts. */

export function isGithubRepoTool(name: string): boolean {
  return (GITHUB_REPO_TOOL_NAMES as readonly string[]).includes(name);
}

export const GITHUB_REPO_TOOL_DEFINITIONS: Record<string, LLMTool> = {
  github_repo_info: {
    name: "github_repo_info",
    description:
      "Get metadata of the linked GitHub repository (description, visibility, default branch, last push). Use it first to know the default branch and the language of the project.",
    input_schema: { type: "object", properties: {} },
  },

  github_repo_list_files: {
    name: "github_repo_list_files",
    description:
      "List the files of a folder in the linked GitHub repository (use an empty path for the root). Returns file paths with their size.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Folder path, e.g. src/components (empty for the repository root)" },
        branch: { type: "string", description: "Branch to read (default: the branch of the linked repository)" },
      },
    },
  },

  github_repo_read_file: {
    name: "github_repo_read_file",
    description:
      "Read a text file of the linked GitHub repository. Returns the file content. Binary files cannot be read.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path, e.g. src/app/page.tsx" },
        branch: { type: "string", description: "Branch to read (default: the branch of the linked repository)" },
      },
      required: ["path"],
    },
  },

  github_repo_write_file: {
    name: "github_repo_write_file",
    description:
      "Create or overwrite a text file in the linked GitHub repository on the given branch. This modifies the user's code: the user is asked to confirm before the write happens. Read the file first and preserve the existing content unless the user asked for a full rewrite.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path, e.g. src/app/page.tsx" },
        content: { type: "string", description: "Full new content of the file" },
        message: { type: "string", description: "Commit message (optional)" },
        branch: { type: "string", description: "Branch to write on (default: the branch of the linked repository)" },
      },
      required: ["path", "content"],
    },
  },

  github_repo_create_branch: {
    name: "github_repo_create_branch",
    description:
      "Create a branch in the linked GitHub repository, starting from another branch (default: the default branch of the repository).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the new branch, e.g. feature/login" },
        from: { type: "string", description: "Branch to start from (default: the default branch)" },
      },
      required: ["name"],
    },
  },

  github_repo_create_pull_request: {
    name: "github_repo_create_pull_request",
    description:
      "Open a pull request in the linked GitHub repository from a branch to the base branch. The user is asked to confirm before the pull request is opened.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Pull request title" },
        body: { type: "string", description: "Pull request description (markdown, optional)" },
        head: { type: "string", description: "Branch with the changes" },
        base: { type: "string", description: "Target branch (default: the default branch)" },
      },
      required: ["title", "head"],
    },
  },

  github_repo_list_branches: {
    name: "github_repo_list_branches",
    description: "List the branches of the linked GitHub repository.",
    input_schema: { type: "object", properties: {} },
  },
};

/**
 * Repository di riferimento: quello collegato. Se il modello ne indica un
 * altro, l'operazione viene rifiutata: l'agente lavora sul repository che
 * l'utente ha scelto, non su uno qualsiasi.
 */
function resolveRepo(context: ToolContext, input: Record<string, string>): GithubRepoRef | { error: string } {
  const linked = context.githubRepo;
  if (!linked || !linked.owner || !linked.repo) {
    return {
      error:
        "No GitHub repository is linked to this conversation. Ask the user to link one from the chat menu (the \"+\" button → Repository GitHub).",
    };
  }
  const owner = String(input.owner ?? "").trim();
  const repo = String(input.repo ?? "").trim();
  if (owner && owner.toLowerCase() !== linked.owner.toLowerCase()) {
    return {
      error: `Only the linked repository (${linked.owner}/${linked.repo}) can be used in this conversation.`,
    };
  }
  if (repo && repo.toLowerCase() !== linked.repo.toLowerCase()) {
    return {
      error: `Only the linked repository (${linked.owner}/${linked.repo}) can be used in this conversation.`,
    };
  }
  return { owner: linked.owner, repo: linked.repo, branch: linked.branch };
}

function tenantOf(context: ToolContext): string {
  if (context.userId && context.userId !== "anonymous") return context.userId;
  return context.tenantId ?? "";
}

/** Esegue un tool del repository collegato e restituisce il testo per il modello. */
export async function executeGithubRepoTool(
  name: string,
  input: Record<string, string>,
  context: ToolContext,
): Promise<string> {
  const repo = resolveRepo(context, input);
  if ("error" in repo) return repo.error;

  const tenantId = tenantOf(context);
  const resolved = await resolveIntegrationToken(tenantId, "github");
  if (!resolved.ok) {
    return `${resolved.error} The user can link GitHub from the chat menu (the "+" button → Connettori).`;
  }
  const token = resolved.token.accessToken;
  const branch = String(input.branch ?? "").trim() || repo.branch;

  switch (name) {
    case "github_repo_info": {
      const r = await getRepoInfo(token, repo);
      return r.ok ? r.data : r.error;
    }
    case "github_repo_list_files": {
      const r = await listFiles(token, repo, String(input.path ?? ""), branch);
      return r.ok ? r.data : r.error;
    }
    case "github_repo_read_file": {
      const r = await readFile(token, repo, String(input.path ?? ""), branch);
      return r.ok ? r.data : r.error;
    }
    case "github_repo_write_file": {
      const r = await writeFile(token, repo, {
        path: String(input.path ?? ""),
        content: String(input.content ?? ""),
        message: String(input.message ?? ""),
        branch,
      });
      return r.ok ? r.data : r.error;
    }
    case "github_repo_create_branch": {
      const r = await createBranch(token, repo, {
        name: String(input.name ?? ""),
        from: String(input.from ?? ""),
      });
      return r.ok ? r.data : r.error;
    }
    case "github_repo_create_pull_request": {
      const r = await createPullRequest(token, repo, {
        title: String(input.title ?? ""),
        body: String(input.body ?? ""),
        head: String(input.head ?? ""),
        base: String(input.base ?? ""),
      });
      return r.ok ? r.data : r.error;
    }
    case "github_repo_list_branches": {
      const r = await listBranches(token, repo);
      return r.ok ? r.data : r.error;
    }
    default:
      return `Unknown GitHub repository tool: ${name}.`;
  }
}

/**
 * Blocco di contesto per il system prompt: dice al modello su quale repository
 * può lavorare e con quali tool. Senza questo blocco il modello non sa che
 * esiste un repository collegato e non chiama i tool.
 */
export function buildGithubRepoContext(repo: GithubRepoRef | null | undefined): string {
  if (!repo || !repo.owner || !repo.repo) return "";
  return [
    "[Repository GitHub collegato]",
    `L'utente ha collegato il repository GitHub ${repo.owner}/${repo.repo}${repo.branch ? ` (branch: ${repo.branch})` : ""}.`,
    "Puoi leggerne i file e scriverci usando i tool github_repo_* (github_repo_info, github_repo_list_files, github_repo_read_file, github_repo_write_file, github_repo_create_branch, github_repo_create_pull_request, github_repo_list_branches).",
    "Regole: leggi il file prima di modificarlo, e modifica solo i file necessari al compito dell'utente. Le scritture chiedono la conferma all'utente: non aggirarla e non promettere modifiche già fatte.",
  ].join("\n");
}
