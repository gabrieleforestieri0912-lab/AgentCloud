"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

/**
 * Pagina di autorizzazione CLI — `/cli/auth?port=1234&state=abc`
 * Richiede autenticazione web e reindirizza il token Supabase al server locale della CLI
 * su `http://127.0.0.1:port/callback?token=...&state=...`
 * Stesso DB del web/mobile (Supabase), nessun waitlist gate qui (gestito dal proxy).
 */
export default function CliAuthPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13131A] p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#6366F1]" />
            <p className="mt-3 text-sm text-[#9CA3AF]">Caricamento…</p>
          </div>
        </main>
      }
    >
      <CliAuthInner />
    </Suspense>
  );
}

function CliAuthInner() {
  const params = useSearchParams();
  const port = params.get("port");
  const state = params.get("state");
  const [status, setStatus] = useState<"checking" | "redirecting" | "error" | "unauth">("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const callbackBase = port ? `http://127.0.0.1:${port}/callback` : null;
  const loginHref = `/login?next=${encodeURIComponent(`/cli/auth${port ? `?port=${port}&state=${state ?? ""}` : ""}`)}`;

  useEffect(() => {
    if (!port || !state) {
      setStatus("error");
      setErrorMsg("Parametri mancanti: la CLI deve aprire /cli/auth?port=...&state=... — ripeti `agentcloud login`.");
      return;
    }
    // Verifica port numerica per sicurezza (evita open redirect)
    if (!/^\d{2,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
      setStatus("error");
      setErrorMsg(`Porta non valida: ${port}`);
      return;
    }

    const run = async () => {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        setStatus("error");
        setErrorMsg(error.message);
        return;
      }
      if (!session?.access_token) {
        setStatus("unauth");
        return;
      }
      const token = session.access_token;
      setAccessToken(token);
      setStatus("redirecting");
      // Reindirizza al callback locale della CLI
      const redirectUrl = `${callbackBase}?token=${encodeURIComponent(token)}&state=${encodeURIComponent(state)}`;
      // Breve delay per mostrare UI di conferma, poi redirect
      setTimeout(() => {
        window.location.assign(redirectUrl);
      }, 600);
    };
    run();
  }, [port, state, callbackBase]);

  if (status === "checking") {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13131A] p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#6366F1]" />
          <p className="mt-3 text-sm text-[#9CA3AF]">Verifica sessione…</p>
        </div>
      </main>
    );
  }

  if (status === "unauth") {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13131A] p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#6366F1]" />
          <h1 className="mt-3 text-xl font-bold text-white">Autorizza AgentCloud CLI</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Devi prima accedere sul web. Dopo il login verrai reindirizzato automaticamente alla CLI.</p>
          <Link href={loginHref} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#6366F1] px-5 py-3 text-sm font-bold text-white hover:bg-[#818CF8]">
            Accedi per autorizzare
          </Link>
          <p className="mt-3 text-xs text-[#6B7280]">Porta locale: {port} — State: {state?.slice(0, 8)}…</p>
        </div>
      </main>
    );
  }

  if (status === "redirecting" && accessToken) {
    const manualUrl = `${callbackBase}?token=${encodeURIComponent(accessToken)}&state=${encodeURIComponent(state!)}`;
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13131A] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]/15 text-[#10B981]">✓</div>
          <h1 className="mt-3 text-xl font-bold text-white">Reindirizzamento alla CLI…</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Stiamo inviando il token al tuo terminale su <code className="rounded bg-white/5 px-1 py-0.5 text-xs">127.0.0.1:{port}</code>.</p>
          <p className="mt-4 text-xs text-[#6B7280]">Se non vieni reindirizzato, <a href={manualUrl} className="text-[#818CF8] underline">clicca qui</a>.</p>
          <p className="mt-6 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-300">Non condividere mai questo token. È il tuo Supabase access token e scade automaticamente.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#13131A] p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
        <h1 className="mt-3 text-lg font-bold text-white">Errore</h1>
        <p className="mt-2 text-sm text-red-300">{errorMsg ?? "Parametri non validi."}</p>
        <Link href="/" className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Torna alla home</Link>
      </div>
    </main>
  );
}
