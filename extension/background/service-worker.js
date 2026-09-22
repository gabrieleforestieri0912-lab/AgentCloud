// AgentCloud Copilot — background service worker (Chrome/Edge/Brave/Opera/Firefox).
//
// L'unica interfaccia dell'estensione è il pannello laterale
// (sidepanel/sidepanel.html): il click sull'icona apre il pannello, non un popup.
// Questo service worker si occupa di:
//   1. aprire il pannello laterale (con fallback per i browser che non lo hanno);
//   2. verificare la sessione AgentCloud con i cookie di www.agentcloud.agency;
//   3. eseguire gli agenti in streaming SSE e inoltrare gli eventi al pannello.
const api = globalThis.browser || globalThis.chrome;
const API_BASE = "https://www.agentcloud.agency";
const SESSION_ENDPOINT = "/api/extension/session";
const RUN_ENDPOINT = "/api/agent/run";
const SESSION_KEY = "ac_session_state";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- tenuto per coerenza con sidepanel (chiave selezione agente)
const SELECTED_AGENT_KEY = "ac_selected_agent";
const SESSION_TTL_MS = 2 * 60 * 1000;
const LOGIN_TAB_KEY = "ac_login_tab_id";
const AUTH_TAB_KEY = "ac_auth_tab_id";
const PANEL_PAGE = "sidepanel/sidepanel.html";

api.runtime.onInstalled.addListener(() => {
  api.storage.local.set({ [SESSION_KEY]: { status: "unknown", checkedAt: 0 } });
  configureSidePanel();
});

api.runtime.onStartup?.addListener?.(() => {
  configureSidePanel();
});

/**
 * Chrome 114/115 non hanno `sidePanel.open()`: lì l'unico modo per aprire il
 * pannello al click sull'icona è il comportamento nativo `openPanelOnActionClick`.
 * Da Chrome 116 in poi apriamo il pannello noi da `action.onClicked`, così il
 * flusso resta esplicito e verificabile (e il popup non esiste più).
 */
async function configureSidePanel() {
  if (!api.sidePanel || typeof api.sidePanel.open === "function") return;
  try {
    await api.sidePanel.setPanelBehavior?.({ openPanelOnActionClick: true });
  } catch {
    // Browser senza side panel: resta il fallback in openSidePanel().
  }
}

async function openSidePanel(tab) {
  const tabId = tab?.id;
  const windowId = tab?.windowId;

  if (typeof api.sidePanel?.open === "function") {
    try {
      if (typeof windowId === "number") {
        await api.sidePanel.open({ windowId });
        return { success: true, mode: "sidepanel" };
      }
      if (typeof tabId === "number") {
        await api.sidePanel.open({ tabId });
        return { success: true, mode: "sidepanel" };
      }
    } catch (error) {
      // Es. gesto utente mancante: si passa ai fallback sottostanti.
      console.warn("[AgentCloud] sidePanel.open non riuscito:", error?.message || error);
    }
  }

  try {
    await api.windows.create({
      url: api.runtime.getURL(PANEL_PAGE),
      type: "popup",
      width: 420,
      height: 720,
    });
    return { success: true, mode: "window" };
  } catch {}

  try {
    await api.tabs.create({ url: `${API_BASE}/chat` });
    return { success: true, mode: "web" };
  } catch {}

  return {
    success: false,
    error:
      "Impossibile aprire il pannello laterale. Serve Chrome 114+ (Edge/Brave/Opera equivalenti) oppure apri la chat web da agentcloud.agency.",
  };
}

// Click sull'icona della barra strumenti → pannello laterale sulla scheda attiva.
api.action.onClicked.addListener((tab) => {
  openSidePanel(tab);
});

// ─── Supabase (per replicare src/app/login e src/app/signup dentro l'estensione) ───
const SUPABASE_URL = "https://umnvmlfzclkuorwnevpu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnZtbGZ6Y2xrdW9yd25ldnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzgyMjksImV4cCI6MjA5NzQxNDIyOX0.Q1PWWyocWG7I3hRJRyT_hxz_uY3P6QiXmE3_zMWopJg";
const SUPABASE_SESSION_KEY = "ac_supabase_session";

async function getSupabaseSession() {
  const s = await api.storage.local.get(SUPABASE_SESSION_KEY);
  return s[SUPABASE_SESSION_KEY] || null;
}
async function setSupabaseSession(data) {
  await api.storage.local.set({ [SUPABASE_SESSION_KEY]: data });
}
async function clearSupabaseSession() {
  await api.storage.local.remove(SUPABASE_SESSION_KEY);
}

// ─── Sessione AgentCloud (cookie del sito + token Supabase dell'estensione) ───

async function request(url, options = {}) {
  const accept = options.headers?.Accept || (url === RUN_ENDPOINT ? "text/event-stream, application/json" : "application/json");
  const extraHeaders = { ...(options.headers || {}) };
  // Se l'estensione ha un token Supabase salvato, invialo come Bearer per far
  // passare il gate del proxy anche senza cookie (proxy.ts risolve Bearer).
  try {
    const supa = await getSupabaseSession();
    if (supa?.access_token) extraHeaders["Authorization"] = `Bearer ${supa.access_token}`;
  } catch {}
  return fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: { Accept: accept, ...extraHeaders },
  });
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Messaggio di errore ricco di contesto: quando il deployment non espone ancora
 * le API dell'estensione (es. il gate pre-lancio risponde con un redirect a
 * /waitlist) è importante che l'utente veda *cosa* ha risposto il server al
 * posto di un generico "impossibile connettersi".
 */
function endpointFailure(response, path, hint) {
  const contentType = (response?.headers?.get("content-type") || "sconosciuto").split(";")[0].trim();
  let redirect = "";
  if (response?.redirected) {
    try {
      redirect = ` Il server ha reindirizzato la richiesta a ${new URL(response.url).pathname}.`;
    } catch {
      redirect = " Il server ha reindirizzato la richiesta.";
    }
  }
  return `Le API dell'estensione non sono raggiungibili su ${API_BASE} (${path} → HTTP ${response?.status}, content-type ${contentType}).${redirect} ${hint}`;
}

const DEPLOY_HINT =
  `Il gate pre-lancio di ${API_BASE} sta rispondendo al posto delle API: pubblica un deployment che includa src/app/api/extension/ e l'esenzione per l'estensione in src/proxy.ts (vedi extension/README.md).`;

async function supabaseLogin(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.error || "Email o password non corretti.");
  const session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user, expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null };
  await setSupabaseSession(session);
  return session;
}
async function supabaseSignup(email, password, name) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: name ? { full_name: name } : {} }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.msg || data.error_description || data.error || "Registrazione non riuscita. Riprova.");
  // Se serve conferma email, non c'è sessione
  if (data.access_token) {
    const session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user, expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null };
    await setSupabaseSession(session);
    return { session, needsConfirm: false };
  }
  return { needsConfirm: true, message: "Controlla la tua email per confermare la registrazione." };
}
async function supabaseForgot(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.msg || data.error_description || data.error || "Impossibile inviare il reset.");
  return true;
}
async function supabaseGetUser(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

async function checkSession(force = false) {
  const stored = await api.storage.local.get(SESSION_KEY);
  const cached = stored[SESSION_KEY];
  if (!force && cached && cached.status !== "error" && Date.now() - cached.checkedAt < SESSION_TTL_MS) {
    return cached;
  }

  const cache = async (state) => {
    await api.storage.local.set({ [SESSION_KEY]: state });
    return state;
  };

  // Replica di src/app/login: se l'estensione ha già un token Supabase, verifica
  // direttamente con Supabase e poi prova a recuperare owned dal backend con Bearer.
  try {
    const supa = await getSupabaseSession();
    if (supa?.access_token) {
      const user = await supabaseGetUser(supa.access_token);
      if (user?.email) {
        try {
          const r = await request(SESSION_ENDPOINT, { cache: "no-store" });
          if (r.ok) {
            const d = await r.json();
            const owned = Array.isArray(d.owned) ? d.owned : [];
            return await cache({
              status: owned.length > 0 ? "loggedInWithAgents" : "loggedInEmpty",
              owned,
              email: d.email || user.email,
              name: d.name || user.user_metadata?.full_name || null,
              checkedAt: Date.now(),
            });
          }
        } catch {}
        return await cache({
          status: "loggedInEmpty",
          owned: [],
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          checkedAt: Date.now(),
        });
      }
      await clearSupabaseSession();
    }
  } catch {}

  try {
    const response = await request(SESSION_ENDPOINT, { cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";

    // 401 = nessuna sessione Supabase valida → l'utente deve accedere.
    if (response.status === 401) {
      return await cache({ status: "loggedOut", owned: [], checkedAt: Date.now() });
    }
    if (!response.ok) {
      throw new Error(endpointFailure(response, SESSION_ENDPOINT, DEPLOY_HINT));
    }
    if (!contentType.includes("application/json")) {
      throw new Error(endpointFailure(response, SESSION_ENDPOINT, DEPLOY_HINT));
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        `La verifica della sessione ha restituito una risposta non leggibile (${SESSION_ENDPOINT}). ${DEPLOY_HINT}`,
      );
    }

    const owned = Array.isArray(data.owned) ? data.owned : [];
    return await cache({
      status: owned.length > 0 ? "loggedInWithAgents" : "loggedInEmpty",
      owned,
      email: data.email || null,
      name: data.name || null,
      checkedAt: Date.now(),
    });
  } catch (error) {
    const message =
      error instanceof TypeError
        ? `Impossibile contattare ${API_BASE}. Controlla la connessione a internet e riprova.`
        : error?.message || "Verifica della sessione non riuscita.";
    return await cache({ status: "error", owned: [], checkedAt: Date.now(), error: message });
  }
}

async function openLogin() {
  const tab = await api.tabs.create({ url: `${API_BASE}/login?next=/dashboard` });
  if (tab?.id != null) {
    await api.storage.local.set({ [LOGIN_TAB_KEY]: tab.id, [AUTH_TAB_KEY]: tab.id });
  }
}

async function openSignup() {
  const tab = await api.tabs.create({ url: `${API_BASE}/signup?next=/dashboard` });
  if (tab?.id != null) {
    await api.storage.local.set({ [LOGIN_TAB_KEY]: tab.id, [AUTH_TAB_KEY]: tab.id });
  }
}

// ─── Cursore AgentCloud reattivo sulla pagina affianco ───────────────────────

async function getActiveTab() {
  try {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  } catch { return null; }
}

async function ensureAgentPage() {
  let tab = await getActiveTab();
  const isUsable = tab && tab.url && /^https?:/.test(tab.url) && !tab.url.startsWith(API_BASE);
  if (isUsable) return tab;
  // Se la pagina affianco non è apribile (chrome://, vuota, o assente), aprine una nuova
  try {
    const created = await api.tabs.create({ url: "about:blank", active: true });
    return created;
  } catch {
    return tab;
  }
}

async function injectCursor(tabId) {
  if (tabId == null) return false;
  try {
    await api.scripting.executeScript({ target: { tabId }, files: ["content/agent-cursor.js"] });
    return true;
  } catch {
    // fallback: prova inject inline
    try {
      await api.scripting.executeScript({
        target: { tabId },
        func: () => { window.__acCursorInjected = false; },
      });
      await api.scripting.executeScript({ target: { tabId }, files: ["content/agent-cursor.js"] });
      return true;
    } catch { return false; }
  }
}

async function sendCursor(tabId, action, payload = {}) {
  if (tabId == null) return;
  try {
    await api.tabs.sendMessage(tabId, { action, ...payload });
    return;
  } catch {}
  // Se il content script non è ancora in ascolto, inietta e ritenta via executeScript
  try {
    await injectCursor(tabId);
    await api.tabs.sendMessage(tabId, { action, ...payload });
  } catch {
    try {
      await api.scripting.executeScript({
        target: { tabId },
        func: (act, pl) => {
          if (window.__acCursor) {
            const c = window.__acCursor;
            if (act === "AC_CURSOR_SHOW") c.show(pl.label);
            else if (act === "AC_CURSOR_HIDE") c.hide();
            else if (act === "AC_CURSOR_MOVE") c.moveTo(pl.x, pl.y, pl.label);
            else if (act === "AC_CURSOR_CLICK") { if (pl.x) c.moveTo(pl.x, pl.y, pl.label); c.clickEffect(); }
            else if (act === "AC_CURSOR_LABEL") c.show(pl.label);
          }
        },
        args: [action, payload],
      });
    } catch {}
  }
}

function cursorMoveForTool(toolName) {
  const labels = {
    web_search: "Ricerca in corso…",
    scrape_page: "Lettura pagina…",
    read_file: "Lettura file…",
    write_file: "Scrittura file…",
    shopify_create_product: "Creazione prodotto…",
    shopify_search_products: "Ricerca prodotti…",
    calendar_book_event: "Prenotazione…",
    gmail_send: "Invio email…",
  };
  return labels[toolName] || `Uso ${toolName}…`;
}

// ─── Contesto pagina (solo su richiesta esplicita dell'utente) ──────────────

async function getPageContext(tabId) {
  if (tabId == null) throw new Error("Nessuna scheda attiva su cui leggere la selezione.");
  try {
    const results = await api.scripting.executeScript({
      target: { tabId },
      func: () => {
        const selection = window.getSelection()?.toString().trim() || "";
        return {
          title: document.title || "",
          url: window.location.href || "",
          selection,
          isSelection: Boolean(selection),
        };
      },
    });
    return results?.[0]?.result || { title: "", url: "", selection: "", isSelection: false };
  } catch (error) {
    throw new Error(
      `Impossibile leggere la scheda attiva (${error?.message || "accesso negato"}). Apri il pannello dall'icona di AgentCloud mentre sei sulla pagina da analizzare: il permesso vale per quella scheda e solo dopo il click sull'icona.`,
    );
  }
}

// ─── Esecuzione agente in streaming (SSE) ──────────────────────────────────

async function runAgent({ agentId, messages, context, requestId, tabId: requestedTabId }) {
  if (!agentId || typeof agentId !== "string") {
    throw new Error("Nessun agente selezionato: scegli un agente dal pannello laterale e riprova.");
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messaggio mancante: scrivi qualcosa nel pannello prima di inviare.");
  }

  // ——— Cursore AgentCloud sulla pagina affianco (apre se non è aperta) ———
  let cursorTabId = requestedTabId ?? null;
  if (!cursorTabId) {
    const active = await getActiveTab();
    if (active && active.id != null) cursorTabId = active.id;
    else {
      const ensured = await ensureAgentPage();
      if (ensured && ensured.id != null) cursorTabId = ensured.id;
    }
  } else {
    // verifica che la tab esista e sia http, altrimenti apri
    try {
      const t = await api.tabs.get(cursorTabId);
      if (!t || !t.url || !/^https?:/.test(t.url)) {
        const ensured = await ensureAgentPage();
        if (ensured && ensured.id != null) cursorTabId = ensured.id;
      }
    } catch {
      const ensured = await ensureAgentPage();
      if (ensured && ensured.id != null) cursorTabId = ensured.id;
    }
  }
  // Inietta e mostra il cursore personalizzato reattivo
  if (cursorTabId != null) {
    await injectCursor(cursorTabId).catch(() => {});
    await sendCursor(cursorTabId, "AC_CURSOR_SHOW", { label: "AgentCloud sta operando…" }).catch(() => {});
  }
  const cursorMoveRandom = () => {
    if (cursorTabId == null) return;
    const x = 120 + Math.random() * Math.max(200, (typeof screen !== "undefined" ? screen.width : 800) * 0.35);
    const y = 120 + Math.random() * 260;
    sendCursor(cursorTabId, "AC_CURSOR_MOVE", { x, y }).catch(() => {});
  };
  const cursorClickRandom = () => {
    if (cursorTabId == null) return;
    const x = 180 + Math.random() * 320;
    const y = 160 + Math.random() * 220;
    sendCursor(cursorTabId, "AC_CURSOR_CLICK", { x, y }).catch(() => {});
  };

  let answer = "";
  try {
  const response = await request(RUN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      messages: context
        ? [...messages.slice(0, -1), {
            role: "user",
            content: `${messages[messages.length - 1]?.content || ""}\n\nContesto pagina (fornito dall'utente):\nTitolo: ${context.title}\nURL: ${context.url}\nSelezione: ${context.selection || "(nessuna selezione)"}`,
          }]
        : messages,
    }),
  });

  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim();

  if (!response.ok || response.redirected) {
    let detail = `Richiesta non riuscita (HTTP ${response.status}).`;
    if (response.redirected) {
      // Caso tipico pre-lancio: il gate risponde 307 → /waitlist e l'agente non
      // viene mai eseguito. Meglio dirlo esplicitamente di un errore generico.
      let target = "";
      try { target = new URL(response.url).pathname; } catch {}
      detail = `La richiesta è stata reindirizzata a ${target || "un'altra pagina"} (HTTP ${response.status}) invece di eseguire l'agente. ${DEPLOY_HINT}`;
    } else {
      try {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          if (data?.error) detail = data.error;
        } catch {
          const plain = stripHtml(text).slice(0, 180);
          if (plain) detail = `Richiesta non riuscita (HTTP ${response.status}): ${plain}`;
        }
      } catch {}
    }
    const error = new Error(detail);
    error.status = response.status;
    if (response.status === 401) await api.storage.local.remove(SESSION_KEY);
    throw error;
  }

  if (!contentType.includes("text/event-stream")) {
    let detail = "";
    try { detail = stripHtml(await response.text()).slice(0, 180); } catch {}
    const error = new Error(
      `L'agente non ha risposto in streaming (content-type ${contentType || "sconosciuto"}). ${DEPLOY_HINT}${detail ? ` Risposta del server: ${detail}` : ""}`,
    );
    error.status = response.status;
    throw error;
  }

  if (!response.body) throw new Error("Risposta dell'agente non disponibile (nessun body in streaming).");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const emit = (payload) =>
    api.runtime.sendMessage({ action: "AGENT_STREAM", requestId, ...payload }).catch(() => {});

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "text" && typeof data.content === "string") {
          answer += data.content;
          emit({ type: "text", content: data.content });
          // micro-movimento reattivo durante la generazione
          if (answer.length % 42 === 0) cursorMoveRandom();
        } else if (data.type === "tool_start") {
          emit({ type: "tool_start", toolName: data.toolName });
          const label = cursorMoveForTool(data.toolName);
          if (cursorTabId != null) sendCursor(cursorTabId, "AC_CURSOR_LABEL", { label }).catch(() => {});
          cursorMoveRandom();
        } else if (data.type === "tool_done") {
          emit({ type: "tool_done", toolName: data.toolName });
          cursorClickRandom();
        } else if (data.type === "file") emit({ type: "file", filename: data.filename });
        else if (data.type === "error") throw new Error(data.message || data.error || "Errore dell'agente");
        else if (data.type === "done") {
          // continuerà fino a done del reader
        }
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        // inoltra anche al pannello prima di propagare
        emit({ type: "error", message: error?.message || String(error) });
        if (cursorTabId != null) sendCursor(cursorTabId, "AC_CURSOR_LABEL", { label: "Errore — riprovo…" }).catch(() => {});
        throw error;
      }
    }
  }

  emit({ type: "done" });
  if (cursorTabId != null) {
    sendCursor(cursorTabId, "AC_CURSOR_LABEL", { label: "Operazione completata ✓" }).catch(() => {});
    setTimeout(() => sendCursor(cursorTabId, "AC_CURSOR_HIDE", {}).catch(() => {}), 1400);
  }
  return { output: answer };
  } catch (err) {
    if (cursorTabId != null) {
      sendCursor(cursorTabId, "AC_CURSOR_LABEL", { label: "Errore — riprovo…" }).catch(() => {});
      setTimeout(() => sendCursor(cursorTabId, "AC_CURSOR_HIDE", {}).catch(() => {}), 1600);
    }
    throw err;
  }
}

// ─── Messaggi dal pannello laterale ────────────────────────────────────────

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === "CHECK_SESSION") {
        sendResponse({ success: true, data: await checkSession(Boolean(message.force)) });
        return;
      }
      if (message.action === "OPEN_LOGIN") {
        await openLogin();
        sendResponse({ success: true });
        return;
      }
      if (message.action === "OPEN_SIGNUP") {
        await openSignup();
        sendResponse({ success: true });
        return;
      }
      if (message.action === "GET_PAGE_CONTEXT") {
        const tabId = message.tabId ?? sender.tab?.id;
        sendResponse({ success: true, data: await getPageContext(tabId) });
        return;
      }
      if (message.action === "RUN_AGENT") {
        sendResponse({ success: true, data: await runAgent(message.payload) });
        return;
      }
      if (message.action === "LOGIN_WITH_PASSWORD") {
        const { email, password } = message.payload || {};
        if (!email || !password) throw new Error("Email e password sono obbligatorie.");
        await supabaseLogin(email, password);
        await api.storage.local.remove(SESSION_KEY);
        sendResponse({ success: true, data: await checkSession(true) });
        return;
      }
      if (message.action === "SIGNUP") {
        const { email, password, name } = message.payload || {};
        if (!email || !password) throw new Error("Email e password sono obbligatorie.");
        const r = await supabaseSignup(email, password, name);
        if (r.needsConfirm) { sendResponse({ success: true, needsEmailConfirm: true, message: r.message }); return; }
        await api.storage.local.remove(SESSION_KEY);
        sendResponse({ success: true, data: await checkSession(true) });
        return;
      }
      if (message.action === "FORGOT_PASSWORD") {
        const { email } = message.payload || {};
        if (!email) throw new Error("Email obbligatoria.");
        await supabaseForgot(email);
        sendResponse({ success: true });
        return;
      }
      if (message.action === "CLEAR_SESSION") {
        await api.storage.local.remove(SESSION_KEY);
        await clearSupabaseSession();
        sendResponse({ success: true });
        return;
      }
      sendResponse({ success: false, error: "Azione non supportata" });
    } catch (error) {
      sendResponse({ success: false, error: error?.message || "Errore imprevisto", status: error?.status || null });
    }
  })();
  return true;
});

// ─── Ritorno dal login web → il pannello si aggiorna da solo ───────────────

function broadcastSessionUpdated() {
  try {
    api.runtime.sendMessage({ action: "SESSION_UPDATED" })?.catch?.(() => {});
  } catch {}
}

api.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;

  const tab = await api.tabs.get(tabId).catch(() => null);
  if (!tab?.url) return;

  let url;
  try {
    url = new URL(tab.url);
  } catch {
    return;
  }
  if (!/(^|\.)agentcloud\.agency$/.test(url.hostname)) return;
  // Pagine di autenticazione: non è ancora concluso
  if (url.pathname.startsWith("/auth/") || ["/login", "/signup", "/reset-password", "/reset"].includes(url.pathname)) return;

  const stored = await api.storage.local.get([LOGIN_TAB_KEY, AUTH_TAB_KEY, SESSION_KEY]);
  const isTrackedAuthTab = stored[LOGIN_TAB_KEY] === tabId || stored[AUTH_TAB_KEY] === tabId;

  // Caso 1: tab aperto dall'estensione (Accedi o Registrati) → verifica forzata e chiudi
  if (isTrackedAuthTab) {
    await checkSession(true);
    await api.storage.local.remove([LOGIN_TAB_KEY, AUTH_TAB_KEY]);
    // Chiudi solo se l'utente è atterrato su pagina post-auth (dashboard, /, agents...)
    // evita di chiudere se è ancora su /waitlist pre-lancio senza sessione
    const cached = (await api.storage.local.get(SESSION_KEY))[SESSION_KEY];
    if (cached && cached.status !== "loggedOut" && cached.status !== "error") {
      await api.tabs.remove(tabId).catch(() => {});
    }
    broadcastSessionUpdated();
    return;
  }

  // Caso 2: login/signup manuale fuori dall'estensione — se eravamo loggedOut/error
  // e l'utente atterra su una pagina app (dashboard, /, agents) → aggiorna automatico
  // Questo copre "verifica se l'utente è già entrato o è nuovo" anche senza click su "Accedi"
  const cached = stored[SESSION_KEY];
  const isStale = !cached || Date.now() - (cached.checkedAt || 0) > 30_000;
  const wasLoggedOut = !cached || cached.status === "loggedOut" || cached.status === "error";
  const isAppPage = ["/", "/dashboard", "/agents", "/chat", "/settings", "/integrations"].some(
    (p) => url.pathname === p || url.pathname.startsWith(p + "/"),
  );
  if (wasLoggedOut && isStale && isAppPage) {
    await checkSession(true);
    broadcastSessionUpdated();
  }
});


