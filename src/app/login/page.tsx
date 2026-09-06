"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Home, Loader2, Mail } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import HeroBubbles from "@/components/HeroBubbles";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n/dictionaries";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { AlertCircle } from "lucide-react";
import {
  validateAndSanitizeEmail,
  validatePassword,
  checkClientThrottle,
  recordFailedClientAttempt,
  resetClientAttemptThrottle,
  HONEYPOT_FIELD_NAME,
} from "@/lib/forms-security";

// Pagina di login (client): applica difese anti-bot/anti-brute-force prima di
// chiamare Supabase Auth, e riprende i flussi OAuth in sospeso (intent=...).
// Il rilevamento di ?error= / ?intent= vive in componenti figli isolati così
// da poter essere avvolti in Suspense (useSearchParams lo richiede durante il
// prerender statico di /login).
function CallbackErrorNotice() {
  const { dict } = useLanguage();
  const searchParams = useSearchParams();
  if (searchParams.get("error") !== "auth_callback") return null;
  return (
    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {dict.auth.errors.authCallbackFailed}
    </p>
  );
}

// La destinazione "next" usata dagli handler di submit. Lettura diretta da
// window.location (questo componente è montato solo lato client) così la page
// stessa non chiama mai useSearchParams durante il prerender statico.
function getNextParam(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && isSafeRedirectPath(next) ? next : null;
}

// Legge ?intent=shopify|google (impostato quando le route di connessione OAuth
// rimbalzano qui l'utente) e spiega perché gli viene chiesto di accedere.
function ConnectIntentNotice() {
  const { dict, locale } = useLanguage();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  if (intent !== "shopify" && intent !== "google") return null;
  const app =
    intent === "shopify"
      ? "Shopify"
      : locale === "it"
        ? "Gmail e Google Calendar"
        : "Gmail and Google Calendar";
  return (
    <p className="flex items-start gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm leading-5 text-brand-200">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      {t(dict.auth.login.needSigninToConnect, { app })}
    </p>
  );
}

export default function LoginPage() {
  const { dict } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [honeypotValue, setHoneypotValue] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const a = dict.auth;

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    // 1. Controllo Honeypot Anti-Bot
    if (honeypotValue.trim().length > 0) {
      setError("Richiesta non valida.");
      return;
    }

    // 2. Controllo Throttling Client-Side contro attacchi brute-force / dictionary
    const throttle = checkClientThrottle("login_attempt");
    if (!throttle.allowed) {
      setError(`Troppi tentativi falliti. Riprova tra ${throttle.retryAfterSeconds} secondi.`);
      return;
    }

    // 3. Validazione e sanitizzazione email preventiva
    const emailCheck = validateAndSanitizeEmail(email);
    if (!emailCheck.valid || !emailCheck.email) {
      setError(emailCheck.error || a.errors.invalidCredentials);
      return;
    }

    // 4. Validazione password (lunghezza minima/massima anti DoS crittografico)
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      setError(pwdCheck.error || a.errors.invalidCredentials);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: emailCheck.email,
        password,
      });
      if (error) {
        // Registra il tentativo fallito per il throttling brute force
        recordFailedClientAttempt("login_attempt", 5, 30);
        setError(
          error.message?.toLowerCase().includes("confirm")
            ? a.signup.checkEmail
            : a.errors.invalidCredentials,
        );
        return;
      }
      // Accesso riuscito: reset contatore tentativi
      resetClientAttemptThrottle("login_attempt");

      // Riprende una connessione OAuth in sospeso (es. install Shopify) dopo
      // il login — la route è un redirect API verso il provider esterno,
      // quindi serve una navigazione piena, non un routing client-side.
      const next = getNextParam();
      if (next) {
        window.location.assign(next);
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

    const emailCheck = validateAndSanitizeEmail(email);
    if (!emailCheck.valid || !emailCheck.email) {
      setError(emailCheck.error || a.errors.invalidCredentials);
      return;
    }

    setResetting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(emailCheck.email, {
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
      const next = getNextParam();
      const redirectTo = `${window.location.origin}/auth/callback${
        next ? `?next=${encodeURIComponent(next)}` : ""
      }`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) setError(a.errors.googleFailed);
    } catch {
      setError(a.errors.network);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[linear-gradient(180deg,#0a0a0f_0%,#12121a_58%,#0a0a0f_100%)]">
      {/* Sfondo decorativo — stesso linguaggio visivo dell'hero */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(3,139,254,.15), transparent 30%), radial-gradient(circle at 90% 16%, rgba(234,67,53,.15), transparent 26%)",
        }}
      />

      {/* Costellazioni fluttuanti di app e agenti ai lati del form */}
      <HeroBubbles />

      <section className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md">
          {/* Torna alla home — su questa pagina la navbar non è renderizzata */}
          <div className="mb-6 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-bold text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
            >
              <Home size={14} className="text-brand-400" />
              {dict.legal.terms.backHome}
            </Link>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {a.login.title}
            </h1>
            <p className="mt-2 text-neutral-400">{a.login.hint}</p>
            <div className="mt-3">
              <Suspense fallback={null}>
                <ConnectIntentNotice />
              </Suspense>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {/* Campo trappola Honeypot Anti-Bot invisibile */}
              <div
                style={{
                  position: "absolute",
                  left: "-9999px",
                  opacity: 0,
                  height: 0,
                  width: 0,
                  overflow: "hidden",
                }}
                aria-hidden="true"
              >
                <input
                  type="text"
                  name={HONEYPOT_FIELD_NAME}
                  value={honeypotValue}
                  onChange={(e) => setHoneypotValue(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

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
                <BrandLogo slug="google" size={17} />
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
