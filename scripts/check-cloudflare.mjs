/**
 * Controllo di salute del sito (pre/post deploy).
 *
 * Eseguo un ciclo concorrente di richieste sulle rotte pubbliche principali
 * e restituisce il numero di risposte in errore. L'errore Cloudflare 1102
 * ("Worker exceeded resource limits") si presenta come 503.
 *
 * - CLI: `node scripts/check-cloudflare.mjs [baseUrl] [richieste] [concurrenza]`
 * - Modulo: `import { checkHealth } from "./check-cloudflare.mjs"`
 * Exit code 0 = tutto ok; 1 = almeno un errore.
 */
import { setTimeout as sleep } from "node:timers/promises";

const DEFAULT_BASE = "https://www.agentcloud.agency";
const PATHS = ["/", "/about", "/agents", "/skills", "/bundles", "/integrations", "/login", "/pricing", "/security", "/waitlist"];

/* Nota: /agent NON viene testata (non esiste come rotta; solo /agent/[id]),
   per non inquinare l'esito con falsi 404. */

export async function checkHealth(baseUrl = DEFAULT_BASE, total = 60, concurrency = 6) {
  const statuses = {};
  const failures = [];
  let done = 0;

  async function hit(i) {
    const path = PATHS[i % PATHS.length];
    try {
      const res = await fetch(baseUrl + path, { redirect: "follow" });
      statuses[`${res.status} ${path}`] = (statuses[`${res.status} ${path}`] ?? 0) + 1;
      if (res.status !== 200) {
        failures.push(`GET ${path} -> ${res.status}`);
      }
    } catch (e) {
      failures.push(`GET ${path} -> Rete: ${e?.message || e}`);
    }
    done += 1;
    if (done % 15 === 0) console.log(`... ${done}/${total}`);
  }

  for (let i = 0; i < total; i += concurrency) {
    const batch = Math.min(concurrency, total - i);
    await Promise.all(Array.from({ length: batch }, (_, k) => hit(i + k)));
    await sleep(150);
  }

  return { statuses, failures, total };
}

export function printResult({ statuses, failures, total }) {
  console.log("\n— Distribuzione status —");
  Object.entries(statuses).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  if (failures.length) {
    console.log(`\nCHECK FALLITO: ${failures.length}/${total} richieste in errore`);
    failures.slice(0, 10).forEach((f) => console.log("  " + f));
    return false;
  }
  console.log(`\nCHECK OK: ${total}/${total} richieste 200`);
  return true;
}

const isMain = process.argv[1] && process.argv[1].endsWith("check-cloudflare.mjs");
if (isMain) {
  const base = process.argv[2] ?? DEFAULT_BASE;
  const total = Number(process.argv[3] ?? 60);
  const concurrency = Number(process.argv[4] ?? 6);
  const result = await checkHealth(base, total, concurrency);
  const ok = printResult(result);
  process.exit(ok ? 0 : 1);
}
