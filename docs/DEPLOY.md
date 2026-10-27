# Deployment sicuro su Cloudflare Workers (piano Free)

> **Stato attuale (ottobre 2026): la produzione gira su Vercel.**
> Il progetto ha rimigrato su Vercel: le variabili d'ambiente vanno salvate
> anche lì (dashboard Vercel o `vercel env add <nome> production`), perché
> l'environment di produzione vero è quello di Vercel, non `.env`.
> **Tutto il contenuto Cloudflare di questa pagina si conserva di proposito**
> (`wrangler.jsonc`, `open-next.config.ts`, `scripts/safe-deploy.mjs`,
> `scripts/check-cloudflare.mjs`, gli script `deploy`/`deploy:publish` in
> `package.json`): su Cloudflare si potrebbe tornare, quindi niente va
> eliminato né "ripulito" come obsoleto.

## Il problema

L'account è sul **piano Workers Free**: il limite è **10 ms di CPU per
richiesta HTTP** (documentazione Workers aggiornata a ottobre 2026:
Free = 10 ms, Paid = 30 s di default, configurabile fino a 5 min).

Un'app Next.js in SSR costa tipicamente 30-800 ms di CPU per richiesta:
il limite viene superato per costruzione. La piattaforma concede una
"built-in flex" per isolati appena avviati: le richieste pesanti passano
finché il runtime non decide che l'isolato supera il limite in modo
continuo; da quel momento le uccide quasi all'istante e il client vede il
classico `HTTP 503` con body `error code: 1102`.

Questo spiega perché:
- qualche ora dopo un deploy tutto sembrava "tornato a funzionare";
- certi periodi tengono 240/240 richieste e altri soltanto 50/80;
- un rollback di codice diverso sembrava "sistemare" in modo duraturo.

## Cosa misurare e come

`scripts/check-cloudflare.mjs` è uno **stress test**: in concurrenza alta
provoca lui stesso i 1102 (mette in flag gli isolati anche con codice
sano), quindi:

- per verificare che il sito sia usabile:
  `node scripts/check-cloudflare.mjs https://www.agentcloud.agency 30 3`;
- per misurare l'utilizzo vero: richieste singole con pause (una
  navigazione umana carica una pagina alla volta, al massimo 3-4 in
  parallelo).

Per dare un'occhiata alla produzione in diretta:
`npx wrangler tail agentcloud`

Se si attiva il piano Workers Paid, tutta questa sezione perde valore: il
limite CPU sale a 30 s per richiesta e i 1102 scompaiono alla radice.

## La garanzia: auto-rollback nel deploy

`npm run deploy` è stato riconfigurato così:

```
opennextjs-cloudflare build   →   node scripts/safe-deploy.mjs
```

`scripts/safe-deploy.mjs`:
1. legge la versione attiva in produzione prima del deploy (via API
   Cloudflare, token OAuth locale in
   `xdg.config/.wrangler/config/default.toml`);
2. lancia `opennextjs-cloudflare deploy` (la build è già stata fatta);
3. attende 10 s di propagazione, poi esegue il check salute su rotte
   vere (`scripts/check-cloudflare.mjs`, 30 richieste, concurrenza 3);
4. se il primo round supera il 25% di errori, si attende 90 s e si
   ripete il round di conferma (i burst concorrenti possono dare 1102
   anche con codice sano: gli isolati si riprendono dopo una pausa);
5. se anche la conferma supera il 25%: **rollback automatico** con
   `wrangler rollback` alla versione precedente. Il check dopo il
   rollback è solo informativo (gli isolati si riprendono in qualche
   minuto anche dopo il ripristino).

Esiti:
- **exit 0**: sito sano, versione nuova confermata in produzione;
- **exit 1**: il deploy è stato ripristinato automaticamente — correggere
  il codice che ha innescato il problema e ridistribuire.

Comandi manuali, nel caso:
- vedere lo stato: `npx wrangler deployments list`
- rollback manuale: `npx wrangler rollback <versionId>`
- deploy senza rete di protezione: `npm run deploy:publish`

## Come ridurre il rischio (senza piano Paid)

Ordine di efficacia concreta:

1. **Passare al piano Workers Paid (~$5/mese)**: toglie l'intera classe di
   errore (30 s di CPU per richiesta). Il codice non va né toccato né
   ridistribuito di nuovo.
2. **Pagine statiche**: trasformare le pagine marketing in prerender
   servite dal binding ASSETS elimina l'SSR dai percorsi più visti, ma è
   un re-engineering globale: la lingua è risolta da un cookie con
   `headers()`/`cookies()` nel layout radice, quindi tutte le pagine sono
   dinamiche per costruzione.
3. **Cache degli asset statici** (`public/_headers`, già fatto, commit
   868d2c0): le richieste di JS/CSS/immagini restano fuori dal worker.
