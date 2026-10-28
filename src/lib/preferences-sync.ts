"use client";

/**
 * Sync delle preferenze utente browser ↔ DB.
 *
 * Le preferenze (larghezza sidebar, sidebar aperta, size testo, agente
 * predefinito, toggle email/prodotti) restano in `localStorage`, che è la
 * fonte immediata (zero-flash al caricamento): il DB è la copia allineata.
 *
 *   - `pushPreference` —fire-and-forget a ogni scrittura locale (le
 *     scritture sono rare e guidate dall'utente: niente batch);
 *   - `hydrateMissingPreferences` — al mount riempi i buchi: ciò che manca
 *     nel browser (nuovo device, storage svuotato) arriva dal DB, ciò che
 *     c'è già resta e viene rispedito al DB al prossimo tocco.
 */
import {
  PREFERENCE_KEYS,
  isPreferenceValue,
  type PreferenceValue,
} from "@/lib/preference-keys";

/** Fire-and-forget: la preferenza locale va in copia sul DB. */
export function pushPreference(key: string, value: PreferenceValue): void {
  try {
    void fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }).catch(() => {
      // best-effort: il valore resta valido in locale
    });
  } catch {
    // Client fetch sempre disponibile nei browser moderni: non accade.
  }
}

/**
 * Riempie i buchi del browser dal DB. Restituisce le preferenze lette dal
 * server (le usa chi vuole reagire oltre alle chiavi di storage, es. i
 * toggle di Impostazioni). Gira UNA volta per pagina.
 */
export async function hydrateMissingPreferences(): Promise<
  Partial<Record<string, PreferenceValue>>
> {
  const preferences: Partial<Record<string, PreferenceValue>> = {};
  try {
    const res = await fetch("/api/user/preferences", { cache: "no-store" });
    if (!res.ok) return preferences;
    const data = (await res.json()) as {
      preferences?: Record<string, unknown>;
    };
    if (!data.preferences) return preferences;
    for (const [key, value] of Object.entries(data.preferences)) {
      if (!isPreferenceValue(value)) continue;
      preferences[key] = value;
      if (!(PREFERENCE_KEYS as readonly string[]).includes(key)) continue;
      try {
        const local = window.localStorage.getItem(key);
        // Buco nel browser (nuovo device o storage svuotato): si ripristina.
        if (!local) window.localStorage.setItem(key, String(value));
      } catch {
        // Storage non disponibile: resta solo la risposta che segue.
      }
    }
  } catch {
    // Server irraggiungibile: i default locali governano come prima.
  }
  return preferences;
}

/**
 * Legge una preferenza con priorità al browser; il DB fa da copia.
 * Usata in componenti che non vogliono perder tempo a distinguere le fonti.
 */
export function readLocalPreference(
  key: string,
  fallback: PreferenceValue,
): PreferenceValue {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    if (raw === "true") return true;
    if (raw === "false") return false;
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
    return raw;
  } catch {
    return fallback;
  }
}
