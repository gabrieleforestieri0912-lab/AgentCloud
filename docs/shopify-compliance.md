# Conformità Shopify — privacy webhooks

Endpoint, cosa conserviamo, configurazione nel Partner Dashboard e come
verificarli. Riferimento per l'App Store review e per le richieste GDPR che un
merchant può inviare.

---

## 1. Endpoint da registrare

Un solo URL per i tre topic di conformità: Shopify manda `X-Shopify-Topic` e
l'endpoint smista.

| Scopo | URL |
|---|---|
| **Privacy webhooks (da registrare)** | `https://www.agentcloud.agency/api/webhooks/shopify/compliance` |
| Disinstallazione app | `https://www.agentcloud.agency/api/webhooks/shopify/app-uninstalled` |

La casella del Partner Dashboard per i webhook obbligatori è quella della
conformità: **un URL**, che riceve `customers/data_request`, `customers/redact`
e `shop/redact`.

> `/api/shopify/webhooks` esiste ancora ed è deprecato. Non registrarlo: non
> fa più niente di diverso, ma è un doppione che confonde chi configura.

---

## 2. Come funziona la verifica

Ogni richiesta, in quest'ordine:

1. `SHOPIFY_API_SECRET` assente → **500** (è un problema di configurazione).
2. `await req.text()` sul **corpo grezzo**. Mai `req.json()` prima della firma:
   ri-serializzare cambierebbe i byte e la firma non corrisponderebbe più.
3. HMAC-SHA256 in base64 sul corpo grezzo, confrontato con
   `X-Shopify-Hmac-Sha256` via `timingSafeEqual`, dopo il controllo di
   lunghezza (senza, `timingSafeEqual` lancerebbe). Firma assente o diversa →
   **401**, senza eseguire nulla.
4. Solo dopo, il topic viene instradato.

Il middleware (`src/proxy.ts`) non consuma il body, e
`/api/webhooks/shopify` è in `PUBLIC_PATHS`, quindi Shopify raggiunge la route
senza sessione. Senza quella voce l'endpoint risponderebbe 401 a ogni
chiamata di Shopify.

Contratto di risposta:

| Situazione | Risposta |
|---|---|
| Firma mancante o errata | `401` |
| Topic non previsto dalla route | `400` |
| `shop_domain` assente | `400` |
| Retry già visto (stesso `X-Shopify-Webhook-Id`) | `200 duplicate` |
| Elaborazione riuscita | `200` |
| Elaborazione fallita | `500` → Shopify ritenta |

Il 500 sull'errore è deliberato: dichiarare `200` su una cancellazione fallita
sarebbe una dichiarazione falsa di conformità.

Nei log finiscono solo topic, `shop_domain` ed esito. **Il payload non viene
mai stampato**: contiene nome, email e telefono del cliente del negozio.

---

## 3. Cosa conserviamo, per negozio

| Tabella | Contenuto | È dato personale? |
|---|---|---|
| `shopify_connections` | `shop_domain`, access token cifrato, scope | No |
| `shopify_compliance_events` | `webhook_id`, `shop_domain`, topic, esito, data | No |

**Nient'altro.** Non esiste alcuna tabella con dati di prodotti, ordini o
clienti del negozio.

Perché è così, verificato nel codice:

- `conversation_messages` esiste nello schema ma **nessuna riga di codice la
  scrive**. I messaggi di chat stanno nel `localStorage` del browser
  (`src/components/ChatInterface.tsx`).
- `agent_runs` salva solo contatori: `input_tokens`, `output_tokens`,
  `tool_calls`. Mai il contenuto.
- I tool Shopify (`src/lib/agents/tools.ts`) non fanno caching: leggono dalla
  Admin API e restituiscono il risultato al modello, senza scriverlo.

---

## 4. Cosa fanno i tre handler

### `customers/data_request`
Il merchant chiede i dati del cliente che abbiamo. Non ne abbiamo, quindi
l'esito è "nulla trovato" e si risponde `200` senza toccare dati.

L'handler **non riceve e non conserva** l'oggetto `customer` della richiesta,
che porta email e telefono: non serve a nulla e conservarlo creerebbe proprio
la PII che il webhook serve a evitare.

### `customers/redact`
Idem: nulla da cancellare lato server.

**Limite reale, dichiarato.** La chat in cui un agente ha mostrato i dati di un
cliente vive nel browser di chi l'ha scritta. Il server non può raggiungerlo, e
non potrebbe comunque dopo che l'utente ha disinstallato. La rimozione dal
lato utente spetta al merchant, che conosce i propri operatori.

### `shop/redact`
Elimina **definitivamente** le righe `shopify_connections` del negozio, cioè i
token. È l'unico dato che valeva la pena di cancellare.

Elimina anche le righe di audit precedenti dello stesso negozio, **tranne
l'evento in corso**, che resta come ricevuta: senza una traccia che dimostri
di aver onorato la richiesta, un revisore non ha modo di verificare nulla, e
quella riga non contiene dati di nessun cliente.

Shopify invia `shop/redact` **~48 ore dopo la disinstallazione**, non subito.
Nel frattempo `app/uninstalled` ha già reso il token inutilizzabile
(`uninstalled_at`).

---

## 5. Da dichiarare a Shopify: la trasmissione, non la conservazione

Non conserviamo dati di clienti, **ma li trasmettiamo**. Quando
`shopify_list_customers` viene eseguito, il risultato (nome, cognome, email)
entra nel prompt inviato al provider LLM che risponde all'utente durante il
run.

Non viene persistito da noi, ma è **divulgato a un subprocessor**. Questo va
detto in due posti:

1. **Informativa privacy** — va aggiunto l'elenco dei subprocessor LLM usati
   (provider e ruolo). È un lavoro sui testi legali in
   `src/lib/i18n/legal.ts`, non su questo codice.
2. **Nella risposta al Trust & Safety di Shopify**, se chiedono la
  Disclosure of Data Sharing: agenti che leggono i dati del negozio inviano
   quei dati al provider LLM per generare la risposta.

Da valutare separatamente, se un domani i dati dei clienti diventassero
sensibili: gli strumenti Shopify con PII sono `shopify_list_customers` e
`shopify_get_order_status` (restituiscono dati di fatturazione). Si possono
disattivare da `ALL_TOOLS_LIST` in `src/lib/agents/feature-flags.ts`.

---

## 6. ⚠️ Schema da applicare

`supabase/schema-shopify-compliance.sql` crea `shopify_compliance_events`.

**Va applicato al database.** Il file era già nel repository ma non era mai
stato eseguito: durante la verifica un `shop/redact` ha risposto `500` con
*"Could not find the table 'public.shopify_compliance_events' in the schema
cache"*. Con la tabella assente il webhook di cancellazione falliva e i dati
del negozio restavano al loro posto — il difetto peggiore possibile in un
obbligo GDPR.

Applica con:

```bash
supabase db push
```

oppure incollando il file nel **SQL Editor** del progetto su Supabase.

Verifica che sia applicata:

```sql
select to_regclass('public.shopify_compliance_events');
-- deve restituire la tabella, non NULL
```

> `supabase/migrations/` è in `.gitignore`: il DDL vive nei file
> `schema-*.sql`, che è la convenzione del repository. Se usi `supabase db
> push`, la cartella `migrations/` deve essere presente in locale ma non è
> tracciata.

Nel frattempo il codice regge: la pulizia dell'audit è best-effort, quindi
l'assenza della tabella non impedisce più la cancellazione dei token. Ma senza
la tabella non ci sono né audit né idempotenza, e il reviewer può chiederne
conto.

---

## 7. Come verificare

### Con `shopify app webhook trigger`

Non è disponibile: il progetto **non usa Shopify CLI** (nessun
`shopify.app.toml`, nessuna dipendenza `@shopify/cli`). Il comando assume una
app gestita da CLI.

Le alternative che restano sono il pannello di Shopify o una POST firmata a
mano.

### Con curl, firma valida

```bash
BODY='{"shop_domain":"tuo-shop.myshopify.com","customer":{"id":1,"email":"c@example.com"},"orders_requested":[]}'

SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SHOPIFY_API_SECRET" -binary | base64)

curl -i -X POST https://www.agentcloud.agency/api/webhooks/shopify/compliance \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: shop/redact" \
  -H "X-Shopify-Shop-Domain: tuo-shop.myshopify.com" \
  -H "X-Shopify-Webhook-Id: test-manuale-1" \
  -H "X-Shopify-Hmac-Sha256: $SIG" \
  -d "$BODY"
```

Risposta attesa: `200 {"received":true}`.

Cambia `X-Shopify-Topic` in `customers/data_request` o `customers/redact` per
provare gli altri due.

### Con curl, firma errata

```bash
curl -i -X POST https://www.agentcloud.agency/api/webhooks/shopify/compliance \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: shop/redact" \
  -H "X-Shopify-Hmac-Sha256: AAAAAAAAAAAAAAAAAAAAAAAAAAA=" \
  -d '{"shop_domain":"tuo-shop.myshopify.com"}'
```

Risposta attesa: `401 {"error":"invalid signature"}`.

Attenzione: `printf '%s'` senza il `-n` finale aggiunge un newline che non
farebbe parte del body reale, e la firma non corrisponderebbe.

---

## 8. Variabili d'ambiente

| Variabile | Serve | Stato |
|---|---|---|
| `SHOPIFY_API_SECRET` | **Sì.** Firma degli webhook e verifica HMAC | Già impostata |
| `SHOPIFY_API_KEY` | Installazione OAuth | Già impostata |
| `SHOPIFY_TOKEN_ENCRYPTION_KEY` | Cifratura dei token a riposo | Già impostata |
| `SHOPIFY_REDIRECT_URI` | Callback OAuth | Già impostata |
| `SHOPIFY_SCOPES` | Scope richiesti all'installazione | Già impostata |

Nessuna variabile nuova per i privacy webhooks: la firma usa
`SHOPIFY_API_SECRET`, lo stesso del resto.

---

## 9. Checklist Partner Dashboard

- [ ] **App settings → Webhooks → Privacy webhooks** (o "Customer data
      privacy") → URL unico:
      `https://www.agentcloud.agency/api/webhooks/shopify/compliance`
- [ ] **App/uninstalled** →
      `https://www.agentcloud.agency/api/webhooks/shopify/app-uninstalled`
- [ ] Verificare che il secret sia lo stesso dell'app (è il client secret
      dell'app, non la chiave API pubblica)
- [ ] Applicare la migration del §6
- [ ] Aggiungere i subprocessor LLM all'informativa privacy
- [ ] Rispondere al Trust & Safety dichiarando la trasmissione ai provider LLM
- [ ] Provare la firma con i comandi del §7 e allegare l'esito

Se il pannello chiede **tre URL separati** invece di uno, usa lo stesso
endpoint tre volte: lo smistamento avviene su `X-Shopify-Topic`, quindi
funziona in entrambi i casi.