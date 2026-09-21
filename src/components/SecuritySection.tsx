"use client";
/**
 * Sicurezza e isolamento tenant — solo ciò che è verificabile nel repo.
 * RLS per tabella, token cifrati, Edge proxy, nessun segreto client.
 * Visual: diagramma SVG inline 4 layer.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, KeyRound, Server, Database, EyeOff } from "lucide-react";

const POINTS = [
  { icon: Database, title: "RLS su ogni tabella", desc: "profiles, user_agents, agent_runs, carts — policy `auth.uid() = user_id` in supabase/schema.sql. Ogni tenant vede solo le proprie righe." },
  { icon: Lock, title: "Token per tenant cifrati", desc: "OAuth Shopify/Google salvati per tenantId=user.id, cifrati at-rest. Lettura solo via Edge con service-role." },
  { icon: Server, title: "Edge proxy verificabile", desc: "src/proxy.ts resolveSession() valida cookie o Bearer, isola /api/agent/run e /api/extension/* prima del lancio." },
  { icon: KeyRound, title: "Nessun segreto nel client", desc: "ANTHROPIC_API_KEY, STRIPE_SECRET, SUPABASE_SERVICE_ROLE solo server. L’estensione usa cookie, non token salvati." },
  { icon: EyeOff, title: "Chiamate esterne proxate", desc: "Shopify, Gmail, Calendar via /api/* con host_permissions minime; content script solo su richiesta (activeTab)." },
  { icon: ShieldCheck, title: "Audit e isolamento", desc: "Nessuna mesh tra agenti promessa. Ogni run è isolata per agent_slug + user_id con 4 msg freemium." },
];

export default function SecuritySection() {
  return (
    <section id="sicurezza" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">Sicurezza • Multi-tenant</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Isolamento per tenant, <span className="bg-linear-to-r from-emerald-400 to-brand-400 bg-clip-text text-transparent">verificabile nel codice</span></h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-neutral-400">Niente promesse generiche. Solo ciò che è in <code className="rounded bg-white/5 px-1">schema.sql</code>, <code className="rounded bg-white/5 px-1">proxy.ts</code> e <code className="rounded bg-white/5 px-1">agent-cursor.js</code>.</p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POINTS.map((p) => (
            <motion.div key={p.title} className="rounded-2xl border border-white/5 bg-neutral-900 p-4" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
              <p.icon size={16} className="text-emerald-400" />
              <p className="mt-2 text-sm font-bold text-white">{p.title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-neutral-400">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Visual SVG — 4 layer */}
        <motion.div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-2xl border border-white/5 bg-neutral-900 p-4" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Visual: diagramma SVG inline — JSX, no immagini esterne</p>
          <svg viewBox="0 0 800 140" className="mt-3 w-full" role="img" aria-label="Browser → Edge Proxy → Supabase RLS → Fornitori">
            <rect x="10" y="20" width="170" height="100" rx="12" fill="#18181b" stroke="rgba(255,255,255,0.08)" />
            <text x="95" y="55" textAnchor="middle" fill="#e4e4e7" fontSize="12" fontWeight="700">Browser</text>
            <text x="95" y="75" textAnchor="middle" fill="#a1a1aa" fontSize="10">activeTab • no token</text>
            <text x="95" y="92" textAnchor="middle" fill="#52525b" fontSize="9">agent-cursor.js</text>
            <rect x="210" y="20" width="170" height="100" rx="12" fill="#18181b" stroke="rgba(255,255,255,0.08)" />
            <text x="295" y="55" textAnchor="middle" fill="#e4e4e7" fontSize="12" fontWeight="700">Edge Proxy</text>
            <text x="295" y="75" textAnchor="middle" fill="#a1a1aa" fontSize="10">resolveSession()</text>
            <text x="295" y="92" textAnchor="middle" fill="#52525b" fontSize="9">src/proxy.ts</text>
            <rect x="410" y="20" width="170" height="100" rx="12" fill="#0a2e22" stroke="rgba(16,185,129,0.25)" />
            <text x="495" y="55" textAnchor="middle" fill="#6ee7b7" fontSize="12" fontWeight="700">Supabase RLS</text>
            <text x="495" y="75" textAnchor="middle" fill="#a7f3d0" fontSize="10">tenantId = user.id</text>
            <text x="495" y="92" textAnchor="middle" fill="#6ee7b7" fontSize="9">schema.sql</text>
            <rect x="610" y="20" width="170" height="100" rx="12" fill="#18181b" stroke="rgba(255,255,255,0.08)" />
            <text x="695" y="55" textAnchor="middle" fill="#e4e4e7" fontSize="12" fontWeight="700">Fornitori</text>
            <text x="695" y="75" textAnchor="middle" fill="#a1a1aa" fontSize="10">Shopify • Gmail • Stripe</text>
            <text x="695" y="92" textAnchor="middle" fill="#52525b" fontSize="9">token cifrati</text>
            <line x1="180" y1="70" x2="210" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" markerEnd="url(#arr)" />
            <line x1="380" y1="70" x2="410" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" markerEnd="url(#arr)" />
            <line x1="580" y1="70" x2="610" y2="70" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" markerEnd="url(#arr2)" />
            <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="rgba(255,255,255,0.35)" /></marker><marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="rgba(16,185,129,0.6)" /></marker></defs>
          </svg>
          <p className="mt-2 text-xs font-semibold text-neutral-500">Solo <code className="rounded bg-white/5 px-1">transform</code> e <code className="rounded bg-white/5 px-1">opacity</code> nelle animazioni; `prefers-reduced-motion` rispettato via Framer.</p>
        </motion.div>

        <div className="mt-8 text-center">
          <Link href="/privacy" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10">Vedi privacy &amp; termini →</Link>
        </div>
      </div>
    </section>
  );
}
