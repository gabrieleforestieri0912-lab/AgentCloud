import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardShell from "@/components/DashboardShell";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { CreditCard, Calendar, CheckCircle2, XCircle, Clock, Receipt, ExternalLink } from "lucide-react";

export default async function SubscriptionsPage() {
  const locale = await getLocale();
  const isIt = locale === "it";
  const dict = getDictionary(locale);
  const user = await getSessionUser();

  const effectiveId = user?.id ?? null;
  const email = false ? "admin@agentcloud.agency" : (user?.email ?? "");

  const db = createAdminClient();
  let active: Array<{ agent_slug: string; status: string; activated_at: string | null; current_period_end: string | null; config: Record<string, unknown> | null }> = [];
  let history: Array<{ agent_slug: string; status: string; activated_at: string | null; cancelled_at: string | null; current_period_end: string | null }> = [];
  let allSubs: Array<{ agent_id: string; status: string; stripe_subscription_id: string | null; created_at: string }> = [];

  if (db && effectiveId) {
    const [{ data: ua }, { data: subs }] = await Promise.all([
      db.from("user_agents").select("agent_slug, status, activated_at, current_period_end, cancelled_at, config").eq("user_id", effectiveId).order("activated_at", { ascending: false }),
      db.from("subscriptions").select("agent_id, status, stripe_subscription_id, created_at").eq("user_id", effectiveId).order("created_at", { ascending: false }).limit(20),
    ]);
    const rows = (ua ?? []) as Array<{ agent_slug: string; status: string; activated_at: string | null; current_period_end: string | null; cancelled_at: string | null; config: Record<string, unknown> | null }>;
    active = rows.filter((r) => r.status === "active") as typeof active;
    history = rows as typeof history;
    allSubs = (subs ?? []) as Array<{ agent_id: string; status: string; stripe_subscription_id: string | null; created_at: string }>;
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(isIt ? "it-IT" : "en-US", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <DashboardShell email={email}>
      <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-white">{dict.subscriptionsPage.mySubscriptions}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              {dict.subscriptionsPage.subscriptionsDesc}
            </p>
          </div>

          {/* Billing actions */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><CreditCard size={18} className="text-brand-400" /> {dict.subscriptionsPage.billing}</h2>
              <p className="mt-2 text-sm text-neutral-400">{dict.subscriptionsPage.billingDesc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/api/billing/portal" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100">
                  {dict.subscriptionsPage.manageOnStripe} <ExternalLink size={14} />
                </Link>
                <Link href="/cart" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
                  {dict.subscriptionsPage.goToCart}
                </Link>
              </div>
              <p className="mt-3 text-xs text-neutral-500">{dict.subscriptionsPage.paypalNote}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Receipt size={18} className="text-emerald-400" /> {dict.subscriptionsPage.invoiceHistory}</h2>
              <p className="mt-2 text-sm text-neutral-400">{dict.subscriptionsPage.invoiceHistoryDesc}</p>
              <p className="mt-3 text-xs text-neutral-500">{dict.subscriptionsPage.localHistory}</p>
            </div>
          </div>

          {/* Attivi */}
          <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-400" /> {`${dict.subscriptionsPage.active} (${active.length})`}</h2>
            {active.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">{dict.subscriptionsPage.noActiveSubscriptions} <Link href="/agents" className="font-bold text-brand-400 hover:underline">{dict.subscriptionsPage.browseAgents}</Link></p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {active.map((s) => (
                  <div key={s.agent_slug} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-sm font-bold text-white">{s.agent_slug}</p>
                    <p className="text-xs text-emerald-300 flex items-center gap-1"><Calendar size={12} /> {dict.subscriptionsPage.activeSince} {formatDate(s.activated_at)} · {dict.subscriptionsPage.nextRenewal} {formatDate(s.current_period_end)}</p>
                    {!!(s.config as Record<string, unknown>)?.paypal && <span className="mt-1 inline-flex rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-bold text-blue-300">PayPal</span>}
                    {!!(s.config as Record<string, unknown>)?.stripeSubscriptionItemId && <span className="ml-1 inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-300">Stripe</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Storico */}
          <div className="mt-6 rounded-2xl border border-white/5 bg-neutral-900 p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Clock size={18} className="text-neutral-400" /> {dict.subscriptionsPage.subscriptionHistory}</h2>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">{dict.subscriptionsPage.noHistory}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-widest text-neutral-500">
                    <tr><th className="py-2">{isIt ? "Agente" : "Agent"}</th><th className="py-2">{isIt ? "Stato" : "Status"}</th><th className="py-2">{isIt ? "Attivato" : "Activated"}</th><th className="py-2">{isIt ? "Scadenza" : "Expires"}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.map((h) => (
                      <tr key={`${h.agent_slug}-${h.activated_at}`} className="text-neutral-300">
                        <td className="py-2 font-bold text-white">{h.agent_slug}</td>
                        <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${h.status === "active" ? "bg-emerald-500/15 text-emerald-300" : h.status === "canceled" ? "bg-red-500/15 text-red-300" : "bg-white/5 text-neutral-400"}`}>{h.status}</span></td>
                        <td className="py-2">{formatDate(h.activated_at)}</td>
                        <td className="py-2">{formatDate(h.current_period_end)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {allSubs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">{isIt ? "Transazioni" : "Transactions"}</p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-500">
                  {allSubs.map((s) => (
                    <li key={s.stripe_subscription_id ?? `${s.agent_id}-${s.created_at}`} className="flex justify-between">
                      <span>{s.agent_id} · {s.status}</span><span>{formatDate(s.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/api/billing/portal" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10">{dict.subscriptionsPage.manageBilling}</Link>
              <Link href="/agents" className="rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-400">{dict.subscriptionsPage.addAgent}</Link>
            </div>
          </div>

          {false && (
            <p className="mt-4 text-xs text-amber-300">Mock admin: nessun dato reale su DB.</p>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
