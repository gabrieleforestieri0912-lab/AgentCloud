"use client";

/**
 * Indicatore di generazione: tre puntini che sostituiscono l'avatar.
 *
 * Perché esiste: durante la generazione l'avatar statico dice "sta arrivando
 * qualcosa di generico", mentre i tre puntini comunicano "ci sta lavorando
 * sopra". Sostituendolo (e non affiancandolo) la colonna sinistra resta pulita
 * e l'avatar torna a comparire quando il messaggio è completo.
 *
 * `dotsOnly` (predefinito) disegna i puntini al posto dell'avatar: è il
 * formato usato dal blocco "sta pensando". `inBubble` li mette dentro una
 * bolla, per i casi in cui serve un riquadro (a fine risposta, senza avatar
 * ancora disponibile).
 */
export default function TypingDots({
  size = "sm",
  variant = "dotsOnly",
  className = "",
}: {
  /** Stessa scala dell'avatar, così la colonna non cambia larghezza. */
  size?: "sm" | "md";
  variant?: "dotsOnly" | "inBubble";
  className?: string;
}) {
  const dot = (
    <span
      className={`block rounded-full bg-brand-400 animate-typing-pulse ${
        size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
      }`}
      style={{ animationDelay: "0ms" }}
    />
  );
  const dot2 = (
    <span
      className={`block rounded-full bg-brand-400 animate-typing-pulse ${
        size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
      }`}
      style={{ animationDelay: "200ms" }}
    />
  );
  const dot3 = (
    <span
      className={`block rounded-full bg-brand-400 animate-typing-pulse ${
        size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
      }`}
      style={{ animationDelay: "400ms" }}
    />
  );

  const row = (
    <span className={`flex items-center ${variant === "inBubble" ? "gap-1.5" : "gap-1"}`}>
      {dot}
      {dot2}
      {dot3}
    </span>
  );

  if (variant === "inBubble") {
    return (
      <span className={`inline-flex ${className}`}>
        <span className="rounded-2xl rounded-bl-md border border-white/5 bg-neutral-800 px-4 py-3.5">
          {row}
        </span>
      </span>
    );
  }

  // Sostituisce l'avatar: stesso ingombro (h-7 w-7 / h-9 w-9), quindi le righe
  // dei messaggi non saltano quando i puntini appaiono e spariscono.
  const box = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-lg border border-brand-500/20 bg-brand-500/10 ${box} ${className}`}
    >
      {row}
    </span>
  );
}
