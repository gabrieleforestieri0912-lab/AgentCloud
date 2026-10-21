"use client";

/**
 * Dialog di conferma della Modalità Ghost.
 *
 * Usato in due casi:
 *   - ingresso: la chat aperta ha già messaggi → si avvia una NUOVA chat
 *     fantasma vuota e la conversazione corrente resta intatta in cronologia;
 *   - uscita: la chat fantasma contiene messaggi → vengono eliminati
 *     definitivamente, senza possibilità di recupero.
 *
 * Stile coerente con gli altri modali della chat (overlay scuro, card
 * `bg-neutral-900`, bordi arrotondati). Accessibile: `role="dialog"`,
 * `aria-modal`, focus sul bottone principale, Esc e click sul backdrop chiudono.
 */
import { useEffect, useRef } from "react";
import { Ghost } from "lucide-react";

type GhostConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  /** `danger` per l'uscita (cancellazione definitiva), `default` per l'ingresso. */
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function GhostConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "default",
  onConfirm,
  onCancel,
}: GhostConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Il focus va sul bottone principale: l'utente deve poter confermare subito
  // con Invio (e deve poter uscire subito con Esc).
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label={cancelLabel}
        className="absolute inset-0 cursor-default bg-black/60"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-purple-500/20 bg-neutral-900 p-5 shadow-2xl shadow-black/60">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
            <Ghost size={16} />
          </span>
          <h2 className="truncate text-sm font-bold text-white">{title}</h2>
        </div>
        <p className="mt-3 text-xs leading-5 text-neutral-400">{body}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-neutral-300 hover:bg-white/10 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={
              tone === "danger"
                ? "flex-1 rounded-full bg-red-500/90 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition-all"
                : "flex-1 rounded-full bg-purple-500 px-3 py-2.5 text-sm font-bold text-white hover:bg-purple-400 transition-all"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
