/**
 * Operazioni su un repository GitHub collegato.
 *
 * Perché un modulo dedicato: le integrazioni esistenti (`api-proxy.ts`) coprono
 * listare repository, issue e creare issue — abbastanza per "leggi lo stato",
 * non abbastanza per far lavorare l'agente DENTRO il codice. Qui ci sono le
 * operazioni sui file (leggere, scrivere), i branch e le pull request.
 *
 * Il token arriva già decriptato dal chiamante (`resolveIntegrationToken` in
 * `api-proxy.ts`): questo modulo non tocca il DB e non conosce l'utente, fa
 * solo chiamate HTTP a api.github.com con il token ricevuto.
 *
 * Sicurezza: le richieste di scrittura (file, branch, PR) restitucono sempre
 * l'esito reale di GitHub — un errore viene riportato come errore, mai
 * mascherato da successo.
 */

const GITHUB_API = "https://api.github.com";

export type GithubRepoRef = {
  owner: string;
  repo: string;
  /** Branch di lavoro predefinito (default branch del repository se omesso). */
  branch?: string;
};

export type GithubRepoResult =
  | { ok: true; data: string }
  | { ok: false; error: string };

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Messaggio d'errore di GitHub, riprodotto verbatim: spiega cosa sistemare. */
function apiError(json: unknown, status: number, statusText: string): string {
  const j = json as { message?: string; errors?: Array<{ message?: string }> };
  const details = (j?.errors ?? [])
    .map((e) => e?.message)
    .filter(Boolean)
    .join("; ");
  const base = j?.message || `${status} ${statusText}`;
  return details ? `GitHub API error: ${base} (${details})` : `GitHub API error: ${base}`;
}

/** Normalizza un path: niente slash iniziali, niente segmenti vuoti. */
export function normalizePath(path: string | undefined): string {
  return String(path ?? "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .trim();
}

async function call(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; statusText: string; json: unknown }> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: headers(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, statusText: res.statusText, json };
}

/** Metadati del repository: nome, visibilità, branch predefinito, licenza. */
export async function getRepoInfo(
  token: string,
  ref: GithubRepoRef,
): Promise<GithubRepoResult> {
  const { ok, status, statusText, json } = await call(
    token,
    "GET",
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`,
  );
  if (!ok) return { ok: false, error: apiError(json, status, statusText) };
  const r = json as {
    full_name?: string;
    description?: string | null;
    private?: boolean;
    default_branch?: string;
    language?: string | null;
    open_issues_count?: number;
    pushed_at?: string | null;
  };
  const lines = [
    `Repository: ${r.full_name ?? `${ref.owner}/${ref.repo}`}`,
    r.description ? `Description: ${r.description}` : null,
    `Visibility: ${r.private ? "private" : "public"}`,
    `Default branch: ${r.default_branch ?? "(unknown)"}`,
    r.language ? `Primary language: ${r.language}` : null,
    `Open issues: ${r.open_issues_count ?? 0}`,
    r.pushed_at ? `Last push: ${r.pushed_at}` : null,
  ].filter(Boolean);
  return { ok: true, data: lines.join("\n") };
}

/** Elenco dei file di una cartella (o della root, con path vuoto). */
export async function listFiles(
  token: string,
  ref: GithubRepoRef,
  path: string,
  branch?: string,
): Promise<GithubRepoResult> {
  const clean = normalizePath(path);
  const qs = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  const target = clean ? `/${encodeURIComponent(clean)}` : "";
  const { ok, status, statusText, json } = await call(
    token,
    "GET",
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/contents${target}${qs}`,
  );
  if (!ok) return { ok: false, error: apiError(json, status, statusText) };

  const items = (Array.isArray(json) ? json : []) as Array<{
    name?: string;
    path?: string;
    type?: string;
    size?: number;
  }>;
  if (items.length === 0) {
    return { ok: true, data: `No files found in "${clean || "/" }".` };
  }
  const lines = items.map((i) => {
    const kind = i.type === "dir" ? "dir " : "file";
    const size = typeof i.size === "number" ? ` (${i.size} bytes)` : "";
    return `- [${kind}] ${i.path ?? i.name ?? "?"}${size}`;
  });
  return {
    ok: true,
    data: `Files in "${clean || "/" }":\n${lines.join("\n")}`,
  };
}

/** Legge un file di testo. I file binari vengono segnalati, non troncati a caso. */
export async function readFile(
  token: string,
  ref: GithubRepoRef,
  path: string,
  branch?: string,
): Promise<GithubRepoResult> {
  const clean = normalizePath(path);
  if (!clean) return { ok: false, error: "github_repo_read_file requires a path." };
  const qs = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  const { ok, status, statusText, json } = await call(
    token,
    "GET",
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/contents/${encodeURIComponent(clean)}${qs}`,
  );
  if (!ok) return { ok: false, error: apiError(json, status, statusText) };

  const file = json as {
    name?: string;
    path?: string;
    sha?: string;
    size?: number;
    encoding?: string;
    content?: string;
    type?: string;
  };
  if (file.type === "dir" || Array.isArray(json)) {
    return {
      ok: false,
      error: `"${clean}" is a directory. Use github_repo_list_files to browse it.`,
    };
  }
  const encoding = file.encoding ?? "base64";
  let content = "";
  if (encoding === "base64" && file.content) {
    // Il contenuto GitHub arriva spezzato in righe: si toglie il \n prima del decode.
    content = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
  } else if (typeof file.content === "string") {
    content = file.content;
  }
  if (!content) {
    return {
      ok: false,
      error: `"${clean}" could not be decoded (encoding ${encoding}). It may be a binary file.`,
    };
  }
  const MAX = 40_000;
  const capped =
    content.length > MAX ? `${content.slice(0, MAX)}\n… (truncated)` : content;
  return {
    ok: true,
    data: `File: ${file.path ?? clean}${file.size ? ` (${file.size} bytes)` : ""}\n---\n${capped}`,
  };
}

/**
 * Scrive (crea o sovrascrive) un file.
 *
 * Se il file esiste serve il suo `sha`: GitHub rifiuta la scrittura senza, e
 * il messaggio di errore ("sha is required") sarebbe incomprensibile per il
 * modello. Qui lo recuperiamo prima, così l'errore che resta è quello vero.
 */
export async function writeFile(
  token: string,
  ref: GithubRepoRef,
  params: {
    path: string;
    content: string;
    message?: string;
    branch?: string;
  },
): Promise<GithubRepoResult> {
  const clean = normalizePath(params.path);
  if (!clean) return { ok: false, error: "github_repo_write_file requires a path." };
  const branch = params.branch || ref.branch;
  if (!branch) {
    return {
      ok: false,
      error:
        "github_repo_write_file needs a branch: no default branch is known for this repository.",
    };
  }

  // sha del file esistente (se c'è) sul branch indicato.
  let sha: string | undefined;
  const existing = await call(
    token,
    "GET",
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/contents/${encodeURIComponent(clean)}?ref=${encodeURIComponent(branch)}`,
  );
  if (existing.ok) {
    const f = existing.json as { sha?: string; type?: string };
    if (f.type !== "dir" && f.sha) sha = f.sha;
  }

  const body: Record<string, unknown> = {
    message: params.message?.trim() || `Update ${clean} via AgentCloud`,
    content: Buffer.from(params.content, "utf8").toString("base64"),
    branch,
  };
  if (sha) body.sha = sha;

  const { ok, status, statusText, json } = await call(
    token,
    "PUT",
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/contents/${encodeURIComponent(clean)}`,
    body,
  );
  if (!ok) return { ok: false, error: apiError(json, status, statusText) };
  const c = json as { content?: { path?: string; sha?: string }; commit?: { sha?: string } };
  return {
    ok: true,
    data: `File written: ${c.content?.path ?? clean} (branch ${branch}, commit ${c.commit?.sha?.slice(0, 7) ?? "?"}).`,
  };
}

/** Crea un branch a partire da un altro (default: branch predefinito). */
export async function createBranch(
  token: string,
  ref: GithubRepoRef,
  params: { name: string; from?: string },
): Promise<GithubRepoResult> {
  const name = String(params.name ?? "").trim();
  if (!name) return { ok: false, error: "github_repo_create_branch requires a name." };

  const from = params.from || ref.branch;
  let sha: string | undefined;
  if (from) {
    const head = await call(
      token,
      "GET",
      `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/branches/${encodeURIComponent(from)}`,
    );
    if (!head.ok) {
      return {
        ok: false,
        error: apiError(head.json, head.status, head.statusText),
      };
    }
    sha = (head.json as { commit?: { sha?: string } }).commit?.sha;
  } else {
    const info = await getRepoInfo(token, ref);
    if (!info.ok) return info;
    const defaultBranch = /Default branch: (.+)/.exec(info.data)?.[1]?.trim();
    if (!defaultBranch) {
      return { ok: false, error: "Could not resolve the default branch of the repository." };
    }
    const head = await call(
      token,
      "GET",
      `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/branches/${encodeURIComponent(defaultBranch)}`,
    );
    if (!head.ok) return { ok: false, error: apiError(head.json, head.status, head.statusText) };
    sha = (head.json as { commit?: { sha?: string } }).commit?.sha;
  }
  if (!sha) return { ok: false, error: "Could not resolve the commit to branch from." };

  const { ok, status, statusText, json } = await call(
    token,
    "POST",
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/git/refs`,
    { ref: `refs/heads/${name}`, sha },
  );
  if (!ok) return { ok: false, error: apiError(json, status, statusText) };
  const r = json as { ref?: string; object?: { sha?: string } };
  return { ok: true, data: `Branch created: ${r.ref ?? `refs/heads/${name}`}.` };
}

/** Apre una pull request. */
export async function createPullRequest(
  token: string,
  ref: GithubRepoRef,
  params: { title: string; body?: string; head: string; base?: string },
): Promise<GithubRepoResult> {
  const title = String(params.title ?? "").trim();
  const head = String(params.head ?? "").trim();
  if (!title) return { ok: false, error: "github_repo_create_pull_request requires a title." };
  if (!head) return { ok: false, error: "github_repo_create_pull_request requires a head branch." };

  const base = params.base || ref.branch;
  if (!base) {
    return {
      ok: false,
      error:
        "github_repo_create_pull_request needs a base branch: no default branch is known for this repository.",
    };
  }

  const { ok, status, statusText, json } = await call(
    token,
    "POST",
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/pulls`,
    { title, body: params.body ?? "", head, base },
  );
  if (!ok) return { ok: false, error: apiError(json, status, statusText) };
  const pr = json as { number?: number; html_url?: string; head?: { ref?: string } };
  return {
    ok: true,
    data: `Pull request #${pr.number ?? "?"} opened (${pr.head?.ref ?? head} → ${base})${pr.html_url ? ` — ${pr.html_url}` : ""}.`,
  };
}

/** Elenco dei branch del repository. */
export async function listBranches(
  token: string,
  ref: GithubRepoRef,
): Promise<GithubRepoResult> {
  const { ok, status, statusText, json } = await call(
    token,
    "GET",
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/branches?per_page=50`,
  );
  if (!ok) return { ok: false, error: apiError(json, status, statusText) };
  const branches = (Array.isArray(json) ? json : []) as Array<{
    name?: string;
    commit?: { sha?: string };
  }>;
  if (branches.length === 0) return { ok: true, data: "No branches found." };
  return {
    ok: true,
    data: branches
      .map((b) => `- ${b.name ?? "?"}${b.commit?.sha ? ` (${b.commit.sha.slice(0, 7)})` : ""}`)
      .join("\n"),
  };
}
