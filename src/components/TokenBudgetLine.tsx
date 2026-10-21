"use client";

/**
 * Riga del budget di token sopra l'input della chat.
 *
 * Dice quanto del budget del piano è stato consumato, quanto resta e quando
 * il budget si rinnova. È l'informazione che permette all'utente di capire
 * se l'agente può ancora lavorare — il colore avvisa prima che il budget
 * finisca (giallo all'80%, rosso quando è esaurito).
 *
 * Il testo arriva già tradotto dal padre: il componente non conosce il
 * dizionario e non riceve funzioni (niente prop che il React Compiler possa
 * scambiare per chiamate durante il render).
 */
export type TokenBudgetLevel = "ok" | "warning" | "critical";

export default function TokenBudgetLine({
  ratio,
  level,
  text,
}: {
  /** Quota consumata 0..1. */
  ratio: number;
  level: TokenBudgetLevel;
  /** Testo già localizzato (budget usato/rinnovo o budget esaurito). */
  text: string;
}) {
  const bar =
    level === "critical"
      ? "bg-red-400"
      : level === "warning"
        ? "bg-amber-400"
        : "bg-brand-400";
  const textColor =
    level === "critical"
      ? "text-red-300"
      : level === "warning"
        ? "text-amber-300"
        : "text-neutral-500";

  return (
    <div className="mb-2 flex items-center justify-center gap-2 text-[11px] font-semibold">
      <span
        className="h-1 w-20 overflow-hidden rounded-full bg-white/10"
        aria-hidden="true"
      >
        <span
          className={`block h-full rounded-full ${bar}`}
          style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
        />
      </span>
      <span className={textColor}>{text}</span>
    </div>
  );
}
