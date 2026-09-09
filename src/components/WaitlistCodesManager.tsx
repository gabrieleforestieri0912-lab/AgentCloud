"use client";

/**
 * WaitlistCodesManager — UI interna per gestire i codici beta access.
 *
 * Features:
 * - Genera nuovo codice (ruolo, max_uses, scadenza)
 * - Lista codici con used_count / stato
 * - Revoca manuale (imposta expires_at a ora)
 */

import { useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Key,
  Users,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";

type Code = {
  id: string;
  code: string;
  role: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
};

type Redemption = {
  id: string;
  code_id: string;
  user_id: string;
  redeemed_at: string;
  profiles: { email: string | null } | null;
};

type Props = {
  codes: Code[];
  redemptions: Redemption[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatus(code: Code): { label: string; color: string } {
  if (code.expires_at && new Date(code.expires_at) < new Date()) {
    return { label: "Scaduto", color: "text-red-400 bg-red-500/10" };
  }
  if (code.used_count >= code.max_uses) {
    return { label: "Esaurito", color: "text-amber-400 bg-amber-500/10" };
  }
  return { label: "Attivo", color: "text-emerald-400 bg-emerald-500/10" };
}

export default function WaitlistCodesManager({ codes, redemptions }: Props) {
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [newRole, setNewRole] = useState<"beta_tester" | "internal_qa">("beta_tester");
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [newExpiry, setNewExpiry] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/waitlist-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          role: newRole,
          max_uses: newMaxUses,
          expires_at: newExpiry || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nella generazione");
      } else {
        setSuccess(`Codice generato: ${data.code}`);
        // Reload page to show new code
        window.location.reload();
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (codeId: string) => {
    setRevoking(codeId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/waitlist-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", code_id: codeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nella revoca");
      } else {
        setSuccess("Codice revocato");
        window.location.reload();
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Generator */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
          <Plus size={18} className="text-brand-400" />
          Genera Nuovo Codice
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-1.5">Ruolo</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "beta_tester" | "internal_qa")}
              className="w-full rounded-xl border border-white/10 bg-neutral-800 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50"
            >
              <option value="beta_tester">Beta Tester</option>
              <option value="internal_qa">Internal QA</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-1.5">Max utilizzi</label>
            <input
              type="number"
              min={1}
              max={100}
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-neutral-800 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-1.5">Scadenza (opzionale)</label>
            <input
              type="datetime-local"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-neutral-800 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-400 disabled:opacity-50 transition-all"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
          Genera Codice
        </button>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            <Check size={14} />
            {success}
          </div>
        )}
      </div>

      {/* Codes list */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
          <Key size={18} className="text-brand-400" />
          Codici Esistenti ({codes.length})
        </h2>

        {codes.length === 0 ? (
          <p className="text-sm text-neutral-500">Nessun codice generato.</p>
        ) : (
          <div className="space-y-3">
            {codes.map((code) => {
              const status = getStatus(code);
              return (
                <div
                  key={code.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-neutral-800 p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm font-bold text-white">{code.code}</span>
                    <button
                      onClick={() => handleCopy(code.code)}
                      className="text-neutral-500 hover:text-white transition-colors"
                    >
                      {copied === code.code ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-neutral-700 px-2 py-0.5 text-xs font-bold text-neutral-300">
                      {code.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 shrink-0">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {code.used_count}/{code.max_uses}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(code.expires_at ?? code.created_at)}
                    </span>
                    <button
                      onClick={() => handleRevoke(code.id)}
                      disabled={revoking === code.id || status.label !== "Attivo"}
                      className="text-neutral-500 hover:text-red-400 disabled:opacity-30 transition-colors"
                      title="Revoca codice"
                    >
                      {revoking === code.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redemptions list */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
          <Users size={18} className="text-brand-400" />
          Redemptions ({redemptions.length})
        </h2>

        {redemptions.length === 0 ? (
          <p className="text-sm text-neutral-500">Nessuna redemption ancora.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-neutral-500">
                <tr>
                  <th className="py-2">Email</th>
                  <th className="py-2">Codice</th>
                  <th className="py-2">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {redemptions.map((r) => {
                  const code = codes.find((c) => c.id === r.code_id);
                  return (
                    <tr key={r.id} className="text-neutral-300">
                      <td className="py-2 font-bold text-white">
                        {r.profiles?.email ?? r.user_id.slice(0, 8) + "…"}
                      </td>
                      <td className="py-2 font-mono text-xs">{code?.code ?? "—"}</td>
                      <td className="py-2">{formatDate(r.redeemed_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
