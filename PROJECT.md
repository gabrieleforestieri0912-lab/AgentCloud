# AgentCloud

**v0.2.0** — AI agent marketplace landing page.

---

## Stack

- **Next.js 16.2.9** (Turbopack) — framework
- **React 19.2.4** — UI library
- **Tailwind CSS v4** — styling (`@theme`-based)
- **TypeScript ^5** — type safety
- **Supabase** — demo request storage
- **Resend** — email notifications
- **FontAwesome 7** — brand icons (Google, Slack, Shopify, Stripe, social)
- **Lucide React** — primary icon set

---

## Project Structure

```
src/
├── proxy.ts              # Redirects all routes except / and /demo → /demo
├── app/
│   ├── layout.tsx        # Root layout: fonts (Manrope + Inter), bg-black, metadata
│   ├── page.tsx          # Homepage — assembles all sections
│   ├── globals.css       # Tailwind theme (brand/pink/orange/purple/indigo/neutral),
│   │                     # keyframes (fade-in-up, scale-in, typing-pulse, etc.),
│   │                     # custom scrollbar, stagger delays
│   ├── demo/page.tsx     # Demo request page (product pitch + form)
│   ├── chat/page.tsx     # AI chat page (reads ?q=)
│   ├── dashboard/page.tsx# Agent dashboard (stats, agents, activity)
│   ├── agents/
│   │   ├── page.tsx      # Marketplace listing ("Coming soon")
│   │   ├── [slug]/page.tsx        # Agent detail (description, preview, CTA)
│   │   └── [slug]/deploy/page.tsx # Agent deploy wizard (configure, connect, review)
│   └── api/
│       ├── demo/request/route.ts  # POST — stores in Supabase + sends email
│       ├── email/send/route.ts    # POST — send via Resend
│       └── email/webhook/route.ts # POST/GET — inbound email webhook
├── components/
│   ├── Navbar.tsx           # Fixed header with dropdowns (Marketplace, Solutions,
│   │                        #   Integrations, Pricing) + mobile hamburger
│   ├── HeroSection.tsx      # Rotating word pills + textarea → /chat
│   ├── MarketplaceSection.tsx # Agent store pitch + custom agent CTA
│   ├── FeaturesSection.tsx  # 5 feature cards with embedded mockups
│   ├── DashboardSection.tsx # Dashboard mockup (sidebar, agents, activity)
│   ├── IntegrationsSection.tsx # 12 integrations in a tile grid
│   ├── FAQSection.tsx       # Accordion FAQ (8 items)
│   ├── CTASection.tsx       # Final CTA banner
│   ├── Footer.tsx           # Black footer (logo, links, copyright)
│   ├── AgentCard.tsx        # Marketplace agent card
│   ├── AgentIcon.tsx        # Maps icon string → Lucide component
│   ├── AgentPreview.tsx     # Simulated agent preview on detail page
│   ├── AnimatedSection.tsx  # Scroll-triggered animation wrapper
│   ├── ChatInterface.tsx    # Full chat UI (sidebar, messages, keyword AI)
│   ├── ChatSkeleton.tsx     # Skeleton loading states for chat
│   └── Skeleton.tsx         # Base skeleton primitives
├── hooks/
│   └── useInView.ts         # IntersectionObserver hook
└── lib/
    ├── agents.ts            # Agent type + 8 agent definitions
    ├── resend.ts            # Resend client singleton
    └── supabase/
        ├── client.ts        # Supabase browser client
        └── server.ts        # Supabase server client (cookies)
```

---

## Routes

| Path | Page | Access |
|------|------|--------|
| `/` | Homepage | Direct |
| `/demo` | Demo request | Direct |
| `/chat` | AI chat | Direct |
| `/dashboard` | Dashboard | Direct |
| `/agents` | Marketplace | Proxy → `/demo` |
| `/agents/[slug]` | Agent detail | Proxy → `/demo` |
| `/agents/[slug]/deploy` | Deploy wizard | Proxy → `/demo` |

**Proxy behavior** (`src/proxy.ts`): All routes except `/` and `/demo` redirect to `/demo`.

---

## Design System

### Brand Colors
- **brand**: `#038bfe` (primary blue) — buttons, links, gradients
- **pink**: `#e879a8` — secondary accent in gradients
- **purple**: `#c084fc` — status badges, checkmarks
- **orange**: `#f97316` — HubSpot/Zapier integrations
- **indigo**: `#a78bfa` — Slack/Stripe integrations
- **neutral**: grays — text, borders, backgrounds

### Layout
- `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Section spacing: `py-24`
- Border radius: `rounded-xl` (cards), `rounded-2xl` (containers), `rounded-full` (pills)
- Body: `bg-black` — white content floats on black with `rounded-b-[4rem]` bottom corners

### Fonts
- Primary: **Manrope** (400-900)
- Fallback: **Inter** (400-900)
- Small text (`text-xs`, `text-sm`): `font-semibold` by convention

### Animations
- Triggered via `AnimatedSection` wrapper (IntersectionObserver with 80px root margin)
- Variants: `fade-in-up`, `fade-in-left`, `fade-in-right`, `scale-in`
- Stagger classes: `animate-stagger-1` through `animate-stagger-6` (80ms intervals)
- Typing indicator: `typing-pulse` (scale + opacity oscillation, 1.2s infinite)

---

## Agent Model

8 pre-built agents in `src/lib/agents.ts`:

| Slug | Name | Category | Price |
|------|------|----------|-------|
| `hiring-agent` | Automated Hiring System | HR | From €490 |
| `invoice-agent` | Automated Invoice Processing | Finance | From €390 |
| `website-chatbot` | Website Chatbot | Customer Support | From €290 |
| `inventory-agent` | Inventory Agent | Restaurant | From €450 |
| `lead-generation-agent` | Lead Generation Agent | Sales | From €590 |
| `campaign-agent` | Campaign Agent | Marketing | From €420 |
| `ecommerce-agent` | E-commerce Agent | E-commerce | From €520 |
| `analytics-agent` | Analytics Agent | Operations | From €480 |

---

## Environment Variables

```
RESEND_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DEMO_EMAIL_TO=info@agentcloud.io
```

---

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build (with TypeScript check)
npm run lint     # ESLint
```
