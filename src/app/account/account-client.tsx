"use client";

// Client della pagina account: gestisce modifica nome, logout, eliminazione
// profilo e mostra piano/connessioni. Riceve dal server component i dati già
// verificati (isMock = admin via codice → nessuna scrittura sul DB).
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Shield, CreditCard, Plug, Trash2, LogOut, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

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
  const isIt = locale === "it";
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSaveName() {
    if (isMock) {
      setMsg({ kind: "err", text: isIt ? "Modalità mock: nessuna scrittura su DB." : "Mock mode: no DB writes." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) throw error;
      setMsg({ kind: "ok", text: isIt ? "Nome aggiornato." : "Name updated." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Errore" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  async function handleDelete() {
    if (!confirm(isIt ? "Eliminare definitivamente l'account? Azione irreversibile." : "Permanently delete account? Irreversible.")) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      // Supabase non permette la self-delete dal client; servirebbe una route API.
      // Per ora: logout e rimando al supporto (pagina contatti).
      await supabase.auth.signOut();
      window.location.href = "/contact";
    } finally {
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
              {isIt ? "Profilo" : "Profile"}
              {isAdmin && <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-300">Admin</span>}
            </h2>
            <p className="text-sm text-neutral-500">{firstName} · {initialEmail}</p>
            {createdAt && <p className="text-xs text-neutral-600">{isIt ? "Creato il" : "Created"} {new Date(createdAt).toLocaleDateString(locale === "it" ? "it-IT" : "en-US")}</p>}
          </div>
          <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-neutral-300 hover:bg-white/5">
            <LogOut size={14} /> {isIt ? "Esci" : "Sign out"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-neutral-300">{isIt ? "Nome" : "Name"}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={isIt ? "Mario Rossi" : "John Doe"} className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-500/50" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-neutral-300">Email</span>
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-neutral-800 px-4 py-2.5 text-sm text-neutral-400">
              <Mail size={14} />
              {initialEmail}
            </div>
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleSaveName} disabled={saving || isMock} className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-400 disabled:opacity-50">
            {saving ? "..." : isIt ? "Salva nome" : "Save name"}
          </button>
          {msg && (
            <span className={`inline-flex items-center gap-1 text-sm font-semibold ${msg.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>
              {msg.kind === "ok" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {msg.text}
            </span>
          )}
        </div>
      </div>

      {/* Piano */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <CreditCard size={16} className="text-brand-400" />
          {isIt ? "Piano e fatturazione" : "Plan & billing"}
        </h3>
        <p className="mt-2 text-sm text-neutral-400">
          {plan ? (isIt ? `Piano attuale: ${plan}` : `Current plan: ${plan}`) : isIt ? "Nessun piano attivo." : "No active plan."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/agents" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100">
            {isIt ? "Sfoglia agenti" : "Browse agents"}
          </Link>
          <Link href="/api/billing/portal" className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
            {isIt ? "Gestisci abbonamento" : "Manage billing"}
          </Link>
        </div>
      </div>

      {/* Connessioni */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <Plug size={16} className="text-purple-400" />
          {isIt ? "Connessioni" : "Connections"}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-neutral-800 p-4">
            <p className="text-sm font-bold text-white">Shopify</p>
            <p className="text-xs text-neutral-500">{shopifyShops.length ? shopifyShops.join(", ") : isIt ? "Non collegato" : "Not connected"}</p>
            <Link href="/integrations" className="mt-3 inline-flex text-xs font-bold text-brand-400 hover:underline">{isIt ? "Gestisci" : "Manage"} →</Link>
          </div>
          <div className="rounded-xl border border-white/5 bg-neutral-800 p-4">
            <p className="text-sm font-bold text-white">Google</p>
            <p className="text-xs text-neutral-500">{googleEmail ?? (isIt ? "Non collegato" : "Not connected")}</p>
            <Link href="/dashboard" className="mt-3 inline-flex text-xs font-bold text-brand-400 hover:underline">{isIt ? "Gestisci" : "Manage"} →</Link>
          </div>
        </div>
      </div>

      {/* Sicurezza */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <Shield size={16} className="text-emerald-400" />
          {isIt ? "Sicurezza" : "Security"}
        </h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/reset-password" className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
            {isIt ? "Cambia password" : "Change password"}
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
          {isIt ? "Zona pericolosa" : "Danger zone"}
        </h3>
        <p className="mt-2 text-sm text-red-200/70">
          {isIt ? "Eliminare l'account è irreversibile. Contatta il supporto se hai bisogno di assistenza." : "Deleting your account is irreversible. Contact support if you need help."}
        </p>
        <button onClick={handleDelete} disabled={deleting || isMock} className="mt-4 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-50">
          {deleting ? "..." : isIt ? "Elimina account" : "Delete account"}
        </button>
      </div>
    </div>
  );
}
