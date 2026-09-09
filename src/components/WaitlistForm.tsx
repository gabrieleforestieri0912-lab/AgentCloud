"use client";

/**
 * Form waitlist: accetta SOLO codici di accesso beta.
 * Quando l'utente inserisce un codice valido, viene reindirizzato al login
 * con un cookie di sessione pending che assegnerà il ruolo beta dopo auth.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import LanguageToggle from "@/components/LanguageToggle";

export default function WaitlistForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Codice non valido");
        return;
      }

      if (data.accessGranted) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      }
    } catch {
      setError("Errore di connessione, riprova");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex min-h-dvh overflow-x-hidden dark-gradient-main px-4 py-6 sm:py-10">
      {/* Sfondo decorativo */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/30 to-transparent" />
      <div
        className="absolute inset-0 opacity-40 pointer-events-none select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 85% 15%, rgba(234,67,53,.14), transparent 28%), radial-gradient(circle at 50% 92%, rgba(168,85,247,.14), transparent 36%)",
        }}
      />

      {/* Toggle lingua */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      <motion.div
        className="relative z-10 m-auto w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="relative h-10 w-10">
            <Image
              src="/agentcloud.png"
              alt="AgentCloud"
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            AgentCloud
          </span>
        </div>

        {/* Card */}
        <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/20 to-brand-600/10">
              <KeyRound size={24} className="text-brand-400" />
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-2 text-center">
              Accesso <span className="text-brand-400">Beta</span>
            </h1>
            <p className="text-neutral-400 text-center mb-6">
              Inserisci il codice che hai ricevuto per accedere alla piattaforma
            </p>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 mx-auto mb-3">
                  <CheckCircle2 size={28} className="text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Codice valido!
                </h3>
                <p className="text-neutral-400 text-sm mb-4">
                  Verrai reindirizzato alla pagina di accesso...
                </p>
                <Loader2 size={20} className="animate-spin text-brand-400 mx-auto" />
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
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
                    className="w-full bg-neutral-800 border border-white/10 rounded-full px-5 py-3 text-center text-lg font-mono tracking-widest text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    disabled={loading}
                  />
                  {error && (
                    <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full bg-linear-to-r from-brand-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-full hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 inline-flex items-center justify-center gap-2"
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

            <p className="text-neutral-500 text-xs text-center mt-6">
              Non hai un codice? Contattaci per richiedere l&apos;accesso beta.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
