import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentCard from "@/components/AgentCard";
import { AVAILABLE_AGENTS, COMING_SOON_AGENTS } from "@/lib/agents";

export const metadata: Metadata = {
  title: "AI Agent Marketplace",
  description:
    "Browse pre-built AI agents for marketing, operations, support, finance and more. Deploy ready-to-use agents that automate your business workflows.",
  openGraph: {
    title: "AI Agent Marketplace | AgentCloud",
    description:
      "Browse pre-built AI agents for marketing, operations, support, finance and more.",
  },
};

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />

      <section className="bg-[linear-gradient(180deg,#101014_0%,#0a0a0f_100%)] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-400">
                Agent marketplace
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                AI agents built to automate business workflows.
              </h1>
              <p className="mt-6 text-lg leading-8 text-neutral-400">
                Choose from pre-configured AI agents for marketing, operations,
                support, finance and more. Each agent can use research, file
                uploads and tool actions to get work done.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400"
                >
                  Start a chat
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-neutral-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white/20"
                >
                  Request a demo
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {AVAILABLE_AGENTS.map((agent) => (
                <div
                  key={agent.slug}
                  className="rounded-3xl border border-white/5 bg-neutral-900 p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${agent.accent}`}
                    >
                      <span className="text-white text-lg font-bold">
                        {agent.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">
                        {agent.name}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {agent.category}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-neutral-400">
                    {agent.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Available agents */}
          <div className="mb-8">
            <h2 className="mb-6 text-2xl font-bold text-white">
              Available now
            </h2>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {AVAILABLE_AGENTS.map((agent) => (
                <AgentCard key={agent.slug} agent={agent} />
              ))}
            </div>
          </div>

          {/* Coming soon agents */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">Coming soon</h2>
              <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-bold text-neutral-400">
                {COMING_SOON_AGENTS.length} agents
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {COMING_SOON_AGENTS.map((agent) => (
                <AgentCard key={agent.slug} agent={agent} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
