"use client";

/**
 * Bottone della Modalità Ghost (chat incognito) nell'header della chat.
 *
 * Pattern uguale ai bottoni vicini (Share / Dashboard): icona tonda 32px,
 * `title` come tooltip, hover e focus coerenti con il design system.
 * Lo stato attivo è reso evidente con colore + bordo (viola), non solo con
 * il colore, così si distingue anche in modalità a basso contrasto.
 *
 * Accessibilità:
 *   - `aria-label` cambia con lo stato ("Chat fantasma" / "Esci dalla modalità fantasma");
 *   - `aria-pressed` espone lo stato on/off del toggle;
 *   - è un `<button>` nativo → focusabile e attivabile da tastiera (Invio/Spazio).
 */
import { Ghost } from "lucide-react";

type GhostModeButtonProps = {
  /** True quando la chat è già in modalità fantasma. */
  active: boolean;
  /** Etichetta/tooltip corrente (cambia con lo stato). */
  label: string;
  onToggle: () => void;
};

export default function GhostModeButton({
  active,
  label,
  onToggle,
}: GhostModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={active}
      title={label}
      data-ghost-active={active ? "true" : "false"}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-full transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70",
        active
          ? "bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/60 hover:bg-purple-500/25"
          : "text-neutral-400 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      <Ghost size={15} aria-hidden="true" />
    </button>
  );
}
