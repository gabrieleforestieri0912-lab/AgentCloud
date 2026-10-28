/**
 * Preferenze utente lato server (tabella `user_preferences`).
 *
 * Una preferenza = chiave -> valore JSON. Le chiavi concesse vivono in
 * `preference-keys.ts` (shared con il client: le chiavi di storage del
 * browser sono le STESSE stringhe, il sync non ha traduzioni da fare).
 * Chiave non ammessa → rifiutata (la tabella non è un magazzino generico).
 *
 * Il modulo viene usato solo da API server autenticate (service role); le
 * policy RLS dello schema coprono accessi diretti del client autenticato.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isPreferenceKey,
  isPreferenceValue,
  type PreferenceKey,
  type PreferenceValue,
} from "@/lib/preference-keys";

export {
  isPreferenceKey,
  isPreferenceValue,
  type PreferenceKey,
  type PreferenceValue,
} from "@/lib/preference-keys";

/** Tutte le preferenze dell'utente; assenza = default lato client. */
export async function readPreferences(
  userId: string,
): Promise<Partial<Record<PreferenceKey, PreferenceValue>>> {
  const db = createAdminClient();
  if (!db) return {};
  const { data } = await db
    .from("user_preferences")
    .select("key, value")
    .eq("user_id", userId)
    .limit(100);
  const out: Partial<Record<PreferenceKey, PreferenceValue>> = {};
  for (const row of (data ?? []) as { key: string; value: unknown }[]) {
    if (isPreferenceKey(row.key) && isPreferenceValue(row.value)) {
      out[row.key] = row.value;
    }
  }
  return out;
}

/** Upsert di una preferenza; chiave o valore non ammesso → false. */
export async function writePreference(
  userId: string,
  key: PreferenceKey,
  value: PreferenceValue,
): Promise<boolean> {
  const db = createAdminClient();
  if (!db) return false;
  const { error } = await db.from("user_preferences").upsert(
    { user_id: userId, key, value, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" },
  );
  return !error;
}

/** Cancellare le preferenze dell'account (cancellazione profilo). */
export async function deletePreferences(userId: string): Promise<void> {
  const db = createAdminClient();
  if (!db) return;
  await db.from("user_preferences").delete().eq("user_id", userId);
}
