import { execFile, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";

const PACKAGE = "@agentcloud/cli";
// Su Windows `npm` è un .cmd: senza shell execFile non lo trova.
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

const execFileAsync = promisify(execFile);

/** Versione installata, letta dal package.json del pacchetto. */
export function localVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json") as { version?: string };
    return typeof pkg.version === "string" && pkg.version ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Confronto semver semplificato: 1 se a > b, -1 se a < b, 0 se uguali. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .split("-")[0]
      .split(".")
      .map((n) => Number.parseInt(n, 10) || 0);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/** Ultima versione pubblicata su npm. Lancia un errore leggibile se fallisce. */
export async function latestVersion(): Promise<string> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(NPM, ["view", PACKAGE, "version"]));
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      throw new Error("npm non trovato: installa Node.js 18+ per aggiornare la CLI.");
    }
    throw new Error(
      `Registro npm non raggiungibile o pacchetto non pubblicato: ${PACKAGE}. ` +
        `Se usi la CLI dai sorgenti, aggiorna con git pull e ricompila (vedi cli/README.md).`,
    );
  }
  const version = stdout.trim().split("\n").pop()?.trim() || "";
  if (!version) throw new Error("Il registro npm non ha restituito una versione: riprova più tardi.");
  return version;
}

/**
 * `agentcloud update [--check]`.
 *
 * Aggiorna il pacchetto globale all'ultima versione pubblicata. Con `--check`
 * confronta soltanto e non installa nulla.
 */
export async function runUpdate(checkOnly: boolean): Promise<void> {
  const local = localVersion();
  const latest = await latestVersion();
  const cmp = compareVersions(local, latest);
  if (cmp === 0) {
    console.log(`✓ Sei già aggiornato (v${local}).`);
    return;
  }
  if (cmp > 0) {
    console.log(`Versione locale v${local} più recente di quella pubblicata (v${latest}): niente da fare.`);
    return;
  }
  if (checkOnly) {
    console.log(`Disponibile la versione v${latest} (locale v${local}). Esegui \`agentcloud update\` per installarla.`);
    return;
  }
  console.log(`Aggiornamento v${local} → v${latest}…`);
  try {
    // spawn con stdio inherit: l'output di npm resta visibile così, se
    // fallisce, l'utente vede il perché senza nostri giri di parole.
    await new Promise<void>((resolve, reject) => {
      const child = spawn(NPM, ["install", "-g", `${PACKAGE}@latest`], { stdio: "inherit" });
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`npm install uscito con codice ${code}`)),
      );
    });
  } catch {
    throw new Error(
      "Installazione fallita (vedi l'output di npm qui sopra). Su sistemi protetti può servire un terminale da amministratore.",
    );
  }
  console.log(`✓ Aggiornato a v${latest}. Riavvia il terminale o riesegui il comando.`);
}
