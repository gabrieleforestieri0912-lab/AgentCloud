"use client";

// Sezione "API keys" della pagina /account: crea key `ack_…` (mostrate una
// sola volta) opazionalmente limitate a un modello abbonato, le elenca, le
// revoca e mostra lo snippet per integrarle nei progetti esterni.
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Copy, Check, Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { DATE_LOCALES } from "@/lib/i18n/constants";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  agent_slug: string | null;
  created_at: string;
  last_used_at: string | null;
};

function codeSnippet(agent: string): string {
  return `const res = await fetch("https://www.agentcloud.agency/api/v1/run", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // API key creata in /account → "API keys" (vale quanto la password)
    "Authorization": "Bearer ack_...",
  },
  body: JSON.stringify({
    // il modello a cui sei abbonato: la key da sola non basta
    "agent": "${agent}",
    "messages": [{ "role": "user", "content": "Ciao!" }],
    // "stream": true  // per risposte lunghe: stesso SSE di /api/agent/run
  }),
});
const data = await res.json();
console.log(data.reply); // { ok: true, agent, reply }`;
}

export default function ApiKeys() {
  const { dict, locale } = useLanguage();
  const t = dict.apiKeys;
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<{ key: string; agent: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const errorText = useCallback(
    (code: string) =>
      code === "keys_not_setup"
        ? t.notSetup
        : code === "too_many_keys"
          ? t.tooMany
          : code === "unknown_agent"
            ? t.unknownAgent
            : t.error,
    [t],
  );

  const load = useCallback(async () => {
    try {
      const [keysRes, ownedRes] = await Promise.all([
        fetch("/api/user/keys", { cache: "no-store" }),
        fetch("/api/user/owned", { cache: "no-store" }),
      ]);
      const keysData = (await keysRes.json()) as { keys?: KeyRow[]; error?: string };
      if (!keysRes.ok) throw new Error(keysData.error || "error");
      setKeys(keysData.keys ?? []);
      setError(null);
      const ownedData = (await ownedRes.json()) as { owned?: string[] };
      if (ownedRes.ok && Array.isArray(ownedData.owned)) setOwned(ownedData.owned);
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : "error"));
    }
  }, [errorText]);

  // Primo caricamento differito di un microtask (stesso pattern di
  // settings-client): niente setState sincrono nel corpo dell'effect.
  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setFresh(null);
    setCopied(false);
    try {
      const res = await fetch("/api/user/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, agent: scope || undefined }),
      });
      const data = (await res.json()) as { key?: string; agent?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error || "error");
      setFresh({ key: data.key ?? "", agent: data.agent ?? null });
      setName("");
      setScope("");
      await load();
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : "error"));
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // copia manuale: la key resta visibile nel campo
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
  }

  async function handleRevoke(id: string) {
    if (!confirm(t.confirmRevoke)) return;
    setRevoking(id);
    setError(null);
    try {
      const res = await fetch(`/api/user/keys/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "error");
      }
      await load();
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : "error"));
    } finally {
      setRevoking(null);
    }
  }

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(DATE_LOCALES[locale], {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
      <h3 className="flex items-center gap-2 text-lg font-bold text-white">
        <KeyRound size={16} className="text-cyan-400" />
        {t.title}
      </h3>
      <p className="mt-2 text-sm text-neutral-400">{t.desc}</p>

      {/* Key appena creata: visibile una sola volta */}
      {fresh && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-bold text-amber-300">{t.showOnce}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 break-all rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 font-mono text-xs text-emerald-300">
              {fresh.key}
            </code>
            <button
              onClick={() => void handleCopy(fresh.key)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? t.copied : t.copy}
            </button>
          </div>
        </div>
      )}

      {/* Creazione */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreate();
          }}
          placeholder={t.namePlaceholder}
          maxLength={60}
          className="flex-1 rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-500/50"
        />
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-500/50"
          aria-label={t.scopeLabel}
        >
          <option value="">{t.scopeAll}</option>
          {owned.map((slug) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>
        <button
          onClick={() => void handleCreate()}
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400 disabled:opacity-50"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {t.create}
        </button>
      </div>

      {/* Elenco */}
      <div className="mt-4">
        {keys === null ? (
          <p className="text-sm text-neutral-500">…</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-neutral-500">{t.noTokens}</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-neutral-800 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {k.name}{" "}
                    <span className="ml-1 rounded-full bg-cyan-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                      {k.agent_slug ?? t.scopeAllShort}
                    </span>
                  </p>
                  <p className="font-mono text-xs text-neutral-500">
                    {k.prefix}… · {t.created} {fmtDate(k.created_at)} ·{" "}
                    {k.last_used_at ? `${t.lastUsed} ${fmtDate(k.last_used_at)}` : t.neverUsed}
                  </p>
                </div>
                <button
                  onClick={() => void handleRevoke(k.id)}
                  disabled={revoking === k.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                >
                  {revoking === k.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  {t.revoke}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-red-300">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      {/* Snippet d'integrazione: nel codice specifichi il modello abbonato */}
      <div className="mt-6">
        <p className="text-sm font-bold text-white">{t.snippetTitle}</p>
        <p className="mt-1 text-xs text-neutral-500">{t.snippetNote}</p>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-brand-100">
          {codeSnippet(fresh?.agent ?? scope ?? "slug-del-tuo-agente")}
        </pre>
      </div>
    </div>
  );
}
