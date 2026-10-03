/**
 * Store server-side dei coupon (SOLO server — usa `node:fs`, mai importare
 * dai client component).
 *
 * Perché esiste: il conteggio usi del coupon deve essere unico e condiviso
 * tra `/api/coupon/limit`, `/api/coupon/decrement`, `/api/checkout` e
 * `/api/cart/checkout`. Prima ogni route aveva la sua copia in-memory con
 * rischio di divergenza: ora la logica vive qui una sola volta.
 *
 * Limite noto: in-memory per processo (vale per dev/single server; su
 * serverless multi-istanza il conteggio è best-effort, come prima).
 */
import fs from "node:fs";
import path from "node:path";
import { COUPON_CODE, COUPON_MAX_USES } from "./coupon";

const TTL_MS = 5 * 60 * 1000; // 5 min per warmup

// In-memory store per serverless (persiste solo dentro lo stesso processo)
let memoryStore: Map<string, number> | null = null;

function getStore(): Map<string, number> {
  if (memoryStore) return memoryStore;

  // Prova a leggere da un file per persistenza cross-request (solo dev/single server)
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    try {
      const filePath = path.join(process.cwd(), ".coupon-store.json");
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        memoryStore = new Map(JSON.parse(raw));
        return memoryStore;
      }
    } catch {
      // ignora errori
    }
  }

  memoryStore = new Map();
  return memoryStore;
}

function setStore(map: Map<string, number>) {
  memoryStore = map;

  // Persistenza su file (solo dev/single server)
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    try {
      const filePath = path.join(process.cwd(), ".coupon-store.json");
      fs.writeFileSync(filePath, JSON.stringify(Array.from(map.entries())));
    } catch {
      // ignora errori
    }
  }
}

function load(): Map<string, number> {
  let map = getStore();
  if (map.size === 0) {
    map = new Map();
    // Warmup: il coupon è attivo finché ci sono usi liberi
    for (let i = COUPON_MAX_USES; i > 0; i -= 1) map.set(i.toString(), i);
    setStore(map);
  }
  return map;
}

/** Pulisce le voci scadute e restituisce gli usi rimanenti. */
export function getCouponRemaining(): number {
  const now = Date.now();
  const map = load();
  let remaining = map.get("0") ?? COUPON_MAX_USES;

  for (const [key, value] of map.entries()) {
    const lastUpdated = Number(key);
    if (lastUpdated + TTL_MS <= now) {
      map.delete(key);
    } else if (key === "0") {
      remaining = value;
    }
  }

  map.set("0", remaining);
  setStore(map);
  return remaining;
}

export type ConsumeResult =
  | { ok: true; remaining: number }
  | { ok: false; error: "INVALID_CODE" | "INSUFFICIENT_USES" };

/**
 * Valida il codice e consuma un utilizzo in modo atomico (singolo processo).
 * Da chiamare SOLO al momento della creazione del checkout Stripe, mai al
 * claim del banner: gli usi si consumano con l'acquisto, non con l'intenzione.
 */
export function tryConsumeCoupon(code: unknown): ConsumeResult {
  if (code !== COUPON_CODE) return { ok: false, error: "INVALID_CODE" };

  const remaining = getCouponRemaining();
  if (remaining <= 0) return { ok: false, error: "INSUFFICIENT_USES" };

  const map = load();
  const next = remaining - 1;
  map.set("0", next);
  map.set(Date.now().toString(), next);
  setStore(map);
  return { ok: true, remaining: next };
}
