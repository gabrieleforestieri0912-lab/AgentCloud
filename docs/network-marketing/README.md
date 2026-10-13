# Network Marketing Agent

Assistente per incaricati alle vendite dirette e team leader: lista contatti,
follow-up, presentazioni, clienti e team — più conversazioni vere, zero spam,
tutto in regola. Non è un bot che scrive a sconosciuti: è un coach + segretario
operativo. Ogni invio verso terzi è una bozza che l'utente approva.

- **Prezzo proposto:** €14,99/mese. **Alternativa da valutare:** €9,99 base + add-on team.
- **Bundle:** Network Marketing Pro (Network Marketing + Lead Capture + Social Media + Calendar Booking) con sconti trimestrale/annuale esistenti.
- **Pagina:** `/agents/network-marketing` con esempi di chat, FAQ e avviso di conformità.
- **Conformità:** semaforo verde/giallo/rosso su ogni bozza (rosso = non copiabile né inviabile), registro consensi, lista "Non contattare", tetto 15 approcci/giorno, max 3 follow-up, audit log, presa visione regole con versione.
- **Integrazioni:** HubSpot, Sheets, Calendar, Gmail, Slack, Notion (live); WhatsApp, Instagram, Facebook, TikTok, Meet, Calendly, Mailchimp (in arrivo, mai obbligatorie — fallback copia/`wa.me`).
- **Test:** 44 casi IT in `supabase/seed-network-marketing.sql`, verificati contro `src/lib/network-marketing/compliance.ts` (44/44 al 2026-10-13).

## Assunzioni esplicite

1. `account_id = auth.users(id)` come in `schema-skills.sql`; una riga `nm_profiles` per account.
2. Nessun benchmark di guadagno né claim nelle pagine marketing.
3. Le bozze rosse sono bloccate in UI: l'applicazione del blocco tocca al
   componente bozza in chat (badge + disabilitazione copia/invio su `status: red`).
4. I documenti ufficiali dell'azienda sono caricati dall'utente (RAG): senza di
   essi l'agente dichiara i dati mancanti e non li inventa.
5. Conteggio catalogo aggiornato: 14 plugin, 71 skill (13+60 esistenti + 1+11 nuovi).
