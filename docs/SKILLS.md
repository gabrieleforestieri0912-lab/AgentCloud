# Skills & Plugin (Competenze)

Sistema di **Competenze** per gli agenti AgentCloud, sul modello di Claude Skills:
una **Skill** è una cartella di istruzioni riutilizzabili che insegna a un agente
come svolgere bene un tipo di lavoro; un **Plugin** è un pacchetto tematico che
raggruppa più skill + integrazioni richieste + agenti consigliati.

Vetrina pubblica: `/skills` (catalogo) e `/skills/[plugin]` (dettaglio).
Guida utente: `/docs/skills` ("Crea la tua competenza in 10 minuti").

## Stato di implementazione

| Voce | Stato |
|---|---|
| DB (`supabase/schema-skills.sql`) | 7 tabelle, RLS per account |
| Seed (`supabase/seed-skills.sql`) | generato da `npm run seed:skills`, 13 plugin / 60 skill |
| Catalogo (`src/lib/skills/catalog.ts`) | fonte dei dati per la UI, con fallback se il DB non è migrato |
| API lettura | `GET /api/plugins`, `/api/plugins/:slug`, `/api/skills`, `/api/skills/:slug`, `/api/agents/:id/recommended-plugins` |
| Download | `GET /api/plugins/:slug/download`, `/api/skills/:slug/download` (zip + checksum SHA-256) |
| Installazione | `POST/PATCH/DELETE /api/agents/:id/skills` (dietro sessione, accetta `skill_id` o `skill_slug`) |
| Upload | `POST /api/skills/upload` (validazione server-side, skill private) |
| Tab agente | `/agents/[slug]`, tab Panoramica/Competenze con install/toggle |
| Dashboard | sezione "Competenze installate" (stato, ultimo uso, attivazioni, successo) |
| Runtime | progressive disclosure nel system prompt + log `skill_runs` |
| Test | `npm run test:skills` (62 test), `npm run test:skills-parity` (8 test) |

## Architettura

### Doppia fonte dati, una sola verità

Il catalogo TypeScript (`src/lib/skills/catalog.ts`) è la fonte dei dati per la
UI. `src/lib/skills/data.ts` prova prima Supabase e ricade sul catalogo statico
quando le tabelle non esistono ancora (l'istanza prod remota non le ha: il token
CLI salvato non aveva i privilegi per il push). Quando il DB è migrato, il merge
aggiorna i metadati dal DB ma conserva relazioni e contenuti dal catalogo.

Il seed SQL non si scrive a mano: il file è generato dal catalogo TypeScript e
va rigenerato a ogni modifica di `src/lib/skills/catalog.ts`. Modificandolo a
mano si reintroducono slug che nessuna pagina può linkare (è successo: il seed
conteneva `quotes-estimates` invece di `quote-agent` e 10 skill mancanti).
Ricontrollare a mano la sintassi: `ON CONFLICT` non può comparire due volte
nella stessa istruzione e i vincoli citati devono esistere.

Validazione eseguita: schema + seed sono stati eseguiti davvero su Postgres
(PGlite, con stub minimi di `auth.uid()`/`auth.users` che su Supabase reale
esistono già). Risultato: 13 plugin, 60 skill, 60 link plugin-skill, 49 agenti,
95 integrazioni; seconda esecuzione senza errori né duplicati; RLS attiva su
tutte le tabelle; nessuna skill orfana.

### Formato Skill (obbligatorio)

```
nome-skill/
├── SKILL.md        obbligatorio, < 500 righe
├── references/     opzionale
├── templates/      opzionale
├── scripts/       opzionale (solo calcoli locali, niente link esterni)
└── examples/      opzionale
```

`SKILL.md` ha frontmatter YAML (`name` kebab-case, `description` con trigger,
`version`, `locale`, `agents`, `integrations_required/optional`, `permissions`,
`risk_level: low|medium|high`). La validazione è in `src/lib/skills/validate.ts`
(modulo puro, testato): dimensioni, frontmatter, oltre-500-righe, chiavi API e
token, link abbreviati, path traversal, estensioni, script pericolosi.

### Runtime (progressive disclosure)

1. L'agente riceve nel system prompt solo l'**indice**: nome + descrizione +
   rischio di ogni skill abilitata (`buildSkillIndex`).
2. Se la richiesta corrisponde a una description, il corpo della SKILL.md entra
   nel contesto **come messaggio utente** (non nel system prompt: l'utente
   attiva la skill ma non può sovrascriverla), max 3 skill per turno.
3. Una skill non amplia mai i permessi: i permessi richiesti vengono intersecati
   con quelli derivati dai tool abilitati; se manca qualcosa la skill è marcata
   `degraded` (fa il possibile, dichiara il resto).
4. `risk_level: high` (invio a terzi, pubblicazioni, pagamenti, cancellazioni)
   richiede approvazione esplicita — il pattern "pubblica su approvazione" già
   usato per i tool (`toolRequiresConfirmation`).
5. Ogni attivazione viene loggata in `skill_runs` (visibile in dashboard).

### Privacy e sicurezza

- Skill utente (`owner: "user"`) salvate sempre con `account_id` della sessione,
  mai dai valori del frontmatter. RLS per `account_id` su `installed_skills` e
  `skill_runs`; lettura pubblica solo per `official`/`community`.
- Le API di lettura e download sono pubbliche (`src/lib/public-paths.ts`);
  installazione, toggle e upload richiedono sessione.
- Limiti piano: free = 5 messaggi/giorno per agente, anche con skill.
- Rate limit sui download via `Cache-Control` + CDN; checksum SHA-256 nell'header
  `X-Content-SHA256` di ogni zip.

## Politica prezzi: le due alternative

Il prompt di prodotto chiedeva di decidere la politica e proporre 2 alternative.
Implementato: `price_tier` su ogni plugin (`free | included | addon`), con la
sezione "Cosa costa" sulla pagina di dettaglio. Oggi tutti i 13 plugin ufficiali
sono `included`.

### Alternativa A (implementata, consigliata): ufficiali incluse + premium come add-on

- **Skill ufficiali incluse nel prezzo dell'agente.** Installi, disinstalli e
  scarichi liberamente, nessun canone aggiuntivo.
- **Plugin premium (add-on).** Un plugin marcato `addon` è attivabile sul singolo
  agente con un pagamento una tantum (o un canone mensile, da definire in
  `docs/PRICING.md`): le competenze contenute restano attive finché l'add-on è
  attivo. La UI lo evidenzia con il riquadro dedicato.
- **Skill dell'utente sempre gratis e private**, anche con un plugin premium attivo.

Perché questa: per una PMI il prezzo deve essere prevedibile (abbonamento
agente), e l'add-on copre solo i plugin con costo reale sottostante (es. analisi
avanzate con modelli costosi). Coerente con l'add-on Web Search esistente.

### Alternativa B (scarto): tutto incluso, nessun add-on

- Ogni plugin ufficiale è incluso nel prezzo dell'agente, senza eccezioni.
- I costi dei plugin "pesanti" vengono assorbiti nel canone o nei limiti token.

Perché scartata: un plugin che costa di più da eseguire (es. ricerca continua,
analisi documentali massicce) alza il prezzo per tutti o erode il margine. Con
l'alternativa A il costo segue l'uso reale.

Se in futuro si sceglie B, basta non marcare mai un plugin come `addon`: nessun
cambio di codice richiesto.

## Analytics prodotto

- `downloads` su `skills` e `plugins` (funzioni `increment_*_downloads` SECURITY
  DEFINER già nello schema).
- `skill_runs` per attivazioni, esito e token (aggregato in dashboard).
- Contatori coerenti: 15 agenti live + 7 in arrivo, 17 integrazioni live
  (derivati dai cataloghi esistenti, non hardcodati).

## Domande aperte (non bloccanti)

1. **Applicazione della migration**: le tabelle `skills`/`plugins` non esistono
   ancora sul DB remoto. Chi la applica? (`supabase db push` + `npm run seed:skills`
   come contenuto, oppure `psql -f supabase/schema-skills.sql -f supabase/seed-skills.sql`).
2. **Prezzo dell'add-on premium**: canone mensile o una tantum? Vedi Alternativa A.
3. Integrazione "Avvisami" oggi è solo un toggle locale: collegarla a una coda
   notifiche reale quando la prima integrazione "in arrivo" va live?
