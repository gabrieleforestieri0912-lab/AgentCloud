"use client";

// Client della pagina account: gestisce modifica nome, logout, eliminazione
// profilo e mostra piano/connessioni. Riceve dal server component i dati già
// verificati (isMock = admin via codice → nessuna scrittura sul DB).
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";
import { useAccountSession } from "@/lib/use-account-session";
import { t } from "@/lib/i18n/dictionaries";
import { DATE_LOCALES, type Locale } from "@/lib/i18n/constants";
import { User, Mail, Shield, CreditCard, Plug, Trash2, LogOut, CheckCircle2, AlertCircle, Save, Unplug, Loader2 } from "lucide-react";

export default function AccountClient({
  initialEmail,
  initialName,
  firstName,
  isAdmin,
  isMock,
  createdAt,
  plan,
  shopifyShops,
  googleEmail,
  locale,
}: {
  initialEmail: string;
  initialName: string;
  firstName: string;
  isAdmin: boolean;
  isMock: boolean;
  createdAt: string | null;
  plan: string | null;
  shopifyShops: string[];
  googleEmail: string | null;
  locale: Locale;
}) {
  const { dict } = useLanguage();
  const { avatarUrl } = useAccountSession();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [google, setGoogle] = useState<string | null>(googleEmail);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleSaveName() {
    if (isMock) {
      setMsg({ kind: "err", text: dict.chat.accountMockError });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) throw error;
      setMsg({ kind: "ok", text: dict.chat.accountNameUpdated });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : dict.chat.accountError });
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try { await createClient().auth.signOut(); } catch {}
    window.location.replace("/waitlist");
  }

  async function handleUpdateEmail() {
    const value = newEmail.trim().toLowerCase();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value === initialEmail.toLowerCase()) return;
    if (isMock) {
      setMsg({ kind: "err", text: dict.chat.accountMockError });
      return;
    }
    setUpdatingEmail(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: value });
      if (error) throw error;
      setNewEmail("");
      setMsg({ kind: "ok", text: dict.chat.accountEmailUpdateSent });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : dict.chat.accountError });
    } finally {
      setUpdatingEmail(false);
    }
  }

  async function handleGoogleDisconnect() {
    if (!confirm(dict.chat.accountDisconnectConfirm)) return;
    setDisconnecting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setGoogle(null);
      setMsg({ kind: "ok", text: dict.chat.accountSaved });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : dict.chat.accountError });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(dict.chat.accountDeleteConfirm)) return;
    setDeleting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || (dict.chat.accountDeleteError));
      }
      // Account cancellato — reindirizza alla home
      window.location.href = "/";
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : dict.chat.accountError });
      setDeleting(false);
    }
  }

  const initials = (initialName || initialEmail || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

  return (
    <div className="space-y-6">
      {/* Profilo */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <div className="flex items-start gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-500/15 text-brand-300 text-lg font-bold">
            <span>{initials}</span>
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
              />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User size={16} className="text-brand-400" />
              {dict.chat.accountProfile}
              {isAdmin && <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-300">Admin</span>}
            </h2>
            <p className="text-sm text-neutral-500">{firstName} · {initialEmail}</p>
            {createdAt && <p className="text-xs text-neutral-600">{dict.chat.createdOn} {new Date(createdAt).toLocaleDateString(DATE_LOCALES[locale])}</p>}
          </div>
          <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-neutral-300 hover:bg-white/5">
            <LogOut size={14} /> {dict.navbar.logOut}
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-neutral-300">{dict.chat.accountName}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={dict.chat.accountNamePlaceholder} className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-500/50" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-neutral-300">Email</span>
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-neutral-800 px-4 py-2.5 text-sm text-neutral-400">
              <Mail size={14} />
              {initialEmail}
            </div>
          </label>
        </div>
        <div className="mt-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-neutral-300">{dict.chat.accountNewEmail}</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUpdateEmail(); }}
                type="email"
                placeholder={initialEmail}
                className="flex-1 rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-500/50"
              />
              <button
                onClick={handleUpdateEmail}
                disabled={updatingEmail || isMock || !newEmail.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
              >
                {updatingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {dict.chat.accountUpdateEmail}
              </button>
            </div>
          </label>
        </div>
        {msg && (
          <p className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold ${msg.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>
            {msg.kind === "ok" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {msg.text}
          </p>
        )}
      </div>

      {/* Piano */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <CreditCard size={16} className="text-brand-400" />
          {dict.chat.accountPlanBilling}
        </h3>
        <p className="mt-2 text-sm text-neutral-400">
          {plan ? t(dict.chat.accountCurrentPlan, { plan }) : dict.chat.accountNoPlan}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/agents" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100">
            {dict.chat.accountBrowseAgents}
          </Link>
          <Link href="/dashboard" className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
            {dict.dashboard.myAgents}
          </Link>
          <Link href="/dashboard/subscriptions" className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
            {dict.navbar.subscriptions}
          </Link>
          <Link href="/api/billing/portal" className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
            {dict.chat.accountManageBilling}
          </Link>
        </div>
      </div>

      {/* Connessioni */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <Plug size={16} className="text-purple-400" />
          {dict.chat.accountConnections}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-neutral-800 p-4">
            <p className="text-sm font-bold text-white">Shopify</p>
            <p className="text-xs text-neutral-500">{shopifyShops.length ? shopifyShops.join(", ") : dict.chat.accountNotConnected}</p>
            <Link href="/dashboard/integrations" className="mt-3 inline-flex text-xs font-bold text-brand-400 hover:underline">{dict.chat.accountManage} →</Link>
          </div>
          <div className="rounded-xl border border-white/5 bg-neutral-800 p-4">
            <p className="text-sm font-bold text-white">Google</p>
            <p className="text-xs text-neutral-500">{google ?? (dict.chat.accountNotConnected)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link href="/dashboard/integrations" className="inline-flex text-xs font-bold text-brand-400 hover:underline">{dict.chat.accountManage} →</Link>
              {google && (
                <button
                  onClick={handleGoogleDisconnect}
                  disabled={disconnecting || isMock}
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-300 hover:text-red-200 disabled:opacity-50"
                >
                  {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <Unplug size={12} />}
                  {dict.chat.accountDisconnect}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sicurezza */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <Shield size={16} className="text-emerald-400" />
          {dict.chat.accountSecurity}
        </h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/reset-password" className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
            {dict.chat.accountChangePassword}
          </Link>
          <Link href="/privacy" className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
            {dict.footer.privacy}
          </Link>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-red-300">
          <Trash2 size={16} />
          {dict.chat.accountDangerZone}
        </h3>
        <p className="mt-2 text-sm text-red-200/70">
          {dict.chat.accountDangerDesc}
        </p>
        <button onClick={handleDelete} disabled={deleting || isMock} className="mt-4 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-50">
          {deleting ? "..." : dict.chat.accountDelete}
        </button>
      </div>

      {/* Bottone unico sticky */}
      <div className="sticky bottom-4 z-20 mt-2 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-900/95 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="hidden text-sm font-semibold text-neutral-400 sm:block">
          {dict.chat.accountSaveAll}
        </p>
        <span className="sm:hidden text-sm font-semibold text-neutral-500">{dict.chat.accountReadyToSave}</span>
        <button
          onClick={handleSaveName}
          disabled={saving || isMock}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "..." : dict.chat.settingsSaveChanges}
        </button>
      </div>
    </div>
  );
}
