"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const { dict } = useLanguage();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">(
    "checking",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(false);
  const [saving, setSaving] = useState(false);

  const r = dict.auth.resetPassword;

  // Two supported entry paths:
  // 1. New flow: the email link lands on /auth/callback?next=/reset-password,
  //    which exchanges the PKCE code and redirects here with a live session.
  // 2. Legacy/direct links: the recovery code arrives in the URL hash and is
  //    exchanged here before the password can be updated.
  useEffect(() => {
    let mounted = true;

    async function init() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        if (mounted) setStatus("ready");
        return;
      }

      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const code = params.get("code");
      const tokenHash = params.get("token_hash");

      if (!code && !tokenHash) {
        if (mounted) setStatus("invalid");
        return;
      }
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash!,
          });
      if (mounted) setStatus(error ? "invalid" : "ready");
    }
    void init();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(r.updateFailed);
        return;
      }
      setUpdated(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1200);
    } catch {
      setError(r.updateFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {r.title}
            </h1>
            <p className="mt-2 text-neutral-400">{r.hint}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
            {status === "checking" && (
              <div className="flex items-center justify-center gap-2 py-8 text-neutral-400">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">…</span>
              </div>
            )}

            {status === "invalid" && (
              <div className="text-center">
                <p className="text-sm leading-relaxed text-red-300">{r.invalidLink}</p>
                <Link
                  href="/login"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
                >
                  {r.backToLogin}
                </Link>
              </div>
            )}

            {status === "ready" &&
              (updated ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <CheckCircle2 size={32} className="text-green-400" />
                  <p className="text-sm leading-relaxed text-green-300">
                    {r.success}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-neutral-300">
                      {r.newPassword}
                    </span>
                    <div className="relative">
                      <KeyRound
                        size={15}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={r.newPasswordPlaceholder}
                        className="w-full rounded-xl border border-white/10 bg-neutral-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                      />
                    </div>
                  </label>

                  {error && (
                    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={saving || password.length < 8}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <KeyRound size={16} />
                    )}
                    {r.submit}
                  </button>
                </form>
              ))}
          </div>
        </div>
      </section>
    </main>
  );
}
