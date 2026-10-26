# Regole operative permanenti — AgentCloud

Valgono per ogni sessione di lavoro in questo repository. Sono qui perché
opencode le carica a ogni avvio (vedi `opencode.json` → `instructions`).

---

## 1. Dopo ogni modifica, salva su GitHub

A fine blocco di lavoro — non dopo ogni singolo file — committa e spingi.

**Tutto va su `main`, sempre.** Non si committa su branch di lavoro e non si
lasciano modifiche su branch: se il checkout è su un altro branch, si torna
su `main` *prima* di iniziare a lavorare. I branch di feature esistenti
restano solo come riferimenti; non vanno usati come destinazione di lavoro.
Se un deploy non esce, la prima cosa da controllare è che il commit sia su
`main`: la produzione esce da lì.

1. `git status` e `git diff` **prima** di committare: guarda cosa stai per
   includere.
2. `git add` dei file intenzionali, per nome. **Non** usare `git add -A` né
   `git commit -a`: la working tree contiene `.env`, `.next` e artefatti di
   build che non devono finire in un commit.
3. `git commit` con un messaggio che spiega il **perché**, non il **cosa**. Il
   repo usa `type(scope): cosa` → `feat(chat): …`, `fix(woocommerce): …`.
   Se le modifiche sono indipendenti, fai più commit: un commit = un concetto.
4. `git push` su `main`.

Vincoli:

- **Mai segreti.** `.env` e `.env.local` sono già in `.gitignore`: va rispettato,
  non aggirato. Se un file tracciato contiene una chiave o un token, non
  pusharlo e segnalalo.
- **Non toccare gli stash dell'utente.** `git stash list` può contenere lavoro in
  corso che non è tuo: non lo applichi, non lo droppi, non lo committi.
- **Niente force-push.** Se serve davvero, chiedi prima.

---

## 2. I test che crei vengono eliminati quando passano

I test in questo repository sono uno strumento di verifica usa-e-getta, non un
deliverable.

1. Scrivi il file di test ed eseguilo.
2. Se **passa**: eliminalo prima di committare. Ha fatto il suo lavoro.
3. Se **fallisce**: **non** eliminarlo. Il fallimento è un bug reale, e si
   corregge nel codice di produzione — non rilassando l'asserzione. Correggi,
   rilancia finché passa, poi elimini il test come sopra.

La regola vale solo per i file che **crei tu**: non per test già presenti nel
repository.

### Cosa segue da questa regola

Un test eliminato non protegge da regressioni: da domani non presidia più
quel comportamento. La verifica permanente è quindi tutta qui:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

E per il codice che gira davvero, esercizio manuale: partire il server e
provare il percorso. Un "il test passava" non basta come evidenza — il test
appena eliminato non controllerà più nulla domani.

---

## 3. Prima di dichiarare finito un lavoro

**Una modifica non è conclusa quando è scritta: è conclusa quando è stata
provata e funziona correttamente.** Il codice che compila non è una prova di
funzionamento, è il minimo. Se non riesci a verificare il comportamento, il
lavoro non è finito: dillo apertamente invece di presentarlo come
concluso.

Prima di dire "fatto" devi avere questa evidenza:

- typecheck pulito
- lint senza errori nuovi (i warning preesistenti non sono un blocco)
- build che compila
- **il comportamento nuovo è stato provato** (vedi sotto)
- i file di test che hai creato per la verifica sono eliminati

### Cosa significa "provato", per tipo di modifica

| Modifica | Prova minima |
|----------|--------------|
| UI / layout | pagina renderizzata davvero (build locale o produzione) e comportamento controllato: niente doppia scrollbar, niente layout rotto, testo presente |
| Route / API | chiamata HTTP reale alla route, con status e body attesi — non "il file esiste" |
| Integrazione esterna | chiamata vera al provider, o almeno al suo handler con i dati del caso |
| Tool / prompt | invocazione reale del tool e verifica di ciò che il modello ne ricava |
| Script / migrazione | esecuzione dello script e verifica dell'effetto sui dati |

### Regole di verifica

- **Prova il percorso vero**, non un mock: se la modifica sta in un form →
  invia il form; se sta in una fetch → guarda la risposta; se sta in un tool →
  chiamalo e leggi cosa torna.
- **Il caso di errore è metà del lavoro**: una funzione che regge solo quando
  tutto va bene non è verificata. Prova anche l'errore (input invalido,
  timeout, risorsa non raggiungibile) e verifica che il fallimento venga
  **detto**, non nascosto e non inventato.
- **Non rilassare l'asserzione per farla passare**: se la verifica fallisce,
  il bug è nel codice di produzione.
- **Leggi il risultato, non solo il codice di uscita**: uno script che esce 0
  ma non ha fatto nulla è una verifica mancata.
- **Ciò che non puoi provare qui** (login interattivo, dashboard esterna,
  store reale, click dentro un admin) va detto nell'atto finale: elenca cosa
  hai potuto verificare e cosa resta all'utente. Non presentare come
  verificato ciò che hai solo dedotto.
