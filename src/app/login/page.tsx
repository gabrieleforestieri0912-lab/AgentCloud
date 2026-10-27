"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
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
import type { DesktopBridge } from "@/types/desktop";

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

function CompleteAccountNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("reason") !== "complete_account") return null;
  return (
    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
      Per accedere alla piattaforma, ricevi un codice di accesso via email (qui sotto) oppure
      imposta una password con &laquo;Password dimenticata?&raquo;.
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
  const { dict } = useLanguage();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  if (intent !== "shopify" && intent !== "google") return null;
  const app = intent === "shopify" ? "Shopify" : dict.auth.login.googleAppsLabel;
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
  const [otpSent, setOtpSent] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resetting, setResetting] = useState(false);

  const a = dict.auth;

  // App desktop (Electron): la finestra carica questo web app e il login
  // Google DEVE passare dal browser di sistema (Google rifiuta l'OAuth dentro
  // una webview incorporata). Il ritorno arriva con il deep link
  // agentcloud://auth, che il desktop inoltra alla pagina.
  const [desktop, setDesktop] = useState<DesktopBridge | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDesktop(window.agentcloud ?? null);
  }, []);

  // Precompila l'email quando il proxy rimanda qui un waitlist-user
  // (?reason=complete_account&email=...): non conosce la password provvisoria,
  // quindi il link di accesso deve partire con un solo clic.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("email");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (param) setEmail(param.trim());
  }, []);

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
      await completeSignIn();
    } catch {
      setError(a.errors.network);
    } finally {
      setLoading(false);
    }
  }

  // Passi comuni a ogni accesso riuscito (password o codice via email): riscatto
  // della waitlist pre-lancio, profilo con metodo di accesso completato, referral
  // pendente e redirect finale. Volutamente senza try/catch: gli errori di rete
  // sono gestiti dai chiamanti, così ogni flusso mostra il proprio messaggio.
  async function completeSignIn() {
    const supabase = createClient();

    // Beta access: complete waitlist redemption if pending session cookie exists
    if (process.env.NEXT_PUBLIC_ENABLE_WAITLIST_BETA_BYPASS === "true") {
      const sessionMatch = document.cookie.match(/waitlist_session=([^;]+)/);
      const sessionToken = sessionMatch?.[1];
      if (sessionToken) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch(`${supabaseUrl}/functions/v1/complete-waitlist-redemption`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
                "apikey": anonKey,
              },
              body: JSON.stringify({ session_token: sessionToken }),
            });
          }
        } catch {
          // Non-blocking: user still has normal account
        }
        // Clear the cookie
        document.cookie = "waitlist_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    }

    // Set auth_method_completed = true (accesso completo con password o codice)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        await fetch(`${supabaseUrl}/rest/v1/profiles?auth_method_completed=eq.false`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": anonKey,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ auth_method_completed: true }),
        });
        // Phase 2: completa referral pending -> 3 punti al referrer (Open Decision #7)
        try { await fetch("/api/waitlist/complete-referral", { method: "POST" }); } catch {}
      }
    } catch {
      // Non-blocking
    }

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
  }

  // Accesso senza password: invia per email un codice monouso a 6 cifre (lo stesso
  // token del magic link, reso nel template Supabase da {{ .Token }}). Il codice
  // viene poi confermato da handleVerifyEmailCode. `shouldCreateUser: false`
  // impedisce di creare account per email sconosciute.
  async function handleSendEmailCode() {
    if (otpLoading) return;
    setError("");
    setResetSent("");
    setOtpSent("");
    setShowCode(false);
    setCode("");

    const emailCheck = validateAndSanitizeEmail(email);
    if (!emailCheck.valid || !emailCheck.email) {
      setError(emailCheck.error || a.errors.invalidCredentials);
      return;
    }

    setOtpLoading(true);
    try {
      const supabase = createClient();
      const next = getNextParam();
      // Destinazione: l'account, dove l'utente completa/aggiorna i suoi dati.
      const target = next ?? "/account";
      const { error } = await supabase.auth.signInWithOtp({
        email: emailCheck.email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
        },
      });
      // Non riveliamo se l'email è registrata: messaggio generico anche in caso
      // di errore restituito da Supabase (anti-enumerazione).
      if (error) console.warn("[login] codice di accesso non inviato:", error.message);
      setOtpSent(
        `Ti abbiamo inviato un codice di accesso a ${emailCheck.email}. Controlla l'email (anche lo spam) e inseriscilo qui sotto.`,
      );
      setShowCode(true);
    } catch {
      setError(a.errors.network);
    } finally {
      setOtpLoading(false);
    }
  }

  // Conferma del codice ricevuto: crea la sessione e prosegue con gli stessi
  // passi finali del login con password (waitlist, profilo, redirect).
  async function handleVerifyEmailCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (verifying) return;
    setError("");

    const emailCheck = validateAndSanitizeEmail(email);
    if (!emailCheck.valid || !emailCheck.email) {
      setError(emailCheck.error || a.errors.invalidCredentials);
      return;
    }
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      setError("Inserisci il codice a 6 cifre ricevuto per email.");
      return;
    }

    setVerifying(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: emailCheck.email,
        token,
        type: "email",
      });
      if (error) {
        setError("Codice non valido o scaduto. Controlla e riprova.");
        return;
      }
      await completeSignIn();
    } catch {
      setError(a.errors.network);
    } finally {
      setVerifying(false);
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

      // App desktop: il login parte nel browser di sistema e il ritorno
      // arriva con il deep link (l'uso effettivo è gestito da
      // completeSignInFromDeepLink).
      if (desktop) {
        const redirectTo = `agentcloud://auth${
          next ? `?next=${encodeURIComponent(next)}` : ""
        }`;
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            // L'URL torna a noi invece di navigare: lo apriamo noi nel browser.
            skipBrowserRedirect: true,
            scopes: "email profile",
            queryParams: { access_type: "offline", prompt: "consent" },
          },
        });
        if (oauthError || !data?.url) {
          setError(a.errors.googleFailed);
          return;
        }
        await desktop.openExternal(data.url);
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback${
        next ? `?next=${encodeURIComponent(next)}` : ""
      }`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          scopes: "email profile",
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) setError(a.errors.googleFailed);
    } catch {
      setError(a.errors.network);
    } finally {
      setGoogleLoading(false);
    }
  }

  /**
   * Ritorno del login dal browser di sistema (app desktop).
   *
   * Il desktop inoltra il deep link `agentcloud://auth` con i token nel
   * fragmento (`#access_token=...&refresh_token=...`, lo stesso formato del
   * client nativo). Qui si rimette la sessione e si prosegue come dopo un
   * accesso normale.
   */
  const completeSignInFromDeepLink = useCallback(
    async (deepLinkUrl: string) => {
      const supabase = createClient();
      // I token stanno nel fragmento; il "next" nella query.
      const hash = deepLinkUrl.split("#")[1] ?? "";
      const hashParams = new URLSearchParams(hash.replace(/&/g, "&"));
      let queryParams: URLSearchParams;
      try {
        queryParams = new URL(deepLinkUrl).searchParams;
      } catch {
        queryParams = new URLSearchParams();
      }

      const accessToken = hashParams.get("access_token") ?? "";
      const refreshToken = hashParams.get("refresh_token") ?? "";
      if (!accessToken) {
        // Fallback PKCE: se il provider ha restituito un codice invece dei
        // token, si scambia il codice per la sessione.
        const authCode = queryParams.get("code");
        if (!authCode) return;
        setGoogleLoading(true);
        setError("");
        try {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            setError(a.errors.googleFailed);
            return;
          }
          await completeSignIn();
        } catch {
          setError(a.errors.network);
        } finally {
          setGoogleLoading(false);
        }
        return;
      }

      setGoogleLoading(true);
      setError("");
      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError(a.errors.googleFailed);
          return;
        }
        await completeSignIn();
      } catch {
        setError(a.errors.network);
      } finally {
        setGoogleLoading(false);
      }
    },
    // completeSignIn è ricreato a ogni render ma usa solo funzioni stabili.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [a.errors.googleFailed, a.errors.network],
  );

  // Ascolta il deep link finché la pagina è viva.
  useEffect(() => {
    if (!desktop) return;
    const unsubscribe = desktop.onDeepLink((url) => {
      void completeSignInFromDeepLink(url);
    });
    return unsubscribe;
  }, [desktop, completeSignInFromDeepLink]);

  return (
    <main className="relative min-h-dvh overflow-x-hidden dark-gradient-main">
      {/* Sfondo decorativo — stesso linguaggio visivo dell'hero */}
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(3,139,254,.15), transparent 30%), radial-gradient(circle at 90% 16%, rgba(234,67,53,.15), transparent 26%)",
        }}
      />

      {/* Costellazioni fluttuanti di app e agenti ai lati del form */}
      <HeroBubbles />

      {/* Torna alla home — fissato in alto a sinistra della pagina.
          Su questa pagina la navbar non è renderizzata. */}
      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-bold text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
        >
          <Home size={14} className="text-brand-400" />
          {dict.legal.terms.backHome}
        </Link>
      </div>

      <section className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md">
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
                  <CompleteAccountNotice />
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
              {otpSent && (
                <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                  {otpSent}
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

              <button
                type="button"
                onClick={handleSendEmailCode}
                disabled={otpLoading || !email}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-5 py-3 text-sm font-bold text-brand-200 transition-all hover:bg-brand-500/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {otpLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Ricevi un codice di accesso via email
              </button>

              {showCode && (
                <div className="space-y-3 rounded-xl border border-brand-500/30 bg-brand-500/5 p-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-neutral-300">
                      Codice ricevuto per email
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleVerifyEmailCode();
                        }
                      }}
                      placeholder="123456"
                      className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-center text-lg tracking-[0.4em] text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleVerifyEmailCode()}
                    disabled={verifying || code.length !== 6}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verifying ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    Conferma codice
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetting}
                  className="text-xs font-semibold text-neutral-500 transition-colors hover:text-brand-400 disabled:opacity-50"
                >
                  {resetting ? "..." : a.login.forgot}
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
