"use client";

/**
 * Menu "+" dell'input della chat.
 *
 * Un solo bottone apre tutte le azioni che si possono fare prima di scrivere:
 * allegare file, catturare uno screenshot, scegliere il progetto, attivare
 * una skill, aprire i connettori, scegliere un plugin, accendere la ricerca
 * web e collegare un repository GitHub su cui l'agente può lavorare.
 *
 * Perché un componente dedicato e non un blocco dentro `ChatInterface.tsx`:
 * il menu ha uno stato proprio (aperto/chiuso, sotto-menu, dati caricati
 * pigramente) e `ChatInterface` è già un file enorme. Qui stanno i dati
 * (skill, plugin, connettori) e il menu li chiede al server solo quando
 * l'utente apre il ramo che gli serve.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Blocks,
  Camera,
  Check,
  ChevronRight,
  FolderPlus,
  GitBranch,
  Paperclip,
  Plug,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { GithubRepoLink } from "@/lib/github-repos";
import { parseGithubRepoInput } from "@/lib/github-repos";
import { CHAT_ATTACH_ACCEPT } from "@/lib/chat-attachments";

export type PlusMenuLabels = {
  aria: string;
  attach: string;
  attachShortcut: string;
  screenshot: string;
  screenshotError: string;
  addToProject: string;
  noProjects: string;
  skills: string;
  noSkills: string;
  connectors: string;
  noConnectors: string;
  manageConnectors: string;
  plugins: string;
  noPlugins: string;
  webSearch: string;
  githubRepo: string;
  noRepos: string;
  linkRepo: string;
  linkRepoTitle: string;
  linkRepoConfirm: string;
  cancel: string;
  linkRepoPlaceholder: string;
  linkRepoInvalid: string;
  unlinkRepo: string;
  githubNotConnected: string;
  /** Testo inserito nell'input quando l'utente sceglie una skill. */
  useSkill: string;
};

export type PlusMenuItem =  | {
      type: "action";
      id: string;
      label: string;
      icon: React.ReactNode;
      hint?: string;
      disabled?: boolean;
      /** L'azione lascia il menu aperto (es. il form di collegamento). */
      keepOpen?: boolean;
      onSelect: () => void;
    }
  | {
      type: "toggle";
      id: string;
      label: string;
      icon: React.ReactNode;
      checked: boolean;
      onSelect: () => void;
    }
  | {
      type: "submenu";
      id: string;
      label: string;
      icon: React.ReactNode;
      items: PlusMenuItem[];
    };

type SkillSummary = { slug: string; name: string };
type PluginSummary = { slug: string; name: string };
type ConnectorSummary = { provider: string; label: string };

type ChatPlusMenuProps = {
  labels: PlusMenuLabels;
  disabled?: boolean;
  /** File scelti dall'utente (dal selettore file o da Ctrl+U). */
  onFiles: (files: FileList | null) => void;
  /** Aggiunge uno screenshot catturato come allegato. */
  onScreenshot: (file: File) => void;
  projects: { id: string; name: string }[];
  onSelectProject: (id: string) => void;
  /** Repository GitHub collegati e quello attivo. */
  repos: GithubRepoLink[];
  activeRepo: GithubRepoLink | null;
  onSelectRepo: (repo: GithubRepoLink) => void;
  onUnlinkRepo: (repo: GithubRepoLink) => void;
  onLinkRepo: (owner: string, repo: string) => void;
  /** GitHub è collegato come integrazione? */
  githubConnected: boolean;
  webSearch: boolean;
  onToggleWebSearch: (next: boolean) => void;
};

/**
 * Cattura lo schermo (o una finestra) e la restituisce come File.
 *
 * `getDisplayMedia` chiede il permesso al browser: se l'utente annulla, la
 * promessa rifiuta e il menu mostra l'errore invece di fallire in silenzio.
 */
export async function captureScreenFile(): Promise<File> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("getDisplayMedia non supportato");
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas non disponibile");
    ctx.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) throw new Error("screenshot non disponibile");
    return new File([blob], "screenshot.png", { type: "image/png" });
  } finally {
    // La webcam/screen-capture va chiusa subito: Leaving it on keeps the
    // browser's "sharing" indicator on forever.
    stream.getTracks().forEach((t) => t.stop());
  }
}

function MenuPanel({
  items,
  onClose,
  depth = 0,
}: {
  items: PlusMenuItem[];
  onClose: () => void;
  depth?: number;
}) {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  return (
    <div
      className="min-w-[15rem] max-w-[22rem] overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 py-1 shadow-2xl shadow-black/50 backdrop-blur-xl"
      role="menu"
    >
      {items.map((item) => {
        if (item.type === "toggle") {
          return (
            <button
              key={item.id}
              type="button"
              role="menuitemcheckbox"
              aria-checked={item.checked}
              onClick={() => {
                item.onSelect();
                onClose();
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] text-neutral-200 transition-colors hover:bg-white/10"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-neutral-400">
                {item.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.checked && <Check size={14} className="shrink-0 text-brand-400" />}
            </button>
          );
        }

        if (item.type === "submenu") {
          const open = openSubmenu === item.id;
          return (
            <div key={item.id} className="relative">
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpenSubmenu(open ? null : item.id)}
                onMouseEnter={() => setOpenSubmenu(item.id)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] text-neutral-200 transition-colors hover:bg-white/10"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center text-neutral-400">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <ChevronRight size={14} className="shrink-0 text-neutral-500" />
              </button>
              {open && (
                <div
                  className={
                    depth === 0
                      ? "absolute left-full top-0 z-20 ml-1"
                      : "absolute left-full top-0 z-20 ml-1"
                  }
                >
                  <MenuPanel items={item.items} onClose={onClose} depth={depth + 1} />
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect();
              if (!item.keepOpen) onClose();
            }}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] text-neutral-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-neutral-400">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.hint && (
              <span className="shrink-0 text-[11px] text-neutral-500">{item.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function ChatPlusMenu({
  labels,
  disabled,
  onFiles,
  onScreenshot,
  projects,
  onSelectProject,
  repos,
  activeRepo,
  onSelectRepo,
  onUnlinkRepo,
  onLinkRepo,
  githubConnected,
  webSearch,
  onToggleWebSearch,
}: ChatPlusMenuProps) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const [plugins, setPlugins] = useState<PluginSummary[] | null>(null);
  const [connectors, setConnectors] = useState<ConnectorSummary[] | null>(null);
  const [repoInput, setRepoInput] = useState("");
  const [repoFormOpen, setRepoFormOpen] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Chiude il menu cliccando fuori o premendo Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Ctrl+U (Ctrl+Shift+U su mac) apre il selettore file da qualunque punto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() !== "u") return;
      // Non intercettare la combinazione "sottolinea" nei campi di testo.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      e.preventDefault();
      openFilePicker();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openFilePicker]);

  // Dati caricati pigramente: solo quando il ramo del menu viene aperto.
  useEffect(() => {
    if (!open) return;
    if (skills === null) {
      fetch("/api/skills?owner=user")
        .then((r) => (r.ok ? r.json() : { skills: [] }))
        .then((data: { skills?: { slug: string; name: string }[] }) =>
          setSkills((data.skills ?? []).slice(0, 20).map((s) => ({ slug: s.slug, name: s.name }))),
        )
        .catch(() => setSkills([]));
    }
    if (plugins === null) {
      fetch("/api/plugins")
        .then((r) => (r.ok ? r.json() : { plugins: [] }))
        .then((data: { plugins?: { slug: string; name: string }[] }) =>
          setPlugins((data.plugins ?? []).slice(0, 20).map((p) => ({ slug: p.slug, name: p.name }))),
        )
        .catch(() => setPlugins([]));
    }
    if (connectors === null) {
      fetch("/api/integrations/status")
        .then((r) => (r.ok ? r.json() : { providers: [] }))
        .then(
          (data: {
            providers?: { provider: string; status?: string; external_account_id?: string }[];
          }) =>
            setConnectors(
              (data.providers ?? [])
                .filter((p) => p.status === "connected")
                .map((p) => ({ provider: p.provider, label: p.external_account_id || p.provider })),
            ),
        )
        .catch(() => setConnectors([]));
    }
  }, [open, skills, plugins, connectors]);

  const handleScreenshot = useCallback(async () => {
    try {
      const file = await captureScreenFile();
      onScreenshot(file);
      setNotice(null);
    } catch {
      setNotice(labels.screenshotError);
    }
  }, [labels.screenshotError, onScreenshot]);

  const submitRepo = useCallback(() => {
    const value = repoInput.trim();
    if (!value) return;
    // Parsing tollerante: "owner/repo", URL GitHub o SSH.
    const parts = parseGithubRepoInput(value);
    if (!parts) {
      setRepoError(labels.linkRepoInvalid);
      return;
    }
    onLinkRepo(parts.owner, parts.repo);
    setRepoInput("");
    setRepoError(null);
    setRepoFormOpen(false);
    setOpen(false);
    setNotice(null);
  }, [labels.linkRepoInvalid, onLinkRepo, repoInput]);

  const items: PlusMenuItem[] = [
    {
      type: "action",
      id: "attach",
      label: labels.attach,
      icon: <Paperclip size={15} />,
      hint: labels.attachShortcut,
      onSelect: openFilePicker,
    },
    {
      type: "action",
      id: "screenshot",
      label: labels.screenshot,
      icon: <Camera size={15} />,
      onSelect: () => {
        void handleScreenshot();
      },
    },
    {
      type: "submenu",
      id: "project",
      label: labels.addToProject,
      icon: <FolderPlus size={15} />,
      items: projects.length
        ? projects.map((p) => ({
            type: "action" as const,
            id: `project-${p.id}`,
            label: p.name,
            icon: <FolderPlus size={15} />,
            onSelect: () => onSelectProject(p.id),
          }))
        : [
            {
              type: "action" as const,
              id: "project-empty",
              label: labels.noProjects,
              icon: <FolderPlus size={15} />,
              disabled: true,
              onSelect: () => {},
            },
          ],
    },
    {
      type: "submenu",
      id: "skills",
      label: labels.skills,
      icon: <Sparkles size={15} />,
      items: skills === null
        ? [
            {
              type: "action" as const,
              id: "skills-loading",
              label: "…",
              icon: <Sparkles size={15} />,
              disabled: true,
              onSelect: () => {},
            },
          ]
        : skills.length
          ? skills.map((s) => ({
              type: "action" as const,
              id: `skill-${s.slug}`,
              label: s.name,
              icon: <Sparkles size={15} />,
              onSelect: () => {
                window.dispatchEvent(
                  new CustomEvent("agentcloud:use-skill", { detail: { name: s.name } }),
                );
              },
            }))
          : [
              {
                type: "action" as const,
                id: "skills-empty",
                label: labels.noSkills,
                icon: <Sparkles size={15} />,
                disabled: true,
                onSelect: () => {},
              },
            ],
    },
    {
      type: "submenu",
      id: "connectors",
      label: labels.connectors,
      icon: <Plug size={15} />,
      items: [
        ...(connectors && connectors.length
          ? connectors.map((c) => ({
              type: "action" as const,
              id: `connector-${c.provider}`,
              label: c.label,
              icon: <Plug size={15} />,
              onSelect: () => {
                window.location.href = "/dashboard/integrations";
              },
            }))
          : [
              {
                type: "action" as const,
                id: "connectors-empty",
                label: labels.noConnectors,
                icon: <Plug size={15} />,
                disabled: true,
                onSelect: () => {},
              },
            ]),
        {
          type: "action" as const,
          id: "connectors-manage",
          label: labels.manageConnectors,
          icon: <Plug size={15} />,
          onSelect: () => {
            window.location.href = "/dashboard/integrations";
          },
        },
      ],
    },
    {
      type: "submenu",
      id: "plugins",
      label: labels.plugins,
      icon: <Blocks size={15} />,
      items: plugins === null
        ? [
            {
              type: "action" as const,
              id: "plugins-loading",
              label: "…",
              icon: <Blocks size={15} />,
              disabled: true,
              onSelect: () => {},
            },
          ]
        : plugins.length
          ? plugins.map((p) => ({
              type: "action" as const,
              id: `plugin-${p.slug}`,
              label: p.name,
              icon: <Blocks size={15} />,
              onSelect: () => {
                window.location.href = `/plugins/${p.slug}`;
              },
            }))
          : [
              {
                type: "action" as const,
                id: "plugins-empty",
                label: labels.noPlugins,
                icon: <Blocks size={15} />,
                disabled: true,
                onSelect: () => {},
              },
            ],
    },
    {
      type: "toggle",
      id: "web-search",
      label: labels.webSearch,
      icon: <Search size={15} />,
      checked: webSearch,
      onSelect: () => onToggleWebSearch(!webSearch),
    },
    {
      type: "submenu",
      id: "github",
      label: labels.githubRepo,
      icon: <GitBranch size={15} />,
      items: [
        ...(repos.length
          ? repos.map((r) => ({
              type: "action" as const,
              id: `repo-${r.owner}-${r.repo}`,
              label: `${r.owner}/${r.repo}${r.branch ? ` · ${r.branch}` : ""}`,
              icon: <GitBranch size={15} />,
              onSelect: () => onSelectRepo(r),
            }))
          : [
              {
                type: "action" as const,
                id: "repo-empty",
                label: labels.noRepos,
                icon: <GitBranch size={15} />,
                disabled: true,
                onSelect: () => {},
              },
            ]),
        {
          type: "action" as const,
          id: "repo-link",
          label: labels.linkRepo,
          icon: <Plus size={15} />,
          keepOpen: true,
          onSelect: () => {
            setRepoInput("");
            setRepoError(null);
            setRepoFormOpen(true);
          },
        },
        ...(activeRepo
          ? [
              {
                type: "action" as const,
                id: "repo-unlink",
                label: `${labels.unlinkRepo} ${activeRepo.owner}/${activeRepo.repo}`,
                icon: <Trash2 size={15} />,
                onSelect: () => onUnlinkRepo(activeRepo),
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={CHAT_ATTACH_ACCEPT}
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-label={labels.aria}
        title={labels.aria}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
      >
        <Plus size={16} strokeWidth={2.25} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-40 mb-2">
          {repoFormOpen ? (
            // Il form SOSTITUISCE il menu: metterli insieme spingerebbe il
            // menu fuori dal viewport (il contenitore cresce verso l'alto).
            <div className="w-[20rem] rounded-xl border border-white/10 bg-neutral-900/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <label className="mb-2 block text-[12px] font-semibold text-white">
                {labels.linkRepoTitle}
              </label>
              <input
                autoFocus
                value={repoInput}
                onChange={(e) => {
                  setRepoInput(e.target.value);
                  setRepoError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRepo();
                }}
                placeholder={labels.linkRepoPlaceholder}
                className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-[13px] text-white outline-none placeholder-neutral-600 focus:border-brand-500/60"
              />
              {repoError && <p className="mt-1.5 text-[11px] text-red-400">{repoError}</p>}
              {!githubConnected && (
                <p className="mt-1.5 text-[11px] text-amber-400">{labels.githubNotConnected}</p>
              )}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRepoInput("");
                    setRepoError(null);
                    setRepoFormOpen(false);
                  }}
                  className="rounded-lg px-3 py-1.5 text-[12px] text-neutral-300 hover:bg-white/10"
                >
                  {labels.cancel}
                </button>
                <button
                  type="button"
                  onClick={submitRepo}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-400"
                >
                  {labels.linkRepoConfirm}
                </button>
              </div>
            </div>
          ) : (
            <MenuPanel items={items} onClose={() => setOpen(false)} />
          )}
          {notice && <p className="mt-2 w-[20rem] text-[11px] text-amber-400">{notice}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * Etichette del menu prese dal dizionario attivo.
 * Vive qui (e non nella chat) cosi' il contratto fra dizionario e menu resta
 * in un posto solo.
 */
export function chatPlusMenuLabels(dict: {
  chat: {
    plusMenu: {
      aria: string;
      attach: string;
      attachShortcut: string;
      screenshot: string;
      screenshotError: string;
      addToProject: string;
      noProjects: string;
      skills: string;
      noSkills: string;
      connectors: string;
      noConnectors: string;
      manageConnectors: string;
      plugins: string;
      noPlugins: string;
      webSearch: string;
      githubRepo: string;
      noRepos: string;
      linkRepo: string;
      linkRepoTitle: string;
      linkRepoConfirm: string;
      cancel: string;
      linkRepoPlaceholder: string;
      linkRepoInvalid: string;
      unlinkRepo: string;
      githubNotConnected: string;
      useSkill: string;
    };
  };
}): PlusMenuLabels {
  const p = dict.chat.plusMenu;
  return {
    aria: p.aria,
    attach: p.attach,
    attachShortcut: p.attachShortcut,
    screenshot: p.screenshot,
    screenshotError: p.screenshotError,
    addToProject: p.addToProject,
    noProjects: p.noProjects,
    skills: p.skills,
    noSkills: p.noSkills,
    connectors: p.connectors,
    noConnectors: p.noConnectors,
    manageConnectors: p.manageConnectors,
    plugins: p.plugins,
    noPlugins: p.noPlugins,
    webSearch: p.webSearch,
    githubRepo: p.githubRepo,
    noRepos: p.noRepos,
    linkRepo: p.linkRepo,
    linkRepoTitle: p.linkRepoTitle,
    linkRepoConfirm: p.linkRepoConfirm,
    cancel: p.cancel,
    linkRepoPlaceholder: p.linkRepoPlaceholder,
    linkRepoInvalid: p.linkRepoInvalid,
    unlinkRepo: p.unlinkRepo,
    githubNotConnected: p.githubNotConnected,
    useSkill: p.useSkill,
  };
}
