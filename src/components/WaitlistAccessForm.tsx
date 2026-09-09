"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export default function WaitlistAccessForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Inserisci un codice valido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-waitlist-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Codice non valido");
        return;
      }

      // Set httpOnly-like cookie via document.cookie (30 min expiry)
      // Note: true httpOnly would need server-side; this is the best we can do client-side
      const expires = new Date(Date.now() + data.expires_in * 1000).toUTCString();
      document.cookie = `waitlist_session=${data.session_token}; expires=${expires}; path=/; SameSite=Lax; Secure`;

      setSuccess(true);

      // Redirect to login after 1.5s
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setError("Errore di connessione, riprova");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden dark-gradient-main">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(3,139,254,.15), transparent 30%), radial-gradient(circle at 90% 16%, rgba(234,67,53,.15), transparent 26%)",
        }}
      />

      <section className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-bold text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
            >
              <Home size={14} className="text-brand-400" />
              Torna alla home
            </Link>
          </div>

          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/20 to-brand-600/10">
              <KeyRound size={24} className="text-brand-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Accesso Beta
            </h1>
            <p className="mt-2 text-neutral-400">
              Inserisci il codice che hai ricevuto per accedere alla piattaforma
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
            {success ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle2 size={28} className="text-green-400" />
                </div>
                <p className="text-center text-lg font-semibold text-white">
                  Codice valido!
                </p>
                <p className="text-center text-sm text-neutral-400">
                  Verrai reindirizzato alla pagina di accesso...
                </p>
                <Loader2 size={20} className="animate-spin text-brand-400" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-neutral-300">
                    Codice di accesso
                  </span>
                  <input
                    type="text"
                    required
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setError("");
                    }}
                    placeholder="es. T5PMY2R2"
                    className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-center text-lg font-mono tracking-widest text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                  />
                </label>

                {error && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <KeyRound size={16} />
                  )}
                  Verifica codice
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-neutral-400">
              Non hai un codice?{" "}
              <Link
                href="/waitlist"
                className="font-bold text-brand-400 transition-colors hover:text-brand-300"
              >
                Unisciti alla waitlist
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
