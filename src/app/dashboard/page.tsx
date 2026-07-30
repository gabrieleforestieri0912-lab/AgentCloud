/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Plus,
  Power,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentIcon from "@/components/AgentIcon";
import { AGENTS } from "@/lib/agents";

const INSTALLED_AGENTS = [
  {
    slug: "support-agent",
    status: "Active",
    runs: "1,284",
    success: "98.7%",
    lastRun: "2m ago",
  },
  {
    slug: "crm-assistant",
    status: "Active",
    runs: "346",
    success: "96.1%",
    lastRun: "18m ago",
  },
  {
    slug: "marketing-strategist",
    status: "Paused",
    runs: "92",
    success: "94.8%",
    lastRun: "2d ago",
  },
];

const EVENTS = [
  "Website Chatbot captured a qualified lead from pricing page.",
  "Invoice Agent flagged 2 possible duplicate invoices.",
  "Campaign Agent prepared 3 subject line variants.",
  "Website Chatbot escalated a billing question to support.",
];

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const user = await currentUser();
  const installed = INSTALLED_AGENTS.map((item) => ({
    ...item,
    agent: AGENTS.find((agent) => agent.slug === item.slug)!,
  }));

  const greeting = user?.firstName
    ? `Welcome back, ${user.firstName}`
    : "Welcome back";
  const email = user?.emailAddresses?.[0]?.emailAddress || "";

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />

      <section className="px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Activity size={13} className="text-brand-400" />
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
                  My Agents
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {greeting}
              </h1>
              <p className="mt-2 text-sm text-neutral-500">{email}</p>
              <p className="mt-2 max-w-2xl text-lg leading-8 text-neutral-400">
                Track status, recent runs, connected workflows, and agent
                performance from one place.
              </p>
            </div>

            <Link
              href="/agents"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400"
            >
              <Plus size={16} />
              Install agent
            </Link>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            {[
              ["3", "Installed agents", Zap],
              ["1,722", "Total runs", Activity],
              ["97.4%", "Avg success", CheckCircle2],
              ["2", "Needs review", AlertCircle],
            ].map(([value, label, Icon]) => (
              <div
                key={label as string}
                className="rounded-lg border border-white/5 bg-neutral-900 p-5 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Icon size={19} />
                </div>
                <p className="text-3xl font-bold text-white">
                  {value as string}
                </p>
                <p className="text-sm text-neutral-400">{label as string}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-lg border border-white/5 bg-neutral-900 shadow-sm">
              <div className="border-b border-white/5 p-5">
                <h2 className="text-xl font-bold text-white">
                  Installed agents
                </h2>
              </div>

              <div className="divide-y divide-white/5">
                {installed.map(({ agent, status, runs, success, lastRun }) => (
                  <div
                    key={agent.slug}
                    className="grid gap-4 p-5 lg:grid-cols-[1fr_120px_120px_120px_110px] lg:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-lg ${agent.accent}`}
                      >
                        <AgentIcon
                          icon={agent.icon}
                          size={21}
                          className="text-white"
                        />
                      </div>
                      <div>
                        <Link
                          href={`/agents/${agent.slug}`}
                          className="font-bold text-white transition-colors hover:text-brand-400"
                        >
                          {agent.shortName}
                        </Link>
                        <p className="text-sm text-neutral-500">
                          {agent.category}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                        status === "Active"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {status}
                    </span>
                    <p className="text-sm font-bold text-white">{runs} runs</p>
                    <p className="text-sm font-bold text-white">{success}</p>
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                      <Clock3 size={15} />
                      {lastRun}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-lg border border-white/5 bg-neutral-900 p-5 shadow-sm">
                <h2 className="text-xl font-bold text-white">
                  Recent activity
                </h2>
                <div className="mt-5 space-y-3">
                  {EVENTS.map((event) => (
                    <div
                      key={event}
                      className="rounded-lg bg-neutral-800 p-3 text-sm leading-6 text-neutral-300"
                    >
                      {event}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/5 bg-linear-to-br from-neutral-900 to-neutral-950 p-5 text-white shadow-sm">
                <Power size={20} className="mb-4 text-purple-400" />
                <h2 className="text-xl font-bold">Agent control center</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  The next step is connecting these controls to real workflow
                  runs, logs, billing, and integration health.
                </p>

                {/* Onboarding checklist */}
                <div className="mt-5 space-y-3 border-t border-white/5 pt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Getting started
                  </p>
                  {[
                    ["Browse marketplace", "/agents"],
                    ["Install your first agent", "/agents"],
                    ["Configure integrations", "/agents"],
                    ["View your dashboard", "/dashboard"],
                  ].map(([label, href], i) => (
                    <Link
                      key={label}
                      href={href}
                      className="flex items-center gap-3 rounded-lg bg-white/5 px-3.5 py-3 text-sm transition-colors hover:bg-white/10"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                        {i + 1}
                      </span>
                      <span className="text-neutral-300">{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
