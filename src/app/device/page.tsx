"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, AlertTriangle, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

/**
 * Pagina di approvazione del device code flow — `/device?user_code=…`
 * (o il codice inserito a mano).
 *
 * Serve ai lavori via SSH/WSL/headless, dove il terminale non può aprire un
 * browser: la CLI mostra un codice corto, l'utente arriva qui (da qualunque
 * dispositivo), lo inserisce e approva. Il server aggancia i token della
 * sessione del browser al grant in attesa e la CLI li ritira col polling.
 */
export default function DevicePage() {
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
      <DeviceInner />
    </Suspense>
  );
}

function DeviceInner() {
  const params = useSearchParams();
  const prefill = params.get("user_code") || "";
  const [code, setCode] = useState(prefill);
  const [phase, setPhase] = useState<"idle" | "approving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const approve = async () => {
    setPhase("approving");
    setErrorMsg(null);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const next = `/device${prefill ? `?user_code=${encodeURIComponent(prefill)}` : ""}`;
      window.location.assign(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    const response = await fetch("/api/cli/device/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_code: code.trim(),
        access_token: session.access_token,
        refresh_token: session.refresh_token ?? "",
      }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setPhase("error");
      setErrorMsg(data?.error || `Approvazione non riuscita (${response.status}).`);
      return;
    }
    setPhase("done");
  };

  // Con user_code nell'URL si parte subito in approvazione: un colpo solo.
  useEffect(() => {
    // setTimeout: l'approvazione parte fuori dal body dell'effect (niente
    // setState sincrono, niente cascading render).
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (prefill && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/i.test(prefill) && phase === "idle") {
      timer = setTimeout(() => { void approve(); }, 0);
    }
    return () => { if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  if (phase === "done") {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#10B981]/20 bg-[#13131A] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]/15 text-[#10B981]">
            <Check size={24} strokeWidth={2.5} />
          </div>
          <h1 className="mt-3 text-xl font-bold text-white">Accesso approvato</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Torna al terminale: il login si completerà da solo.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#0A0A0F] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13131A] p-8">
        <div className="text-center">
          <KeyRound className="mx-auto h-10 w-10 text-[#038BFE]" />
          <h1 className="mt-3 text-xl font-bold text-white">Autorizza AgentCloud CLI</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Inserisci il codice mostrato nel terminale.</p>
        </div>
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void approve();
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 9))}
            placeholder="XXXX-XXXX"
            aria-label="Codice dispositivo"
            className="w-full rounded-xl border border-white/10 bg-[#17171C] px-4 py-3 text-center text-lg font-mono uppercase tracking-widest text-white placeholder-neutral-600 outline-none focus:border-[#038BFE]/50"
          />
          <button
            type="submit"
            disabled={phase === "approving" || code.trim().length < 4}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#038BFE] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#038BFE]/20 hover:bg-[#2EA3FF] disabled:opacity-50"
          >
            {phase === "approving" ? <Loader2 size={16} className="animate-spin" /> : null}
            Approva il login
          </button>
        </form>
        {phase === "error" ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg ?? "Errore."}</span>
          </div>
        ) : null}
        <p className="mt-6 text-center text-xs text-[#6B7280]">
          Non hai un codice? Esegui <code className="text-[#9CA3AF]">agentcloud login --device</code> nel terminale.
        </p>
        {/* Torna alla home: allineato a sinistra, non centrato. */}
        <p className="mt-2 text-left text-xs">
          <Link href="/" className="text-[#038BFE] hover:underline">Torna alla home</Link>
        </p>
      </div>
    </main>
  );
}
