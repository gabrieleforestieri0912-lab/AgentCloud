/**
 * Controllo salute del sito su Cloudflare Workers (pre/post deploy).
 *
 * Esegue una serie di richieste concorrenti sulle rotte pubbliche principali
 * e fallisce se anche una sola risposta non è 200 (l'errore Cloudflare 1102
 * "Worker exceeded resource limits" si presenta come 503 con cache no-store).
 *
 * Uso: node scripts/check-cloudflare.mjs [baseUrl] [richieste] [concurrenza]
 * Exit code 0 = tutto ok; 1 = almeno un errore.
 */
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.argv[2] ?? "https://www.agentcloud.agency";
const TOTAL = Number(process.argv[3] ?? 60);
const CONCURRENCY = Number(process.argv[4] ?? 6);

const PATHS = ["/", "/about", "/agents", "/skills", "/bundles", "/integrations", "/login", "/pricing", "/security", "/waitlist"];

const failures = [];
let statuses = {};
let done = 0;

async function hit(i) {
  const path = PATHS[i % PATHS.length];
  const started = performance.now();
  try {
    const res = await fetch(BASE + path, { redirect: "follow" });
    statuses[`${res.status} ${path}`] = (statuses[`${res.status} ${path}`] ?? 0) + 1;
    if (res.status !== 200) {
      failures.push(`GET ${path} -> ${res.status}`);
    }
  } catch (e) {
    failures.push(`GET ${path} -> Rete: ${e?.message || e}`);
  }
  done += 1;
  if (done % 15 === 0) console.log(`... ${done}/${TOTAL} (` + ((performance.now() - started).toFixed(0)) + "ms)");
}

const rounds = [];
for (let i = 0; i < TOTAL; i += CONCURRENCY) {
  const batch = Math.min(CONCURRENCY, TOTAL - i);
  await Promise.all(Array.from({ length: batch }, (_, k) => hit(i + k)));
  await sleep(150);
}

await sleep(0);
console.log("\n— Distribuzione status —");
Object.entries(statuses).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));

if (failures.length) {
  console.log(`\nCHECK FALLITO: ${failures.length}/${TOTAL} richieste in errore`);
  failures.slice(0, 10).forEach((f) => console.log("  " + f));
  process.exit(1);
}
console.log(`\nCHECK OK: ${TOTAL}/${TOTAL} richieste 200`);
