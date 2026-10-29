"use client";

/**
 * Select dei filtri (categoria, agente, integrazione) condiviso da
 * `SkillsList` (`/skills`) e `PluginsCatalog` (`/plugins`).
 *
 * Il select nativo è reso `appearance-none` e la freccia è una chevron lucide
 * sovrapposta: il controllo resta coerente con il resto dell'interfaccia
 * invece di ereditare lo stile del sistema operativo. `[color-scheme:dark]` e
 * la classe delle `<option>` scuriscono anche il menù a tendina nativo.
 */

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/** Classe condivisa delle `<option>`: scurisce anche il menù a tendina nativo. */
export const FILTER_OPTION_CLASS =
  "bg-neutral-900 text-xs font-semibold text-neutral-300";

export default function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full lg:w-36">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="w-full cursor-pointer appearance-none rounded-lg border border-white/10 bg-neutral-900 py-2 pl-2.5 pr-8 text-xs font-bold text-neutral-300 outline-none transition-colors [color-scheme:dark] hover:border-white/20 hover:text-white focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
      >
        {children}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500"
      />
    </div>
  );
}
