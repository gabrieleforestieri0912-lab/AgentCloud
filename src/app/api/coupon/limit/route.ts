import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const LIMIT = 20;
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
    for (let i = LIMIT; i > 0; i -= 1) map.set(i.toString(), i);
    setStore(map);
  }
  return map;
}

export async function GET() {
  const now = Date.now();
  const map = load();
  let remaining = map.get("0") ?? LIMIT;

  // Pulizia voci obsolete
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

  return NextResponse.json({ remaining, max: LIMIT, active: remaining > 0 });
}