"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, XCircle } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

type Notification = {
  id: string;
  kind: "expiring" | "cancelling";
  agentSlug: string;
  agentName: string;
  periodEnd: string | null;
  daysLeft: number | null;
};

function formatDate(iso: string | null, locale: "it" | "en"): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NotificationBell() {
  const { locale, dict } = useLanguage();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.notifications) setItems(d.notifications);
      })
      .catch(() => {});
    return () => {
      active = false;
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

  const count = items.length;

  function message(n: Notification): string {
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={dict.notifications.title}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-neutral-300 transition-colors hover:border-brand-500/40 hover:bg-white/5 hover:text-white"
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-white/10 bg-neutral-950 p-3 shadow-xl shadow-black/40 animate-fade-in-up">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-sm font-bold text-white">
              {dict.notifications.title}
            </span>
            {count > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                {count}
              </span>
            )}
          </div>

          {count === 0 ? (
            <p className="px-1 py-3 text-sm text-neutral-500">
              {dict.notifications.empty}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((n) => (
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
                      {message(n)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function t(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in values ? String(values[key]) : m,
  );
}
