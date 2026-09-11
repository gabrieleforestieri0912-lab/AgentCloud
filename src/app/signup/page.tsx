"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Loader2, Mail, User } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import HeroBubbles from "@/components/HeroBubbles";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import {
  validateAndSanitizeEmail,
  validatePassword,
  validateFullName,
  checkClientThrottle,
  recordFailedClientAttempt,
  resetClientAttemptThrottle,
  HONEYPOT_FIELD_NAME,
} from "@/lib/forms-security";

// Pagina di registrazione (client): come il login, applica in sequenza
// honeypot anti-bot, throttling anti-spam e validazioni preventive prima di
// creare l'utente su Supabase Auth.
export default function SignupPage() {
  const { dict } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [honeypotValue, setHoneypotValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const a = dict.auth;

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    // 1. Controllo Honeypot Anti-Bot
    if (honeypotValue.trim().length > 0) {
      setError("Richiesta non valida.");
      return;
    }

    // 2. Throttling client-side contro registrazioni massive / spam
    const throttle = checkClientThrottle("signup_attempt");
    if (!throttle.allowed) {
      setError(`Troppi tentativi consecutivi. Attendi ${throttle.retryAfterSeconds} secondi.`);
      return;
    }

    // 3. Validazione e sanitizzazione del nome (max 80 caratteri, anti-XSS)
    const nameCheck = validateFullName(name);
    if (!nameCheck.valid) {
      setError(nameCheck.error || a.errors.signupFailed);
      return;
    }

    // 4. Validazione e sanitizzazione dell'email (RFC 5321, no byte nulli, no CRLF)
    const emailCheck = validateAndSanitizeEmail(email);
    if (!emailCheck.valid || !emailCheck.email) {
      setError(emailCheck.error || a.errors.signupFailed);
      return;
    }

    // 5. Validazione robustezza password (8-128 caratteri, anti-DoS crittografico)
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      setError(pwdCheck.error || a.errors.signupFailed);
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: emailCheck.email,
        password,
        options: {
          data: { full_name: nameCheck.name || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) {
        recordFailedClientAttempt("signup_attempt", 5, 60);
        setError(a.errors.signupFailed);
        return;
      }
      resetClientAttemptThrottle("signup_attempt");

      // Se la conferma email è attiva non esiste ancora una sessione: si
      // chiede all'utente di controllare la casella; altrimenti si va
      // direttamente alla dashboard.
      if (data.session) {
        // Beta access: complete waitlist redemption if pending session cookie exists
        if (process.env.NEXT_PUBLIC_ENABLE_WAITLIST_BETA_BYPASS === "true") {
          const sessionMatch = document.cookie.match(/waitlist_session=([^;]+)/);
          const sessionToken = sessionMatch?.[1];
          if (sessionToken) {
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
              const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
              await fetch(`${supabaseUrl}/functions/v1/complete-waitlist-redemption`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${data.session.access_token}`,
                  "apikey": anonKey,
                },
                body: JSON.stringify({ session_token: sessionToken }),
              });
            } catch {
              // Non-blocking: user still has normal account
            }
            // Clear the cookie
            document.cookie = "waitlist_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          }
        }
        // Set auth_method_completed = true (signup = full auth)
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
          await fetch(`${supabaseUrl}/rest/v1/profiles?auth_method_completed=eq.false`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${data.session.access_token}`,
              "apikey": anonKey,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ auth_method_completed: true }),
          });
        } catch {
          // Non-blocking
        }
        router.push("/dashboard");
        router.refresh();
      } else {
        setSuccess(a.signup.checkEmail);
      }
    } catch {
      setError(a.errors.network);
    } finally {
      setLoading(false);
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
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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

  return (
    <main className="relative min-h-dvh overflow-x-hidden dark-gradient-main">
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
              {a.signup.title}
            </h1>
            <p className="mt-2 text-neutral-400">{a.signup.hint}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
            <form onSubmit={handleEmailSignup} className="space-y-4">
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
                  {a.signup.name}
                </span>
                <div className="relative">
                  <User
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                  />
                  <input
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={a.signup.namePlaceholder}
                    className="w-full rounded-xl border border-white/10 bg-neutral-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-neutral-300">
                  {a.signup.email}
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={a.signup.emailPlaceholder}
                  className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-neutral-300">
                  {a.signup.password}
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={a.signup.passwordPlaceholder}
                  className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                />
              </label>

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email || password.length < 8}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Mail size={16} />
                )}
                {a.signup.submit}
              </button>
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
              {a.signup.google}
            </button>

            <p className="mt-6 text-center text-sm text-neutral-400">
              {a.signup.prompt}{" "}
              <Link
                href="/login"
                className="font-bold text-brand-400 transition-colors hover:text-brand-300"
              >
                {a.signup.link}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
