# AgentCloud — Audit responsive mobile (FASE 0)

> Documento della **FASE 0**: sola ricognizione, **nessuna modifica al codice**.
> Metodo: mappa delle route/layout condivisi + scansione dei pattern problematici
> (`h-screen`/`100vh`, larghezze fisse, `grid-cols` senza fallback, `overflow-x`,
> `fixed`/`sticky`, target touch, font input) su `src/app` e `src/components`.

## 0. Premessa importante — differenze dall'assunzione del brief

Il brief presuppone una base con **shadcn/ui** (Sheet, Drawer, Dialog,
DropdownMenu, Tabs) e due banner (`LaunchCountdownBanner`, `FoundingSpotsBanner`).
Il repository **non li contiene**:

- **shadcn/ui NON esiste**: manca `src/components/ui/`, e non ci sono le
  dipendenze `@radix-ui/*`, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `vaul`. L'UI è composta da componenti custom + Tailwind v4.
- **Banner assenti**: `LaunchCountdownBanner` e `FoundingSpotsBanner` non
  esistono in `src/`. Esiste solo `CountdownTimer` (usato nella waitlist).
- Molte fondamenta del responsive **sono già presenti**: `viewport` corretto,
  `h-dvh` nelle shell, drawer mobile in dashboard e chat, breakpoint `sm/md/lg`
  sulle griglie, `max-md:` per card-ificare le righe tabellari, modali waitlist
  con `max-h-[90dvh] overflow-y-auto`.

Quindi questo audit **non inventa rotture**: elenca i problemi reali residui.
Le scelte su come sostituire shadcn/ui e i banner sono in **Decisioni aperte**.

## 1. Mappa delle route e dei layout condivisi

| Gruppo | Route | Layout/shell |
|---|---|---|
| Marketing pubblico | `/`, `/about`, `/integrations`, `/mobile`, `/agents`, `/bundles`, `/bundles/[slug]`, `/agent/[id]`, `/a/[slug]`, `/contact` | `Navbar` + `MobileNav` + `Footer`; `app/layout.tsx` |
| Auth/onboarding | `/login`, `/signup`, `/reset-password`, `/reset`, `/waitlist`, `/select-agent` | standalone (no Navbar) |
| App (protetta) | `/chat`, `/dashboard`, `/dashboard/integrations`, `/dashboard/subscriptions`, `/account`, `/settings`, `/cart`, `/agents/[slug]/deploy` | `DashboardShell` (task) / `ChatInterface` (chat) |
| Admin | `/admin/carts`, `/admin/waitlist-codes` | `DashboardShell` |
| Legale | `/privacy`, `/terms`, `/refunds` | Navbar + Footer |
| Install/CLI | `/install`, `/cli/auth` | standalone |

Layout/props condivisi ispezionati: `src/app/layout.tsx`, `DashboardShell`,
`AppHeader`, `Navbar`, `MobileNav`, `Footer`, `ChatInterface`, `WaitlistForm`,
`DemoLimitModal`, `SubscribePaywallModal`, `DashboardCharts`.

## 2. Check `app/layout.tsx` (viewport)

✅ **Già corretto**: `export const viewport: Viewport = { width: "device-width",
initialScale: 1, themeColor: "#0a0a0f" }`. Nessuna azione necessaria in FASE 1
su questo punto.

## 3. Tabella dei problemi

Gravità: **bloccante** (impedisce l'uso) / **alta** (uso molto scomodo) /
**media** (frizioni) / **bassa** (rifinitura).

| Route / Componente | Problema | Gravità | Fix proposto |
|---|---|---|---|
| `globals.css` (global) | Nessuna rete di sicurezza `overflow-x: hidden` su `html, body` (c'è solo `body.overflow-x-hidden` nel layout, non una regola globale) | media | Aggiungere in FASE 1 `html, body { overflow-x: hidden }` come safety net |
| Header/footer/bottom bar fissi (`ChatInterface` FAB, input chat, `AppHeader`, `Footer`) | Nessun uso di `env(safe-area-inset-*)`: su iPhone con notch/home indicator i controlli possono finire sotto la barra di sistema | alta | Applicare padding `safe-area-inset-bottom/left/right` a FAB, input bar e footer |
| `src/app/login/page.tsx`, `src/app/signup/page.tsx` | Input con `text-sm` (14px) → **zoom automatico iOS** al focus | alta | Input/textarea/select a **16px minimo** su mobile (classe o regola CSS in FASE 1) |
| `ChatInterface.tsx` (textarea `text-[13px]`, altri input) | Font < 16px → zoom iOS; textarea chat principale | alta | 16px su mobile; mantenere 13–14px da `sm:` in su |
| `ChatInterface.tsx` ~L1548-1553 (menu conversazione) | Bottone "..." delle conversazioni non attive è **hover-only** (`opacity-0 group-hover:opacity-100`) → **invisibile su touch**: rename/archivia/elimina non raggiungibili | alta | Renderlo sempre visibile sotto `lg` (`opacity-100 lg:opacity-0 lg:group-hover:opacity-100`) |
| `AppHeader.tsx` pannello impostazioni rapide (`w-72 absolute right-0`) | Su 320px il pannello è a filo del bordo; con padding header può sforare a sinistra | media | `w-[min(18rem,calc(100vw-2rem))]` e/o centratura |
| `AppHeader.tsx`, `SidebarAccount.tsx`, `cart-client.tsx`, `Navbar.tsx` | Target touch < 44×44: gear `h-8 w-8`, menu conversazione `p-1.5` (~26px), remove carrello `h-8 w-8`, close `h-8 w-8`, pill lingua `py-1.5 text-xs` | media | Alzare a ≥44px lato mobile (varianti touch), senza peggiorare il desktop |
| Pagine con `min-h-screen` (`about`, `account`, `admin/*`, `agents`, `bundles`, `cart`, `contact`, `integrations`, `privacy`, `refunds`, `terms`, `mobile`, `install`, `page`) | `100vh`-based → problema barra indirizzi mobile; preferibile `dvh` | bassa | Migrare a `min-h-dvh` dove il contenitore è a tutta altezza |
| `DemoLimitModal.tsx`, `SubscribePaywallModal.tsx` | `max-w-md p-6` **senza** `max-h`/`overflow-y-auto`: in landscape basso il contenuto può sforare e i bottoni uscire | media | `max-h-[90dvh] overflow-y-auto overscroll-contain` (come già fa `WaitlistForm`) |
| `cart-client.tsx` (riga item) | Riga `flex items-start gap-4` con icona + testo + prezzo + remove: a 320px il contenuto centrale si comprime molto | media | Su `<sm` impilare prezzo/azioni sotto il testo (colonna) |
| `dashboard/subscriptions/page.tsx`, `WaitlistCodesManager.tsx` | `<table>` in `overflow-x-auto` (già contenuto) ma le colonne non si nascondono su mobile → scroll orizzontale interno | bassa | Card su mobile (label:valore) o nascondere colonne secondarie |
| `HeroSection.tsx` (mini-chat hero) | Input vicino al fondo: la tastiera mobile può coprire il campo (nessun `scroll-margin`/adeguamento `visualViewport`); container `h-dvh` | media | `scroll-margin`/`scrollIntoView` sul focus + altezza basata su dvh |
| `DashboardShell.tsx` | `AppHeader` renderizzato **due volte** (`hidden lg:block` + `lg:hidden`): non simultaneo, ma markup duplicato | bassa | Un solo `AppHeader` con breakpoint interni (cleanup) |
| Globale — testi | 110 occorrenze di `text-[9-12px]` | bassa | Verifica leggibilità su mobile; alzare i casi critici |
| Globale — hover | 337 usi di `hover:`; la maggior parte decorativi, il caso critico è il menu conversazione (sopra) | bassa | Audit mirato delle azioni hover-only residue |

### Già a posto (nessuna azione)

- `app/layout.tsx` viewport ✅
- `DashboardShell` — sidebar già drawer mobile (overlay + hamburger + chiusura alla navigazione) ✅ → FASE 2 quasi completa
- `ChatInterface` — shell `h-dvh` + drawer sidebar mobile + FAB hamburger ✅
- `Navbar`/`MobileNav` — nav desktop `hidden lg:flex`, menu mobile separato, dropdown `w-[420px] max-w-[90vw]` ✅
- `Footer` — colonne impilate, bottom bar `flex-wrap` ✅
- `DashboardCharts` — `sm:grid-cols-2 lg:grid-cols-4`, `lg:grid-cols-[1fr_320px]`, `ResponsiveContainer width="100%"` ✅
- `dashboard/page.tsx` — righe agenti `lg:grid-cols-[...]` con `max-md:rounded-lg max-md:border` (card su mobile) ✅
- `settings-client.tsx`, `account-client.tsx` — `sm:grid-cols-2/3` ✅
- `WaitlistForm.tsx` — modali `max-h-[90dvh] overflow-y-auto overscroll-contain` ✅
- `deploy-client.tsx` — blocchi codice `overflow-x-auto break-all` ✅

## 4. Decisioni aperte (default proposto — non bloccanti)

| # | Decisione | Default proposto |
|---|---|---|
| D1 | **shadcn/ui assente** (Sheet/Drawer/Dialog/DropdownMenu/Tabs non esistono) | **Non installare dipendenze**: riusare i pattern custom già presenti (drawer in `DashboardShell`/`ChatInterface`, overlay a pannello, modali centrate). Chiedo conferma se preferisci introdurre shadcn/ui + Radix. |
| D2 | Banner `LaunchCountdownBanner`/`FoundingSpotsBanner` assenti | Nessun intervento (non esistono); l'unico elemento affini è `CountdownTimer` nella waitlist |
| D3 | Modali lunghi → bottom sheet (vaul) | Nessun vaul: Dialog a quasi tutto schermo con `max-h-[90dvh] overflow-y-auto` |
| D4 | Branch/commit con working tree **già sporco** (modifiche non committate dai task precedenti) | Creo `fix/mobile-responsive-<timestamp>` e committo **solo i file toccati in ogni fase**, lasciando intatti i file pre-esistenti |
| D5 | Tabelle dati su mobile | Card (label:valore) dove la tabella è riducibile; altrimenti scroll interno |
| D6 | Breakpoint mobile→desktop | `lg` (1024px) per le sidebar, `md` (768px) per le griglie (già prevalente nel codice) |
| D7 | Test automatici responsive (Playwright) | Non aggiungere ora |
| D8 | Push/PR | **Non eseguo push**: preparo branch e commit locali; la PR la apri tu (o me lo chiedi esplicitamente) |

## 5. Sintesi

- **Problemi bloccanti:** 0 rilevati a livello di layout statico (la shell
  dashboard/chat è già mobile-ready).
- **Problemi alta gravità:** 3 (menu conversazione hover-only; font input 14px
  → zoom iOS; assenza safe-area sui controlli fissi).
- **Media:** 6 · **Bassa:** 5.
- Le fasi successive possono concentrarsi su: fondamenta globali (safe-area,
  16px input, `dvh`), azioni hover-only, modali senza `max-h`, cart e tabelle.

---

**PROSSIMO PASSO (dopo tua conferma):** FASE 1 — Fondamenta globali
(`globals.css`, viewport, `dvh`, target touch, utility condivise).
