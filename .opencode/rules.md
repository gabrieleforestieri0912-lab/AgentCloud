# Regole operative permanenti — AgentCloud

Valgono per ogni sessione di lavoro in questo repository. Sono qui perché
opencode le carica a ogni avvio (vedi `opencode.json` → `instructions`).

---

## 1. Dopo ogni modifica, salva su GitHub

A fine blocco di lavoro — non dopo ogni singolo file — committa e spingi.

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

- typecheck pulito
- lint senza errori nuovi (i warning preesistenti non sono un blocco)
- build che compila
- se hai toccato un'integrazione o una route: il percorso provato a mano
- i file di test che hai creato per la verifica sono eliminati