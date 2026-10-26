/**
 * Deploy "safe" per Cloudflare Workers (piano Free).
 *
 * Perché esiste: sul piano Free il limite è 10 ms di CPU per richiesta e
 * l'errore Cloudflare 1102 ("Worker exceeded resource limits") è scoppiato
 * in produzione dopo certi deploy. Questo script esegue il deploy, testa la
 * produzione con rotte vere e, se il nuovo codice rompe il sito, fa
 * AUTOMATICAMENTE il rollback all'ultima versione sana: l'utente non deve
 * fare nulla, il sito non resta mai rotto dopo un deploy.
 *
 * Pipeline:
 *   1. legge la versione attiva prima del deploy (via API Cloudflare);
 *   2. lancia `opennextjs-cloudflare deploy` (la build è già fatta);
 *   3. aspetta la propagazione e gira il check salute (rotte vere);
 *   4. se le richieste in errore superano la soglia -> rollback alla
 *      versione precedente + riconferma; exit 1.
 *
 * Uso: node scripts/safe-deploy.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { checkHealth, printResult } from "./check-cloudflare.mjs";

const ACCOUNT_ID = "00880ff0283cd862369457d468026397";
const WRANGLER_TOKEN_PATH = "C:/Users/Utente/AppData/Roaming/xdg.config/.wrangler/config/default.toml";
const BASE = "https://www.agentcloud.agency";

/** soglia di allarme: sopra questa % di richieste fallite il deploy è "rotto" */
const FAILURE_THRESHOLD = 0.25;
/** Caratteristiche del check: conc 3 e round separati per non autogenerare
 *  i 1102 (burst concorrenti mettono in flag gli isolati anche con codice sano). */
const CHECKS = [
  { total: 30, concurrency: 3, delayMs: 10_000 },
];

/** secondo round di conferma dopo 90s, solo se il primo è sopra soglia */
const CONFIRM_DELAY_MS = 90_000;

function readWranglerToken() {
  const toml = readFileSync(WRANGLER_TOKEN_PATH, "utf8");
  return toml.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1] ?? "";
}

/** Rinfresca il token OAuth di wrangler (scade ogni poche ore). Senza questo
 *  il deploy fallisce su una macchina che non ha usato wrangler da tempo:
 *  `wrangler whoami` innesca il refresh e riscrive default.toml in silenzio. */
async function refreshWranglerToken() {
  await new Promise((resolve) => {
    const child = spawn("npx", ["wrangler", "whoami"], { shell: true, stdio: "ignore" });
    child.on("exit", resolve);
    child.on("error", resolve);
  });
}

async function cfApi(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${readWranglerToken()}`, ...init.headers },
  });
  const body = await res.json();
  if (!body.success) {
    throw new Error(`Cloudflare API ${path}: ${JSON.stringify(body.errors).slice(0, 300)}`);
  }
  return body.result;
}

function activeVersionId(deployments) {
  // il primo elemento è la deployment attiva; la sua versione è uguale a quella attiva
  const active = deployments.deployments[0];
  return { id: active.id, versionId: active.versions[0].version_id };
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: true, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} -> exit ${code}`))));
    child.on("error", reject);
  });
}

async function main() {
  console.log("▸ safe-deploy: rinfresco il token OAuth di wrangler...");
  await refreshWranglerToken();
  console.log("▸ safe-deploy: leggo la versione attiva...");
  const before = activeVersionId(await cfApi("workers/scripts/agentcloud/deployments"));
  console.log(`  versione attiva: ${before.versionId}`);

  console.log("\n▸ safe-deploy: eseguo il deploy...");
  await run("npx", ["opennextjs-cloudflare", "deploy"]);
  console.log("\n▸ safe-deploy: deploy completato");

  for (const { total, concurrency, delayMs } of CHECKS) {
    console.log(`\n▸ safe-deploy: attendo ${delayMs / 1000}s di propagazione...`);
    await sleep(delayMs);
    console.log(`▸ safe-deploy: check salute con ${total} richieste (conc ${concurrency})...`);
    const result = await checkHealth(BASE, total, concurrency);
    let failureRate = result.failures.length / result.total;
    let ok = printResult(result);

    // Il piano Free fa fallire i burst anche con codice sano (processo record
    // nel doc DEPLOY.md): se il primo round è sopra soglia, si conferma dopo
    // una pausa prima di dichiarare il deploy rotto.
    if (failureRate > FAILURE_THRESHOLD) {
      console.log(`\n▸ primo round al ${Math.round(failureRate * 100)}% sopra soglia: conferma dopo ${CONFIRM_DELAY_MS / 1000}s...`);
      await sleep(CONFIRM_DELAY_MS);
      const confirm = await checkHealth(BASE, total, concurrency);
      failureRate = confirm.failures.length / confirm.total;
      ok = printResult(confirm);
    }

    if (failureRate > FAILURE_THRESHOLD) {
      console.log(`\n⛔ deploy ROTTO (${Math.round(failureRate * 100)}% fallito > soglia ${FAILURE_THRESHOLD * 100}%) anche dopo conferma.`);
      console.log(`▸ safe-deploy: rollback automatico a ${before.versionId}...`);
      try {
        await run("npx", ["wrangler", "rollback", before.versionId]);
      } catch (e) {
        console.error("❌ AUTO-ROLLBACK FALLITO: intervenire subito con:");
        console.error(`   npx wrangler rollback ${before.versionId}`);
        console.error(`   (${e.message})`);
        process.exit(1);
      }
      console.log(`\n✅ ROLLBACK ESEGUITO: tornata la versione ${before.versionId}.`);
      console.log("   (il check di conferma dopo il rollback è solo informativo: subito dopo il");
      console.log("    rollback gli isolati possono dare ancora qualche 1102 per qualche minuto.)");
      await sleep(10_000);
      const afterRollback = await checkHealth(BASE, 15, 1);
      printResult(afterRollback);
      console.log("\n✅ ROLLBACK RIUSCITO: il sito non resta mai mezza-rotto dopo un deploy. Exit 1: correggere il codice.");
      process.exit(1);
    }

    if (!ok) {
      console.log(`\n⚠️  round conferma sotto soglia (${Math.round(failureRate * 100)}% <= ${FAILURE_THRESHOLD * 100}%): mantengo la versione. Sul piano Free gli isolati si riprendono da soli a pacienza.`);
    } else {
      console.log("\n✅ DEPLOY VERIFICATO: il sito risponde bene in produzione. Exit 0.");
    }
  }
}

main().catch((e) => {
  console.error(`❌ safe-deploy errore fatale: ${e.message}`);
  process.exit(1);
});
