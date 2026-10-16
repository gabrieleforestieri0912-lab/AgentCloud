"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  Globe,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  Key,
  Sparkles,
  ArrowRight,
  Code,
  CheckCircle2,
  Layers,
  Zap,
} from "lucide-react";

type ActiveTab = "cli" | "extension" | "mobile";

export default function InstallClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("cli");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [cliPkg, setCliPkg] = useState<"npm" | "pnpm" | "yarn" | "npx">("npm");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2200);
  };

  const getCliInstallCommand = () => {
    switch (cliPkg) {
      case "npm":
        return "npm install -g agentcloud-cli";
      case "pnpm":
        return "pnpm add -g agentcloud-cli";
      case "yarn":
        return "yarn global add agentcloud-cli";
      case "npx":
        return "npx agentcloud-cli login";
    }
  };

  const extensionInstallUrl = "https://agentcloud.agency/install#extension";
  const cliInstallCmd = getCliInstallCommand();

  return (
    <div className="relative min-h-dvh bg-[#07070c] text-white pt-28 pb-24 overflow-hidden">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 select-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-500/15 via-cyan-500/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-purple-600/10 blur-3xl rounded-full" />
        <div className="absolute top-2/3 -right-48 w-96 h-96 bg-cyan-600/10 blur-3xl rounded-full" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Header Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-indigo-300 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ecosistema Multi-Piattaforma AgentCloud</span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center mt-6 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white/95 to-white/60">
            AgentCloud ovunque lavori.
          </h1>
          <p className="mt-4 text-base md:text-lg text-neutral-300 leading-relaxed">
            Installa la <strong>CLI</strong> per automatizzare da terminale e script, aggiungi l&apos;<strong>estensione Chrome</strong> per interagire dal browser, o usa l&apos;<strong>app mobile Flutter</strong> per il monitoraggio in mobilità.
          </p>
        </div>

        {/* Top Quick-Copy Floating Bar */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {/* CLI Fast Copy */}
          <div className="relative group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-all flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Terminal className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-neutral-400 font-medium">Installa CLI (Globale)</div>
                <div className="text-sm font-mono text-indigo-200 truncate mt-0.5">
                  npm install -g agentcloud-cli
                </div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard("npm install -g agentcloud-cli", "quick-cli")}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              {copiedKey === "quick-cli" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copia</span>
                </>
              )}
            </button>
          </div>

          {/* Extension Fast Copy */}
          <div className="relative group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-all flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-neutral-400 font-medium">Estensione Chrome (URL)</div>
                <div className="text-sm font-mono text-cyan-200 truncate mt-0.5">
                  agentcloud.agency/install#extension
                </div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(extensionInstallUrl, "quick-ext")}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-neutral-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-lg shadow-cyan-600/20 cursor-pointer"
            >
              {copiedKey === "quick-ext" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copia URL</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Interactive Tabs */}
        <div className="mt-14 flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
            <button
              onClick={() => setActiveTab("cli")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "cli"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>CLI Terminale</span>
            </button>
            <button
              onClick={() => setActiveTab("extension")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "extension"
                  ? "bg-cyan-600 text-neutral-950 shadow-lg shadow-cyan-600/30"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Estensione Chrome</span>
            </button>
            <button
              onClick={() => setActiveTab("mobile")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "mobile"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>App Mobile (Flutter)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: CLI */}
        {activeTab === "cli" && (
          <div className="mt-10 max-w-4xl mx-auto">
            <div className="rounded-3xl bg-neutral-900/70 border border-white/10 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2.5 text-white">
                    <Terminal className="w-6 h-6 text-indigo-400" />
                    <span>AgentCloud CLI</span>
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Esegui agenti in background, passa file locali e integra automazioni nei tuoi script bash, cron o pipeline CI/CD.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                  {(["npm", "pnpm", "yarn", "npx"] as const).map((pkg) => (
                    <button
                      key={pkg}
                      onClick={() => setCliPkg(pkg)}
                      className={`px-3 py-1.5 rounded-lg font-mono transition-colors cursor-pointer ${
                        cliPkg === pkg
                          ? "bg-indigo-600 text-white font-semibold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {pkg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Install Snippet */}
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  1. Comando di Installazione
                </div>
                <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-sm text-indigo-300">
                  <div className="flex items-center gap-3 select-all">
                    <span className="text-neutral-600 select-none">$</span>
                    <span>{cliInstallCmd}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(cliInstallCmd, "cli-install")}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Copia comando"
                  >
                    {copiedKey === "cli-install" ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-xs text-neutral-300">
                  <div className="flex items-center gap-3 select-all min-w-0">
                    <span className="text-neutral-600 select-none">$</span>
                    <span className="truncate">curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard("curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh", "cli-install-sh")}
                    className="ml-2 shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Copia installazione rapida macOS/Linux"
                  >
                    {copiedKey === "cli-install-sh" ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500">Installazione rapida per macOS e Linux (verifica Node 18+ e installa il pacchetto).</p>
              </div>

              {/* Login Snippet */}
              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  2. Accedi dal browser
                </div>
                <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-sm text-neutral-200">
                  <div className="flex items-center gap-3 select-all">
                    <span className="text-neutral-600 select-none">$</span>
                    <span>agentcloud login</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard("agentcloud login", "cli-login")}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedKey === "cli-login" ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Interactive Terminal Mockup */}
              <div className="mt-8 rounded-2xl overflow-hidden border border-white/10 bg-neutral-950 shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-white/10 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-2 font-mono text-neutral-300">bash — agentcloud run</span>
                  </div>
                  <span className="font-mono text-neutral-500">v0.6.0</span>
                </div>
                <div className="p-5 font-mono text-xs md:text-sm space-y-3 leading-relaxed text-neutral-300">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <span>$ agentcloud run email-manager &quot;Prepara il riassunto dei lead settimanali&quot;</span>
                  </div>
                  <div className="text-neutral-500">Connessione stabilita con www.agentcloud.agency</div>
                  <div className="text-neutral-500">Agente &apos;email-manager&apos; caricato con successo</div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-neutral-300">
                    <span className="text-emerald-400 font-semibold">[Output Agente]:</span> Trovati 14 lead qualificati negli ultimi 7 giorni. Report generato e inoltrato al canale configurato.
                  </div>
                  <div className="text-neutral-600 text-xs">Tempo di esecuzione: 1.28s • Token consumati: 420</div>
                </div>
              </div>

              {/* Feature Grid */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-indigo-400 font-semibold text-sm flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Scripting & Cron
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Pianifica l&apos;esecuzione periodica degli agenti via crontab o GitHub Actions.
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-indigo-400 font-semibold text-sm flex items-center gap-1.5">
                    <Code className="w-4 h-4" /> Sessioni riprendibili
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    All&apos;uscita ricevi un codice: <code className="text-indigo-300">chat --resume</code> per continuare da dove eri.
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-indigo-400 font-semibold text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Login sicuro
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Accesso via browser con token a scadenza; niente password salvate, solo token in <code className="text-indigo-300">~/.agentcloud</code>.
                  </div>
                </div>
              </div>

              {/* Come funziona in dettaglio */}
              <div className="mt-10 pt-8 border-t border-white/10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span>Come funziona in dettaglio</span>
                </h3>
                <p className="mt-1 text-sm text-neutral-400">
                  Dal primo avvio alla chat di tutti i giorni, in quattro passi.
                </p>

                <ol className="mt-6 space-y-4">
                  {[
                    {
                      n: "1",
                      title: "Installa il pacchetto",
                      desc: "Serve Node.js 18+. Il comando installa i binari agentcloud e ac, disponibili in ogni terminale.",
                      cmd: "npm install -g agentcloud-cli",
                      key: "how-1",
                    },
                    {
                      n: "2",
                      title: "Accedi dal browser",
                      desc: "Si apre il browser: accedi sul sito e il terminale riceve token e refresh da solo. Senza browser usa agentcloud login --password.",
                      cmd: "agentcloud login",
                      key: "how-2",
                    },
                    {
                      n: "3",
                      title: "Chatta nella TUI",
                      desc: "Senza slug scegli l'agente dentro la chat. Markdown, sidebar con le modifiche ai file, Esc per interrompere la risposta.",
                      cmd: "agentcloud chat",
                      key: "how-3",
                    },
                    {
                      n: "4",
                      title: "Riprendi e aggiorna",
                      desc: "All'uscita ricevi un codice per tornare alla stessa chat. La CLI avvisa da sola quando esce una versione nuova.",
                      cmd: "agentcloud chat support-agent --resume 7c6aa8c2",
                      key: "how-4",
                    },
                  ].map((step) => (
                    <li key={step.key} className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-500/30 text-sm font-bold text-indigo-300">
                        {step.n}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white">{step.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-neutral-400">{step.desc}</p>
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-black/60 border border-white/10 px-3 py-2 font-mono text-xs text-indigo-200">
                          <span className="truncate select-all">
                            <span className="text-neutral-600 select-none">$ </span>
                            {step.cmd}
                          </span>
                          <button
                            onClick={() => copyToClipboard(step.cmd, step.key)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Copia comando"
                          >
                            {copiedKey === step.key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>

                {/* Mockup della TUI */}
                <div className="mt-8 rounded-2xl overflow-hidden border border-white/10 bg-neutral-950 shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 bg-neutral-900 border-b border-white/10">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-2 font-mono text-xs text-neutral-300">terminale — agentcloud chat</span>
                  </div>
                  <div className="grid md:grid-cols-[1fr_220px] font-mono text-[11px] md:text-xs leading-relaxed">
                    <div className="p-4 space-y-3 min-w-0">
                      <div>
                        <p className="font-bold text-[#038BFE]">tu</p>
                        <p className="text-neutral-200">Preparami il report vendite di ottobre</p>
                      </div>
                      <div>
                        <p className="font-bold text-emerald-400">Support Agent</p>
                        <p className="text-neutral-300">Ecco il report, l&apos;ho salvato in report-ottobre.md:</p>
                        <div className="mt-1 rounded-lg border border-white/10 px-2 py-1 text-neutral-400">
                          <p className="text-neutral-500">```markdown</p>
                          <p># Vendite ottobre</p>
                          <p>- Totale: €12.480</p>
                          <p>```</p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#038BFE]/50 px-2 py-1.5">
                        <p className="text-neutral-200">/re▊</p>
                        <div className="mt-1 border-t border-white/10 pt-1 space-y-0.5">
                          <p><span className="text-cyan-300">/rename</span> <span className="text-neutral-500">Rinomina la chat corrente</span></p>
                          <p><span className="text-cyan-300">/redo</span> <span className="text-neutral-500">Ripristina la modifica annullata</span></p>
                        </div>
                      </div>
                      <p className="text-neutral-500">support-agent · ~/negozio · online</p>
                    </div>
                    <div className="border-t md:border-t-0 md:border-l border-white/10 p-4 space-y-2 min-w-0">
                      <p className="text-neutral-500">CHAT</p>
                      <p className="font-bold text-white truncate">Report vendite ottobre</p>
                      <p className="text-neutral-500">MODIFICHE (1)</p>
                      <p className="truncate"><span className="text-emerald-400">+ </span><span className="text-neutral-200">report-ottobre.md</span> <span className="text-emerald-400">+45</span> <span className="text-red-400">-3</span></p>
                      <p className="text-neutral-300">1 file · <span className="text-emerald-400">+45</span> <span className="text-red-400">-3</span></p>
                    </div>
                  </div>
                </div>

                {/* Comandi slash */}
                <h4 className="mt-8 text-sm font-bold text-white">Comandi slash nella chat</h4>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    ["/help", "comandi e scorciatoie"],
                    ["/new", "nuova chat"],
                    ["/sessions", "chat precedenti e ripresa"],
                    ["/rename <titolo>", "rinomina la chat"],
                    ["/undo · /redo", "annulla / ripristina modifiche"],
                    ["/diff [file]", "mostra le modifiche"],
                    ["/clear", "pulisce la conversazione"],
                    ["/theme [nome]", "tema dark / light"],
                    ["/login · /logout", "gestione account"],
                    ["/exit", "esce salvando la sessione"],
                  ].map(([cmd, desc]) => (
                    <div key={cmd} className="flex items-baseline gap-2 rounded-xl bg-white/[0.02] border border-white/5 px-3 py-2">
                      <code className="shrink-0 font-mono text-xs font-bold text-cyan-300">{cmd}</code>
                      <span className="text-xs text-neutral-400">{desc}</span>
                    </div>
                  ))}
                </div>

                {/* Scorciatoie */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
                  {["Invio invia", "Maiusc+Invio a capo", "Tab focus", "Ctrl+B sidebar", "Esc interrompe", "Ctrl+C esce"].map((s) => (
                    <span key={s} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Extension */}
        {activeTab === "extension" && (
          <div className="mt-10 max-w-4xl mx-auto">
            <div className="rounded-3xl bg-neutral-900/70 border border-white/10 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2.5 text-white">
                    <Globe className="w-6 h-6 text-cyan-400" />
                    <span>Estensione Chrome per AgentCloud</span>
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Porta il copilota AI su qualsiasi scheda: automazioni web, scraping di pagine, composizione email e analisi in tempo reale.
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Prossimamente — non ancora disponibile
                </span>
              </div>

              <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
                L&apos;estensione browser è in arrivo e non è ancora installabile. Questa pagina mostra un&apos;anteprima di come funzionerà una volta disponibile.
              </div>

              {/* Extension Actions */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-neutral-900 border border-cyan-500/20 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                      Installazione Diretta
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Aggiungi al tuo browser Chromium
                    </h3>
                    <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                      Compatibile con Google Chrome, Microsoft Edge, Brave e Opera, oltre a Mozilla Firefox. Il pannello si apre accanto alla pagina attiva.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-col gap-2.5">
                    <button
                      onClick={() => copyToClipboard(extensionInstallUrl, "ext-url")}
                      className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/25"
                    >
                      {copiedKey === "ext-url" ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>URL Estensione Copiato!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copia URL di Installazione</span>
                        </>
                      )}
                    </button>
                    <div className="text-[11px] text-center text-neutral-400">
                      Link permanente: <span className="text-cyan-300 font-mono">agentcloud.agency/install#extension</span>
                    </div>
                  </div>
                </div>

                {/* Developer Mode Load */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Installazione Manuale / Beta
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Carica estensione decompressa
                    </h3>
                    <ol className="mt-3 text-xs text-neutral-300 space-y-2 list-decimal list-inside">
                      <li>Apri nel browser <code className="text-cyan-300 font-mono">chrome://extensions</code></li>
                      <li>Attiva la spunta <strong>Modalità sviluppatore</strong> in alto a destra</li>
                      <li>Clicca su <strong>Carica estensione non pacchettizzata</strong></li>
                      <li>Seleziona la cartella <code className="text-indigo-300 font-mono">extension/</code> del progetto</li>
                    </ol>
                  </div>
                  <div className="mt-6">
                    <div className="p-3 rounded-xl bg-neutral-950 border border-white/10 text-xs text-neutral-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Supporta SidePanel nativo e storage crittografato locale.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extension Features */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-cyan-400 font-semibold text-sm flex items-center gap-1.5">
                    <Layers className="w-4 h-4" /> Side Panel Laterale
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Accedi all&apos;assistente AI accanto a qualsiasi pagina senza mai cambiare finestra o scheda.
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-cyan-400 font-semibold text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Comprensione del Contesto
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    L&apos;agente legge automaticamente il contenuto della pagina attiva quando richiesto.
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-cyan-400 font-semibold text-sm flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Compilazione Form
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Compila form complessi e bozze email con un singolo clic grazie all&apos;agente dedicato.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Mobile App */}
        {activeTab === "mobile" && (
          <div className="mt-10 max-w-4xl mx-auto">
            <div className="rounded-3xl bg-neutral-900/70 border border-white/10 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2.5 text-white">
                    <Smartphone className="w-6 h-6 text-purple-400" />
                    <span>AgentCloud Mobile (Flutter)</span>
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    L&apos;app nativa per iOS e Android realizzata in Flutter per governare i tuoi agenti ovunque ti trovi.
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Pre-ordine · in sviluppo
                </span>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">
                    Tutto il potere del cloud nel tuo palmo
                  </h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Ricevi notifiche push istantanee quando un agente termina una sequenza di follow-up, approva pagamenti o risolve un ticket cliente.
                  </p>
                  <ul className="space-y-2.5 text-xs text-neutral-300 pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Chat in tempo reale con gli agenti tramite SSE</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Archiviazione token sicura con FlutterSecureStorage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Dark theme elegante con Material 3 e colori AgentCloud</span>
                    </li>
                  </ul>

                  <div className="pt-4 flex items-center gap-3">
                    <button
                      onClick={() => copyToClipboard("https://agentcloud.agency/install#mobile", "mobile-url")}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      {copiedKey === "mobile-url" ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Link Copiato!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copia Link Mobile</span>
                        </>
                      )}
                    </button>
                    <span className="text-xs text-neutral-400">                      Codice sorgente: <code className="text-purple-300 font-mono">mobile/</code></span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-neutral-950 border border-white/10 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="mt-4 text-base font-bold text-white">Esecuzione Locale con Flutter</div>
                  <div className="mt-2 text-xs font-mono text-purple-300 bg-white/[0.04] p-2.5 rounded-xl border border-white/5 select-all">
                    cd mobile && flutter run
                  </div>
                  <div className="mt-3 text-xs text-neutral-400">
                    Analisi del codice: <strong>0 errori</strong> con flutter analyze.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Key Connection Card */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-950/40 via-neutral-900 to-purple-950/30 border border-white/10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                  <Key className="w-3.5 h-3.5" />
                  <span>Account unificato</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Un unico account per tutti i client
                </h3>
                <p className="text-sm text-neutral-300 max-w-xl">
                  Accedi con email/password o Google: la CLI e l&apos;app mobile usano la stessa sessione via token, l&apos;estensione condivide i cookie del sito. Nessuna chiave da copiare.
                </p>
              </div>

              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-sm transition-all shrink-0 shadow-lg shadow-white/10"
              >
                <span>Vai alle impostazioni</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
