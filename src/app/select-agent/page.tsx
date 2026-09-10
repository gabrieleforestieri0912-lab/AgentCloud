"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Bot,
  ShoppingCart,
  Zap,
  Calendar,
  Mail,
  Search,
  Headphones,
  PenTool,
  BarChart3,
  UserCheck,
  Store,
  Check,
  ArrowRight,
} from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  "email-manager": Mail,
  "business-manager": BarChart3,
  "personal-assistant": Bot,
  "calendar-booking": Calendar,
  "seo-agent": Search,
  "lead-capture": UserCheck,
  "support-agent": Headphones,
  copywriter: PenTool,
  "finance-manager": BarChart3,
  "shopify-agent": Store,
};

const COLORS: Record<string, string> = {
  "email-manager": "from-blue-500/20 to-cyan-500/20 text-blue-400",
  "business-manager": "from-emerald-500/20 to-teal-500/20 text-emerald-400",
  "personal-assistant": "from-purple-500/20 to-violet-500/20 text-purple-400",
  "calendar-booking": "from-orange-500/20 to-amber-500/20 text-orange-400",
  "seo-agent": "from-green-500/20 to-lime-500/20 text-green-400",
  "lead-capture": "from-pink-500/20 to-rose-500/20 text-pink-400",
  "support-agent": "from-cyan-500/20 to-sky-500/20 text-cyan-400",
  copywriter: "from-indigo-500/20 to-blue-500/20 text-indigo-400",
  "finance-manager": "from-yellow-500/20 to-amber-500/20 text-yellow-400",
  "shopify-agent": "from-green-500/20 to-emerald-500/20 text-green-400",
};

interface AgentCard {
  slug: string;
  name: string;
  shortName: string;
  category: string;
  price: string;
  description: string;
  tasks: string[];
}

const AGENTS: AgentCard[] = [
  {
    slug: "email-manager",
    name: "Email Manager",
    shortName: "Email Manager",
    category: "Business & Operations",
    price: "€39/mo",
    description: "Gestisci email in arrivo, crea bozze e automatizza risposte",
    tasks: ["Smistamento e bozze email", "Risposte automatiche intelligenti"],
  },
  {
    slug: "business-manager",
    name: "Business Manager",
    shortName: "Business Manager",
    category: "Business & Operations",
    price: "€59/mo",
    description: "Gestisci processi, report e analisi del business",
    tasks: ["Report settimanali automatizzati", "Analisi performance business"],
  },
  {
    slug: "personal-assistant",
    name: "Personal Assistant",
    shortName: "Personal Assistant",
    category: "Business & Operations",
    price: "€29/mo",
    description: "Assistente personale per task quotidiani",
    tasks: ["Organizza la tua agenda", "Gestione reminder e task"],
  },
  {
    slug: "calendar-booking",
    name: "Calendar Booking",
    shortName: "Calendar Booking",
    category: "Business & Operations",
    price: "€39/mo",
    description: "Prenota e gestisci appuntamenti automaticamente",
    tasks: ["Gestione appuntamenti", "Prenotazioni automatiche"],
  },
  {
    slug: "seo-agent",
    name: "SEO Content Agent",
    shortName: "SEO Content",
    category: "Marketing & Sales",
    price: "€39/mo",
    description: "Crea contenuti ottimizzati per i motori di ricerca",
    tasks: ["Ricerca parole chiave", "Ottimizzazione contenuti SEO"],
  },
  {
    slug: "lead-capture",
    name: "Lead Capture",
    shortName: "Lead Capture",
    category: "Marketing & Sales",
    price: "€29/mo",
    description: "Cattura e qualifica lead automaticamente",
    tasks: ["Qualifica lead in arrivo", "Arricchimento profili contatti"],
  },
  {
    slug: "support-agent",
    name: "Support Agent",
    shortName: "Support Agent",
    category: "Customer Service",
    price: "€49/mo",
    description: "Rispondi ai clienti con assistenza AI intelligente",
    tasks: ["Risposte automatiche clienti", "Ticketing intelligente"],
  },
  {
    slug: "copywriter",
    name: "Copywriter",
    shortName: "Copywriter",
    category: "Design & Content",
    price: "€39/mo",
    description: "Crea testi di marketing accattivanti",
    tasks: ["Generazione copy per ads", "Scrittura post social media"],
  },
  {
    slug: "finance-manager",
    name: "Finance Manager",
    shortName: "Finance Manager",
    category: "E-commerce & Finance",
    price: "€49/mo",
    description: "Gestisci finanze, fatture e report finanziari",
    tasks: ["Analisi spese e ricavi", "Report finanziari mensili"],
  },
  {
    slug: "shopify-agent",
    name: "Shopify Agent",
    shortName: "Shopify Agent",
    category: "E-commerce & Finance",
    price: "€39/mo",
    description: "Gestisci il tuo store Shopify con AI",
    tasks: ["Gestione prodotti e inventario", "Analisi vendite e trend"],
  },
];

export default function SelectAgentPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    if (!selected) return;
    setActivating(true);
    setError(null);

    try {
      const res = await fetch("/api/trial/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_slug: selected }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "already_has_agent") {
          setError("Hai già un agente attivo. Visita la dashboard per gestirlo.");
        } else {
          setError("Errore durante l'attivazione. Riprova.");
        }
        return;
      }

      // Success — redirect to chat with the activated agent
      router.push(`/chat?agent=${selected}`);
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-neutral-950/80 backdrop-blur-2xl">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="relative h-8 w-8 overflow-hidden rounded-lg">
              <Image
                src="/agentcloud.png"
                alt="AgentCloud"
                fill
                className="object-cover"
                sizes="32px"
              />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              AgentCloud
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-semibold text-brand-400 mb-4">
            <Zap size={14} />
            Prova gratuita 1 mese
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Scegli il tuo agente AI
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Seleziona un agente per iniziare la tua prova gratuita di 30 giorni.
            Potrai cambiarlo in qualsiasi momento dalla dashboard.
          </p>
        </motion.div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {AGENTS.map((agent, i) => {
            const Icon = ICONS[agent.slug] || Bot;
            const color = COLORS[agent.slug] || "from-brand-500/20 to-purple-500/20 text-brand-400";
            const isSelected = selected === agent.slug;

            return (
              <motion.button
                key={agent.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                onClick={() => setSelected(agent.slug)}
                className={`relative text-left rounded-2xl border p-5 transition-all duration-200 ${
                  isSelected
                    ? "border-brand-500/50 bg-brand-500/[0.08] ring-1 ring-brand-500/30"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} mb-3`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{agent.name}</h3>
                <p className="text-xs text-neutral-500 font-medium mb-2">{agent.category}</p>
                <p className="text-xs text-neutral-400 mb-3 line-clamp-2">{agent.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.tasks.map((task) => (
                    <span
                      key={task}
                      className="inline-flex items-center rounded-lg bg-white/5 px-2 py-0.5 text-[10px] font-medium text-neutral-400"
                    >
                      {task}
                    </span>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: selected ? 1 : 0 }}
          className="text-center"
        >
          {error && (
            <p className="text-sm text-red-400 mb-4">{error}</p>
          )}
          <button
            onClick={handleActivate}
            disabled={!selected || activating}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Attivazione in corso...
              </>
            ) : (
              <>
                <Zap size={16} />
                Attiva prova gratuita
                <ArrowRight size={16} />
              </>
            )}
          </button>
          <p className="mt-3 text-xs text-neutral-500">
            Nessuna carta di credito richiesta • 30 giorni gratis • Cancelli quando vuoi
          </p>
        </motion.div>
      </div>
    </div>
  );
}
