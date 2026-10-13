# Nota legale per il team AgentCloud — Network Marketing Agent

> Non è un parere legale. Quadro da verificare con un avvocato prima del
> rilascio: le norme possono cambiare e i testi di prodotto vanno validati.

## 1. Cosa far verificare

1. **Testi del compliance-check** (`src/lib/network-marketing/compliance.ts`,
   regole NM-01…NM-08): coprono i pattern tipici ma non sono esaustivi; il
   legale deve validarli e definire la cadenza di aggiornamento.
2. **Presa visione regole** (versione `1.0.0` in `COMPLIANCE_RULES_VERSION`):
   verificare che basti come evidenza e come gestire gli aggiornamenti
   (ri-accettazione obbligatoria già prevista a schema).
3. **Informative privacy e basi giuridiche**: il prodotto salva fonte, base di
   liceità e data del consenso per contatto — verificare informative, ruoli
   titolare/responsabile e accordi con HubSpot/altri sub-responsabili.
4. **Retention 12 mesi** per contatti inattivi: verificare congruità col
   principio di limitazione della conservazione per questo trattamento.
5. **Disclaimer automatici** ("Incaricato indipendente di [azienda]") e recesso
   14 giorni: verificare formulazioni per vendite fuori locali commerciali e a
   distanza.
6. **Pagine marketing**: confermare che non contengano benchmark di guadagno o
   promesse di risultato (verificato in bozza: non ne contengono).

## 2. Riferimenti normativi usati nel disegno

- Legge 173/2005 (vendite piramidali vietate, vendita diretta)
- Codice del Consumo D.Lgs. 206/2005 (pratiche commerciali scorrette, recesso)
- GDPR e art. 130 Codice Privacy (marketing diretto e consenso)
- Reg. CE 1924/2006 (claim nutrizionali e sulla salute)
- Codice etico di settore (Direct Selling Italia) e regolamenti delle singole aziende (caricati come RAG, prevale la regola più restrittiva)

## 3. Cosa il prodotto NON fa (e non deve promettere)

- Non invia mai messaggi in automatico: ogni invio è una bozza approvata.
- Non pubblica su social in automatico: prepara testi, l'utente pubblica.
- Non dà consulenza fiscale, previdenziale o legale.
- Non importa liste acquistate né dati da scraping (blocco previsto).
- Le integrazioni WhatsApp/Instagram/Facebook/TikTok sono "in arrivo" e mai
  richieste: il fallback è copia/`wa.me` manuale.
