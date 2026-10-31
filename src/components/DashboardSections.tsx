"use client";

/**
 * Sezioni della dashboard riordinabili e nascondibili.
 *
 * La pagina (server) legge la preferenza `agentcloud_dashboard_sections` e
 * passa qui le sezioni come nodi React già pronti: questo componentino non
 * conosce il loro contenuto, decide solo ORDINE e VISIBILITÀ. Così i blocchi
 * che girano lato server restano tali, e il riordino è un problema del
 * solo contenitore.
 *
 * Al click su "Personalizza" si entra in modalità di modifica: le sezioni
 * diventano trascinabili (drag & drop nativo, niente dipendenze nuove),
 * l'occhio nasconde/mostra, le frecce muoiono da tastiera. Il salvataggio
 * avviene su "Fatto": `localStorage` prima (zero-flash, fonte immediata),
 * copia sul DB con `pushPreference` (stessa pipeline delle altre
 * preferenze: al ritorno la pagina server legge il layout giusto).
 */

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardSectionId,
  type DashboardSectionItem,
  parseDashboardLayout,
  serializeDashboardLayout,
} from "@/lib/dashboard-sections";
import { pushPreference } from "@/lib/preferences-sync";

/** La stessa chiave della preferenza (shared con server e sync browser). */
const STORAGE_KEY = "agentcloud_dashboard_sections";

/** Target dell'onboarding tour per sezione (stesso attr usato prima). */
const SECTION_ONBOARD_TARGET: Partial<Record<DashboardSectionId, string>> = {
  budget: "dashboard-budget",
  stats: "dashboard-stats",
  skills: "dashboard-skills",
  agents: "dashboard-agents",
};

export type DashboardCustomizeLabels = {
  open: string;
  title: string;
  hint: string;
  done: string;
  cancel: string;
  restore: string;
  hiddenTag: string;
  moveUp: string;
  moveDown: string;
  hide: string;
  show: string;
  sectionTitles: Record<DashboardSectionId, string>;
};

type DashboardSectionsProps = {
  /** Layout letto dal server (default se la preferenza non esiste). */
  layout: DashboardSectionItem[];
  labels: DashboardCustomizeLabels;
  /** Contenuto di ogni sezione, creato dal server component. */
  nodes: Partial<Record<DashboardSectionId, ReactNode>>;
};

/**
 * Lettura di `localStorage` come external store (come `useResizableSidebar`);
 * durante l'idratazione React usa lo snapshot di server e poi passa a quello
 * del browser, senza mismatch né render a cascata.
 */
function readStoredLayout(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage non disponibile: vale il layout passato dal server.
    return null;
  }
}

function subscribeLayout(notify: () => void): () => void {
  // Il solo evento `storage` arriva dalle altre schede: le scritture fatte
  // in questa scheda passano dallo stato `write` (vedi `commit`).
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
}

export default function DashboardSections({
  layout,
  labels,
  nodes,
}: DashboardSectionsProps) {
  // Valore persistito: durante l'idratazione coincide con la pagina, poi la
  // fonte immediata è `localStorage` (zero-flash, come le altre preferenze).
  // `write` è l'ultima scrittura fatta qui (i write locali non emettono
  // `storage` nella stessa scheda): finché resta non-null la sormonta.
  const [write, setWrite] = useState<string | null>(null);
  const serverLayout = useMemo(
    () => serializeDashboardLayout(layout),
    [layout],
  );
  const stored = useSyncExternalStore(
    subscribeLayout,
    readStoredLayout,
    () => serverLayout,
  );
  // Layout in lavorazione; `null` = fuori dalla modalità di modifica.
  const [draft, setDraft] = useState<DashboardSectionItem[] | null>(null);
  const [dragId, setDragId] = useState<DashboardSectionId | null>(null);
  const dragIdRef = useRef<DashboardSectionId | null>(null);

  const committed = write ?? stored ?? serverLayout;

  // Fuori dalla modalità di modifica si renderizza il valore persistito.
  const restItems = useMemo(
    () => parseDashboardLayout(committed),
    [committed],
  );
  const items = draft ?? restItems;

  // Sezioni senza contenuto (es. budget senza pool): non si mostrano né in
  // render né in modifica — non c'è nulla da personalizzare lì dentro.
  const renderable = items.filter((item) => nodes[item.id] !== undefined);

  const commit = useCallback((next: DashboardSectionItem[]) => {
    const serialized = serializeDashboardLayout(next);
    setWrite(serialized);
    try {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // Storage non disponibile: la copia su DB resta comunque.
    }
    pushPreference(STORAGE_KEY, serialized);
  }, []);

  const startCustomize = () => {
    // Solo sezioni che hanno un contenuto: le altre non si possono mostrare.
    setDraft(renderable.map((item) => ({ ...item })));
  };
  const cancelCustomize = () => setDraft(null);
  const saveCustomize = () => {
    if (draft) commit(draft);
    setDraft(null);
  };
  const restoreDefaults = () => setDraft(parseDashboardLayout(DEFAULT_DASHBOARD_LAYOUT));

  const moveItem = useCallback((from: number, to: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const toggleItem = useCallback((id: DashboardSectionId) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return prev.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item,
      );
    });
  }, []);

  const onDragStart = useCallback(
    (_event: ReactDragEvent<HTMLElement>, id: DashboardSectionId) => {
      dragIdRef.current = id;
      setDragId(id);
    },
    [],
  );

  // Riordino "vivo": entrare su un'altra sezione sposta quella trascinata
  // al suo posto. Il ref evita un fruscio di re-enter sul medesimo target.
  const onDragEnter = useCallback(
    (id: DashboardSectionId) => {
      const source = dragIdRef.current;
      if (!source || source === id || !draft) return;
      const from = draft.findIndex((item) => item.id === source);
      const to = draft.findIndex((item) => item.id === id);
      if (from === -1 || to === -1) return;
      dragIdRef.current = id;
      setDragId(id);
      moveItem(from, to);
    },
    [draft, moveItem],
  );

  const onDragEnd = useCallback(() => {
    dragIdRef.current = null;
    setDragId(null);
  }, []);

  const onItemKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, index: number) => {
      if (event.key === "ArrowUp" && index > 0) {
        event.preventDefault();
        moveItem(index, index - 1);
      }
      if (event.key === "ArrowDown" && index < items.length - 1) {
        event.preventDefault();
        moveItem(index, index + 1);
      }
    },
    [items.length, moveItem],
  );

  const customizing = draft !== null;

  return (
    <>
      {/* Barra di modifica (o il pulsante per aprirla): resta sopra le
          sezioni, fuori dal flusso dei contenuti. */}
      <div className="mb-4 flex justify-end">
        {customizing ? (
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2">
            <div className="mr-1 min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {labels.title}
              </p>
              <p className="truncate text-xs text-neutral-500">{labels.hint}</p>
            </div>
            <button
              type="button"
              onClick={restoreDefaults}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RotateCcw size={13} />
              {labels.restore}
            </button>
            <button
              type="button"
              onClick={cancelCustomize}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={13} />
              {labels.cancel}
            </button>
            <button
              type="button"
              onClick={saveCustomize}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-400"
            >
              <Check size={13} />
              {labels.done}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startCustomize}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <SlidersHorizontal size={14} />
            {labels.open}
          </button>
        )}
      </div>

      {renderable.map((item, index) => {
        const node = nodes[item.id];
        if (node === undefined) return null;
        const hidden = !item.visible;
        const title = labels.sectionTitles[item.id] ?? item.id;

        if (customizing) {
          return (
            <article
              key={item.id}
              draggable
              tabIndex={0}
              onDragStart={(event) => onDragStart(event, item.id)}
              onDragEnter={() => onDragEnter(item.id)}
              onDragEnd={onDragEnd}
              onKeyDown={(event) => onItemKeyDown(event, index)}
              className={`mb-8 select-none rounded-xl border p-1 transition-opacity ${
                hidden
                  ? "border-dashed border-white/10 bg-white/[0.02] opacity-60"
                  : "border-white/15 bg-neutral-900"
              } ${dragId === item.id ? "opacity-40" : ""}`}
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="cursor-grab text-neutral-500">
                  <GripVertical size={16} />
                </span>
                <p
                  className={`min-w-0 flex-1 truncate text-sm font-bold ${
                    hidden ? "text-neutral-500" : "text-white"
                  }`}
                >
                  {title}
                </p>
                {hidden && (
                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] font-bold uppercase text-neutral-400">
                    {labels.hiddenTag}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={labels.moveUp}
                  disabled={index === 0}
                  onClick={() => moveItem(index, index - 1)}
                  className="rounded p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  type="button"
                  aria-label={labels.moveDown}
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, index + 1)}
                  className="rounded p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  type="button"
                  aria-label={hidden ? labels.show : labels.hide}
                  onClick={() => toggleItem(item.id)}
                  className="rounded p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
              {!hidden && <div className="pointer-events-none">{node}</div>}
            </article>
          );
        }

        if (hidden) return null;
        return (
          <section
            key={item.id}
            data-onboard={SECTION_ONBOARD_TARGET[item.id]}
            className="mb-8"
          >
            {node}
          </section>
        );
      })}
    </>
  );
}
