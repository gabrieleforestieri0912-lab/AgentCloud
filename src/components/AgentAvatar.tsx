"use client";

/**
 * Avatar di un agente.
 *
 * Perché esiste: la chat deve far capire a colpo d'occhio QUALE agente sta
 * conversando. Qui l'icona dell'agente (o il logo del brand) sta su uno sfondo
 * colorato con l'accent dell'agente — lo stesso accostamento usato dalle card
 * del marketplace — così avatar dei messaggi, header e liste restano coerenti.
 */
import AgentIcon from "./AgentIcon";
import type { Agent } from "@/lib/agents";

type Size = "sm" | "md" | "lg";

const BOX: Record<Size, string> = {
  sm: "h-7 w-7 rounded-lg",
  md: "h-9 w-9 rounded-xl",
  lg: "h-11 w-11 rounded-xl",
};

const ICON_SIZE: Record<Size, number> = { sm: 15, md: 18, lg: 22 };

export default function AgentAvatar({
  agent,
  size = "md",
  className = "",
  circular = false,
}: {
  agent: Agent;
  size?: Size;
  className?: string;
  /**
   * Versione tonda (selettore agente nella toolbar): stesso ingombro della
   * quadra, ma `rounded-full` invece di `rounded-lg`. Parametro esplicito e
   * non override via className perché due classi `rounded-*` in conflitto si
   * risolverebbero in base all'ordine del CSS generato, non a quello voluto.
   */
  circular?: boolean;
}) {
  const box = circular ? BOX[size].replace(/rounded-\w+/, "rounded-full") : BOX[size];
  return (
    <span
      className={`flex shrink-0 items-center justify-center shadow-lg shadow-black/20 ${box} ${agent.accent} ${className}`}
      title={agent.name}
    >
      <AgentIcon
        icon={agent.icon}
        brand={agent.brand}
        size={ICON_SIZE[size]}
        className="text-white"
      />
    </span>
  );
}
