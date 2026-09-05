"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
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
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentIcon from "@/components/AgentIcon";
import { useLanguage } from "@/components/LanguageProvider";
import { getAgentBySlug, localizeAgent, type Agent } from "@/lib/agents";
import { getSiteUrl } from "@/lib/site-url";
import { t } from "@/lib/i18n/dictionaries";
import type { DeployConnections } from "./page";

const NO_CONNECTIONS: DeployConnections = {
  shopifyConnected: false,
  shopifyShops: [],
  googleConnected: false,
  googleEmail: null,
};

/**
 * Which real OAuth connector an integration label maps to.
 *   "shopify" → Shopify OAuth (needs the store domain first)
 *   "google"  → Google OAuth (Gmail + Calendar, read-only)
 *   null      → no live connector yet: the agent chat is where the
 *               user can try the agent and reach its tools.
 */
type ConnectorKind = "shopify" | "google" | null;

function integrationKind(integration: string): ConnectorKind {
  const key = integration.toLowerCase();
  if (key.includes("shopify")) return "shopify";
  if (key === "gmail" || key.includes("google") || key.includes("sheets")) {
    return "google";
  }
  return null;
}

export default function DeployAgentClient({
  slug,
  marketplaceAgents,
  connections = NO_CONNECTIONS,
}: {
  slug: string;
  /** Navbar agent list resolved server-side (the FULL catalog for access holders). */
  marketplaceAgents?: Agent[];
  /** Real per-user connection state (server-side), for the active badges. */
  connections?: DeployConnections;
}) {
  const { dict, locale } = useLanguage();
  const router = useRouter();
  const rawAgent = getAgentBySlug(slug);
  const agent = rawAgent ? localizeAgent(rawAgent, locale) : undefined;
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Integration currently expanding its inline Shopify connect form.
  const [connectingIntegration, setConnectingIntegration] = useState<
    string | null
  >(null);
  const [shopDomain, setShopDomain] = useState("");
  // Outcome of a just-finished OAuth round-trip (?shopify= / ?google=), shown
  // inline on this page instead of bouncing the user to the dashboard.
  const [banner, setBanner] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const parseOutcome = (
      key: string,
      successLabel: string,
    ): { kind: "ok" | "err"; msg: string } | null => {
      const val = params.get(key);
      if (val === "connected") return { kind: "ok", msg: successLabel };
      if (val === "error") {
        return {
          kind: "err",
          msg: t(dict.common.connectFailed, {
            reason: params.get("reason") ?? "error",
          }),
        };
      }
      return null;
    };
    const outcome =
      parseOutcome("shopify", dict.common.connectSuccess) ??
      parseOutcome("google", dict.common.connectSuccess);
    if (outcome) {
      setBanner(outcome);
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = dict.deploy.steps;

  // window.location.origin is only known on the client — subscribe to it
  // directly (useSyncExternalStore) instead of setState-in-effect.
  const origin = useSyncExternalStore(
    subscribeToLocation,
    getWindowOrigin,
    getServerOrigin,
  );

  if (!agent) notFound();

  /**
   * What happens when the user clicks "Connetti" on a tool:
   *  - Shopify → expand the inline store-domain form, then OAuth
   *    (/api/shopify/install?shop=<domain>)
   *  - Google tools (Gmail, Google Calendar, …) → Google OAuth consent
   *    (/api/auth/google/connect)
   *  - any other tool → open the agent's live chat, where the agent can be
   *    tried and its available tools used.
   */
  const startConnect = (integration: string) => {
    const kind = integrationKind(integration);
    const isConnected =
      (kind === "shopify" && connections.shopifyConnected) ||
      (kind === "google" && connections.googleConnected);
    // Already connected → manage/disconnect from the dashboard.
    if (isConnected) {
      router.push("/dashboard");
      return;
    }
    if (kind === "shopify") {
      setShopDomain("");
      setConnectingIntegration((cur) =>
        cur === integration ? null : integration,
      );
      return;
    }
    if (kind === "google") {
      const returnTo = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.assign(`/api/auth/google/connect?returnTo=${returnTo}`);
      return;
    }
    router.push(`/chat?agent=${agent.slug}`);
  };

  const connectShopify = (domain: string) => {
    const s = domain.trim().toLowerCase();
    if (!s) return;
    const u = new URL("/api/shopify/install", window.location.origin);
    u.searchParams.set("shop", s);
    u.searchParams.set("returnTo", window.location.pathname + window.location.search);
    window.location.href = u.toString();
  };

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar marketplaceAgents={marketplaceAgents} />

      <section className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href={`/agents/${agent.slug}`}
            className="group mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm font-bold text-neutral-400 backdrop-blur transition-colors hover:border-white/20 hover:text-white"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            {dict.deploy.backToAgent}
          </Link>

          {/* Agent header card */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-white/5 bg-neutral-900 shadow-sm">
            <div className="border-b border-white/5 bg-linear-to-r from-neutral-900 to-neutral-950 px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${agent.accent} shadow-lg shadow-black/20`}
                  >
                    <AgentIcon
                      icon={agent.icon}
                      brand={agent.brand}
                      size={22}
                      className="text-white"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                      {t(dict.deploy.configureTitle, { name: agent.shortName })}
                    </h1>
                    <p className="mt-0.5 text-sm font-semibold text-neutral-400">
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
                            : "bg-neutral-800 text-neutral-500"
                        }`}
                      >
                        {index === 0 ? <Settings2 size={13} /> : index + 1}
                      </div>
                      <span
                        className={`hidden text-sm font-semibold md:block ${
                          index === 0 ? "text-brand-400" : "text-neutral-500"
                        }`}
                      >
                        {step}
                      </span>
                      {index < steps.length - 1 && (
                        <ChevronRight size={14} className="text-neutral-700" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {banner && (
            <div
              className={`mb-8 rounded-xl border px-4 py-3 text-sm font-semibold ${
                banner.kind === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {banner.msg}
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* Main column */}
            <div className="space-y-6">
              {/* Agent settings */}
              <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-2.5 border-b border-white/5 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                    <Settings2 size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {dict.deploy.agentSettings}
                    </h2>
                    <p className="text-xs font-semibold text-neutral-500">
                      {dict.deploy.agentSettingsDesc}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-300">
                      <User size={14} className="text-brand-400" />
                      {dict.deploy.businessName}
                    </span>
                    <input
                      defaultValue="Acme Studio"
                      className="h-11 w-full rounded-xl border border-white/10 bg-neutral-800 px-4 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-300">
                      <Zap size={14} className="text-brand-400" />
                      {dict.deploy.mainGoal}
                    </span>
                    <input
                      defaultValue={agent.tasks[0]}
                      className="h-11 w-full rounded-xl border border-white/10 bg-neutral-800 px-4 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-300">
                      <Volume2 size={14} className="text-brand-400" />
                      {dict.deploy.tone}
                    </span>
                    <select
                      defaultValue={dict.deploy.toneOptions[0]}
                      className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-neutral-800 px-4 text-sm text-white outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a3a3a3%22%20strokeWidth%3D%222%22%20strokeLinecap%3D%22round%22%20strokeLinejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-size-[16px] bg-position-[right_14px_center] bg-no-repeat"
                    >
                      {dict.deploy.toneOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-300">
                      <Shield size={14} className="text-brand-400" />
                      {dict.deploy.escalation}
                    </span>
                    <select
                      defaultValue={dict.deploy.escalationOptions[0]}
                      className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-neutral-800 px-4 text-sm text-white outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a3a3a3%22%20strokeWidth%3D%222%22%20strokeLinecap%3D%22round%22%20strokeLinejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-size-[16px] bg-position-[right_14px_center] bg-no-repeat"
                    >
                      {dict.deploy.escalationOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Connect tools */}
              <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-2.5 border-b border-white/5 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                    <Plug size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {dict.deploy.connectTools}
                    </h2>
                    <p className="text-xs font-semibold text-neutral-500">
                      {dict.deploy.connectToolsDesc}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {agent.integrations.map((integration) => {
                    const kind = integrationKind(integration);
                    const expanded = connectingIntegration === integration;
                    const connected =
                      (kind === "shopify" && connections.shopifyConnected) ||
                      (kind === "google" && connections.googleConnected);
                    const connectedDetail =
                      kind === "shopify"
                        ? connections.shopifyShops[0]
                        : kind === "google"
                          ? connections.googleEmail
                          : undefined;
                    return (
                      <div key={integration}>
                        <button
                          type="button"
                          onClick={() => startConnect(integration)}
                          className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
                            connected
                              ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                              : "border-white/5 bg-neutral-800/60 hover:border-brand-500/30 hover:bg-neutral-800"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                                connected
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-white/5 text-neutral-400 group-hover:bg-brand-500/15 group-hover:text-brand-400"
                              }`}
                            >
                              <Plug size={16} />
                            </span>
                            <span>
                              <span className="block text-sm font-bold text-white">
                                {integration}
                              </span>
                              {connected ? (
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  {dict.deploy.connected}
                                  {connectedDetail ? ` · ${connectedDetail}` : ""}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-neutral-500">
                                  {kind
                                    ? locale === "it"
                                      ? "Collegamento sicuro OAuth"
                                      : "Secure OAuth connection"
                                    : locale === "it"
                                      ? "Provalo nella chat dell'agente"
                                      : "Try it in the agent chat"}
                                </span>
                              )}
                            </span>
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                              connected
                                ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 group-hover:bg-emerald-500/20"
                                : "border border-brand-500/40 bg-brand-500/10 text-brand-300 group-hover:bg-brand-500 group-hover:text-white"
                            }`}
                          >
                            {connected ? dict.deploy.manage : dict.deploy.connect}
                            <ArrowRight
                              size={12}
                              className="transition-transform group-hover:translate-x-0.5"
                            />
                          </span>
                        </button>

                        {/* Inline Shopify domain form (unfolded on click) */}
                        {expanded && kind === "shopify" && !connected && (
                          <div className="mt-2 rounded-xl border border-white/5 bg-neutral-900 p-3">
                            <div className="flex gap-2">
                              <input
                                value={shopDomain}
                                onChange={(e) => setShopDomain(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    connectShopify(shopDomain);
                                }}
                                placeholder="tuo-store.myshopify.com"
                                autoFocus
                                className="h-10 flex-1 rounded-xl border border-white/10 bg-neutral-800 px-4 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                              />
                              <button
                                type="button"
                                onClick={() => connectShopify(shopDomain)}
                                disabled={!shopDomain.trim()}
                                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <ExternalLink size={14} />
                                {dict.deploy.connect}
                              </button>
                            </div>
                            <p className="mt-2 text-xs text-neutral-500">
                              {locale === "it"
                                ? "Verrà avviato il flusso OAuth di Shopify per autorizzare l'accesso dell'agente al tuo store."
                                : "The Shopify OAuth flow will start to authorize the agent's access to your store."}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2.5 border-b border-white/5 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                    <Rocket size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {dict.deploy.deploymentSummary}
                    </h2>
                    <p className="text-xs font-semibold text-neutral-500">
                      {dict.deploy.reviewBefore}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">
                      {dict.deploy.agent}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {agent.shortName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">
                      {dict.deploy.category}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {agent.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">
                      {dict.deploy.setupTime}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {agent.setupTime}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  <div className="rounded-xl border border-white/5 bg-neutral-800/60 p-3.5 transition-all hover:border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {dict.deploy.starter}
                        </p>
                        <p className="text-xs text-neutral-500">€29/mese</p>
                      </div>
                      <span className="text-[10px] font-semibold text-neutral-500">
                        300 conv/mese
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      <li className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <Check size={11} className="text-brand-400" />
                        {dict.deploy.toolsBase}
                      </li>
                      <li className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <Check size={11} className="text-brand-400" />
                        {dict.deploy.leadCapture}
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 p-3.5 transition-all hover:border-brand-500/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {dict.deploy.growth}
                        </p>
                        <p className="text-xs text-neutral-400">€39/mese</p>
                      </div>
                      <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                        {dict.deploy.popular}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-500">
                      <span>1.000 conv/mese</span>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      <li className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <Check size={11} className="text-brand-400" />
                        {dict.deploy.fullTools}
                      </li>
                      <li className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <Check size={11} className="text-brand-400" />
                        {dict.deploy.leadCapture}
                      </li>
                      <li className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <Check size={11} className="text-brand-400" />
                        {dict.deploy.prioritySupport}
                      </li>
                    </ul>
                  </div>
                </div>

                <label className="mt-6 flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-500 text-brand-500 accent-brand-500"
                  />
                  <span className="text-xs leading-relaxed text-neutral-400">
                    {dict.deploy.consentPrefix}{" "}
                    <Link
                      href="/terms"
                      className="font-semibold text-brand-400 hover:underline"
                    >
                      {dict.deploy.consentTerms}
                    </Link>{" "}
                    {dict.deploy.consentConjunction}{" "}
                    <Link
                      href="/privacy"
                      className="font-semibold text-brand-400 hover:underline"
                    >
                      {dict.deploy.consentPrivacy}
                    </Link>
                    .
                  </span>
                </label>

                <button
                  type="button"
                  disabled={isCheckingOut || !acceptedTerms}
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
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Rocket size={16} />
                  {isCheckingOut ? dict.common.close : dict.deploy.requestDemo}
                </button>

                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-amber-400"
                  />
                  <p className="text-xs leading-relaxed text-amber-200">
                    {dict.deploy.flowNote}
                  </p>
                </div>
              </div>

              {/* Delivery options */}
              <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2.5 border-b border-white/5 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {dict.deploy.deliveryOptions}
                    </h2>
                    <p className="text-xs font-semibold text-neutral-500">
                      {dict.deploy.deliveryOptionsDesc}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Option B: Direct link */}
                  <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                        B
                      </span>
                      <span className="text-sm font-bold text-white">
                        {dict.deploy.directLink}
                      </span>
                      <span className="ml-auto rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                        {dict.deploy.recommended}
                      </span>
                    </div>
                    <p className="mb-3 text-xs font-semibold text-neutral-400">
                      {dict.deploy.directLinkDesc}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={`${origin}/a/${agent.slug}`}
                        className="h-9 flex-1 rounded-lg border border-white/10 bg-neutral-900 px-3 text-xs text-neutral-300 outline-none select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${origin}/a/${agent.slug}`,
                          );
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="h-9 shrink-0 rounded-lg bg-brand-500 px-3 text-xs font-bold text-white transition-colors hover:bg-brand-400"
                      >
                        {copiedLink ? dict.deploy.copied : dict.deploy.copy}
                      </button>
                    </div>
                  </div>

                  {/* Option A: Embed script */}
                  <div className="rounded-xl border border-white/5 bg-neutral-800/60 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-bold">
                        A
                      </span>
                      <span className="text-sm font-bold text-white">
                        {dict.deploy.embedScript}
                      </span>
                    </div>
                    <p className="mb-3 text-xs font-semibold text-neutral-500">
                      <span dangerouslySetInnerHTML={{ __html: dict.deploy.embedScriptDesc }} />
                    </p>
                    <div className="relative">
                      <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-3 text-[10px] leading-relaxed text-green-400">
{`<script src="${origin}/api/embed/${agent.slug}"></script>`}
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `<script src="${origin}/api/embed/${agent.slug}"></script>`,
                          );
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
