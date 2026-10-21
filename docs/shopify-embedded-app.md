# App Shopify incapsulata — App Bridge e session token

Come è fatta l'app dentro l'amministratore Shopify (l'iframe), perché è
incapsulata, e come verificare i due requisiti che Shopify controlla.

Pezzi coinvolti:

| Dove | Cosa |
|---|---|
| `src/app/layout.tsx` | `<meta name="shopify-api-key">` + `<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js">` |
| `src/app/shopify/page.tsx` | la pagina che Shopify incapsula (`application_url` in `shopify.app.toml`) |
| `src/app/shopify/embedded-app.tsx` | il pannello: chiede il session token e chiama il backend |
| `src/app/api/shopify/session/route.ts` | l'unico endpoint chiamato dal pannello: valida il token e scambia l'access token |
| `src/lib/shopify/session-token.ts` | verifica del JWT (HS256) e token exchange |
| `src/lib/shopify/oauth.ts` | helper OAuth (scope, state, firma del redirect) |
| `shopify.app.toml` | client id, `application_url`, `embedded = true`, scope, webhooks |

---

## 1. App Bridge (script dalla CDN)

Nell'`<head>` della pagina caricata dentro l'iframe, la prima cosa che
aggiungiamo è il meta con il Client ID e lo script ufficiale:

```html
<meta name="shopify-api-key" content="461eff50e7ece493b4ed79762975b42d" />
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
```

Requisiti rispettati:

- dalla **CDN** di Shopify: niente copia in locale, niente pacchetto npm;
- **nessun `async`, `defer` o `type="module"`**: è uno script bloccante, il
  parser si ferma finché non è caricato;
- **nessun attributo aggiuntivo** sul tag (niente `data-nscript`).

### Perché non `next/script` (misurato su Next 16.2.9, build di produzione)

Con `next/script` + `strategy="beforeInteractive"` l'HTML ricevuto dal browser
contiene **solo**:

```html
<link rel="preload" href="https://cdn.shopify.com/shopifycloud/app-bridge.js" as="script" />
```

e **nessun tag `<script>`**: il tag vero viene iniettato dal runtime in fase
di hydration. Un controllo che legge l'HTML (come quello di Shopify) non lo
trova. Con il `<script>` scritto a mano nell'`<head>` del layout l'HTML
contiene davvero:

```html
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js">
```

(un solo script Shopify nella pagina, nessun attributo).

### L'ordine nell'head, onestamente

Nell'HTML i **chunk di Next** (tutti `async`, primo-party) precedono il tag di
App Bridge: il framework li emette prima del contenuto del layout, e questo
non è controllabile dall'App Router. Cosa significa in pratica:

- App Bridge è l'unico script **bloccante** (senza `async`) della pagina e
  l'unico script che viene da `cdn.shopify.com`;
- il pannello non usa `window.shopify` finché non è pronto: aspetta con
  `waitForShopify()` (timeout 8 s) prima di chiedere il session token.

Se il controllo di Shopify pretende che il tag sia il **primo elemento
`<script>`** del DOM, con l'App Router questo non è ottenibile senza
`next/script` (che non emette il tag) o senza riscrivere l'HTML a mano.

### Come verificare

1. Apri l'app dentro l'amministratore Shopify.
2. DevTools → Network → filtra `app-bridge.js`: la richiesta deve arrivare da
   `cdn.shopify.com`.
3. DevTools → Elements → `head`: deve esserci
   `<meta name="shopify-api-key" content="…">` e
   `<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js">`
   (senza `async`/`defer`).

---

## 2. Session token (autenticazione del pannello)

Dentro l'iframe i cookie di terze parti sono bloccati: **niente sessioni, niente
OAuth dentro la pagina**. L'autenticazione è il **session token** che Shopify
firmò col client secret dell'app.

### Frontend

`src/app/shopify/embedded-app.tsx`:

```ts
const bridge = await waitForShopify();          // aspetta window.shopify
const sessionToken = await bridge.idToken();     // JWT di breve durata
const res = await fetch("/api/shopify/session", {
  method: "POST",
  headers: { Authorization: `Bearer ${sessionToken}` },
});
```

(`shopify.idToken()` è l'alternativa esplicita all'header aggiunto
automaticamente da App Bridge alle fetch verso il dominio dell'app: entrambe
sono valide, qui si usa la forma esplicita perché è verificabile dal codice.)

Il pannello **non** accetta nulla dai parametri della URL: `?shop=…` serve solo
per il testo. La verità è nel token firmato.

### Backend

`POST /api/shopify/session` (`src/app/api/shopify/session/route.ts`):

1. legge l'header `Authorization: Bearer …` (se manca → `401 missing_session_token`);
2. verifica il JWT (`src/lib/shopify/session-token.ts`):
   - header `alg` **solo HS256** (`none` e algoritmi asimmetrici rifiutati);
   - firma HMAC-SHA256 con `SHOPIFY_API_SECRET`, confronto a tempo costante;
   - `exp` scaduto → rifiutato; `nbf` nel futuro → rifiutato (tolleranza 60 s);
   - `aud` deve essere **il Client ID dell'app**;
   - `dest` deve essere l'URL del negozio: da lì il dominio, normalizzato e
     obbligato a `*.myshopify.com` (niente open redirect, niente host arbitrari);
   - `iss` (se presente) deve essere `https://<shop>/admin`;
3. scambia il session token in un access token per la Admin API del negozio
   (**token exchange**, `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`).

Il client secret non esce mai dal server. Il token di accesso Shopify non
finisce nel browser: resta lato server (cifrato in `shopify_connections`).

Se un passo fallisce → `401`. Se il token è valido ma l'app non è installata
o lo scambio non riesce → `200` con `connected: false` (il pannello lo dice).

### Installazione gestita (niente OAuth dentro l'iframe)

`shopify.app.toml`:

```toml
embedded = true
application_url = "https://www.agentcloud.agency/shopify"

[access_scopes]
scopes = "read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,read_customers,write_customers,read_content,write_content"
use_legacy_install_flow = false
```

Con `use_legacy_install_flow = false` l'installazione è **gestita da Shopify**:
il merchant autorizza dalla pagina di installazione dell'admin, non dal nostro
iframe. Gli scope richiesti dal flusso OAuth (`DEFAULT_SCOPES` in
`src/lib/shopify/oauth.ts`) **devono coincidere** con quelli del toml: se
differiscono Shopify risponde `invalid_scope` oppure concede meno permessi del
necessario. (Le due liste sono tenute allineate e il confronto è verificato
nei test.)

Il flusso OAuth classico (`/api/shopify/install` → `/api/shopify/callback`)
esiste ancora per collegare un negozio dal **dashboard** del sito, fuori
dall'iframe: lì i cookie del nostro dominio funzionano.

### Come verificare

1. Nell'app dentro l'admin, apri DevTools → Network.
2. La chiamata a `/api/shopify/session` deve avere
   `Authorization: Bearer eyJ…` e rispondere **200** (non 401).
3. Il pannello deve mostrare il negozio verificato (nome, id utente, scope).

---

## 3. Cosa non fare

- **Non** aggiungere `async`/`defer`/`type="module"` allo script di App Bridge.
- **Non** passare a `next/script`: in Next 16 non emette il tag `<script>`.
- **Non** introdurre autenticazione basata su cookie o sessioni dentro
  l'app incapsulata (i cookie di terze parti sono bloccati) e **non** fare
  redirect OAuth dentro l'iframe.
- **Non** cambiare gli scope del toml senza cambiare `DEFAULT_SCOPES` (e
  viceversa).
