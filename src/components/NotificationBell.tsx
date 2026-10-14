"use client";

/**
 * Campanella notifiche in-app (azioni degli agenti, scadenze abbonamento).
 *
 * Polling periodico su /api/notifications, badge col conteggio non letto,
 * pannello con le notifiche e azione "segna come letto" (POST su
 * /api/notifications/read).
 */
import { useEffect, useRef, useState } from "react";
import { DATE_LOCALES, type Locale } from "@/lib/i18n/constants";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  XCircle,
  CheckCheck,
  FileText,
  ShoppingBag,
  Tag,
  FolderOpen,
  Package,
  CalendarDays,
  UserPlus,
  Megaphone,
  Receipt,
  Mail,
  CalendarClock,
  Contact,
} from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { AGENTS, localizeAgent } from "@/lib/agents";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { AgentNotificationKind } from "@/lib/agents/notifications";

type SubscriptionNotification = {
  id: string;
  kind: "expiring" | "cancelling";
  agentSlug: string;
  agentName: string;
  periodEnd: string | null;
  daysLeft: number | null;
};

type AgentNotification = {
  id: string;
  kind: AgentNotificationKind;
  agentSlug: string;
  params: Record<string, string | number>;
  read: boolean;
  createdAt: string;
  /** Righe raggruppate dal dedup server-side (1 = singola). */
  count: number;
};

const NOTIFY_CHANNEL = "agentcloud:notifications";

const POLL_MS = 30_000;

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(DATE_LOCALES[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeAgo(iso: string, dict: Dictionary): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return dict.notifications.justNow;
  if (minutes < 60) return t(dict.notifications.minutesAgo, { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t(dict.notifications.hoursAgo, { n: hours });
  return t(dict.notifications.daysAgo, { n: Math.floor(hours / 24) });
}

function agentDisplayName(slug: string, locale: Locale): string {
  const agent = AGENTS.find((a) => a.slug === slug);
  if (!agent) return slug;
  return localizeAgent(agent, locale).name;
}

function t(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in values ? String(values[key]) : m,
  );
}

export default function NotificationBell() {
  const { locale, dict } = useLanguage();
  const [agentItems, setAgentItems] = useState<AgentNotification[]>([]);
  const [subItems, setSubItems] = useState<SubscriptionNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [toasts, setToasts] = useState<AgentNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  // Id già visti: solo le righe NUOVE mentre la tab è attiva fanno toast (mai
  // al primo caricamento). Un solo tab fa toast (quello col focus): gli altri
  // aggiornano comunque badge e titolo.
  const seenIds = useRef<Set<string> | null>(null);
  const baseTitle = useRef<string | null>(null);

  const pushToast = (n: AgentNotification) => {
    setToasts((prev) => (prev.some((t) => t.id === n.id) ? prev : [...prev.slice(-2), n]));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== n.id));
    }, 6000);
  };

  useEffect(() => {
    let active = true;
    const bc =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(NOTIFY_CHANNEL) : null;
    const load = (withToasts: boolean) =>
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!active || !d) return;
          const data = d as {
            notifications?: SubscriptionNotification[];
            agentNotifications?: (AgentNotification & { count?: number })[];
          };
          setSubItems(data.notifications ?? []);
          const items = (data.agentNotifications ?? []).map((n) => ({
            ...n,
            count: typeof n.count === "number" && n.count > 1 ? n.count : 1,
          }));
          if (seenIds.current === null) {
            seenIds.current = new Set(items.map((n) => n.id));
          } else if (withToasts && document.hasFocus()) {
            for (const n of items) {
              if (!n.read && !seenIds.current.has(n.id)) pushToast(n);
              seenIds.current.add(n.id);
            }
          } else {
            for (const n of items) seenIds.current.add(n.id);
          }
          setAgentItems(items);
        })
        .catch(() => {
          // offline / transitorio — mantieni l'ultimo stato noto
        });
    load(false);
    const interval = setInterval(() => load(true), POLL_MS);
    // Aggiorna subito quando un agente completa un'azione (ChatInterface /
    // PublicAgentChat dispatchano 'agentcloud:notifications-refresh')
    const onAgentDone = () => load(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") load(false);
    };
    // Sync lettura tra tab: un'altra tab ha segnato come lette.
    const onBroadcast = (e: MessageEvent) => {
      const msg = e.data as { type?: string; ids?: string[] } | null;
      if (!msg || msg.type !== "read") return;
      if (msg.ids && msg.ids.length > 0) {
        const idSet = new Set(msg.ids);
        setAgentItems((items) => items.map((n) => (idSet.has(n.id) ? { ...n, read: true } : n)));
      } else {
        setAgentItems((items) => items.map((n) => ({ ...n, read: true })));
      }
    };
    bc?.addEventListener("message", onBroadcast);
    window.addEventListener("agentcloud:notifications-refresh", onAgentDone);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      active = false;
      clearInterval(interval);
      bc?.close();
      window.removeEventListener("agentcloud:notifications-refresh", onAgentDone);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unreadCount = agentItems.filter((n) => !n.read).length;
  const hasItems = agentItems.length > 0 || subItems.length > 0;
  const visibleItems = filter === "unread" ? agentItems.filter((n) => !n.read) : agentItems;

  // Badge nel titolo della tab quando è in background (ripristinato al ritorno).
  useEffect(() => {
    if (baseTitle.current === null) baseTitle.current = document.title;
    const base = baseTitle.current ?? "AgentCloud";
    if (unreadCount > 0 && document.hidden) {
      document.title = `(${unreadCount}) ${base.replace(/^\(\d+\)\s*/, "")}`;
    } else if (!document.hidden) {
      document.title = base.replace(/^\(\d+\)\s*/, "");
    }
  }, [unreadCount]);

  function broadcastRead(ids?: string[]) {
    try {
      const bc = new BroadcastChannel(NOTIFY_CHANNEL);
      bc.postMessage({ type: "read", ids: ids ?? null });
      bc.close();
    } catch {
      // BroadcastChannel assente (vecchi browser): le altre tab si
      // riallineano al prossimo polling.
    }
  }

  async function markRead(ids?: string[]) {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      });
    } catch {
      // best-effort — lo stato locale si aggiorna comunque
    }
    broadcastRead(ids);
    if (ids) {
      const idSet = new Set(ids);
      setAgentItems((items) =>
        items.map((n) => (idSet.has(n.id) ? { ...n, read: true } : n)),
      );
    } else {
      setAgentItems((items) => items.map((n) => ({ ...n, read: true })));
    }
  }

  function subscriptionMessage(n: SubscriptionNotification): string {
    const date = formatDate(n.periodEnd, locale);
    if (n.kind === "cancelling") {
      return `${t(dict.notifications.cancelling, { agent: n.agentName })} — ${t(
        dict.notifications.cancellingOn,
        { date },
      )}`;
    }
    return `${t(dict.notifications.expiring, {
      agent: n.agentName,
      days: n.daysLeft ?? 0,
    })} — ${t(dict.notifications.expiringOn, { date })}`;
  }

  function actionParams(n: AgentNotification): Record<string, string | number> {
    const params = { ...n.params };
    if (n.kind === "discount_created") {
      params.value =
        params.type === "percentage" ? `${params.value}%` : `€${params.value}`;
    }
    if (n.kind === "collection_updated") {
      params.action =
        params.action === "add"
          ? dict.notifications.actions.add
          : dict.notifications.actions.remove;
    }
    if (n.kind === "event_booked") {
      const start = new Date(String(params.start));
      params.start = isNaN(start.getTime())
        ? String(params.start)
        : start.toLocaleString(DATE_LOCALES[locale], {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
    }
    if (n.kind === "lead_submitted") {
      const name = String(params.name || "");
      const email = String(params.email || "");
      params.lead = name && name !== "Unknown" ? `${name} (${email})` : email;
    }
    return params;
  }

  function actionMessage(n: AgentNotification): string {
    const template = dict.notifications.agentActions[n.kind];
    if (!template) return agentDisplayName(n.agentSlug, locale);
    return t(template, {
      agent: agentDisplayName(n.agentSlug, locale),
      ...actionParams(n),
    });
  }

  function ActionIcon({ kind }: { kind: AgentNotificationKind }) {
    const cls = "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300";
    switch (kind) {
      case "file_created":
        return (
          <span className={cls}>
            <FileText size={15} />
          </span>
        );
      case "product_created":
        return (
          <span className={cls}>
            <ShoppingBag size={15} />
          </span>
        );
      case "discount_created":
        return (
          <span className={cls}>
            <Tag size={15} />
          </span>
        );
      case "collection_updated":
        return (
          <span className={cls}>
            <FolderOpen size={15} />
          </span>
        );
      case "inventory_updated":
        return (
          <span className={cls}>
            <Package size={15} />
          </span>
        );
      case "event_booked":
        return (
          <span className={cls}>
            <CalendarDays size={15} />
          </span>
        );
      case "lead_submitted":
        return (
          <span className={cls}>
            <UserPlus size={15} />
          </span>
        );
      case "lead_notified":
        return (
          <span className={cls}>
            <Megaphone size={15} />
          </span>
        );
      case "invoice_created":
        return (
          <span className={cls}>
            <Receipt size={15} />
          </span>
        );
      case "payment_reminder_sent":
        return (
          <span className={cls}>
            <Mail size={15} />
          </span>
        );
      case "post_scheduled":
        return (
          <span className={cls}>
            <CalendarClock size={15} />
          </span>
        );
      case "cv_analyzed":
        return (
          <span className={cls}>
            <Contact size={15} />
          </span>
        );
      case "email_sent":
        return (
          <span className={cls}>
            <Mail size={15} />
          </span>
        );
      case "email_trashed":
        return (
          <span className={cls}>
            <FileText size={15} />
          </span>
        );
      case "calendar_event_deleted":
        return (
          <span className={cls}>
            <XCircle size={15} />
          </span>
        );
      case "calendar_reminder_set":
        return (
          <span className={cls}>
            <CalendarClock size={15} />
          </span>
        );
      case "quote_generated":
        return (
          <span className={cls}>
            <Receipt size={15} />
          </span>
        );
      case "quote_sent":
        return (
          <span className={cls}>
            <Mail size={15} />
          </span>
        );
      case "review_replied":
        return (
          <span className={cls}>
            <Megaphone size={15} />
          </span>
        );
      case "store_created":
        return (
          <span className={cls}>
            <ShoppingBag size={15} />
          </span>
        );
      default:
        return (
          <span className={cls}>
            <FileText size={15} />
          </span>
        );
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={dict.notifications.title}
        className="relative flex h-8 w-8 items-center justify-center text-neutral-400 transition-colors hover:text-white"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-white/10 bg-neutral-950 p-3 shadow-xl shadow-black/40 animate-fade-in-up">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-sm font-bold text-white">
              {dict.notifications.title}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markRead()}
                className="flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-300 transition-colors hover:bg-brand-500/25"
              >
                <CheckCheck size={12} />
                {dict.notifications.markAllRead}
              </button>
            )}
          </div>
          <div className="mb-2 flex gap-1 px-1" role="tablist" aria-label={dict.notifications.title}>
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  filter === f ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {f === "all" ? dict.notifications.filterAll : dict.notifications.filterUnread}
                {f === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            ))}
          </div>

          {!hasItems || (filter === "unread" && unreadCount === 0) ? (
            <p className="px-1 py-3 text-sm text-neutral-500">
              {dict.notifications.empty}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {visibleItems.length > 0 && (
                <ul className="space-y-1.5">
                  {visibleItems.map((n) => (
                    <li key={n.id} className={n.read ? "opacity-60" : ""}>
                      <Link
                        href="/dashboard"
                        onClick={() => {
                          if (!n.read) markRead([n.id]);
                          setOpen(false);
                        }}
                        className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/5"
                      >
                        <ActionIcon kind={n.kind} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm leading-5 text-neutral-300">
                            {actionMessage(n)}
                            {n.count > 1 && (
                              <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-neutral-200">
                                ×{n.count}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11px] font-semibold text-neutral-500">
                            {timeAgo(n.createdAt, dict)}
                          </span>
                        </span>
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {subItems.length > 0 && (
                <>
                  {visibleItems.length > 0 && (
                    <div className="my-2 border-t border-white/5" />
                  )}
                  <ul className="space-y-1.5">
                    {subItems.map((n) => (
                      <li key={n.id}>
                        <Link
                          href="/dashboard"
                          onClick={() => setOpen(false)}
                          className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/5"
                        >
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              n.kind === "cancelling"
                                ? "bg-red-500/20 text-red-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {n.kind === "cancelling" ? (
                              <XCircle size={15} />
                            ) : (
                              <AlertTriangle size={15} />
                            )}
                          </span>
                          <span className="min-w-0 text-sm leading-5 text-neutral-300">
                            {subscriptionMessage(n)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toast per gli eventi arrivati mentre la tab è attiva (solo il tab col
          focus li mostra: gli altri aggiornano badge e titolo). */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
          {toasts.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                markRead([n.id]);
                setToasts((prev) => prev.filter((t) => t.id !== n.id));
              }}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-neutral-900/95 p-3 text-left shadow-2xl shadow-black/50 backdrop-blur transition-colors hover:border-brand-500/40"
            >
              <ActionIcon kind={n.kind} />
              <span className="min-w-0 flex-1 text-sm leading-5 text-neutral-200">
                {actionMessage(n)}
                {n.count > 1 && <span className="ml-1.5 text-xs font-bold text-neutral-400">×{n.count}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}