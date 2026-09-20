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
const SELECTED_AGENT_KEY = "ac_selected_agent";
const SESSION_TTL_MS = 2 * 60 * 1000;
const LOGIN_TAB_KEY = "ac_login_tab_id";
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

// ─── Sessione AgentCloud (cookie del sito, nessun token salvato) ────────────

function request(url, options = {}) {
  return fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: { Accept: "application/json", ...(options.headers || {}) },
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
  if (tab?.id != null) await api.storage.local.set({ [LOGIN_TAB_KEY]: tab.id });
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

async function runAgent({ agentId, messages, context, requestId }) {
  if (!agentId || typeof agentId !== "string") {
    throw new Error("Nessun agente selezionato: scegli un agente dal pannello laterale e riprova.");
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messaggio mancante: scrivi qualcosa nel pannello prima di inviare.");
  }

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
  let answer = "";
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
        }
        if (data.type === "tool_start") emit({ type: "tool_start", toolName: data.toolName });
        if (data.type === "error") throw new Error(data.message || "Errore dell'agente");
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  }

  emit({ type: "done" });
  return { output: answer };
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
      if (message.action === "GET_PAGE_CONTEXT") {
        const tabId = message.tabId ?? sender.tab?.id;
        sendResponse({ success: true, data: await getPageContext(tabId) });
        return;
      }
      if (message.action === "RUN_AGENT") {
        sendResponse({ success: true, data: await runAgent(message.payload) });
        return;
      }
      if (message.action === "CLEAR_SESSION") {
        await api.storage.local.remove(SESSION_KEY);
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
  const stored = await api.storage.local.get(LOGIN_TAB_KEY);
  if (stored[LOGIN_TAB_KEY] !== tabId) return;

  const tab = await api.tabs.get(tabId).catch(() => null);
  if (!tab?.url) return;

  let url;
  try {
    url = new URL(tab.url);
  } catch {
    return;
  }
  if (!/(^|\.)agentcloud\.agency$/.test(url.hostname)) return;
  // Qualsiasi pagina AgentCloud che non sia di autenticazione significa che il
  // login è concluso (anche se il gate pre-lancio porta su /waitlist).
  if (url.pathname.startsWith("/auth/") || ["/login", "/signup", "/reset-password"].includes(url.pathname)) return;

  await checkSession(true);
  await api.storage.local.remove(LOGIN_TAB_KEY);
  await api.tabs.remove(tabId).catch(() => {});
  broadcastSessionUpdated();
});


