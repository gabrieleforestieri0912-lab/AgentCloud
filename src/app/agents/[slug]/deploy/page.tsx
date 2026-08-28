"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Plug,
  Rocket,
  Settings2,
  Zap,
  Shield,
  User,
  Volume2,
  AlertTriangle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentIcon from "@/components/AgentIcon";
import { useLanguage } from "@/components/LanguageProvider";
import { getAgentBySlug, isAvailable, localizeAgent } from "@/lib/agents";
import { getSiteUrl } from "@/lib/site-url";
import { t } from "@/lib/i18n/dictionaries";

export default function DeployAgentPage() {  const { dict, locale } = useLanguage();
  const params = useParams<{ slug: string }>();
  const rawAgent = getAgentBySlug(params.slug);
  const agent = rawAgent ? localizeAgent(rawAgent, locale) : undefined;
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const steps = dict.deploy.steps;

  // window.location.origin is only known on the client — subscribe to it
  // directly (useSyncExternalStore) instead of setState-in-effect.
  const origin = useSyncExternalStore(
    subscribeToLocation,
    getWindowOrigin,
    getServerOrigin,
  );

  if (!agent) notFound();
  // Only agents currently offered by the platform can be configured.
  // isAvailable resolves against the default vertical in client bundles,
  // which matches the runtime offering for this launch.
  if (!isAvailable(params.slug)) notFound();

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href={`/agents/${agent.slug}`}
            className="group mb-8 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition-colors hover:text-neutral-950"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            {dict.deploy.backToAgent}
          </Link>

          {/* Agent header card */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
            <div className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${agent.accent} shadow-sm`}
                  >
                    <AgentIcon
                      icon={agent.icon}
                      brand={agent.brand}
                      size={22}
                      className="text-white"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
                      {t(dict.deploy.configureTitle, { name: agent.shortName })}
                    </h1>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      {agent.description}
                    </p>
                  </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2">
                  {steps.map((step, index) => (
                    <div key={step} className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          index === 0
                            ? "bg-brand-500 text-white shadow-sm shadow-brand-500/20"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {index === 0 ? <Settings2 size={13} /> : index + 1}
                      </div>
                      <span
                        className={`hidden text-sm font-semibold md:block ${
                          index === 0 ? "text-brand-600" : "text-neutral-500"
                        }`}
                      >
                        {step}
                      </span>
                      {index < steps.length - 1 && (
                        <ChevronRight size={14} className="text-neutral-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* Main column */}
            <div className="space-y-6">
              {/* Agent settings */}
              <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                    <Settings2 size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-950">
                      {dict.deploy.agentSettings}
                    </h2>
                    <p className="text-xs text-neutral-500">
                      {dict.deploy.agentSettingsDesc}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
                      <User size={14} className="text-brand-500" />
                      {dict.deploy.businessName}
                    </span>
                    <input
                      defaultValue="Acme Studio"
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
                      <Zap size={14} className="text-brand-500" />
                      {dict.deploy.mainGoal}
                    </span>
                    <input
                      defaultValue={agent.tasks[0]}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
                      <Volume2 size={14} className="text-brand-500" />
                      {dict.deploy.tone}
                    </span>
                    <select
                      defaultValue={dict.deploy.toneOptions[0]}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a3a3a3%22%20strokeWidth%3D%222%22%20strokeLinecap%3D%22round%22%20strokeLinejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-size-[16px] bg-position-[right_14px_center] bg-no-repeat"
                    >
                      {dict.deploy.toneOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
                      <Shield size={14} className="text-brand-500" />
                      {dict.deploy.escalation}
                    </span>
                    <select
                      defaultValue={dict.deploy.escalationOptions[0]}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a3a3a3%22%20strokeWidth%3D%222%22%20strokeLinecap%3D%22round%22%20strokeLinejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-size-[16px] bg-position-[right_14px_center] bg-no-repeat"
                    >
                      {dict.deploy.escalationOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Connect tools */}
              <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                    <Plug size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-950">
                      {dict.deploy.connectTools}
                    </h2>
                    <p className="text-xs text-neutral-500">
                      {dict.deploy.connectToolsDesc}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {agent.integrations.map((integration, index) => (
                    <button
                      key={integration}
                      type="button"
                      className="group relative flex items-center justify-between rounded-xl border border-neutral-100 bg-white p-4 text-left shadow-sm transition-all hover:border-brand-200 hover:shadow-md hover:shadow-brand-500/5"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 transition-all group-hover:bg-brand-50 group-hover:text-brand-500">
                          <Plug size={16} />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-neutral-900">
                            {integration}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {index < 2 ? dict.deploy.recommended : dict.deploy.optional}
                          </span>
                        </span>
                      </span>
                      <span className="rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-xs font-bold text-neutral-600 transition-all hover:border-brand-500 hover:bg-brand-500 hover:text-white">
                        {dict.deploy.connect}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                    <Rocket size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-950">
                      {dict.deploy.deploymentSummary}
                    </h2>
                    <p className="text-xs text-neutral-500">
                      {dict.deploy.reviewBefore}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">{dict.deploy.agent}</span>
                    <span className="text-sm font-bold text-neutral-950">{agent.shortName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">{dict.deploy.category}</span>
                    <span className="text-sm font-bold text-neutral-950">{agent.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">{dict.deploy.setupTime}</span>
                    <span className="text-sm font-bold text-neutral-950">{agent.setupTime}</span>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  <div className="rounded-xl border border-neutral-200 bg-white p-3.5 transition-all hover:border-brand-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-neutral-950">{dict.deploy.starter}</p>
                        <p className="text-xs text-neutral-500">€29/mese</p>
                      </div>
                      <span className="text-[10px] font-semibold text-neutral-400">300 conv/mese</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      <li className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                        <Check size={11} className="text-brand-500" />
                        {dict.deploy.toolsBase}
                      </li>
                      <li className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                        <Check size={11} className="text-brand-500" />
                        {dict.deploy.leadCapture}
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-3.5 transition-all hover:border-brand-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-neutral-950">{dict.deploy.growth}</p>
                        <p className="text-xs text-neutral-500">€39/mese</p>
                      </div>
                      <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-700">{dict.deploy.popular}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-500">
                      <span className="text-neutral-400">1.000 conv/mese</span>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      <li className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                        <Check size={11} className="text-brand-500" />
                        {dict.deploy.fullTools}
                      </li>
                      <li className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                        <Check size={11} className="text-brand-500" />
                        {dict.deploy.leadCapture}
                      </li>
                      <li className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                        <Check size={11} className="text-brand-500" />
                        {dict.deploy.prioritySupport}
                      </li>
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isCheckingOut}
                  onClick={async () => {
                    setIsCheckingOut(true);
                    try {
                      const res = await fetch("/api/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ agentId: agent.slug }),
                      });
                      const data = await res.json();
                      if (data.url) {
                        window.location.href = data.url;
                      }
                    } catch {
                      // user stays on page on error
                    } finally {
                      setIsCheckingOut(false);
                    }
                  }}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 active:scale-[0.98] disabled:opacity-50"
                >
                  <Rocket size={16} />
                  {isCheckingOut ? dict.common.close : dict.deploy.requestDemo}
                </button>

                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200/50 bg-amber-50/50 px-3.5 py-2.5">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <p className="text-xs leading-relaxed text-amber-800">
                    {dict.deploy.flowNote}
                  </p>
                </div>
              </div>

              {/* Delivery options */}
              <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-950">
                      {dict.deploy.deliveryOptions}
                    </h2>
                    <p className="text-xs text-neutral-500">
                      {dict.deploy.deliveryOptionsDesc}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Option B: Direct link */}
                  <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold">
                        B
                      </span>
                      <span className="text-sm font-bold text-neutral-900">
                        {dict.deploy.directLink}
                      </span>
                      <span className="ml-auto rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                        {dict.deploy.recommended}
                      </span>
                    </div>
                    <p className="mb-3 text-xs text-neutral-500">
                      {dict.deploy.directLinkDesc}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={`${origin}/a/${agent.slug}`}
                        className="flex-1 h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-700 outline-none select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${origin}/a/${agent.slug}`);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="shrink-0 h-9 rounded-lg bg-brand-500 px-3 text-xs font-bold text-white hover:bg-brand-400 transition-colors"
                      >
                        {copiedLink ? dict.deploy.copied : dict.deploy.copy}
                      </button>
                    </div>
                  </div>

                  {/* Option A: Embed script */}
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-white text-xs font-bold">
                        A
                      </span>
                      <span className="text-sm font-bold text-neutral-900">
                        {dict.deploy.embedScript}
                      </span>
                    </div>
                    <p className="mb-3 text-xs text-neutral-500">
                      <span dangerouslySetInnerHTML={{ __html: dict.deploy.embedScriptDesc }} />
                    </p>
                    <div className="relative">
                      <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-[10px] text-green-300 leading-relaxed">
{`<script src="${origin}/api/embed/${agent.slug}"></script>`}
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`<script src="${origin}/api/embed/${agent.slug}"></script>`);
                          setCopiedEmbed(true);
                          setTimeout(() => setCopiedEmbed(false), 2000);
                        }}
                        className="absolute top-2 right-2 rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-white hover:bg-white/20 transition-colors"
                      >
                        {copiedEmbed ? dict.deploy.copied : dict.deploy.copy}
                      </button>
                    </div>
                  </div>
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

// --- window.location.origin helpers for useSyncExternalStore ---

function subscribeToLocation() {
  // origin never changes for a page lifetime — no subscription needed.
  return () => {};
}

function getWindowOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return getSiteUrl();
}
