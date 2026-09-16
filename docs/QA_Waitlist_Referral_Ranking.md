# QA — Waitlist Referral & Ranking System (feature/waitlist-referral-ranking-20260916)

Branch: `feature/waitlist-referral-ranking-20260916` — **non mergiare**, PR aperta per review.

## Stack
Next.js App Router, TypeScript, Tailwind, Supabase (RLS + Edge), Vercel. Esterno via Edge Functions (Shopify pattern).

## Pre-requisiti
- Eseguire in Supabase SQL editor (in ordine):
  1. `supabase/schema-waitlist-ranking.sql` (Phase 1)
  2. `supabase/schema-waitlist-referral-complete-trigger.sql` (Phase 2)
- Verificare env `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` e `ADMIN_EMAILS` intatti (non toccati).

## Checklist manuale (Phase 6)

### 1. Referral signup muove il referrer su
- [ ] A già in waitlist → `GET /api/waitlist/referral-code` → copia `codeA` (`base62` 8 chars)
- [ ] Incognito → `GET /waitlist/join?ref=codeA` → verifica cookie `ac_wl_ref=codeA` (1h, Lax) e redirect `302` a `/waitlist?ref=codeA`
- [ ] Registra B con email diversa via quel link → `POST /api/waitlist` con `ref=codeA` → verifica `waitlist_referrals` row `referrer=A, referred_email=B, status=pending, referrer_ip` loggato
- [ ] B completa `auth_method_completed=true` (Google OAuth via `/auth/callback` o `POST /api/waitlist/complete-referral`) → verifica `status` diventa `completed`, `completed_at` set, `waitlist_points` per A = `3` → `GET /api/waitlist/ranking` per A mostra `position` diminuita (es. da #10 a #8 se 3 punti scavalcano 2 utenti a 0 punti)

### 2. Duplicate IG follow non raddoppia
- [ ] Da account waitlist (o `ac_wl_email` cookie) → card Instagram → clicca `Apri Instagram` → poi `Ho seguito` → `POST /api/waitlist/instagram-follow` → `200 {success:true, points:1}`
- [ ] Riclicca `Ho seguito` (o ricarica e riclicca) → `200 {alreadyCompleted:true}` — nessuna seconda riga in `waitlist_social_actions` (unique `user_id,action_type` via `23505`)
- [ ] Verifica `GET /api/waitlist/instagram-follow` → `{"completed":true}` e `GET /api/waitlist/ranking` → `instagramFollow=1`, `points` +1, non +2

### 3. Same-email referral bloccato
- [ ] A invita se stesso (stessa email case-insensitive) via `/waitlist/join?ref=codeA` → `POST /api/waitlist` con `email = A email` → server log `waitlist_referral_self_email_blocked`, nessun `pending` creato, `referred_by` null
- [ ] Verifica `waitlist_referrals` nessuna riga `referrer=A, referred_email=A`

### 4. Position ricalcola correttamente con join concorrenti
- [ ] Concorrente: iscrivi C, D, E in rapida sequenza senza referral (0 punti) → verifica `GET /api/waitlist/ranking` per ciascuno: `RANK() OVER (points DESC, waitlist_joined_at ASC)` mantiene ordine `joined_at` per pari punti
- [ ] Poi completa un referral per C (3 punti) → C deve balzare davanti a chi ha 0 punti anche se joined dopo (es. C rank 1, altri rank 2+)
- [ ] `GET /api/waitlist/leaderboard_preview?limit=5` e `GET /api/waitlist/ranking` coerenti

### 5. Altri
- [ ] `GET /api/waitlist/referral-code` senza auth e senza `ac_wl_email` → `401`; con cookie ma non in waitlist → `404`
- [ ] `/waitlist/join?ref=invalid123` → redirect a `/waitlist` senza crash, nessun `pending` creato per code inesistente
- [ ] Same-IP: due account diversi dallo stesso IP via stesso link → entrambi `pending` creati, log `waitlist_referral_same_ip_flagged` (se abilitato), ma entrambi poi `completed` → entrambi i punti assegnati (no hard IP block per NAT)
- [ ] `isSuccess` hero mostra `#N su Y` da `ranking` (points-aware) non più da `waitlist_position` legacy, e `ahead` 5 davanti coerente con nuovo rank
- [ ] `prefers-reduced-motion: reduce` → nessuna animazione `y` (solo `opacity` istantaneo) in `WaitlistForm` e `InstagramFollowCard`

## Known Limitation (da riportare in PR)
Instagram follow è **self-reported / honor-system** per v1 (Open Decision #1). Non c'è verifica via Instagram Graph API (richiede Business/Creator + app review, out of scope). Loggato come `known limitation` nel codice (`InstagramFollowCard.tsx`) e qui. Se in futuro si vuole verifica reale, è una fase separata più ampia — non tentata in questo prompt.

## Non-goals verificati
- Nessuna integrazione Graph API tentata
- Nessuna modifica a `ADMIN_EMAILS` / admin allowlist
- Waitlist system ancora attivo (pre-launch), nessun bypass di `auth_method_completed` rimosso (gate in `proxy.ts:215` intatto)
- Nessun secret client-side; tutte le chiamate esterne via Edge/API route

## Rollback
Se la migration non è ancora applicata in prod, il nuovo endpoint `GET /api/waitlist/ranking` fa fallback a `waitlist_position` legacy (nessun 500). Le nuove tabelle sono additive, nessun DROP di esistente.
