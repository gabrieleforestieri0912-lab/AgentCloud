# AgentCloud - Catalogo Agenti per Notion

> Formattato per copia-incolla diretto in Notion

---

## 🛒 E-commerce (Shopify)

### 1. Shopify Commerce Agent

**Prezzo:** €29/mese  
**Categoria:** E-commerce & Finance  
**Descrizione:** Agente specializzato per negozi Shopify che ricerca prodotti, controlla lo stato degli ordini e genera link diretti al carrello.

**Funzionalità principali:**

- Ricerca prodotti nel catalogo Shopify
- Controllo stato ordini (richiede numero ordine + email)
- Generazione link carrello diretti
- Risposte in italiano su prodotti, prezzi, disponibilità

**Tools attivi (default):**

- `shopify_search_products` - Cerca prodotti per nome, categoria, tag
- `shopify_get_order_status` - Recupera stato pagamento, spedizione, tracking
- `shopify_build_cart_url` - Genera link diretto al carrello

**Tools opzionali (disattivati):**

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

**Prezzo:** €29/mese  
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

## 💼 Altri Agenti Disponibili (Non Attivi di Default)

### 4. SEO Content Agent

**Prezzo:** €29/mese  
**Categoria:** Marketing & Sales  
**Descrizione:** Scrive contenuti SEO-ottimizzati con keyword research e analisi competitor.

**Tools default:** read_file, write_file  
**Tools opzionali:** web_search, scrape_page

---

### 5. Business Manager Agent

**Prezzo:** €29/mese  
**Categoria:** Business & Operations  
**Descrizione:** Assistente executive per reporting, scheduling e analisi strategica.

**Tools default:** read_file, write_file  
**Tools opzionali:** web_search, scrape_page, run_python

---

### 6. Personal AI Assistant

**Prezzo:** €29/mese  
**Categoria:** Business & Operations  
**Descrizione:** Assistente personale per task quotidiani, ricerca e organizzazione.

**Tools default:** read_file, write_file  
**Tools opzionali:** web_search, scrape_page

---

## 📊 Confronto Piani

| Piano                 | Prezzo    | Conversazioni/Mese | Agenti Inclusi | Tools               |
| --------------------- | --------- | ------------------ | -------------- | ------------------- |
| **Starter**           | €29/mese  | 300                | 1 a scelta     | Solo default        |
| **Growth**            | €69/mese  | 1.000              | 1 a scelta     | Default + opzionali |
| **Add-on Web Search** | +€15/mese | -                  | Qualsiasi      | + web_search        |

## 🎯 Verticali

### Shopify E-commerce

- **Agenti:** Shopify Agent + Lead Capture
- **Tools:** Product search, order status, cart links, lead capture
- **Prezzo:** €29-69/mese

### Services

- **Agenti:** Calendar Booking + Lead Capture
- **Tools:** Calendar search, booking, lead capture
- **Prezzo:** €29-69/mese

## 💡 Note per Notion

**Costo variabile per conversazione:**

- LLM (Claude/GPT/Gemini): ~€0.05-0.15
- Tavily (se attivo): ~€0.01-0.05
- **Senza web search:** ~€0.05-0.08

**Margine stimato:**

- Starter: €9-19/mese
- Growth: €19-44/mese

**Founder pricing:** Primi 10-15 clienti a prezzi bloccati a vita

---

**Formato pronto per copiare in Notion** ✅


## 💡 Note per Notion

**Costo variabile per conversazione:**

- LLM (Claude/GPT/Gemini): ~€0.05-0.15
- Tavily (se attivo): ~€0.01-0.05
- **Senza web search:** ~€0.05-0.08

**Margine stimato:**

- Starter: €9-19/mese
- Growth: €19-44/mese

**Founder pricing:** Primi 10-15 clienti a prezzi bloccati a vita

---

**Formato pronto per copiare in Notion** ✅
