"use client";

/**
 * Upload di una competenza personale.
 *
 * Drag & drop di uno .zip (o selezione da file). La validazione è lato server
 * (`POST /api/skills/upload` → `lib/skills/validate.ts`): qui si fa solo
 * l'anteprima dei file e la lettura degli errori, che tornano come elenco
 * leggibile e non come "qualcosa è andato storto".
 *
 * Privacy: la skill viene salvata con `owner: "user"` e `account_id` della
 * sessione, mai dai valori del frontmatter. È scritto qui sotto perché è la
 * promessa che facciamo all'utente.
 */

import { useCallback, useRef, useState } from "react";
import { Upload, FileCheck2, AlertTriangle, Trash2, Loader2, Eye, Lock } from "lucide-react";
import type { SkillsDictionary } from "@/lib/i18n/skills";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | {
      status: "done";
      skill: { slug: string; name: string; description: string; risk_level: string };
      files: { path: string; bytes: number }[];
      warnings: string[];
      renamed: boolean;
    }
  | { status: "error"; issues: string[] };

export default function SkillUploader({
  signedIn,
  dict,
}: {
  signedIn: boolean;
  dict: SkillsDictionary;
}) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setState({ status: "uploading" });
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/skills/upload", { method: "POST", body: form });
        const data = (await res.json()) as {
          error?: string;
          issues?: string[];
          skill?: { slug: string; name: string; description: string; risk_level: string };
          files?: { path: string; bytes: number }[];
          warnings?: string[];
          renamed?: boolean;
        };
        if (!res.ok || !data.skill) {
          setState({
            status: "error",
            issues: data.issues?.length ? data.issues : [data.error ?? dict.uploadError],
          });
          return;
        }
        setState({
          status: "done",
          skill: data.skill,
          files: data.files ?? [],
          warnings: data.warnings ?? [],
          renamed: Boolean(data.renamed),
        });
      } catch {
        setState({ status: "error", issues: [dict.uploadError] });
      }
    },
    [dict.uploadError],
  );

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!signedIn) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  if (!signedIn) {
    return (
      <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Upload size={16} className="text-brand-400" />
          {dict.uploadTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{dict.uploadBody}</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-neutral-400">
          <Lock size={14} />
          {dict.uploadRequiresLogin}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Upload size={16} className="text-brand-400" />
            {dict.uploadTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">{dict.uploadBody}</p>
        </div>
        <a
          href="/docs/skills"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-800 px-3.5 py-1.5 text-xs font-bold text-neutral-200 transition-colors hover:bg-neutral-700 hover:text-white"
        >
          {dict.templateDownload}
        </a>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mt-5 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-brand-500/50 bg-brand-500/5" : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
        <p className="text-sm text-neutral-400">
          {dict.uploadDropzone}{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-bold text-brand-400 underline underline-offset-2 transition-colors hover:text-brand-300"
          >
            {dict.uploadChoose}
          </button>
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-600">
          <Lock size={11} />
          {dict.uploadPrivateNote}
        </p>
      </div>

      {state.status === "uploading" && (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-neutral-400">
          <Loader2 size={14} className="animate-spin" />
          {dict.uploadValidating}
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-red-300">
            <AlertTriangle size={14} />
            {dict.uploadError}
          </p>
          <ul className="mt-2 space-y-1">
            {state.issues.map((issue, i) => (
              <li key={i} className="text-xs leading-5 text-red-200/80">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.status === "done" && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <FileCheck2 size={14} />
            {dict.uploadSuccess}: {state.skill.name}
          </p>
          <p className="mt-1 font-mono text-[11px] text-emerald-200/70">{state.skill.slug}</p>

          {state.renamed && (
            <p className="mt-2 text-xs text-amber-300">
              Lo slug esisteva già per un altro account: la competenza è stata salvata con un
              suffisso univoco.
            </p>
          )}

          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              <Eye size={11} />
              {dict.uploadPreview}
            </p>
            <p className="mt-1 text-sm leading-6 text-neutral-300">{state.skill.description}</p>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {dict.uploadFiles}
            </p>
            <ul className="mt-1 space-y-0.5">
              {state.files.map((f) => (
                <li key={f.path} className="font-mono text-[11px] text-neutral-400">
                  {f.path} <span className="text-neutral-600">({formatBytes(f.bytes)})</span>
                </li>
              ))}
            </ul>
          </div>

          {state.warnings.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">
                {dict.uploadWarnings}
              </p>
              <ul className="mt-1 space-y-0.5">
                {state.warnings.map((w, i) => (
                  <li key={i} className="text-[11px] leading-5 text-amber-200/80">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => setState({ status: "idle" })}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 transition-colors hover:text-white"
          >
            <Trash2 size={12} />
            {dict.uploadClear}
          </button>
        </div>
      )}
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
