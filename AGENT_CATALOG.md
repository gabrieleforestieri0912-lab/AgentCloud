# AgentCloud - Catalogo Agenti per Notion

> Formattato per copia-incolla diretto in Notion

---

## 🛒 E-commerce (Shopify)

### 1. Shopify Commerce Agent

**Prezzo:** €39/mese  
**Categoria:** E-commerce & Finance  
**Descrizione:** Agente specializzato per negozi Shopify che ricerca prodotti, controlla lo stato degli ordini e genera link diretti al carrello.

**Funzionalità principali:**

- Creazione e gestione prodotti (titoli, descrizioni, prezzi, immagini)
- Codici sconto e promozioni per guidare le vendite
- Gestione collezioni e inventario
- Analisi vendite, clienti e ordini (stato pagamento, spedizione, tracking)
- Generazione link carrello diretti
- Guida alla connessione del negozio (OAuth sicuro, niente token da incollare in chat)

**Tools attivi (default):**

- `shopify_search_products` - Cerca prodotti per nome, categoria, tag
- `shopify_get_order_status` - Recupera stato pagamento, spedizione, tracking
- `shopify_build_cart_url` - Genera link diretto al carrello
- `shopify_list_customers` - Elenca clienti con storico acquisti
- `shopify_get_analytics` - Vendite, ordini e prodotti top
- `shopify_create_product` - Crea prodotti in store
- `shopify_create_discount` - Crea codici sconto percentuale/fisso
- `shopify_list_collections` - Elenca le collezioni del catalogo
- `shopify_manage_collection` - Aggiunge/rimuove prodotti dalle collezioni
- `shopify_update_inventory` - Aggiorna le giacenze delle varianti

**Tools opzionali (disattivati):**

- `shopify_setup_store` - Setup store (legacy: la connessione ora passa dal pannello OAuth in chat)
- `web_search` - Ricerche web generiche
- `read_file` / `write_file` - Lettura/scrittura file

**Ideale per:** E-commerce Shopify che vogliono automatizzare il customer service

---

### 2. Lead Capture Agent

**Prezzo:** €29/mese  
**Categoria:** Marketing & Sales  
**Descrizione:** Agente che cattura, arricchisce e notifica il team commerciale sui nuovi lead in tempo reale.

**Funzionalità principali:**

- Cattura dettagli lead da conversazioni
- Arricchimento dati (email, azienda, ruolo)
- Notifica automatica a Slack/webhook
- Validazione email e dati di contatto

**Tools attivi (default):**

- `lead_capture_submit` - Salva lead nel database
- `lead_capture_notify_sales` - Invia notifica a Slack/webhook

**Tools opzionali (disattivati):**

- `lead_capture_enrich` - Arricchimento dati lead
- `web_search` - Ricerche web
- `read_file` / `write_file` - Lettura/scrittura file

**Ideale per:** Team commerciali che vogliono catturare lead dal sito/app senza perdere opportunità

---

## 📅 Services (Calendar Booking)

### 3. Calendar Booking Agent

**Prezzo:** €39/mese  
**Categoria:** Business & Operations  
**Descrizione:** Agente che gestisce la prenotazione di appuntamenti, controlla disponibilità e invia conferme automatiche.

**Funzionalità principali:**

- Ricerca slot liberi nel calendario
- Prenotazione automatica appuntamenti
- Invio conferme e reminder
- Gestione fusi orari

**Tools attivi (default):**

- `calendar_search_availability` - Cerca slot liberi
- `calendar_book_event` - Prenota appuntamento

**Tools opzionali (disattivati):**

- `web_search` - Ricerche web
- `read_file` / `write_file` - Lettura/scrittura file

**Ideale per:** Ristoranti, studi professionali, agenzie immobiliari, consulenti

---

### 4. Email Manager ✅ Disponibile

**Prezzo:** €39/mese  
**Categoria:** Business & Operations  
**Descrizione:** Agente che mette in ordine la casella di posta, traccia gli impegni che contano e fornisce un digest giornaliero.

**Funzionalità principali:**

- Smistamento e archiviazione della posta in arrivo
- Bozze di risposta pronte per l'approvazione (mai inviate senza consenso esplicito)
- Estrazione e tracciamento di scadenze, riunioni e follow-up nascosti nelle email
- Digest giornaliero: cosa richiede una decisione, cosa è in attesa, cosa arriva

**Tools attivi (default):**

- `read_file` / `write_file` - Lettura/scrittura file (note e promemoria)

**Tools opzionali (disattivati):**

- `web_search` / `scrape_page` - Ricerche web

**Ideale per:** Founder ed executive che vogliono risparmiare ore di gestione email e non perdere impegni importanti

---

## 💼 Altri Agenti Disponibili (Non Attivi di Default)

### 5. Support Agent ✅ Disponibile

**Prezzo:** €49/mese  
**Categoria:** Customer Service  
**Descrizione:** Agente che risponde ai ticket 24/7, addestrato sulla knowledge base, ed escalada solo i casi che richiedono un umano.

**Funzionalità principali:**

- Risposte 24/7 con knowledge base
- Classificazione automatica dei ticket
- Bozze di risposta pronte all'approvazione
- Escalation dei casi complessi al team umano

**Tools default:** read_file, write_file  
**Tools opzionali:** web_search, scrape_page

**Ideale per:** Team di assistenza clienti che vogliono abbattere tempi di risposta e backlog senza aumentare l'organico

---

### 6. Copywriter ✅ Disponibile

**Prezzo:** €39/mese  
**Categoria:** Design & Content  
**Descrizione:** Scrive copy che convertono su landing page, annunci ed email, con più varianti pronte per i test A/B.

**Funzionalità principali:**

- Copy landing page
- Copy annunci
- Copy email
- Microcopy UI

**Tools default:** read_file, write_file  
**Tools opzionali:** web_search, scrape_page

**Ideale per:** Team marketing che vogliono copy on-brand in pochi minuti e varianti per ottimizzare la conversione

---

### 7. SEO Content Agent

**Prezzo:** €39/mese  
**Categoria:** Marketing & Sales  
**Descrizione:** Scrive contenuti SEO-ottimizzati con keyword research e analisi competitor.

**Tools default:** read_file, write_file  
**Tools opzionali:** web_search, scrape_page

---

### 8. Business Manager Agent

**Prezzo:** €59/mese  
**Categoria:** Business & Operations  
**Descrizione:** Assistente executive per reporting, scheduling e analisi strategica.

**Tools default:** read_file, write_file  
**Tools opzionali:** web_search, scrape_page, run_python

---

### 9. Personal AI Assistant

**Prezzo:** €29/mese  
**Categoria:** Business & Operations  
**Descrizione:** Assistente personale per task quotidiani, ricerca e organizzazione.

**Tools default:** read_file, write_file  
**Tools opzionali:** web_search, scrape_page

---

### 10. Finance Manager Agent

**Prezzo:** €49/mese  
**Categoria:** E-commerce & Finance  
**Descrizione:** Concilia entrate e uscite, prepara fatture e solleciti di pagamento e tiene il cash flow sotto controllo.

**Funzionalità principali:**

- Conciliazione entrate/uscite con segnalazione delle discrepanze
- Fatture e solleciti di pagamento da approvare (mai inviati senza consenso)
- Briefing cash flow in linguaggio semplice: entrate, uscite, scadenze, priorità
- Nessun numero inventato: stime e dati mancanti sempre segnalati

**Tools default:** read_file, write_file  
**Tools opzionali:** web_search, scrape_page

**Ideale per:** PMI e founder che vogliono una panoramica finanziaria affidabile senza caos di fogli di calcolo

---

## 📊 Confronto Piani

| Piano                 | Prezzo    | Conversazioni/Mese | Agenti Inclusi | Tools               |
| --------------------- | --------- | ------------------ | -------------- | ------------------- |
| **Starter**           | €29/mese  | 300                | 1 a scelta     | Solo default        |
| **Growth**            | €39/mese  | 1.000              | 1 a scelta     | Default + opzionali |
| **Add-on Web Search** | +€15/mese | -                  | Qualsiasi      | + web_search        |

## 🎯 Verticali

### Shopify E-commerce

- **Agenti:** Shopify Agent + Lead Capture + Support Agent + Copywriter + Email Manager
- **Tools:** Product search, order status, cart links, gestione prodotti/discount/inventario, lead capture, email
- **Prezzo:** €29-49/mese

### Services

- **Agenti:** Calendar Booking + Lead Capture + Support Agent + Copywriter
- **Tools:** Calendar search, booking, lead capture, supporto, copy
- **Prezzo:** €29-49/mese

## 💡 Note per Notion

**Costo variabile per conversazione:**

- LLM (Gemini): ~€0.05-0.15
- Tavily (se attivo): ~€0.01-0.05
- **Senza web search:** ~€0.05-0.08

**Margine stimato:**

- Starter: €9-19/mese
- Growth: €9-14/mese

**Founder pricing:** Primi 10-15 clienti a prezzi bloccati a vita

---

**Formato pronto per copiare in Notion** ✅
