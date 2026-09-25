"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import BrandLogo from "./BrandLogo";

const IG_URL = "https://www.instagram.com/_agentcloud/";

export default function InstagramFollowCard({ onCompleted }: { onCompleted?: () => void }) {
  const [linkClicked, setLinkClicked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if already completed
    fetch("/api/waitlist/instagram-follow", { method: "GET" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.completed) {
          setCompleted(true);
          setAlreadyCompleted(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleConfirm = async () => {
    if (completed || loading) return;
    if (!linkClicked && !alreadyCompleted) {
      setMessage("Apri prima il profilo Instagram cliccando sul link.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/waitlist/instagram-follow", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCompleted(true);
        setMessage(data?.alreadyCompleted ? "Già completato — +1 punto già assegnato." : "Fatto! +1 punto per il ranking.");
        if (onCompleted) onCompleted();
      } else {
        setMessage(data?.error || "Errore, riprova.");
      }
    } catch {
      setMessage("Errore di rete, riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-3xl border border-white/10 bg-neutral-900/80 p-5 backdrop-blur"
      style={{ willChange: "transform, opacity" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-400 text-white">
          <BrandLogo slug="instagram" size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">Follow us on Instagram</h3>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            Segui <span className="font-semibold text-neutral-200">@_agentcloud</span> su Instagram e conferma per scalare la classifica. <span className="font-semibold text-brand-300">+1 punto</span> una tantum.
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            v1 è self-report (honor system) — non verifichiamo via Graph API. Vedi limitazione in PR.
          </p>
        </div>
        {completed && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
            <CheckCircle2 size={12} /> Fatto
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <a
          href={IG_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setLinkClicked(true)}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
        >
          Apri Instagram <ExternalLink size={14} />
        </a>
        <button
          onClick={handleConfirm}
          disabled={completed || loading || (!linkClicked && !alreadyCompleted)}
          className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition ${
            completed
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
              : linkClicked || alreadyCompleted
                ? "bg-linear-to-r from-brand-500 to-pink-500 text-white shadow-lg shadow-brand-500/20 hover:opacity-90"
                : "bg-white/5 text-neutral-500 border border-white/5 cursor-not-allowed"
          }`}
          title={!linkClicked && !completed ? "Apri prima il profilo Instagram" : undefined}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : completed ? <CheckCircle2 size={14} /> : null}
          {completed ? "Confermato +1" : "Ho seguito su Instagram"}
        </button>
      </div>

      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mt-3 text-center text-xs font-medium ${completed ? "text-emerald-300" : "text-brand-300"}`}
        >
          {message}
        </motion.p>
      )}

      {!completed && !linkClicked && (
        <p className="mt-2 text-center text-[11px] text-neutral-500">Clicca prima “Apri Instagram”, poi conferma.</p>
      )}
    </motion.div>
  );
}
