/**
 * Repository GitHub collegati alla chat.
 *
 * Storage locale (stessa scelta dei progetti e delle conversazioni): niente
 * tabella nuova, niente costo. Il repository collegato viaggia nelle richieste
 * all'API e il server lo usa per i tool `github_repo_*`.
 *
 * Il token GitHub NON sta qui: resta nelle integrazioni del tenant (OAuth),
 * come per tutte le altre app collegate.
 */

export type GithubRepoLink = {
  owner: string;
  repo: string;
  /** Branch di lavoro predefinito (facoltativo: default branch del repository). */
  branch?: string;
  added_at: string;
};

const REPOS_KEY = "agentcloud_github_repos_v1";
const ACTIVE_KEY = "agentcloud_github_active_repo_v1";
const MAX_REPOS = 20;

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function cleanSegment(value: string): string {
  return value
    .trim()
    .replace(/\.git$/i, "")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .slice(0, 100);
}

/**
 * Accetta `owner/repo`, un URL GitHub (`https://github.com/owner/repo`,
 * anche con `/tree/main` o `.git`) o la forma SSH `git@github.com:owner/repo.git`.
 * Restituisce null se non si riconosce un repository.
 */
export function parseGithubRepoInput(raw: string): { owner: string; repo: string } | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  if (value.includes("@") && value.includes(":")) {
    // git@github.com:owner/repo.git
    const match = /:([^/]+)\/([^/]+)$/.exec(value);
    if (!match) return null;
    const owner = cleanSegment(match[1]);
    const repo = cleanSegment(match[2]);
    return owner && repo ? { owner, repo } : null;
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!/github\.com$/i.test(url.hostname)) return null;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return null;
      const owner = cleanSegment(parts[0]);
      const repo = cleanSegment(parts[1]);
      return owner && repo ? { owner, repo } : null;
    } catch {
      return null;
    }
  }

  const parts = value.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = cleanSegment(parts[0]);
  const repo = cleanSegment(parts[1]);
  return owner && repo ? { owner, repo } : null;
}

export function readGithubRepos(): GithubRepoLink[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(REPOS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is GithubRepoLink => !!r && typeof r === "object")
      .map((r) => ({
        owner: cleanSegment(String((r as GithubRepoLink).owner ?? "")),
        repo: cleanSegment(String((r as GithubRepoLink).repo ?? "")),
        branch:
          typeof (r as GithubRepoLink).branch === "string" && (r as GithubRepoLink).branch
            ? String((r as GithubRepoLink).branch).trim().slice(0, 100)
            : undefined,
        added_at:
          typeof (r as GithubRepoLink).added_at === "string"
            ? (r as GithubRepoLink).added_at
            : new Date().toISOString(),
      }))
      .filter((r) => r.owner && r.repo)
      .slice(0, MAX_REPOS);
  } catch {
    return [];
  }
}

export function saveGithubRepos(repos: GithubRepoLink[]): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(REPOS_KEY, JSON.stringify(repos.slice(0, MAX_REPOS)));
  } catch {
    // Storage pieno o non disponibile: i repository restano in memoria.
  }
}

/** Aggiunge (o aggiorna) un repository collegato e lo rende quello attivo. */
export function addGithubRepo(
  owner: string,
  repo: string,
  branch?: string,
): GithubRepoLink | null {
  const cleanOwner = cleanSegment(owner);
  const cleanRepo = cleanSegment(repo);
  if (!cleanOwner || !cleanRepo) return null;
  const link: GithubRepoLink = {
    owner: cleanOwner,
    repo: cleanRepo,
    branch: branch?.trim() ? branch.trim().slice(0, 100) : undefined,
    added_at: new Date().toISOString(),
  };
  const existing = readGithubRepos().filter(
    (r) => !(r.owner.toLowerCase() === cleanOwner.toLowerCase() && r.repo.toLowerCase() === cleanRepo.toLowerCase()),
  );
  saveGithubRepos([link, ...existing]);
  setActiveGithubRepo(link);
  return link;
}

export function removeGithubRepo(owner: string, repo: string): void {
  const next = readGithubRepos().filter(
    (r) => !(r.owner.toLowerCase() === owner.toLowerCase() && r.repo.toLowerCase() === repo.toLowerCase()),
  );
  saveGithubRepos(next);
  const active = readActiveGithubRepo();
  if (
    active &&
    active.owner.toLowerCase() === owner.toLowerCase() &&
    active.repo.toLowerCase() === repo.toLowerCase()
  ) {
    clearActiveGithubRepo();
  }
}

/** Repository attualmente collegato alla chat (null se nessuno). */
export function readActiveGithubRepo(): GithubRepoLink | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GithubRepoLink> | null;
    if (!parsed || typeof parsed.owner !== "string" || typeof parsed.repo !== "string") {
      return null;
    }
    const owner = cleanSegment(parsed.owner);
    const repo = cleanSegment(parsed.repo);
    if (!owner || !repo) return null;
    return {
      owner,
      repo,
      branch: typeof parsed.branch === "string" ? parsed.branch : undefined,
      added_at: parsed.added_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function setActiveGithubRepo(repo: GithubRepoLink | null): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    if (!repo) storage.removeItem(ACTIVE_KEY);
    else storage.setItem(ACTIVE_KEY, JSON.stringify(repo));
  } catch {
    // ignora: la preferenza resta in memoria
  }
}

export function clearActiveGithubRepo(): void {
  setActiveGithubRepo(null);
}
