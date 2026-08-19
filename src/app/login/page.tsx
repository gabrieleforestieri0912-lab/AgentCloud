"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import BrandIcon from "@/components/BrandIcon";
import { BRANDS } from "@/lib/brands";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";

// Reads ?error=auth_callback (set by /auth/callback when the PKCE exchange
// fails) — isolated in a child component so it can be wrapped in Suspense
// (useSearchParams requires one during static prerender of /login).
function CallbackErrorNotice() {
  const { dict } = useLanguage();
  return (
    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {dict.auth.errors.authCallbackFailed}
    </p>
  );
}

export default function LoginPage() {
  const { dict } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const a = dict.auth;
  const google = BRANDS.google;

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        // Supabase reports pending email confirmation distinctly — show the
        // check-your-inbox message instead of a generic credentials error.
        setError(
          error.message?.toLowerCase().includes("confirm")
            ? a.signup.checkEmail
            : a.errors.invalidCredentials,
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(a.errors.network);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (resetting) return;
    setError("");
    setResetSent("");
    if (!email) {
      setError(a.errors.invalidCredentials);
      return;
    }
    setResetting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        setError(a.errors.invalidCredentials);
        return;
      }
      setResetSent(a.login.resetSent);
    } catch {
      setError(a.errors.network);
    } finally {
      setResetting(false);
    }
  }

  async function handleGoogle() {
    if (googleLoading) return;
    setError("");
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(a.errors.googleFailed);
    } catch {
      setError(a.errors.network);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 pt-24 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {a.login.title}
            </h1>
            <p className="mt-2 text-neutral-400">{a.login.hint}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-neutral-300">
                  {a.login.email}
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={a.login.emailPlaceholder}
                  className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-neutral-300">
                  {a.login.password}
                </span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={a.login.passwordPlaceholder}
                  className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                />
              </label>

              {!error && (
                <Suspense fallback={null}>
                  <CallbackErrorNotice />
                </Suspense>
              )}
              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
              {resetSent && (
                <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                  {resetSent}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Mail size={16} />
                )}
                {a.login.submit}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetting}
                  className="text-xs font-semibold text-neutral-500 transition-colors hover:text-brand-400 disabled:opacity-50"
                >
                  {resetting ? "…" : a.login.forgot}
                </button>
              </div>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                o
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-neutral-800 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-neutral-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                google && <BrandIcon brand={google} size={17} />
              )}
              {a.login.google}
            </button>

            <p className="mt-6 text-center text-sm text-neutral-400">
              {a.login.prompt}{" "}
              <Link
                href="/signup"
                className="font-bold text-brand-400 transition-colors hover:text-brand-300"
              >
                {a.login.link}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
