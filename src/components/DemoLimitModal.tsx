"use client";

/**
 * Modale "limite demo raggiunto".
 *
 * Mostrata quando un utente anonimo in anteprima supera il tetto di messaggi
 * gratuiti: spiega il limite e indirizza verso la registrazione/login.
 */
import Link from "next/link";
import { X, Sparkles, Lock } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function DemoLimitModal({
  open,
  onClose,
  remainingMessages,
}: {
  open: boolean;
  onClose: () => void;
  remainingMessages?: number;
}) {
  const { locale } = useLanguage();
  const isIt = locale === "it";

  if (!open) return null;

  const title = isIt ? "Accedi per continuare" : "Sign in to continue";
  const desc = isIt
    ? "Hai usato i 10 messaggi gratuiti della chat demo. Accedi con il tuo account per continuare la conversazione nella chat completa — la ritroverai già salvata."
    : "You've used the 10 free messages of the demo chat. Sign in to continue in the full chat — your conversation will be waiting there.";

  const loginLabel = isIt ? "Accedi" : "Sign in";
  const signupLabel = isIt ? "Crea account" : "Create account";
  const continueAsGuest = isIt ? "Continua come ospite" : "Continue as guest";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
          <Lock size={18} />
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{desc}</p>
        {typeof remainingMessages === "number" && (
          <p className="mt-2 text-xs font-semibold text-amber-300">
            {isIt ? `${remainingMessages} messaggi rimasti` : `${remainingMessages} messages left`}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/login?next=/chat"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white hover:bg-brand-400"
          >
            <Sparkles size={16} />
            {loginLabel}
          </Link>
          <Link
            href="/signup?next=/chat"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            {signupLabel}
          </Link>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-300"
          >
            {continueAsGuest} — {isIt ? "vedi la demo" : "explore demo"}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-neutral-600">
          {isIt
            ? "Dopo l'accesso verrai reindirizzato a /chat con la conversazione salvata."
            : "After signing in you'll be redirected to /chat with your conversation saved."}
        </p>
      </div>
    </div>
  );
}
