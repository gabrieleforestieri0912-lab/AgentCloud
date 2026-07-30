# Pricing Documentation

## Overview

AgentCloud offers simple, transparent pricing for two verticals:

- **E-commerce (Shopify)**: Shopify Agent + Lead Capture
- **Services**: Calendar Booking + Lead Capture

Both verticals share the same pricing structure to keep things simple at launch.

## Pricing Plans

### E-commerce Vertical (Shopify)

| Plan        | Price    | Conversations/Month | Features                                                                |
| ----------- | -------- | ------------------- | ----------------------------------------------------------------------- |
| **Starter** | €29/mese | 300                 | Ricerca prodotti, link carrello, stato ordini, lead capture             |
| **Growth**  | €69/mese | 1.000               | Tutto del Starter + stato ordini avanzato, priorità supporto, analytics |

### Services Vertical (Calendar Booking)

| Plan        | Price    | Conversations/Month | Features                                                              |
| ----------- | -------- | ------------------- | --------------------------------------------------------------------- |
| **Starter** | €29/mese | 300                 | Prenotazione appuntamenti, controllo disponibilità, lead capture      |
| **Growth**  | €69/mese | 1.000               | Tutto del Starter + reminder automatici, priorità supporto, analytics |

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
   - Numero di conversazioni per utente/agente
   - Token totali consumati
   - Costo stimato

3. **Se l'utente supera il limite**:
   - Mostra messaggio: "Hai raggiunto il limite di 300 conversazioni"
   - Offri upgrade a Growth
   - Opzionalmente, permetti overage a €0.10/conversazione

### Enforce limiti

```typescript
import { hasExceededLimit } from "@/lib/billing/usage-tracking";

// Prima di ogni conversazione
const exceeded = await hasExceededLimit(userId, agentSlug);
if (exceeded) {
  return "Hai raggiunto il limite del tuo piano. Upgrade a Growth per continuare.";
}
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
metadata[conversations]=300
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

# Usage limits
USAGE_LIMIT_STARTER=300
USAGE_LIMIT_GROWTH=1000
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
import { calculateCostPerConversation } from "@/lib/billing/pricing";

const costPerConversation = calculateCostPerConversation(
  planPriceInCents,
  conversationsThisMonth,
);

console.log(`Costo per conversazione: €${costPerConversation.toFixed(2)}`);
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
