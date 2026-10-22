"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, AlertTriangle, TerminalSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

/**
 * Pagina di autorizzazione CLI — `/cli/login?port=1234&state=abc&code_challenge=…`
 *
 * Flusso (loopback + PKCE, aperta da `agentcloud login`):
 * 1. richiede la sessione web; se manca, propone il login e torna qui;
 * 2. POST /api/cli/authorize con port/state/code_challenge e i token della
 *    sessione del browser → riceve un `code` usa-e-getta (TTL 2 min);
 * 3. redirect a `http://127.0.0.1:port/callback?code=...&state=...`
 *    L'URL è costruito dal server (callback in risposta): solo 127.0.0.1
 *    con porta validata, nessun redirect parlante verso host estranei.
 */
export default function CliLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13131A] p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#038BFE]" />
            <p className="mt-3 text-sm text-[#9CA3AF]">Caricamento…</p>
          </div>
        </main>
      }
    >
      <CliLoginInner />
    </Suspense>
  );
}

function CliLoginInner() {
  const params = useSearchParams();
  const port = params.get("port");
  const state = params.get("state");
  const challenge = params.get("code_challenge");
  const [phase, setPhase] = useState<"checking" | "unauth" | "signing" | "redirecting" | "done" | "error">((): "checking" | "error" => {
    // Validazione dei parametri nella lazy init (niente setState sincrono
    // dentro l'effect: stessa garanzia, zero cascading render).
    if (!port || !state || !challenge) return "error";
    if (!/^\d{2,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) return "error";
    if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) return "error";
    return "checking";
  });
  const [errorMsg, setErrorMsg] = useState<string | null>((): string | null => {
    if (!port || !state || !challenge) {
      return "Parametri mancanti: la CLI apre /cli/login?port=…&state=…&code_challenge=… — rilancia `agentcloud login`.";
    }
    if (!/^\d{2,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
      return `Porta non valida: ${port}`;
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
      return "code_challenge non valida: rilancia `agentcloud login`.";
    }
    return null;
  });
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  useEffect(() => {
    if (phase === "error") return;
    const run = async () => {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        setPhase("error");
        setErrorMsg(error.message);
        return;
      }
      if (!session?.access_token) {
        setPhase("unauth");
        return;
      }
      setPhase("signing");
      const response = await fetch("/api/cli/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          port,
          state,
          code_challenge: challenge,
          access_token: session.access_token,
          refresh_token: session.refresh_token ?? "",
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setPhase("error");
        setErrorMsg(data?.error || `Autorizzazione non riuscita (${response.status}).`);
        return;
      }
      const data = (await response.json()) as { redirect_uri: string };
      setManualUrl(data.redirect_uri);
      setPhase("redirecting");
      // Breve delay per mostrare l'UI, poi redirect al callback locale.
      setTimeout(() => {
        window.location.assign(data.redirect_uri);
      }, 600);
    };
    void run();
  }, [port, state, challenge, phase]);

  if (phase === "checking" || phase === "signing") {
    const label = phase === "checking" ? "Verifica sessione…" : "Autorizzo la CLI…";
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13131A] p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#038BFE]" />
          <p className="mt-3 text-sm text-[#9CA3AF]">{label}</p>
        </div>
      </main>
    );
  }

  if (phase === "unauth") {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13131A] p-8 text-center">
          <TerminalSquare className="mx-auto h-10 w-10 text-[#038BFE]" />
          <h1 className="mt-3 text-xl font-bold text-white">Autorizza AgentCloud CLI</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            Devi prima accedere sul web: dopo il login torni automaticamente qui e la CLI riceve l&apos;accesso.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/cli/login?port=${port}&state=${state ?? ""}&code_challenge=${challenge ?? ""}`)}`}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#038BFE] px-5 py-3 text-sm font-bold text-white hover:bg-[#2EA3FF]"
          >
            Accedi per autorizzare
          </Link>
          <p className="mt-3 text-xs text-[#6B7280]">Porta locale: {port} — solo 127.0.0.1, niente invia a server remoti.</p>
        </div>
      </main>
    );
  }

  if (phase === "redirecting") {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#10B981]/20 bg-[#13131A] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]/15 text-[#10B981]">
            <Check size={24} strokeWidth={2.5} />
          </div>
          <h1 className="mt-3 text-xl font-bold text-white">Sto restituendo l&apos;accesso al terminale…</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            La pagina si chiude da sola. Se il browser la blocca,{" "}
            <a href={manualUrl ?? "#"} className="text-[#038BFE] underline">clicca qui per completare</a>.
          </p>
          <p className="mt-4 text-xs text-[#6B7280]">
            
          </p>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#10B981]/20 bg-[#13131A] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]/15 text-[#10B981]">
            <Check size={24} strokeWidth={2.5} />
          </div>
          <h1 className="mt-3 text-xl font-bold text-white">Accesso completato</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Puoi chiudere questa pagina e tornare al terminale.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-red-500/20 bg-[#13131A] p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
          <h1 className="mt-3 text-lg font-bold text-white">Errore</h1>
          <p className="mt-2 text-sm text-red-300">{errorMsg ?? "Parametri non validi."}</p>
          <p className="mt-4 text-xs text-[#6B7280]">Al terminale: [R] riprova browser · [T] incolla token.</p>
        </div>
        {/* Torna alla home: allineato a sinistra (bordo del riquadro), non
            centrato dentro. */}
        <div className="mt-6">
          <Link href="/" className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
            Torna alla home
          </Link>
        </div>
      </div>
    </main>
  );
}
