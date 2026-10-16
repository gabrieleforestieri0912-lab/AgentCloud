"use client";

// Sezione "Token API per la CLI" della pagina /account: genera token `act_…`
// (mostrati una sola volta), li elenca e li revoca via /api/user/tokens.
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Copy, Check, Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { DATE_LOCALES } from "@/lib/i18n/constants";

type TokenRow = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
};

export default function ApiTokens() {
  const { dict, locale } = useLanguage();
  const t = dict.apiTokens;
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const errorText = useCallback(
    (code: string) =>
      code === "tokens_not_setup" ? t.notSetup : code === "too_many_tokens" ? t.tooMany : t.error,
    [t],
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user/tokens");
      const data = (await res.json()) as { tokens?: TokenRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || "error");
      setTokens(data.tokens ?? []);
      setError(null);
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : "error"));
    }
  }, [errorText]);

  // Primo caricamento differito di un microtask (stesso pattern di
  // settings-client): niente setState sincrono nel corpo dell'effect.
  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/user/tokens", { cache: "no-store" })
        .then(async (res) => {
          const data = (await res.json()) as { tokens?: TokenRow[]; error?: string };
          if (!res.ok) throw new Error(data.error || "error");
          setTokens(data.tokens ?? []);
          setError(null);
        })
        .catch((e: unknown) => {
          setError(errorText(e instanceof Error ? e.message : "error"));
        });
    });
  }, [errorText]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setFresh(null);
    setCopied(false);
    try {
      const res = await fetch("/api/user/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "error");
      setFresh(data.token ?? null);
      setName("");
      await load();
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : "error"));
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fresh;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // copia manuale: il token resta visibile nel campo
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
      const res = await fetch(`/api/user/tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
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
        <KeyRound size={16} className="text-amber-400" />
        {t.title}
      </h3>
      <p className="mt-2 text-sm text-neutral-400">{t.desc}</p>

      {/* Token appena creato: visibile una sola volta */}
      {fresh && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-bold text-amber-300">{t.showOnce}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 break-all rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 font-mono text-xs text-emerald-300">
              {fresh}
            </code>
            <button
              onClick={() => void handleCopy()}
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
        {tokens === null ? (
          <p className="text-sm text-neutral-500">…</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-neutral-500">{t.noTokens}</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((tok) => (
              <li
                key={tok.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-neutral-800 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{tok.name}</p>
                  <p className="font-mono text-xs text-neutral-500">
                    {tok.prefix}… · {t.created} {fmtDate(tok.created_at)} ·{" "}
                    {tok.last_used_at ? `${t.lastUsed} ${fmtDate(tok.last_used_at)}` : t.neverUsed}
                  </p>
                </div>
                <button
                  onClick={() => void handleRevoke(tok.id)}
                  disabled={revoking === tok.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                >
                  {revoking === tok.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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
    </div>
  );
}
