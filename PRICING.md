# Pricing Documentation

## Overview

AgentCloud offers simple, transparent pricing for two verticals:

- **E-commerce (Shopify)**: Shopify Agent + Lead Capture
- **Services**: Calendar Booking + Lead Capture

Both verticals share the same pricing structure to keep things simple at launch.

## Agent Pricing (abbonamento singolo)

Ogni agente del marketplace può anche essere attivato singolarmente con un
abbonamento mensile dedicato (checkout diretto dalla card dell'agente). I
prezzi riflettono la complessità del compito e sono allineati tra catalogo
(`src/lib/agents.ts`), runtime (`src/lib/agents/registry.ts`) e bootstrap del
DB (`supabase/schema.sql`).

| Agente                                  | Prezzo mensile | Categoria            | Compito principale                |
| --------------------------------------- | -------------- | -------------------- | --------------------------------- |
| Shopify Agent                           | €39/mese       | E-commerce & Finance | Gestione store e vendite          |
| Lead Capture Agent                      | €29/mese       | Marketing & Sales    | Cattura e notifica lead           |
| **Support Agent**                       | **€49/mese**   | Customer Service    | Assistenza clienti 24/7           |
| **Copywriter**                          | **€39/mese**   | Design & Content    | Copy che converte                 |
| Executive Assistant                     | €39/mese       | Business & Ops       | Smistamento e pianificazione      |
| Personal Assistant                      | €29/mese       | Business & Ops       | Organizzazione giornata           |
| SEO Specialist / SEO Content            | €39/mese       | Marketing & Sales    | Contenuti e posizionamento        |
| Social Media Manager                    | €39/mese       | Marketing & Sales    | Contenuti social                  |
| Calendar Booking Agent                  | €39/mese       | Business & Ops       | Prenotazioni e slot               |
| Full Stack Developer                    | €49/mese       | Development          | Sviluppo feature                  |
| Data Analyst                            | €49/mese       | AI & Data            | Analisi e report                  |

La tariffa base è **€29/mese** (agenti a basso carico operativo: meeting,
blog, cold email, lead capture, prompt engineering), **€39/mese** per gli
agenti di contenuto e operazioni standard, **€49/mese** per gli agenti ad
alto valore (supporto 24/7, sviluppo, lead qualification, dati) e
**€59/mese** per gli agenti strategici/cross-team (CRM, customer success,
marketing strategist, DevOps, AI automation, business manager). I nuovi
agenti disponibili — **Support Agent (€49/mese)** e **Copywriter
(€39/mese)** — sono allineati a questa scala.

> **Nota:** questi prezzi sono quelli effettivamente addebitati via
> `/api/checkout` (campo `priceCents` del catalogo). In passato il bootstrap
> `agents_registry` riportava valori divergenti (es. €79-149): il seed è stato
> riallineato al catalogo.

## Pricing Plans

### E-commerce Vertical (Shopify)

| Plan        | Price    | Token/Month   | Features                                                                |
| ----------- | -------- | ------------- | ----------------------------------------------------------------------- |
| **Starter** | €29/mese | 300.000       | Ricerca prodotti, link carrello, stato ordini, lead capture             |
| **Growth**  | €69/mese | 1.000.000     | Tutto del Starter + stato ordini avanzato, priorità supporto, analytics |

### Services Vertical (Calendar Booking)

| Plan        | Price    | Token/Month   | Features                                                              |
| ----------- | -------- | ------------- | --------------------------------------------------------------------- |
| **Starter** | €29/mese | 300.000       | Prenotazione appuntamenti, controllo disponibilità, lead capture      |
| **Growth**  | €69/mese | 1.000.000     | Tutto del Starter + reminder automatici, priorità supporto, analytics |

## Add-ons

### Web Search (+€15/mese)

Web Search is available as an add-on for both verticals:

- **Price**: +€15/mese
- **What it includes**: Ricerche web con Tavily per informazioni in tempo reale
- **Why it's an add-on**: È l'unico tool con costo a consumo reale (Tavily)
- **When to offer**: Solo se il cliente lo richiede esplicitamente

**Example:**

```
Shopify Starter: €29/mese
+ Web Search: +€15/mese
= €44/mese totale
```

## Founder Pricing

Per i primi **10-15 clienti reali**, blocca questi prezzi a vita come incentivo di lancio:

- **Starter**: €29/mese (invece di €39/mese futuro)
- **Growth**: €69/mese (invece di €89/mese futuro)
- **Web Search Add-on**: €15/mese (invece di €19/mese futuro)

### Come gestire il founder pricing

1. **Identifica i primi 10-15 clienti** che pagano regolarmente
2. **Applica sconto manualmente** via Stripe (coupon o prezzo personalizzato)
3. **Documenta in Supabase** nella tabella `user_agents`:
   ```sql
   UPDATE user_agents
   SET config = jsonb_set(config, '{founderPricing}', 'true')
   WHERE user_id = 'user_123';
   ```
4. **Comunica chiaramente** che è un prezzo bloccato a vita per early adopters

### Perché ha senso

- Costo per cliente è basso e prevedibile (niente Tavily a sorpresa)
- Margine è sano anche a €29/mese
- Incentivo potente per early adopters
- Fidelizzazione a lungo termine

## Cost Structure

### Costi Variabili (per conversazione)

| Componente              | Costo                         | Note                           |
| ----------------------- | ----------------------------- | ------------------------------ |
| LLM (Claude/GPT/Gemini) | ~€0.05-0.15/conversazione     | Dipende da lunghezza e modello |
| Tavily (se attivo)      | ~€0.01-0.05/ricerca           | Solo se web search è abilitato |
| **Totale stimato**      | **~€0.06-0.20/conversazione** | Senza web search               |

### Costi Fissi (infrastruttura)

| Componente      | Costo/Mese     |
| --------------- | -------------- |
| Vercel/ hosting | €0-20          |
| Supabase        | €0-25          |
| Resend (email)  | €0-10          |
| **Totale**      | **€0-55/mese** |

### Margine Stimato

**Piano Starter (€29/mese, 300 conversazioni):**

```
Ricavo: €29
Costo variabile: 300 × €0.10 = €30
Costo fisso: €25
Totale costo: €55
Margine: -€26 (negativo a basso volume)
```

**Piano Growth (€69/mese, 1.000 conversazioni):**

```
Ricavo: €69
Costo variabile: 1000 × €0.10 = €100
Costo fisso: €25
Totale costo: €125
Margine: -€56 (negativo a medio volume)
```

**Nota:** I costi stimati sono conservativi. Nella realtà:

- Non tutte le conversazioni usano il LLM (alcune sono semplici)
- I token per conversazione sono in media 500-1000, non 2000+
- Il costo reale per conversazione è più vicino a €0.05-0.08

**Con costo reale €0.05/conversazione:**

```
Starter: €29 - (300 × €0.05) - €25 = €9 margine/mese
Growth: €69 - (1000 × €0.05) - €25 = €19 margine/mese
```

## Break-even Analysis

### Obiettivo: 300 conversazioni × costo-per-conversazione < €29

**Monitorare da subito:**

1. Traccia il costo token medio per conversazione
2. Verifica che `300 × costo_per_conversazione < €29`
3. Se il margine è troppo risicato, abbassa il cap (es. 200 conversazioni)

**Esempio:**

```
Costo medio per conversazione: €0.08
300 conversazioni × €0.08 = €24
€29 (ricavo) - €24 (costo) = €5 margine
€5 / €29 = 17% margine (accettabile per iniziare)
```

## Usage Tracking

### Come funziona

1. **Ogni conversazione** viene registrata in `agent_runs` con:
   - `user_id`
   - `agent_slug`
   - `input_tokens`
   - `output_tokens`
   - `started_at`
   - `finished_at`

2. **Ogni mese** calcola:
   - Token totali consumati (input + output) per utente/agente
   - Numero di conversazioni (informativo)
   - Costo stimato

3. **Se l'utente supera il plafond di token**: parte l'**overage billing**
   (vedi sotto): il run viene permesso e i token extra vengono addebitati
   automaticamente via Stripe.

### Enforce limiti

```typescript
import { assertRunAllowed } from "@/lib/billing/usage-tracking";

// Prima di ogni run:
const check = await assertRunAllowed(userId, agentSlug);
if (!check.allowed) {
  return check.message; // 402 non abbonato / 429 tetto di sicurezza
}
// check.allowed === true → il run parte; se check.overage === true il run
// verrà addebitato come overage dopo l'esecuzione.
```

Il limite è calcolato sui **token reali (input + output)** sommando le
`agent_runs` del mese per utente/agente. Per la migrazione, le righe legacy
che salvano `conversationLimit` vengono mappate automaticamente: 300
conversazioni → 300.000 token, 1.000 → 1.000.000 token.

## Overage Billing (metered usage)

Quando il plafond token mensile viene superato, l'utente **non viene più
bloccato**: i token extra vengono addebitati automaticamente via Stripe.

### Come funziona

1. Il customer paga un piano con un **Payment Link** → Stripe crea una
   subscription ricorrente mensile.
2. Al checkout il webhook **allega un Price metered** (`STRIPE_OVERAGE_PRICE_ID`)
   alla subscription e salva l'id del subscription item in
   `user_agents.config.stripeSubscriptionItemId`.
3. Ogni run oltre il plafond: `recordUsageAndReportOverage` calcola **solo
   l'incremento** di token sopra l'allowance e lo riporta come **meter event**
   (`billing.meterEvents.create`, con `stripe_customer_id` nel payload e
   `identifier` unico per run contro i retry).
4. Stripe **somma gli eventi del periodo** e **fattura a fine periodo**
   insieme al rinnovo, con retry automatici in caso di carta rifiutata
   (dunning).

### Tariffa e tetto

| Parametro | Valore |
| --------- | ------ |
| Tariffa   | **€0,30 per 1.000 token extra** (arrotondata per eccesso all'unità) |
| Tetto     | **2x il plafond** (es. Starter 300K → blocca a 600K, Growth 1M → 2M) |

- Il prezzo reale vive nel **Price metered** di Stripe (env
  `STRIPE_OVERAGE_PRICE_ID`); `OVERAGE_RATE_PER_1000_TOKENS` in
  `pricing.ts` è il mirror per copy UI e calcoli.
- Se l'overage non è configurabile (nessuna subscription o Price mancante)
  resta il comportamento legacy: blocco 429 al raggiungimento del plafond.
- Nota: l'allowance è su mese di calendario, il meter Stripe sul periodo di
  subscription (mensile). Lo sfasamento è di pochi giorni ed è accettato in v1.

### Codice

```typescript
import { recordUsageAndReportOverage } from "@/lib/billing/usage-tracking";

await recordUsageAndReportOverage({
  user_id: userId,
  agent_slug: agentId,
  conversation_id: conversationId,
  tokens_input: inputTokens,
  tokens_output: outputTokens,
});
```

## Stripe Configuration

### Products

Crea due prodotti per verticale:

**Shopify:**

- Product: "AgentCloud Shopify - Starter" (€29/mese)
- Product: "AgentCloud Shopify - Growth" (€69/mese)

**Services:**

- Product: "AgentCloud Services - Starter" (€29/mese)
- Product: "AgentCloud Services - Growth" (€69/mese)

### Prices

Per ogni prodotto, crea un prezzo ricorrente mensile:

```
Product: AgentCloud Shopify - Starter
Price: €29/mese (recurring)
Billing: Monthly
```

### Payment Links

Crea payment link per ogni combinazione:

```
STRIPE_PAYMENT_LINK_SHOPIFY_STARTER=https://buy.stripe.com/...
STRIPE_PAYMENT_LINK_SHOPIFY_GROWTH=https://buy.stripe.com/...
STRIPE_PAYMENT_LINK_SERVICES_STARTER=https://buy.stripe.com/...
STRIPE_PAYMENT_LINK_SERVICES_GROWTH=https://buy.stripe.com/...
```

### Metadata

Aggiungi metadata ai payment link per tracciare il piano:

```
metadata[plan_id]=shopify-starter
metadata[vertical]=shopify
metadata[tokens]=300000
```

## Environment Variables

```env
# Pricing (in cents)
PRICING_SHOPIFY_STARTER_PRICE=2900
PRICING_SHOPIFY_GROWTH_PRICE=6900
PRICING_SERVICES_STARTER_PRICE=2900
PRICING_SERVICES_GROWTH_PRICE=6900

# Add-ons
PRICING_WEB_SEARCH_ADDON_PRICE=1500

# Usage limits (token mensili)
USAGE_LIMIT_STARTER=300000
USAGE_LIMIT_GROWTH=1000000
```

## Migration from Old Pricing

Se hai clienti esistenti con prezzi vecchi:

1. **Grandfathered pricing**: Mantieni il prezzo vecchio per sempre
2. **Documenta in Supabase**:
   ```sql
   UPDATE user_agents
   SET config = jsonb_set(config, '{legacyPricing}', 'true')
   WHERE user_id = 'user_123';
   ```
3. **Comunica** che il prezzo è bloccato a vita

## Best Practices

### 1. Monitora il costo per conversazione

Traccia sempre:

```typescript
import { calculateCostPerToken } from "@/lib/billing/pricing";

// Costo in centesimi per 1.000 token
const costPerThousandTokens = calculateCostPerToken(
  planPriceInCents,
  tokensThisMonth,
);

console.log(`Costo per 1.000 token: €${(costPerThousandTokens / 100).toFixed(2)}`);
```

### 2. Imposta alert

Crea alert se:

- Costo per conversazione supera €0.15
- Margine scende sotto il 10%
- Utilizzo medio supera l'80% del limite

### 3. Aggiusta i limiti se necessario

Se i clienti Starter usano sistematicamente >250 conversazioni:

- Considera di alzare il limite a 400
- Oppure alza il prezzo a €39/mese

### 4. Testa prima di lanciare

Per i primi 3 mesi:

- Monitora costi reali
- Verifica margini
- Raccogli feedback sui limiti
- Aggiusta prima di aprire le vendite

## Support

- Implementation: `src/lib/billing/pricing.ts`
- Usage tracking: `src/lib/billing/usage-tracking.ts`
- Stripe setup: `STRIPE_SETUP.md`
aticamente >250 conversazioni:

- Considera di alzare il limite a 400
- Oppure alza il prezzo a €39/mese

### 4. Testa prima di lanciare

Per i primi 3 mesi:

- Monitora costi reali
- Verifica margini
- Raccogli feedback sui limiti
- Aggiusta prima di aprire le vendite

## Support

- Implementation: `src/lib/billing/pricing.ts`
- Usage tracking: `src/lib/billing/usage-tracking.ts`
- Stripe setup: `STRIPE_SETUP.md`
