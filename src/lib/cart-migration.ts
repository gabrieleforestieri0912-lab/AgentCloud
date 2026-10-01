/**
 * Migrazione del carrello anonimo (localStorage) verso il server al login.
 *
 * Perché è un modulo separato da CartProvider: è logica pura (nessun React,
 * nessun fetch iniettato qui) così il comportamento critico — *non perdere gli
 * item che non sono arrivati a destinazione* — è verificabile dai test.
 */

/** Esito della POST di migrazione, in forma strutturale (niente `Response`). */
export type MigrationOutcome = { ok: boolean; status: number } | null;

/** Status che significano "questo slug non tornerà mai a funzionare". */
const TERMINAL_STATUSES = new Set([
  409, // already_owned: l'agente è già attivo, tenerlo locale è inutile
  404, // agente/bundle inesistente: riprovare non aiuterebbe
]);

/**
 * Trasferisce gli slug al server e ritorna quelli che NON sono arrivati a
 * destinazione e quindi **devono restare in localStorage**.
 *
 * Prima la lista locale veniva azzerata sempre: se la POST falliva (rete,
 * 5xx, server in manutenzione) il carrello anonimo veniva cancellato per
 * sempre al primo login.
 */
export async function migrateLocalSlugsToServer(
  slugs: string[],
  post: (slug: string) => Promise<MigrationOutcome>,
): Promise<string[]> {
  const notMigrated: string[] = [];
  for (const slug of slugs) {
    let outcome: MigrationOutcome = null;
    try {
      outcome = await post(slug);
    } catch {
      outcome = null;
    }
    const handled =
      !!outcome && (outcome.ok || TERMINAL_STATUSES.has(outcome.status));
    if (!handled) notMigrated.push(slug);
  }
  return notMigrated;
}
