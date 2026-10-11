import { execFile, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const PACKAGE = "agentcloud-cli";
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

/* ------------------------------------------------------------------ *
 * Avviso automatico di aggiornamento all'avvio dei comandi
 * ------------------------------------------------------------------ */

type UpdateCheckCache = { checkedAt: number; latest: string; notifiedAt?: number };

const CHECK_FILE = path.join(os.homedir(), ".agentcloud", "update-check.json");
// Controllo e avviso al massimo una volta al giorno: oltre sarebbe spam,
// sotto non si noterebbe un rilascio appena uscito.
const CHECK_INTERVAL_MS = 24 * 3600 * 1000;

function readCheckCache(): UpdateCheckCache | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(CHECK_FILE, "utf8")) as Partial<UpdateCheckCache>;
    if (typeof parsed.checkedAt === "number" && typeof parsed.latest === "string") {
      return { checkedAt: parsed.checkedAt, latest: parsed.latest, notifiedAt: parsed.notifiedAt };
    }
    return null;
  } catch {
    return null;
  }
}

function writeCheckCache(cache: UpdateCheckCache): void {
  try {
    fs.mkdirSync(path.dirname(CHECK_FILE), { recursive: true });
    fs.writeFileSync(CHECK_FILE, JSON.stringify(cache), "utf8");
  } catch {
    // Cache best-effort: se non si scrive, il prossimo avvio ricontrolla.
  }
}

/** Ultima versione pubblicata, o null se offline (mai un'eccezione). */
async function fetchLatestQuiet(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(NPM, ["view", PACKAGE, "version"], { timeout: 4000 });
    const version = stdout.trim().split("\n").pop()?.trim() || "";
    return version || null;
  } catch {
    return null;
  }
}

/**
 * Controllo non bloccante all'avvio: se esiste una versione più recente,
 * lo comunica e propone di installarla subito e ripartire.
 *
 * Non rallenta i comandi (cache giornaliera + timeout corto), non rompe gli
 * script (senza TTY stampa solo l'avviso) e si disattiva con
 * `AGENTCLOUD_NO_UPDATE_CHECK=1`. Non gira per `update` (ha la sua logica),
 * `help` e `--version`.
 */
export async function maybeNotifyUpdate(argv: string[]): Promise<void> {
  if (process.env.AGENTCLOUD_NO_UPDATE_CHECK) return;
  const args = argv.slice(2);
  if (args.length === 0) return;
  const cmd = args[0];
  if (
    cmd === "update" ||
    cmd === "help" ||
    args.includes("--help") ||
    args.includes("-h") ||
    args.includes("--version") ||
    args.includes("-V")
  ) {
    return;
  }

  const local = localVersion();
  const now = Date.now();
  const cache = readCheckCache();
  let latest: string | null = null;
  if (cache && now - cache.checkedAt < CHECK_INTERVAL_MS) {
    latest = cache.latest;
  } else {
    latest = await fetchLatestQuiet();
    if (latest) writeCheckCache({ checkedAt: now, latest, notifiedAt: cache?.notifiedAt });
    else if (cache) latest = cache.latest; // offline: usa l'ultimo dato noto
  }
  if (!latest || compareVersions(local, latest) >= 0) return;
  if (cache?.notifiedAt && now - cache.notifiedAt < CHECK_INTERVAL_MS) return;
  writeCheckCache({ checkedAt: cache?.checkedAt ?? now, latest, notifiedAt: now });

  console.log(`\nÈ disponibile agentcloud-cli v${latest} (hai la v${local}).`);
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log("Aggiorna con `agentcloud update`.");
    return;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question("Aggiornare ora e ripartire? [Y/n] ")).trim().toLowerCase();
  rl.close();
  if (answer !== "" && answer !== "y" && answer !== "sì" && answer !== "si" && answer !== "yes") {
    console.log("Ok, più tardi: `agentcloud update` quando vuoi.");
    return;
  }
  await runUpdate(false);
  await relaunchOrExit(argv);
}

/**
 * Dopo l'aggiornamento rilancia lo stesso comando col binario nuovo, così
 * l'utente non deve rilanciarlo a mano ("scaricarla e ripartire").
 *
 * Il rilancio avviene solo se la CLI gira già dall'installazione globale:
 * dai sorgenti il codice locale potrebbe differire dal pubblicato e il
 * confronto non avrebbe senso — in quel caso si chiede il riavvio manuale.
 */
async function relaunchOrExit(argv: string[]): Promise<never> {
  try {
    const { stdout } = await execFileAsync(NPM, ["root", "-g"]);
    const globalRoot = stdout.trim().toLowerCase();
    const bin = path.join(stdout.trim(), PACKAGE, "dist", "index.js");
    const here = fileURLToPath(import.meta.url).toLowerCase();
    if (globalRoot && here.startsWith(globalRoot) && fs.existsSync(bin)) {
      const child = spawn(process.execPath, [bin, ...argv.slice(2)], { stdio: "inherit" });
      const code: number = await new Promise((resolve) => {
        child.on("error", () => resolve(1));
        child.on("close", (c) => resolve(c ?? 1));
      });
      process.exit(code);
    }
  } catch {
    // sotto: messaggio di riavvio manuale
  }
  console.log("Chiudi e riesegui il comando per usare la nuova versione.");
  process.exit(0);
}
