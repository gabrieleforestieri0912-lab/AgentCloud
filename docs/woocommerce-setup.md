# Collegare WooCommerce — passo passo

WooCommerce **non funziona come le altre integrazioni**. Questa pagina spiega
perché e cosa fare. Se ti sei fermato cercando un campo dove incollare una
"API key", è normale: quel campo non esiste e non deve esistere.

---

## 1. Perché è diverso dalle altre integrazioni

| | Gmail, Slack, Notion, HubSpot… | **WooCommerce** |
|---|---|---|
| Come si autorizza | Schermata OAuth del provider | Schermata di WooCommerce **sul tuo negozio** |
| Le credenziali | Google/Notion le emettono e le danno in cambio di un codice | **WooCommerce le genera da solo** quando approvi |
| Arrivano con | Redirect del browser + scambio di un codice | Una **POST dal server di WooCommerce** al nostro server |
| Dove finiscono | Nel nostro database cifrate | Nel nostro database cifrate |

In pratica: con Gmail tu autorizzi su `accounts.google.com` e noi riceviamo un
codice da scambiare. Con WooCommerce **tu non vedi e non digiti nessuna
chiave**: autorizzi sul tuo WordPress, e il tuo WordPress manda le credenziali
a noi direttamente.

Non c'è nessuna chiave da incollare da nessuna parte, né nessuna variabile
d'ambiente `WOOCOMMERCE_*` da compilare.

---

## 2. Prima di iniziare: 3 requisiti

Se uno solo manca, il collegamento **non parte** e non viene nessun errore
chiaro. Verificali tutti e tre.

### a) I permalink non devono essere su "Semplice"

**Impostazioni → Permaletti** → scegli **"Nome articolo"** (o qualsiasi
opzione diversa da "Semplice") e salva.

Il motivo: l'endpoint di autorizzazione di WooCommerce è una *rewrite rule* di
WordPress, non un indirizzo REST. Con i permalink semplici quell'indirizzo non
esiste e WooCommerce risponde 404 senza mostrare nulla.

> Questo è il motivo più comune di un collegamento che "non parte".

### b) Serve un utente con permessi di gestione del negozio

Chi approva deve essere **Amministratore** o **Manager** del negozio
(in inglese *Administrator* / *Shop Manager*). Con un ruolo inferiore
WooCommerce risponde "non hai i permessi" e non mostra la schermata.

Verificalo qui: **wp-admin → Utenti → Tutti gli utenti**, passa il mouse su
"Modifica" e controlla che sotto "Ruolo" ci sia *Administrator* o *Shop Manager*.

### c) Il negozio deve essere raggiungibile da internet

Il dominio deve risolvere via DNS a un **indirizzo IP pubblico**. Non
funzionano: `localhost`, `127.0.0.1`, IP privati, o un store raggiungibile solo
in rete locale. È un controllo di sicurezza (SSRF) e per questo rifiuta
volontariamente quegli indirizzi.

Se il tuo store è visibile dal browser, il punto è già soddisfatto.

---

## 3. Collegamento, passo passo

### Passo 1 — Accedi

Vai su **https://www.agentcloud.agency/login** e accedi al tuo account
AgentCloud.

### Passo 2 — Apri le integrazioni

**Dashboard → Integrazioni**
(indirizzo diretto: `https://www.agentcloud.agency/dashboard/integrations`)

### Passo 3 — Trova WooCommerce

Nella sezione **E-commerce** trovi la card **WooCommerce**. In alto vedrai i
3 passi e sotto il modulo di collegamento.

### Passo 4 — Incolla l'indirizzo del tuo store

Nel campo **"URL del tuo store WooCommerce"** scrivi **solo il dominio**:

```
https://tuo-store.com
```

Corretto. Non scrivere:
- `https://tuo-store.com/wp-admin` → sbagliato
- `https://tuo-store.com/wp-json/wc/v3` → sbagliato
- `http://` invece di `https://` → rifiutato, deve essere HTTPS

Premi **Collega in 3 minuti**.

### Passo 5 — Approva su WooCommerce

Verrai portato sul **tuo** store, su una schermata che dice:

> **AgentCloud would like to connect to your store**
>
> This will give "AgentCloud" **Read** access which will allow it to:
> - *(l'elenco dei permessi di lettura)*
>
> Approving will share credentials with **www.agentcloud.agency**. Do not
> proceed if this looks suspicious in any way.

Sotto trovi l'utente con cui sei loggato e due pulsanti: **Approve** e **Deny**.

> La schermata è in inglese: dipende dalla lingua del tuo WordPress, non da un
> errore. Il punto da controllare è che dentro le virgolette compaia
> **AgentCloud** e che in grassetto sotto compaia **www.agentcloud.agency**:
> quello è il nostro dominio, ed è l'unico a cui mandi le credenziali.

Premi **Approve**.

Hai premuto **Deny**? Non è un errore: torna in dashboard con
*"Errore: denied"* e puoi riprovare.

### Passo 6 — Torna in dashboard

Vieni riportato su **Dashboard → Integrazioni** con uno di questi tre stati:

| Stato nella card | Significato |
|---|---|
| 🟢 **Connesso** | Tutto pronto. |
| 🟡 **Approvazione ricevuta** | Hai approvato, ma i dati non sono ancora arrivati. **Ricarica la pagina** dopo qualche secondo. |
| 🔴 **Errore** | Qualcosa non ha funzionato: vedi la tabella al §5. |

Lo stato giallo è normale per un secondo o due: le credenziali viaggiano in
una richiesta separata rispetto a quella che ti riporta in dashboard, e se
arrivano dopo il ritorno te lo diciamo invece di farti credere che sia tutto
pronto.

---

## 4. Verifica che funzioni davvero

La card **Connesso** significa solo che le credenziali sono arrivate. Per
verificare che l'agente le usi correttamente, prova in chat:

- **"Quali sono gli ordini in lavorazione?"**
- **"Elenca i prodotti esauriti"**
- **"Quanti clienti ha il negozio?"**

Se l'agente risponde con i dati del tuo store, il collegamento è a completo.

Se risponde *"No WooCommerce account connected"*, la riga non è stata scritta:
torna in dashboard e ricollega.

### Cosa può fare l'agente

Solo **lettura**, e su questo non c'è differenza rispetto a prima:

- leggere l'elenco dei prodotti e il dettaglio di un singolo prodotto
- leggere gli ordini e il dettaglio di un singolo ordine
- leggere un cliente per email o id

**Non** modifica giacenze, **non** cambia lo stato di un ordine, **non**
scrive niente sul tuo store. Le credenziali sono richieste con permesso
`read` e questo è dichiarato nella schermata di autorizzazione.

---

## 5. Se qualcosa non funziona

| Cosa vedi | Causa | Cosa fare |
|---|---|---|
| **Non compare nessuna schermata su WooCommerce** | Permaletti su "Semplice" | §2a — cambia i permaletti |
| **"You do not have permission to access this page" / 401** | Ruolo non sufficiente | §2b — approva con un Amministratore |
| **404** | Permaletti semplici, oppure store non raggiungibile | §2a |
| **"Indirizzo non ammesso"** | Il dominio non risolve a un IP pubblico | Usa il dominio vero, non un IP di rete locale |
| **"The URL must use https"** | Hai scritto `http://` | Rimetti `https://` |
| **"Il User ID deve essere un numero"** / campi extra richiesti | Stai usando una versione precedente del form | Aggiorna la pagina: il campo WordPress User ID non serve più e non va compilato |
| **Errore: denied** | Hai premuto Deny | Ripeti da capo e Approva |
| **Resta su "Approvazione ricevuta"** | La POST col credenziali non è arrivata | Ricarica. Se persiste, controlla che il tuo server raggiunga `https://www.agentcloud.agency` in uscita (firewall/proxy). Poi ricollega. |
| **"Errore: invalid_or_expired_token"** | Il giro è stato lasciato apertoo troppo | Il token vale 10 minuti: ricomincia dal Passo 4 |

---

## 6. Come staccare e ricollegare

**Per staccare:** nella card WooCommerce, **Disconnetti**. Le credenziali
vengono eliminate dal database.

**Per ricollegare:** Connetti di nuovo. WooCommerce mostra di nuovo la
schermata di autorizzazione e Approva come la prima volta.

Le credenziali API di WooCommerce **non scadono** per impostazione predefinita:
una volta collegato, il collegamento resta attivo finché non lo stacchi tu.

> Se prima hai generato chiavi API a mano in wp-admin → WooCommerce →
> Impostazioni → Avanzate → REST API, sono inutili per AgentCloud e puoi
> cancellarle: AgentCloud usa le chiavi che genera l'approvazione.

---

## 7. Come trattiamo le credenziali

- **Non le vediamo mai.** Vengono inviate dal tuo server a ours e cifrate
  subito con AES-256-GCM. Non finiscono nel browser, nei log, né nell'URL.
- **Restano cifrate** nel database (`tenant_integrations`).
- **Servono solo come Basic auth** per chiamare l'API REST v3 del tuo store
  (`https://tuo-store.com/wp-json/wc/v3`).
- **Valgono per il tuo account.** Ogni utente AgentCloud ha la sua riga: non si
  vedono le credenziali di un altro account.

---

## 8. Nota tecnica

WooCommerce non è OAuth e non ha un `state`. Per questo l'implementazione
(`src/lib/integrations/providers/woocommerce.ts`) fa tre cose che nessun altro
connettore fa:

1. costruisce `https://<store>/wc-auth/v1/authorize` — la *rewrite rule*, non
   `/wp-json/...`;
2. manda i cinque parametri che WooCommerce pretende (`app_name`, `user_id`,
   `return_url`, `callback_url`, `scope`), con il token firmato dentro le due
   URL al posto del `state`;
3. espone una **POST** su `/api/integrations/woocommerce/callback`, perché è lì
   che WooCommerce consegna le credenziali.

I dettagli sono in `docs/integrations-setup.md` § WooCommerce.