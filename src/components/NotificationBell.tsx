"use client";

import { useEffect, useRef, useState } from "react";
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
};

const POLL_MS = 30_000;

function formatDate(iso: string | null, locale: "it" | "en"): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeAgo(iso: string, locale: "it" | "en", dict: Dictionary): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return dict.notifications.justNow;
  if (minutes < 60) return t(dict.notifications.minutesAgo, { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t(dict.notifications.hoursAgo, { n: hours });
  return t(dict.notifications.daysAgo, { n: Math.floor(hours / 24) });
}

function agentDisplayName(slug: string, locale: "it" | "en"): string {
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!active || !d) return;
          const data = d as {
            notifications?: SubscriptionNotification[];
            agentNotifications?: AgentNotification[];
          };
          setSubItems(data.notifications ?? []);
          setAgentItems(data.agentNotifications ?? []);
        })
        .catch(() => {
          // offline / transient — keep last known state
        });
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
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

  async function markRead(ids?: string[]) {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      });
    } catch {
      // best-effort — local state still updates
    }
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
        : start.toLocaleString(locale === "en" ? "en-GB" : "it-IT", {
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
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={dict.notifications.title}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-neutral-300 transition-colors hover:border-brand-500/40 hover:bg-white/5 hover:text-white"
      >
        <Bell size={17} />
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

          {!hasItems ? (
            <p className="px-1 py-3 text-sm text-neutral-500">
              {dict.notifications.empty}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {agentItems.length > 0 && (
                <ul className="space-y-1.5">
                  {agentItems.map((n) => (
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
                          </span>
                          <span className="mt-0.5 block text-[11px] font-semibold text-neutral-500">
                            {timeAgo(n.createdAt, locale, dict)}
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
                  {agentItems.length > 0 && (
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
    </div>
  );
}
