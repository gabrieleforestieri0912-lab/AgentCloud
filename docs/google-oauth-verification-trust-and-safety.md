# Guida al consenso OAuth — Trust & Safety (Google Workspace)

Ultima revisione: 8 ott 2026 · risposta ai 3 punti della verifica di funzionalità.

---

## Risposta breve ai 3 punti

1. **Il video non mostra il consenso OAuth.** Il video precedente era stato
   registrato saltando il passaggio di autorizzazione. Il nuovo video lo mostra
   per intero, e le istruzioni qui sotto permettono a qualsiasi revisore di
   ripeterlo da solo in pochi minuti.
2. **Il video non mostra abbastanza la funzionalità.** Il nuovo video mostra il
   prodotto in uso reale (chat + agente + dashboard), non solo le schermate.
3. **Il team non può accedere al consenso OAuth.** Il problema era che il
   flusso partiva da un account di prova condiviso, che ora non esiste più: si
   parte da zero, con un account Google qualsiasi. I passi sono qui sotto.

---

## 1. Quale integrazione mostrare nel video

L'app chiede il consenso Google per **Gmail** e **Google Calendar**. Sono due
scope, ed è tutto quello che viene chiesto:

| Scope | Perché serve |
|---|---|
| `https://www.googleapis.com/auth/gmail.modify` | Leggere, smistare e creare bozze di email |
| `https://www.googleapis.com/auth/calendar` | Leggere eventi, crearne con promemoria |

Un dettaglio che conta per la verifica: lo scope `business.manage` (Google
Business Profile, usato dall'agente Recensioni) **non viene chiesto** se non è
configurata una sede Business. Quindi nella schermata di consenso può comparire
un terzo scope solo se il revisore vede l'app in un ambiente con Business
attivo — in quel caso va accettato anche quello.

---

## 2. Percorso esatto per arrivare alla schermata di consenso

Da zero, con un account Google qualsiasi (non serve un'email aziendale):

1. Vai su **https://agentcloud.agency/signup** e crea un account.
2. Entra con **Accedi** se lo avevi già.
3. Dal menu vai su **Dashboard → Integrazioni**
   (l'URL diretto è **https://agentcloud.agency/dashboard/integrations**).
4. In cima trovi la sezione **Google** con **Gmail** e **Google Calendar**,
   entrambe con il pulsante **Connetti in 2 minuti**.
5. Premi **Connetti** su una delle due. Compare la schermata di consenso Google.
6. Nella schermata: leggi i permessi, clicca **Continua** (eventuale secondo
   passo per l'account Google) e **Consenti**.
7. Tornerai automaticamente su AgentCloud con la card marcata **Connesso**.

Il consenso compare due volte se colleghi entrambe Gmail e Calendar: sono due
autorizzazioni indipendenti, una per app-authorization.

**Nota per il revisore:** `prompt=consent` è voluto. Anche se i permessi sono
già stati concessi in passato, Google mostra comunque la schermata. Serve per
poter revocare e riautorizzare in qualsiasi momento.

---

## 3. Cosa deve mostrare il video

Il video deve essere una registrazione continua, con l'URL del consenso Google
**ben leggibile** e senza tagli. Sequenza richiesta:

| # | Cosa inquadrare | Durata minima | Perché |
|---|---|---|---|
| 1 | Homepage: il campo in cui si scrive una richiesta | 5 s | Mostra che si parte dall'utente, non da un dashboard |
| 2 | Digitare «quali sono i miei ordini in lavorazione?» e inviare | 5 s | Dimostra che è una chat, non un form |
| 3 | **Schermata di consenso Google, per intero e in pausa** | 10 s | Il punto contestato: deve essere leggibile |
| 4 | Concessione, poi redirect ad AgentCloud | 5 s | Mostra il completamento del giro |
| 5 | **La risposta dell'agente** a una domanda reale | 15 s | Dimostra che l'integrazione funziona |
| 6 | Dashboard → Integrazioni: card **Connesso** | 5 s | Stato persistito |
| 7 | **Disconnetti**, poi ricollegare | 10 s | Dimostra che l'utente controlla l'accesso |

I punti 3 e 7 erano quelli mancanti. Il punto 7 serve perché una verifica di
accesso plausibile richiede di vedere sia la concessione sia la revoca.

### Suggerimenti pratici sulla registrazione
- Risoluzione 1920×1080, zoom del browser al 100%.
- Fissa la finestra sullo schermo di consenso per almeno 10 secondi **prima**
  di cliccare, così la pausa è già nel file e non serve in post.
- Nessun Accounts Manager, nessun dispositivo condiviso, nessun segreto
  dell'account di prova.

---

## 4. Come revocare l'accesso

Due modi, entrambi da mostrare se il revisore lo chiede:

- **Da AgentCloud:** Dashboard → Integrazioni → **Disconnetti** sulla card.
  I token vengono cancellati dal database (cifrati con AES-256-GCM, vedi §6).
- **Da Google:** https://myaccount.google.com/connections — la connessione
  compare con il nome del client OAuth.

---

## 5. Perché l'app chiede questi permessi e niente altro

| Scope | Funzionalità che abilita | Niente altro viene letto |
|---|---|---|
| `gmail.modify` | Rispondere alle email, smistare per priorità, creare bozze | Nessuna email viene usata per addestrare modelli |
| `calendar` | Verificare e prenotare appuntamenti | Nessun evento viene condiviso con terzi |

Nessun altro scope Google è richiesto. Non leggiamo Drive, non leggiamo
contatti, non leggiamo Gmail per finalità di profilazione.

I dati restano isolati per account: ogni utente vede solo le proprie email, i
propri eventi e le proprie conversazioni. Dettagli in
`https://agentcloud.agency/privacy`.

---

## 6. Come trattiamo i dati

- **Cifratura a riposo.** Access token e refresh token sono cifrati con
  AES-256-GCM prima di finire nel database. La chiave sta nelle variabili
  d'ambiente del server e non nel codice.
- **Mai nel browser.** Lo scambio del codice per i token avviene interamente
  sul server. Al browser non arriva mai un token.
- **Rinnovo automatico, non revoca.** Un refresh token permette di rinnovare
  l'access token quando scade (circa un'ora) senza chiedere nulla all'utente.
  Non è un accesso che si auto-espande: gli scope restano quelli originariamente
  concessi e sono revocabili in un click.
- **Isolamento per account.** Una riga di connessione per utente. Un utente non
  può leggere le email di un altro, nemmeno via gli agenti.
- **Dipendenza da terzi.** Nessun dato dell'utente viene inviato a provider
  LLM per addestramento.

---

## 7. Se qualcosa non funziona durante la verifica

| Sintomo | Causa probabile | Rimedio |
|---|---|---|
| Dopo il consenso torna a Impostazioni ma la card resta «Non connesso» | Popup/redirect bloccato dal browser | Consentire i redirect da `accounts.google.com` |
| «Il consenso non compare» | Account non loggato su Google | Il flusso porta al login di Google, poi al consenso |
| `redirect_uri_mismatch` | Redirect URI non registrato | Deve essere `https://agentcloud.agency/api/auth/google/callback` |
| Manca Gmail o Calendar | È già collegata: la card mostra «Connesso» | Usare **Disconnetti** prima di ricollegare |

> Nota sui redirect URI: Gmail e Calendar usano `/api/auth/google/callback`.
> Google Sheets e Google Drive sono provider separati con callback propri
> (`/api/integrations/google_sheets/callback` e
> `/api/integrations/google_drive/callback`), entrambi da registrare in Google
> Cloud se quei connettori vengono abilitati. Per la verifica della sola
> Gmail/Calendar basta il primo.

Per qualsiasi altro problema scrivere a **support@agentcloud.agency** indicando
l'ora, l'account di test (mascherato) e il messaggio esatto.

---

## 8. Contatti

- Email: **support@agentcloud.agency**
- Sito: **https://agentcloud.agency**
- Informativa privacy: **https://agentcloud.agency/privacy**
- Termini di servizio: **https://agentcloud.agency/terms**