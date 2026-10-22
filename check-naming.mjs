/**
 * Guard: nel codice, nomi di file, componenti e variabili in INGLESE.
 *
 * Perché esiste: il progetto ha i commenti e i testi in italiano (e i
 * dizionari con le traduzioni: quelli sono contenuto, non naming), ma il
 * NAMING — file, cartelle, componenti, variabili, tipi — è in inglese. Su un
 * codebase grande serve un controllo automatico: il naming in italiano si
 * infila e, dopo venti file, diventa impossibile notarlo a mano.
 *
 * Cosa controlla:
 *   - i nomi di file e cartella (in tutto il repo);
 *   - gli identificatori dichiarati (const/let/var/function/class/interface/
 *     type/enum e le prop), sui sorgenti TS/TSX/JS/JSX/DART.
 *
 * I commenti vengono rimossi prima della scansione: "prima riga = intestazioni"
 * è un commento, non un identificatore.
 *
 * Uso: node scripts/check-english-naming.mjs
 * Esito: 0 = tutto in inglese, 1 = trovati nomi in italiano.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** Cartelle non soggette al controllo (build, dipendenze, VCS). */
const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "out", "build", "coverage",
  ".tmp", ".tmp-g", ".dart_tool", ".vercel", "target", "release", "logs",
  ".opencode", ".claude",
]);

/**
 * Parole italiane che NON sono anche inglesi.
 *
 * La lista è volutamente stretta: "file", "per", "a", "del" sono anche
 * inglesi e non possono stare qui, altrimenti il guard segnalerebbe il
 * codice giusto. Le parole si riconoscono a confine di parola, quindi
 * "conversation" non viene letto come "conversazione".
 */
const ITALIAN_WORDS = [
  "utente", "utenti", "messaggio", "messaggi", "conversazione",
  "conversazioni", "sessione", "sessioni", "salvataggio", "caricamento",
  "scaricare", "invio", "inviato", "aprire", "chiudere", "nuova", "vecchia",
  "nome", "prezzo", "totale", "numero", "elenco", "gruppo", "errore",
  "avviso", "conferma", "annulla", "eliminare", "modificare", "copiare",
  "incollare", "uscire", "entrare", "accedere", "registrazione", "registrato",
  "vuoto", "pieno", "aperto", "chiuso", "percorso", "riga", "colonna",
  "schermo", "finestra", "pulsante", "casella", "etichetta", "titolo",
  "sfondo", "bordo", "dettaglio", "anteprima", "dimensione", "prodotto",
  "prodotti", "cliente", "clienti", "azienda", "aziende", "acquisto",
  "acquisti", "pagamento", "pagamenti", "fattura", "fatture", "abbonamento",
  "credito", "crediti", "sconto", "sconti", "codice", "codici", "invito",
  "inviti", "attesa", "attese", "ricerca", "risultato", "risultati", "domanda",
  "domande", "risposta", "risposte", "aiuto", "esempio", "passo", "passi",
  "scheda", "schede", "scelta", "collega", "delega", "gestisci", "scegli",
  "carrello", "negozio", "fornitore", "allegato", "allegati", "griglia",
  "cella", "pannello", "angolo", "lato", "basso", "alto", "sinistra",
  "destra", "centro", "prima", "dopo", "sopra", "sotto", "dentro", "fuori",
  "verso", "testo", "pagina", "elenco", "prova", "bozza", "casa", "posto",
  "cosa", "modo", "volta", "caso", "tipo", "citta", "anno", "mese",
];

const ITALIAN = new Set(ITALIAN_WORDS);

/** Estrae le parole italiane da un identificatore, a confine di parola. */
function italianWords(token) {
  return token
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map((p) => p.toLowerCase())
    .filter((p) => ITALIAN.has(p));
}

/** Rimuove i commenti: nel codice i nomi non ci sono, nei commenti sì. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ");
}

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".dart"]);
const IDENTIFIER_PATTERNS = [
  /\b(?:const|let|var|final|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
  /([A-Za-z_$][\w$]*)\s*[:=]\s*(?:\([^)]*\)\s*=>|\(|function\b|String\b|bool\b|int\b)/g,
];

const nameHits = [];
const idHits = [];

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".github") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, onFile);
    } else {
      onFile(full);
    }
  }
}

// 1) nomi di file e cartella
walk(ROOT, (file) => {
  const base = path.basename(file).replace(/\.[^.]+$/, "");
  const found = italianWords(base);
  if (found.length) {
    nameHits.push(`${path.relative(ROOT, file)}  (${found.join(", ")})`);
  }
});

// 2) identificatori
walk(ROOT, (file) => {
  if (!CODE_EXT.has(path.extname(file))) return;
  const source = stripComments(fs.readFileSync(file, "utf8"));
  for (const pattern of IDENTIFIER_PATTERNS) {
    let match;
    while ((match = pattern.exec(source))) {
      const found = italianWords(match[1]);
      if (found.length) {
        idHits.push(
          `${path.relative(ROOT, file)}: ${match[1]}  (${found.join(", ")})`,
        );
      }
    }
  }
});

const problems = [...nameHits, ...idHits];
if (problems.length === 0) {
  console.log("Naming: tutto in inglese ✅");
  process.exit(0);
}

console.error("Naming: trovati nomi in italiano. In questo progetto il naming è in inglese (i commenti e i testi restano in italiano).\n");
for (const p of problems) console.error("  " + p);
console.error(`\n${problems.length} da correggere.`);
process.exit(1);
