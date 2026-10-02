"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import {
  COUPON_CODE,
  COUPON_MAX_USES,
} from "@/lib/coupon";
import {
  getCoupon,
  preloadCouponState,
  type CouponState,
} from "@/lib/coupon-store";
import { t } from "@/lib/i18n/dictionaries";

const CLAIMED_KEY = "coupon_agentcloud50_claimed";
/** Evento custom: `storage` scatta solo su altre tab, qui serve anche la corrente. */
const CLAIMED_EVENT = "ac:coupon-claimed-changed";

function readClaimed(): boolean {
  try {
    return localStorage.getItem(CLAIMED_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribeClaimed(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CLAIMED_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CLAIMED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CLAIMED_EVENT, onChange);
  };
}

function writeClaimed(value: boolean) {
  try {
    if (value) localStorage.setItem(CLAIMED_KEY, "true");
    else localStorage.removeItem(CLAIMED_KEY);
  } catch {
    // storage non disponibile
  }
  window.dispatchEvent(new Event(CLAIMED_EVENT));
}

type Props = {
  coupon: CouponState;
  locale: string;
  dict: import("@/lib/i18n/dictionaries").Dictionary;
};

export default function CouponBanner({ coupon, locale, dict }: Props) {
  const router = useRouter();
  const { dict: commonDict } = useLanguage();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  // Stato già reclamato: derivato da localStorage via useSyncExternalStore
  // (snapshot lato server = false), così nessun setState dentro un effect.
  const claimed = useSyncExternalStore(subscribeClaimed, readClaimed, () => false);

  // Sincronizza lo state sul client con quello server-side renderizzato.
  useEffect(() => {
    if (!coupon.enabled) return;
    preloadCouponState(coupon);
  }, [coupon]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim().toUpperCase();
    if (value !== COUPON_CODE) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/coupon/limit");
      const data = await res.json();
      if (!res.ok || !data.active) {
        setStatus("error");
        return;
      }

      // Decrementa server-side: se ci sono 20 usi già consumati
      // (due client contemporanei), il server risponde 409 e il coupon non passa.
      const decrement = await fetch("/api/coupon/decrement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: COUPON_CODE }),
      });

      if (!decrement.ok) {
        // 409 = 20 usi già consumati, 400 = codice errato: stesso messaggio.
        setStatus("error");
        return;
      }

      // Marca il coupon come reclamato localmente (notifica anche questa tab)
      writeClaimed(true);
      setInput("");
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  const model = status === "ok"
    ? dict.agentsPage.coupon.appliedSuccessfully
    : status === "error"
      ? dict.agentsPage.coupon.error
      : null;

  // Se già reclamato, mostra stato applicato
  if (claimed || coupon.applied) {
    return (
      <section
        className="relative z-20 mx-auto max-w-7xl 3xl:max-w-[1720px] overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-50/90 px-4 py-4 shadow-xl shadow-black/10 sm:px-6 sm:py-5"
        aria-live="polite"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <div>
              <p className="text-sm font-bold text-neutral-900">
                {dict.agentsPage.coupon.applied}
              </p>
              <p className="text-xs text-neutral-500">
                {dict.agentsPage.coupon.desc}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              writeClaimed(false);
              setStatus("idle");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/60 px-4 py-2.5 text-sm font-bold text-neutral-700 transition-colors hover:bg-white/80"
          >
            <XCircle size={16} />
            {commonDict.common.coupon.disabled}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative z-20 mx-auto max-w-7xl 3xl:max-w-[1720px] overflow-hidden rounded-2xl border border-white/10 bg-white/90 px-4 py-4 shadow-xl shadow-black/10 sm:px-6 sm:py-5"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <XCircle size={20} className="text-amber-500" />
          <div>
            <p className="text-sm font-bold text-neutral-900">
              {dict.agentsPage.coupon.banner}
            </p>
            <p className="text-xs text-neutral-500">
              {dict.agentsPage.coupon.desc}
            </p>
          </div>
        </div>

        <form onSubmit={handleApply} className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="coupon-input">
{commonDict.common.coupon.enterCode}
          </label>
          <input
            id="coupon-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setStatus("idle");
            }}
            placeholder={commonDict.common.coupon.enterCode}
            maxLength={20}
            className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 sm:w-auto"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {dict.agentsPage.coupon.applying}
              </>
            ) : (
              <>
                {dict.agentsPage.coupon.label}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      {model && (
        <p
          className={`mt-3 text-sm font-bold ${
            status === "ok"
              ? "text-emerald-600"
              : status === "error"
                ? "text-red-500"
                : "text-neutral-500"
          }`}
        >
          {model}
        </p>
      )}
    </section>
  );
}