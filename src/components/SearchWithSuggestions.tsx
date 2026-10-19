"use client";

/**
 * Barra di ricerca con completamento intelligente.
 *
 * Usata nelle barre dei cataloghi (agenti, competenze, plugin): mentre si
 * scrive propone sotto la barra le voci più pertinenti e, su Invio o click,
 * apre direttamente la pagina della voce scelta.
 *
 * "Intelligente" qui significa tre cose concrete:
 * - le parole della ricerca possono comparire in qualunque ordine, come
 *   abbreviazione (sottosequenza) o con un refuso vicino ("shopfiy" per
 *   "shopify"), così un errore di battitura non azzera i risultati;
 * - un match all'inizio del nome vale più di uno dentro la descrizione, e le
 *   voci in cui TUTTE le parole combaciano col nome battono quelle che le
 *   citano solo nel testo lungo;
 * - la navigazione è completa: ↑/↓ spostano l'evidenziazione, Invio apre,
 *   Esc chiude, il mouse fa lo stesso, e i pezzi che combaciano con la
 *   ricerca sono evidenziati dentro il nome.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";

/** Voce proponibile sotto la barra di ricerca. */
export type SearchSuggestion = {
  /** Chiave stabile, di solito lo slug. */
  id: string;
  /** Nome completo: è il testo con cui si completa la barra. */
  label: string;
  /** Contesto breve mostrato a destra (categoria, pacchetto…). */
  hint?: string;
  /** Testo cercabile ma non mostrato (descrizione, task, skill…). */
  keywords?: string;
  /** Pagina della voce: accettarla ci naviga. */
  href: string;
};

const MAX_SUGGESTIONS = 6;

/** Minuscole senza accenti né punteggiatura, spazi compattati: così "Caffè"
 *  e "caffe" si cercano allo stesso modo. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distanza di Damerau-Levenshtein (optimal string alignment): inserimenti,
 *  cancellazioni, sostituzioni e due lettere invertite contano 1. Serve a
 *  tollerare i refusi nelle ricerche di tre lettere su. */
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Punteggio di un token dentro un campo (0 = non c'è). Prefisso e inizio
 *  parola valgono più di un match a metà; in coda, tolleranza ai refusi
 *  (un edit o due sui token lunghi) e alle abbreviazioni (sottosequenza:
 *  "shp" trova "shopify", "eml" trova "email"). */
function tokenScore(field: string, token: string): number {
  const idx = field.indexOf(token);
  if (idx === 0) return 6;
  if (idx > 0 && field[idx - 1] === " ") return 5;
  if (idx > 0) return 3;
  // Refusi: la soglia cresce col token, così "ciao" non combacia con "case".
  const maxEdits = token.length >= 8 ? 2 : token.length >= 5 ? 1 : 0;
  if (maxEdits) {
    for (const word of field.split(" ")) {
      if (Math.abs(word.length - token.length) > maxEdits) continue;
      if (editDistance(word, token) <= maxEdits) return 2;
    }
  }
  // Abbreviazione: lettere del token in ordine, anche non adiacenti.
  let pos = 0;
  let last = -1;
  let gaps = 0;
  for (let i = 0; i < field.length && pos < token.length; i++) {
    if (field[i] === token[pos]) {
      if (last >= 0) gaps += i - last - 1;
      last = i;
      pos++;
    }
  }
  if (pos < token.length) return 0;
  return Math.max(1, 3 - Math.floor(gaps / 4));
}

/** Punteggio di pertinenza di una voce per una ricerca (0 = esclusa). */
export function scoreSuggestion(s: SearchSuggestion, rawQuery: string): number {
  const tokens = normalize(rawQuery).split(" ").filter(Boolean);
  if (!tokens.length) return 0;
  const label = normalize(s.label);
  const hint = normalize(s.hint ?? "");
  const keywords = normalize(s.keywords ?? "");
  let total = 0;
  let inLabelCount = 0;
  for (const token of tokens) {
    const inLabel = tokenScore(label, token);
    const inHint = hint ? tokenScore(hint, token) * 0.6 : 0;
    const inKeywords = keywords ? tokenScore(keywords, token) * 0.35 : 0;
    const best = Math.max(inLabel, inHint, inKeywords);
    // Ogni parola deve trovare casa da qualche parte: altrimenti "shop email"
    // spammerebbe voci che c'entrano solo a metà.
    if (!best) return 0;
    if (best === inLabel) inLabelCount++;
    total += best;
  }
  // Le parole che combaciano col nome pesano di più: "Shopify" deve battere
  // un plugin che lo cita solo nella descrizione lunga.
  return total + inLabelCount * 2;
}

/** Evidenzia dentro il nome i pezzi che combaciano con la ricerca. */
function Highlighted({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-brand-300">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function SearchWithSuggestions({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  inputClassName = "",
  wrapperClassName = "",
  type = "text",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: SearchSuggestion[];
  placeholder?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  type?: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const ranked = useMemo(() => {
    const query = value.trim();
    if (query.length < 2) return [];
    return suggestions
      .map((s) => ({ s, score: scoreSuggestion(s, query) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.s.label.localeCompare(b.s.label))
      .slice(0, MAX_SUGGESTIONS)
      .map((r) => r.s);
  }, [suggestions, value]);

  const tokens = useMemo(() => normalize(value).split(" ").filter(Boolean), [value]);
  const visible = open && ranked.length > 0;
  // Con query nuove l'indice può restare oltre la lista: si limita invece di
  // azzerarlo in un effect (che sarebbe un setState sincrono vietato).
  const activeIndex = Math.min(active, Math.max(ranked.length - 1, 0));

  const accept = (item: SearchSuggestion) => {
    setOpen(false);
    onChange(item.label);
    router.push(item.href);
  };

  const handleChange = (next: string) => {
    onChange(next);
    setActive(0);
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visible) {
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && ranked.length) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % ranked.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + ranked.length) % ranked.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      accept(ranked[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${wrapperClassName}`}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls={id ? `${id}-suggestions` : undefined}
        aria-autocomplete="list"
        aria-activedescendant={visible && id ? `${id}-option-${activeIndex}` : undefined}
        className={inputClassName}
      />
      {visible && (
        <ul
          id={id ? `${id}-suggestions` : undefined}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 shadow-2xl shadow-black/40 backdrop-blur"
        >
          {ranked.map((s, i) => {
            const isActive = i === activeIndex;
            return (
              <li
                key={s.id}
                id={id ? `${id}-option-${i}` : undefined}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActive(i)}
                // Il mousedown non deve spostare il focus dall'input: altrimenti
                // l'input perde il focus prima del click e la lista sparisce.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => accept(s)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive ? "bg-brand-500/15" : "hover:bg-white/5"
                }`}
              >
                <Search
                  size={13}
                  className={`shrink-0 ${isActive ? "text-brand-300" : "text-neutral-500"}`}
                />
                <span
                  className={`min-w-0 flex-1 truncate font-semibold ${
                    isActive ? "text-white" : "text-neutral-300"
                  }`}
                >
                  <Highlighted text={s.label} tokens={tokens} />
                </span>
                {s.hint ? (
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
                    {s.hint}
                  </span>
                ) : null}
                {isActive ? (
                  <CornerDownLeft size={12} className="shrink-0 text-brand-300" />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
