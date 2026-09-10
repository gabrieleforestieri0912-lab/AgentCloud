"use client";

// Client della pagina account: gestisce modifica nome, logout, eliminazione
// profilo e mostra piano/connessioni. Riceve dal server component i dati già
// verificati (isMock = admin via codice → nessuna scrittura sul DB).
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import { User, Mail, Shield, CreditCard, Plug, Trash2, LogOut, CheckCircle2, AlertCircle, Save } from "lucide-react";

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
  locale: string;
}) {
  const { dict } = useLanguage();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Errore" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try { await createClient().auth.signOut(); } catch {}
    window.location.href = "/waitlist";
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
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Errore" });
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
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300 text-lg font-bold">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User size={16} className="text-brand-400" />
              {dict.chat.accountProfile}
              {isAdmin && <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-300">Admin</span>}
            </h2>
            <p className="text-sm text-neutral-500">{firstName} · {initialEmail}</p>
            {createdAt && <p className="text-xs text-neutral-600">{dict.chat.createdOn} {new Date(createdAt).toLocaleDateString(locale === "it" ? "it-IT" : "en-US")}</p>}
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
            <Link href="/integrations" className="mt-3 inline-flex text-xs font-bold text-brand-400 hover:underline">{dict.chat.accountManage} →</Link>
          </div>
          <div className="rounded-xl border border-white/5 bg-neutral-800 p-4">
            <p className="text-sm font-bold text-white">Google</p>
            <p className="text-xs text-neutral-500">{googleEmail ?? (dict.chat.accountNotConnected)}</p>
            <Link href="/dashboard" className="mt-3 inline-flex text-xs font-bold text-brand-400 hover:underline">{dict.chat.accountManage} →</Link>
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
            Privacy
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
