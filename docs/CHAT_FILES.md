# File generati dalla chat (card + anteprima laterale)

I contenuti lunghi non finiscono più dentro la bolla: il modello scrive una
introduzione di 1-3 frasi e in fondo al messaggio compare una **card file** con
nome, tipo e download. Il click sulla card apre un **pannello di anteprima** a
destra, dove il contenuto si legge, si copia, si esporta e si scarica.
Comportamento ispirato a Claude.

## 1. Formato: blocco strutturato, non tool call

Scelta: **blocco `<agentcloud_file>` dentro il testo**, non tool call.

| | tool call `create_file` | blocco nel testo (scelto) |
|---|---|---|
| Streaming | va serializzata con il testo | il blocco arriva token per token |
| Server | deve essere emesso dai provider | nessun vincolo sui provider |
| UI | evento SSE dedicato + stato | il parser basta |
| Contenuto lungo | dentro i tool args | nel testo del modello, tokenizzato |

Con un tool call il file non può iniziare a disegnarsi prima della fine della
generazione, e andrebbe implementato per ogni provider. Il blocco nel testo
funziona con lo streaming che esiste già (`/api/chat` e `/api/agent/run`
inviano `text` + `done`), senza toccare le route.

```
<agentcloud_file id="report-q3" name="report-q3.md" type="markdown" title="Report Q3">
...contenuto completo...
</agentcloud_file>
```

`id` è lo slug stabile: se il modello lo riusa, il file viene **aggiornato**
come nuova versione, non duplicato.

## 2. Parser stream-safe

`src/lib/chat-files.ts` → `parseChatFiles(raw)` va chiamato a ogni token e
restituisce `{ text, files }`:

- il testo della bolla **non contiene mai** `<agentcloud_file>`;
- un blocco senza chiusura è `status: "streaming"` e cresce a ogni token;
- un tag di apertura appena iniziato (`<agentcloud_`) viene già nascosto dalla
  bolla: l'utente non vede mai metà tag;
- più file nello stesso messaggio → lista di card.

**Delimitatore robusto**: il contenuto termina al primo `</agentcloud_file>`
non escapato. Se un file deve contenere il tag (documentazione sul formato), il
modello scrive `&lt;/agentcloud_file&gt;` e il parser lo riporta al testo reale
in anteprima e download.

**Oltre 2 MB** il file viene troncato e la card passa a `incomplete` con
"Riprova": niente file da 10 MB in localStorage.

## 3. Persistenza

Due livelli, di proposito:

1. **nel messaggio** (`LocalMessage.files`, in localStorage) — è la fonte per
   la UI: ricaricando la chat la card e l'anteprima ci sono anche senza DB;
2. **nel DB** — `POST /api/chat/files` con debounce e firma del contenuto, così
   versioni, dashboard ed export dati funzionano anche su un altro dispositivo.

Il DB non è un requisito per la funzionalità: se la tabella non è migrata,
`GET` risponde `{ files: [] }` e la chat continua a funzionare.

Schema (`supabase/migrations/20260101000002_chat_files.sql`):

```
chat_files(id, conversation_id, message_id, account_id, slug, name, type,
           language, title, size_bytes, current_version, agent_slug,
           deleted_at, created_at, updated_at)
chat_file_versions(id, file_id, version, content, created_by[ai|user], created_at)
```

- RLS: `chat_files` filtrato su `auth.uid() = account_id`;
- `chat_file_versions` passa dal file padre (subquery sull'`account_id`);
- `ON DELETE CASCADE` da `auth.users`: cancellare l'account porta via anche le
  versioni (GDPR);
- `UNIQUE (account_id, conversation_id, slug)` → lo stesso slug non può diventare
  due file diversi;
- **versione nuova solo se il contenuto è cambiato**: il rinvio durante lo
  streaming non crea 200 versioni identiche.

API: `GET /api/chat/files` (elenco, filtro `?agent=`), `POST` (upsert con
versione), `DELETE ?slug=` (soft delete).

## 4. Componenti

- `src/components/FileCard.tsx` — card in fondo al messaggio (max 480px).
  Click apre il pannello, "Scarica" scarica senza aprire (`stopPropagation`).
  Stati: in creazione (spinner), pronta, incompleta/errore, aggiornata. Card
  focusabile, Invio/Spazio aprono.
- `src/components/PreviewPanel.tsx` — pannello: desktop colonna a destra
  ridimensionabile (min 360px, max 70% viewport, larghezza ricordata in
  localStorage, animazione 200ms che rispetta `prefers-reduced-motion`); sotto
  `lg` pannello a tutta schermata con "Indietro". Esc chiude.
- `src/components/GeneratedFilesPanel.tsx` — "File generati" in dashboard:
  elenco filtrabile per data (7/30/tutti) e per agente, con anteprima e
  download.
- `src/lib/chat-files-client.ts` — download via Blob con MIME corretto e copia
  con fallback `execCommand` per contesti non sicuri.

## 5. Renderer per tipo

| Tipo | Anteprima | Tab Codice |
|---|---|---|
| `markdown` | `MarkdownText` (parser di progetto, non esegue HTML) | sì, highlight |
| `html` | `<iframe srcDoc sandbox="allow-scripts">` + CSP iniettata | sì |
| `code` | highlight, numeri di riga, a capo opzionale | — |
| `csv` | tabella ordinabile, header sticky, scroll interno | sì |
| `svg` | markup sanitizzato in allowlist | sì |
| `text` | `pre` con a capo | — |

**Sicurezza**:

- HTML in `srcdoc` con `sandbox="allow-scripts"` **senza `allow-same-origin`** →
  origine opaca: nessun accesso a cookie, storage o sessione di AgentCloud. La
  CSP (`default-src 'none'`) aggiunta a `<head>` tiene il resto.
- SVG: sanitizzatore **puro** (no DOM, quindi testabile in Node) in allowlist di
  tag e attributi; via tutti `on*`, `<script>`, `<foreignObject>`, `<iframe>`,
  `<style>` e `href` `javascript:` / `data:text/html`.
- Markdown: il parser di progetto non ha un ramo HTML, quindi nessuno script
  riesce a finire nel DOM della chat.
- Nome file normalizzato: kebab-case, path traversal eliminato, niente caratteri
  speciali.

## 6. Versioni

`mergeFileRecords` in `src/lib/chat-files.ts`: stesso slug + contenuto diverso
→ nuova versione e flag `updated`; stesso contenuto → nessuna versione nuova.
La card mostra il badge `v2` e "Aggiornato · v2", il pannello ha il selettore di
versione e le versioni vecchie restano scaricabili.

## 7. Prompt

`FILE_HANDLING_DIRECTIVE` in `src/lib/agents/system-prompt.ts`, inserita in
`sharedAgentDirectives()`: copre sia `/api/agent/run` sia i due rami di
`/api/chat` (con e senza agente). Contiene le regole di quando creare il file,
il formato del blocco, il divieto di duplicare il contenuto in chat, il riuso
dell'`id` e i 4 esempi richiesti (articolo SEO, script Python breve → no file,
landing page HTML, "rendilo più breve" → stessa id).

## 8. Test

`npm run test:chat-files` — 110 asserzioni su: parser completo, streaming
token-per-token, stream interrotto, più file, chiusura escapata, path
traversal, MIME, limite 2 MB, versioni, XSS (HTML/SVG), CSV, export, e
coerenza fra blocco emesso e record mostrato.

## 9. Assunzioni fatte

1. **Nessun id conversazione lato client**: le conversazioni vivono in
   localStorage (`agentcloud_chat_history_v2`), quindi `conversation_id` viene
   inviato solo se è un UUID valido. I file restano comunque correlati al
   messaggio via `slug` + `message_id`.
2. **"Salva su Drive / Notion" passa dal tool dell'agente**, non da un upload
   diretto: il click manda un messaggio all'agente. L'opzione compare solo se
   l'integrazione risulta `connected` in `/api/integrations/status`; quelle
   `available: false` non sono proprio nel catalogo (§7 "in arrivo").
3. **Patch parziali**: il prompt permette al modello di risparmiare token, ma il
   formato è "nuova versione completa". Una patch sostituisci-stringa è
   un'estensione naturale di `mergeFileRecords`, non è implementata.
4. **Cancellazione**: `DELETE /api/chat/files` fa soft delete; le versioni
   spariscono con l'account (cascade). La cancellazione di una conversazione
   lato client è solo localStorage e non ha una controparte server: per ora
   non chiama `DELETE`.
5. **Limite piano free**: generare un file è un normale messaggio, quindi
   consuma un messaggio del piano free senza codice aggiuntivo.
6. **Metriche** (§8): non c'è una tabella analytics; il flusso è pronto per
   essere agganciato, ma non ho aggiunto telemetria per non inventare uno schema.