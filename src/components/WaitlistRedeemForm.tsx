"use client";

/**
 * WaitlistRedeemForm — Form per riscattare un codice beta access.
 *
 * Mostra un campo input e un pulsante "Attiva". Se il codice è valido,
 * mostra il ruolo assegnato. Se il bypass non è attivo, mostra un messaggio.
 */

import { useState } from "react";
import { Key, Check, AlertCircle, Loader2 } from "lucide-react";

export default function WaitlistRedeemForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    role?: string;
    error?: string;
    message?: string;
  } | null>(null);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/waitlist/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "network_error", message: "Connection failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
          <Key size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Beta Access</h3>
          <p className="text-xs text-neutral-500">Inserisci il codice di accesso</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX"
          className="flex-1 rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm font-mono text-white placeholder-neutral-500 outline-none focus:border-brand-500/50"
          onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
        />
        <button
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "Attiva"
          )}
        </button>
      </div>

      {result && (
        <div className={`mt-4 rounded-xl p-3 text-sm ${
          result.success
            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            : "border border-red-500/20 bg-red-500/10 text-red-300"
        }`}>
          <div className="flex items-center gap-2">
            {result.success ? <Check size={14} /> : <AlertCircle size={14} />}
            <span className="font-bold">
              {result.success
                ? `Accesso attivato: ${result.role}`
                : result.error || "Errore"}
            </span>
          </div>
          {result.message && (
            <p className="mt-1 text-xs opacity-75">{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
