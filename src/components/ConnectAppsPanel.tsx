"use client";

/**
 * "Connetti app": l'elenco delle integrazioni con stato, pulsanti
 * Connetti/Disconnetti e i toggle dei singoli tool.
 *
 * L'utente non deve distinguere MCP da OAuth: per lui è "clicca, autorizza,
 * fatto". Le differenze tecniche (trasporto, chiave, scope) restano nei
 * dettagli, mai nel percorso principale.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  KeyRound,
  Plug,
  Plus,
  ShieldAlert,
} from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import { BRANDS } from "@/lib/brands";
import type { McpServerView } from "@/lib/mcp/describe";
import type { Locale } from "@/lib/i18n/constants";
import { getMcpAppsCopy } from "@/lib/i18n/mcpApps";

export default function ConnectAppsPanel({
  servers,
  locale,
}: {
  servers: McpServerView[];
  locale: Locale;
}) {
  const copy = getMcpAppsCopy(locale);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [apiKeyFor, setApiKeyFor] = useState<string | null>(null);
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(servers.map((s) => s.category))).sort(),
    [servers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return servers.filter((s) => {
      if (category && s.category !== category) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    });
  }, [servers, query, category]);

  const connected = filtered.filter((s) => s.status && s.status !== "disconnected");
  const available = filtered.filter((s) => !s.status || s.status === "disconnected");

  const statusLabel = (s: McpServerView) => {
    switch (s.status) {
      case "connected":
        return copy.statusConnected;
      case "pending":
        return copy.statusPending;
      case "error":
        return copy.statusError;
      case "reconnect_required":
        return copy.statusReconnect;
      default:
        return copy.statusNotConnected;
    }
  };

  const statusClass = (s: McpServerView) => {
    switch (s.status) {
      case "connected":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-300 border-amber-500/20";
      case "error":
        return "bg-red-500/10 text-red-300 border-red-500/20";
      case "reconnect_required":
        return "bg-amber-500/10 text-amber-300 border-amber-500/20";
      default:
        return "bg-white/5 text-neutral-400 border-white/5";
    }
  };

  const StatusIcon = ({ status }: { status: string | null }) => {
    if (status === "connected") return <CheckCircle2 size={12} />;
    if (status === "error") return <AlertCircle size={12} />;
    if (status === "pending" || status === "reconnect_required")
      return <Clock3 size={12} />;
    return <Plug size={12} />;
  };

  /** Avvia la connessione. */
  const connect = async (server: McpServerView) => {
    if (server.auth === "oauth2") {
      // OAuth: il browser viene portato al provider e torna su
      // /api/mcp/callback, che poi riporta qui.
      window.location.assign(
        `/api/mcp/authorize?serverId=${encodeURIComponent(server.id)}&returnTo=${encodeURIComponent("/dashboard/apps")}`,
      );
      return;
    }
    if (server.auth === "api_key") {
      setApiKeyFor(server.id);
      setApiKeyValue("");
      return;
    }
    setBusy(server.id);
    setMessage(null);
    try {
      const res = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: server.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error || copy.errorReachable });
        return;
      }
      setMessage({ kind: "ok", text: copy.successConnected });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: copy.errorGeneric });
    } finally {
      setBusy(null);
    }
  };

  /** Collega con la API key. */
  const connectWithApiKey = async (server: McpServerView) => {
    if (!apiKeyValue.trim()) return;
    setBusy(server.id);
    setMessage(null);
    try {
      const res = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: server.id, apiKey: apiKeyValue }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error || copy.errorGeneric });
        return;
      }
      setApiKeyFor(null);
      setApiKeyValue("");
      setMessage({ kind: "ok", text: copy.successConnected });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: copy.errorGeneric });
    } finally {
      setBusy(null);
    }
  };

  /** Disconnette: la route cancella token e strumenti. */
  const disconnect = async (server: McpServerView) => {
    setBusy(server.id);
    setMessage(null);
    try {
      const res = await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: server.id }),
      });
      if (!res.ok) {
        setMessage({ kind: "error", text: copy.errorGeneric });
        return;
      }
      setMessage({ kind: "ok", text: copy.successDisconnected });
      setExpanded(null);
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: copy.errorGeneric });
    } finally {
      setBusy(null);
    }
  };

  /** Accende/spegne un tool. */
  const toggleTool = async (server: McpServerView, toolName: string, on: boolean) => {
    const current = server.tools.filter((t) => t.enabled).map((t) => t.name);
    const next = on
      ? Array.from(new Set([...current, toolName]))
      : current.filter((n) => n !== toolName);
    setBusy(server.id);
    try {
      const res = await fetch("/api/mcp/tools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: server.id, enabledTools: next }),
      });
      if (!res.ok) {
        setMessage({ kind: "error", text: copy.errorGeneric });
        return;
      }
      setMessage({ kind: "ok", text: copy.successToolsUpdated });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: copy.errorGeneric });
    } finally {
      setBusy(null);
    }
  };

  const renderCard = (server: McpServerView) => {
    const isConnected = server.status === "connected";
    const needsReconnect = server.status === "reconnect_required";
    const isBusy = busy === server.id;
    const isOpen = expanded === server.id;

    return (
      <li
        key={server.id}
        className="rounded-2xl border border-white/10 bg-neutral-900 p-5 transition-colors hover:border-white/15"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/5">
              {BRANDS[server.icon] ? (
                <BrandLogo slug={server.icon} size={22} />
              ) : (
                <Plug size={20} className="text-neutral-400" />
              )}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{server.name}</h3>
              <p className="text-xs font-semibold text-neutral-500 truncate">
                {server.description}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${statusClass(server)}`}
          >
            <StatusIcon status={server.status} />
            {statusLabel(server)}
          </span>
        </div>

        {apiKeyFor === server.id && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <label className="block text-xs font-bold text-neutral-300" htmlFor={`key-${server.id}`}>
              {copy.customApiKey}
            </label>
            <input
              id={`key-${server.id}`}
              type="password"
              autoComplete="off"
              value={apiKeyValue}
              onChange={(e) => setApiKeyValue(e.target.value)}
              placeholder={copy.customApiKeyPlaceholder}
              className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/60"
            />
            <p className="mt-2 text-[11px] text-neutral-500">{copy.apiKeyNotice}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => connectWithApiKey(server)}
                disabled={isBusy || !apiKeyValue.trim()}
                className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-neutral-950 disabled:opacity-40"
              >
                {copy.connect}
              </button>
              <button
                type="button"
                onClick={() => setApiKeyFor(null)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-neutral-300"
              >
                {copy.disconnect}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isConnected || needsReconnect ? (
            <>
              <button
                type="button"
                onClick={() => disconnect(server)}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-neutral-200 disabled:opacity-40"
              >
                {copy.disconnect}
              </button>
              {needsReconnect && (
                <button
                  type="button"
                  onClick={() => connect(server)}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-neutral-950 disabled:opacity-40"
                >
                  {copy.reconnect}
                </button>
              )}
              {server.tools.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : server.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-neutral-400"
                  aria-expanded={isOpen}
                >
                  {copy.toolsTitle} ({server.enabledToolCount}/{server.tools.length})
                  {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => connect(server)}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-neutral-950 disabled:opacity-40"
            >
              {isBusy ? copy.connecting : copy.connect}
            </button>
          )}
        </div>

        {isOpen && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[11px] text-neutral-500">{copy.toolsHint}</p>
            <ul className="mt-3 space-y-2">
              {server.tools.map((tool) => (
                <li key={tool.name} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-200 break-all">
                      {tool.name}
                      {tool.write ? (
                        <span className="ml-2 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          {copy.toolWriteBadge}
                        </span>
                      ) : (
                        <span className="ml-2 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          {copy.toolReadBadge}
                        </span>
                      )}
                    </p>
                    {tool.description ? (
                      <p className="mt-0.5 text-[11px] text-neutral-500 line-clamp-2">
                        {tool.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tool.enabled}
                    aria-label={`${tool.enabled ? copy.toggleDisable : copy.toggleEnable} ${tool.name}`}
                    onClick={() => toggleTool(server, tool.name, !tool.enabled)}
                    disabled={isBusy}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold disabled:opacity-40 ${
                      tool.enabled
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                        : "border-white/10 bg-white/5 text-neutral-500"
                    }`}
                  >
                    {tool.enabled ? copy.toggleDisable : copy.toggleEnable}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-8">
      {message && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            message.kind === "ok"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          aria-label={copy.searchLabel}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.searchPlaceholder}
          className="w-full rounded-full border border-white/10 bg-neutral-900 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/60 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              category === null
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 text-neutral-400"
            }`}
          >
            {copy.allCategories}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(category === c ? null : c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                category === c
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 text-neutral-400"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {connected.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            {copy.connectedTitle}
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">{connected.map(renderCard)}</ul>
        </section>
      )}

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
          {copy.availableTitle}
        </h2>
        {available.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">{copy.empty}</p>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">{available.map(renderCard)}</ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-neutral-900 p-5">
        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          className="inline-flex items-center gap-2 text-sm font-bold text-white"
        >
          <Plus size={16} />
          {copy.customTitle}
        </button>
        {showCustom && <CustomServerForm copy={copy} onDone={() => router.refresh()} />}
      </section>
    </div>
  );
}

/** Form per aggiungere un server MCP personalizzato. */
function CustomServerForm({
  copy,
  onDone,
}: {
  copy: ReturnType<typeof getMcpAppsCopy>;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [transport, setTransport] = useState("streamable_http");
  const [auth, setAuth] = useState("none");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mcp/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          transport,
          auth,
          apiKey: auth === "api_key" ? apiKey : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; serverId?: string };
      if (!res.ok) {
        setError(data.error || copy.errorGeneric);
        return;
      }
      setName("");
      setUrl("");
      setApiKey("");
      onDone();
    } catch {
      setError(copy.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
        {copy.customWarning}
      </p>

      <div>
        <label className="block text-xs font-bold text-neutral-300" htmlFor="mcp-name">
          {copy.customName}
        </label>
        <input
          id="mcp-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={copy.customNamePlaceholder}
          className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/60"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-300" htmlFor="mcp-url">
          {copy.customUrl}
        </label>
        <input
          id="mcp-url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={copy.customUrlPlaceholder}
          className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/60"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-neutral-300" htmlFor="mcp-transport">
            {copy.customTransport}
          </label>
          <select
            id="mcp-transport"
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="streamable_http">{copy.customTransportHttp}</option>
            <option value="sse">{copy.customTransportSse}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-300" htmlFor="mcp-auth">
            {copy.customAuth}
          </label>
          <select
            id="mcp-auth"
            value={auth}
            onChange={(e) => setAuth(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="none">{copy.customAuthNone}</option>
            <option value="api_key">{copy.customAuthApiKey}</option>
            <option value="oauth2">{copy.customAuthOAuth}</option>
          </select>
        </div>
      </div>

      {auth === "api_key" && (
        <div>
          <label className="block text-xs font-bold text-neutral-300" htmlFor="mcp-key">
            {copy.customApiKey}
          </label>
          <div className="relative mt-1">
            <KeyRound
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              id="mcp-key"
              type="password"
              required
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={copy.customApiKeyPlaceholder}
              className="w-full rounded-lg border border-white/10 bg-neutral-950 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500/60"
            />
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">{copy.apiKeyNotice}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-bold text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-neutral-950 disabled:opacity-40"
      >
        {busy ? copy.customSubmitting : copy.customSubmit}
      </button>
    </form>
  );
}
