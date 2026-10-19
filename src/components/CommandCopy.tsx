"use client";

/**
 * Blocco "comando + Copia": mostra una riga di terminale e la copia negli
 * appunti con conferma visiva.
 *
 * Perché un componente: hub `/install` e pagina `/cli` mostrano gli stessi
 * comandi di installazione, e prima la logica di copia era duplicata dentro
 * la pagina tab. Le etichette di copia arrivano dal dizionario attivo così
 * restano tradotte in tutte le lingue.
 */
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function CommandCopy({
  command,
  label,
}: {
  command: string;
  /** Riga esplicativa mostrata sopra il comando (facoltativa). */
  label?: string;
}) {
  const { dict } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    // `clipboard` non esiste fuori da contesti sicuri: copiare non deve
    // rompere la pagina, al massimo non fare nulla.
    void navigator.clipboard?.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/60 p-3.5">
      <div className="min-w-0 flex-1">
        {label && (
          <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            {label}
          </div>
        )}
        <code className="mt-0.5 block truncate font-mono text-xs text-brand-200">
          {command}
        </code>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? dict.common.copied : dict.common.copy}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-neutral-200 transition-colors hover:bg-white/10"
      >
        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        <span>{copied ? dict.common.copied : dict.common.copy}</span>
      </button>
    </div>
  );
}
