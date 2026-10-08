/**
 * Template `SKILL.md` per la guida "Crea la tua competenza in 10 minuti".
 *
 * Perché in un modulo e non in un file .md dentro `public/`: il template
 * documenta il formato che il validatore server accetta. Se le due copie
 * divergessero, l'utente scaricherebbe un file che il caricamento rifiuta —
 * quindi template e validazione stanno nello stesso posto e un test li
 * confronta.
 */

export const SKILL_TEMPLATE = `---
name: la-mia-competenza
description: >
  Cosa fa la competenza e QUANDO usarla, con i trigger espliciti.
  Questo è il testo che l'agente legge per decidere se attivarla: se qui
  scrivi "quando serve fare X", l'agente la userà quando gli chiedi X.
version: 1.0.0
locale: it
agents: [nome-agente-dove-usarla]
integrations_required: []
integrations_optional: []
permissions: [read:contesto]
risk_level: low
---

# La mia competenza

Una riga che dice cosa ottiene l'utente quando questa competenza si attiva.

## Quando usarla

- La richiesta riguarda direttamente questo compito.
- I dati necessari sono disponibili nelle integrazioni collegate.

## Quando NON usarla

- Il compito esce dagli ambiti descritti sopra.
- Un'altra competenza copre già la richiesta.

## Procedura passo-passo

1. Raccogli gli input necessari dalla richiesta.
2. Leggi i dati dalle integrazioni collegate.
3. Applica le regole della sezione successiva.
4. Restituisci l'output nel formato dichiarato.

## Regole e vincoli

- Tono: professionale, diretto, orientato al risultato.
- Nessun dato inventato: se il dato manca, dichiaralo.
- GDPR: solo i dati necessari, mai segreti in questo file.

## Output atteso

Una riga che descrive il formato esatto di ciò che l'agente deve restituire.

## Esempi

**Richiesta**: «una richiesta tipica dell'utente»

\`\`\`
l'output atteso, nell'esempio
\`\`\`

---

# Note per chi scrive

- \`name\` deve essere kebab-case e univoco.
- \`description\` è il campo più importante: è l'unico testo sempre presente
  nel contesto dell'agente. Scrivi cosa fa E quando usarla.
- Il corpo sotto i 500 righe. Quello che eccede va in \`references/\`.
- \`risk_level: high\` fa sì che ogni azione con effetto esterno (invio,
  pubblicazione, pagamento, cancellazione) chieda l'approvazione umana.
- La competenza non può mai usare un'integrazione non collegata all'agente.
`;
