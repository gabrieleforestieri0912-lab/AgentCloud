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

// Accesso senza password: codice a 6 cifre inviato per email (OTP nativo Supabase).
// L'email parte dallo SMTP di Supabase (da puntare a Resend sul dominio verificato)
// e il codice compare nel messaggio solo se il template email di Supabase include
// {{ .Token }}. Nessun invio diretto da qui: evita di custodire la API key Resend
// nell'estensione.
async function supabaseSendEmailCode(email, shouldCreateUser = false) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, create_user: shouldCreateUser, gotrue_meta_security: {} }),
  });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  // Anti-enumerazione: con create_user:false un'email non registrata risponde 4xx.
  // Rispondiamo comunque "inviato" così non si scopre chi è già cliente.
  if (res.status === 400 || res.status === 422) return { ok: true };
  throw new Error(data.error_description || data.msg || data.error || "Impossibile inviare il codice. Riprova.");
}

async function supabaseVerifyEmailCode(email, token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "email", email, token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || data.error || "Codice non valido o scaduto.");
  }
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: data.user,
    expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
  };
  await setSupabaseSession(session);
  return session;
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

const OPERATING_TAB_KEY = "ac_operating_tab_id";

async function getActiveTab() {
  try {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  } catch { return null; }
}

// Pagina operativa: quando l'utente sceglie un agente, apriamo una NUOVA scheda
// dedicata dove l'agente opera (dettaglio agente sul sito, pagina reale e
// scriptabile — mai about:blank/chrome:// che non accettano content script).
function operatingPageUrl(agentId) {
  const slug = typeof agentId === "string" && /^[a-z0-9-]+$/i.test(agentId) ? agentId : null;
  return slug ? `${API_BASE}/agents/${encodeURIComponent(slug)}` : `${API_BASE}/agents`;
}

async function getOperatingTab() {
  try {
    const stored = await api.storage.local.get(OPERATING_TAB_KEY);
    const tabId = stored?.[OPERATING_TAB_KEY];
    if (typeof tabId !== "number") return null;
    const tab = await api.tabs.get(tabId).catch(() => null);
    if (!tab || !tab.url || !/^https?:/.test(tab.url)) return null;
    return tab;
  } catch { return null; }
}

async function openOperatingPage(agentId) {
  const url = operatingPageUrl(agentId);
  const existing = await getOperatingTab();
  // Se esiste già una pagina operativa, riusala navigandola all'agente scelto.
  if (existing && existing.id != null) {
    try {
      await api.tabs.update(existing.id, { url, active: true });
      await api.windows.update(existing.windowId, { focused: true }).catch(() => {});
      const tab = await api.tabs.get(existing.id).catch(() => null);
      if (tab) {
        await waitForTabReady(tab.id);
        await injectCursor(tab.id).catch(() => {});
        await sendCursor(tab.id, "AC_CURSOR_SHOW", { label: "Agente pronto a operare su questa pagina" }).catch(() => {});
      }
      return tab || existing;
    } catch {}
  }
  const created = await api.tabs.create({ url, active: true });
  if (created && created.id != null) {
    await api.storage.local.set({ [OPERATING_TAB_KEY]: created.id }).catch(() => {});
    await waitForTabReady(created.id);
    const tab = await api.tabs.get(created.id).catch(() => created);
    await injectCursor(tab.id).catch(() => {});
    await sendCursor(tab.id, "AC_CURSOR_SHOW", { label: "Agente pronto a operare su questa pagina" }).catch(() => {});
    return tab;
  }
  return created;
}

function waitForTabReady(tabId) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const timer = setTimeout(finish, 8000);
    const listener = (updatedId, info) => {
      if (updatedId === tabId && info.status === "complete") {
        clearTimeout(timer);
        try { api.tabs.onUpdated.removeListener(listener); } catch {}
        // piccola attesa per idratazione Next.js prima di iniettare
        setTimeout(finish, 600);
      }
    };
    try {
      api.tabs.onUpdated.addListener(listener);
      api.tabs.get(tabId).then((t) => {
        if (t && t.status === "complete") {
          clearTimeout(timer);
          try { api.tabs.onUpdated.removeListener(listener); } catch {}
          setTimeout(finish, 600);
        }
      }).catch(() => {});
    } catch { finish(); }
  });
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
            else if (act === "AC_CURSOR_SCAN_START") c.scanStart();
            else if (act === "AC_CURSOR_SCAN_STEP") c.scanProgress(pl);
            else if (act === "AC_CURSOR_SCAN_END") c.scanEnd(pl);
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

// ─── Target reali sulla pagina operativa (niente coordinate casuali) ─────────
// Raccoglie gli elementi azionabili visibili e restituisce selettore + centro.
async function findOperableTargets(tabId, limit = 30) {
  if (tabId == null) return [];
  try {
    const results = await api.scripting.executeScript({
      target: { tabId },
      func: (max) => {
        const els = Array.from(document.querySelectorAll(
          "button, a[href], input, textarea, select, [role='button'], [data-testid]",
        )).filter((el) => {
          try {
            const r = el.getBoundingClientRect();
            if (r.width < 8 || r.height < 8) return false;
            if (r.bottom < 0 || r.top > window.innerHeight + 200) return false;
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
            return true;
          } catch { return false; }
        }).slice(0, max);
        const selFor = (el, idx) => {
          try {
            if (el.id) return `#${CSS.escape(el.id)}`;
            const testid = el.getAttribute && el.getAttribute("data-testid");
            if (testid) return `[data-testid="${testid}"]`;
            const parts = [];
            let node = el;
            for (let d = 0; d < 3 && node && node !== document.body; d++) {
              const tag = node.tagName.toLowerCase();
              const parent = node.parentElement;
              let part = tag;
              if (parent) {
                const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
                if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
              }
              parts.unshift(part);
              node = parent;
            }
            return parts.join(" > ") || `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`;
          } catch { return `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`; }
        };
        return els.map((el, idx) => {
          const r = el.getBoundingClientRect();
          const text = (el.innerText || el.value || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim().slice(0, 80);
          return {
            selector: selFor(el, idx),
            x: Math.round(r.left + r.width / 2),
            y: Math.round(Math.min(window.innerHeight - 60, Math.max(60, r.top + r.height / 2))),
            tag: el.tagName.toLowerCase(),
            type: (el.getAttribute && el.getAttribute("type")) || "",
            text,
          };
        });
      },
      args: [limit],
    });
    return results?.[0]?.result || [];
  } catch { return []; }
}

function pickTargetForTool(targets, toolName, toolInput) {
  if (!targets.length) return null;
  const t = String(toolName || "");
  const inputText = JSON.stringify(toolInput || {}).toLowerCase();
  const has = (...words) => (c) => words.some((w) => c.text.toLowerCase().includes(w));
  if (t.includes("search") || t.includes("scrape")) {
    return targets.find((c) => (c.tag === "input" || c.tag === "textarea") && /search|cerca|query|keyword/i.test(c.text + c.type)) ||
      targets.find((c) => c.tag === "input" || c.tag === "textarea") ||
      targets.find(has("cerca", "search", "trova")) || targets[0];
  }
  if (t.includes("gmail") || t.includes("email") || t.includes("calendar") || t.includes("book")) {
    return targets.find(has("invia", "send", "prenota", "book", "conferma", "salva", "save")) ||
      targets.find((c) => c.tag === "input" || c.tag === "textarea") || targets[0];
  }
  if (t.includes("shopify") || t.includes("product") || t.includes("write") || t.includes("create")) {
    return targets.find(has("crea", "create", "aggiungi", "add", "salva", "save", "pubblica", "conferma")) ||
      targets.find((c) => c.tag === "button" || c.tag === "a") || targets[0];
  }
  if (/input|query|prompt|text/i.test(inputText)) {
    return targets.find((c) => c.tag === "input" || c.tag === "textarea") || targets[0];
  }
  return targets.find((c) => c.tag === "button") || targets[0];
}

// Esegue DAVVERO l'operazione: evidenzia, sposta il cursore sul centro
// dell'elemento, scrolla e clicca (il content script fa el.click()).
async function operateOnTarget(tabId, target, label) {
  if (tabId == null || !target) return false;
  await sendCursor(tabId, "AC_CURSOR_HIGHLIGHT", { selector: target.selector }).catch(() => {});
  await sendCursor(tabId, "AC_CURSOR_MOVE", { x: target.x, y: target.y, label }).catch(() => {});
  await new Promise((r) => setTimeout(r, 350));
  await sendCursor(tabId, "AC_CURSOR_CLICK", { x: target.x, y: target.y, selector: target.selector, label }).catch(() => {});
  return true;
}

// Compila DAVVERO un input/textarea con il testo dato (digitazione simulata).
async function typeIntoTarget(tabId, target, text, label) {
  if (tabId == null || !target || !text) return false;
  const clean = String(text).slice(0, 300);
  await sendCursor(tabId, "AC_CURSOR_HIGHLIGHT", { selector: target.selector }).catch(() => {});
  await sendCursor(tabId, "AC_CURSOR_MOVE", { x: target.x, y: target.y, label }).catch(() => {});
  await new Promise((r) => setTimeout(r, 300));
  await sendCursor(tabId, "AC_CURSOR_TYPE", { selector: target.selector, text: clean }).catch(() => {});
  return true;
}

async function scrollPage(tabId, y) {
  if (tabId == null) return;
  await sendCursor(tabId, "AC_CURSOR_SCROLL", { y }).catch(() => {});
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

// ─── Scansione completa della pagina ───────────────────────────────────────
// L'analisi richiesta dall'utente copre l'INTERA pagina: il cursore attraversa
// visibilmente la pagina dall'alto al basso mentre ogni fascia di viewport
// estrae testo, titoli, link, immagini, form e tabelle. Solo lettura e scroll:
// mai click, submit o altre azioni con effetti collaterali.

// Limiti configurabili: pagina enorme = stop con nota esplicita nell'analisi.
const SCAN_MAX_STEPS = 30;
const SCAN_MAX_MS = 60_000;
const SCAN_SETTLE_MAX_MS = 1_500;
const SCAN_SETTLE_MIN_MS = 280;
const SCAN_SWEEP_MS = 150;
let scanAbort = false;
let scanRunning = false;

function acExec(tabId, func, args = []) {
  return api.scripting.executeScript({ target: { tabId }, func, args: [...args] }).then((r) => r?.[0]?.result);
}

/** Stato iniziale: scroll da ripristinare, viewport, altezza, reduced-motion. */
function acPrepareScan() {
  // Nota: questa funzione viene serializzata e iniettata nella pagina, quindi
  // non può usare helper definiti nel service worker.
  const docHeight = () => Math.max(
    document.documentElement ? document.documentElement.scrollHeight : 0,
    document.body ? document.body.scrollHeight : 0,
  );
  const docWidth = () => Math.max(
    document.documentElement ? document.documentElement.scrollWidth : 0,
    document.body ? document.body.scrollWidth : 0,
  );
  return {
    scrollY0: Math.max(0, Math.round(window.scrollY)),
    scrollX0: Math.max(0, Math.round(window.scrollX)),
    vh: window.innerHeight,
    vw: window.innerWidth,
    scrollHeight: docHeight(),
    scrollWidth: docWidth(),
    title: document.title || "",
    url: (window.location && window.location.href) || "",
    selection: (() => { try { return window.getSelection()?.toString().trim() || ""; } catch { return ""; } })(),
    reduced: !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  };
}

/**
 * Un passo di scansione: scrolla alla posizione, attende che il contenuto si
 * stabilizzi (lazy-load, infinite scroll, immagini) e poi estrae SOLO gli
 * elementi che ricadono nella fascia corrente — non i primi N della pagina.
 * Rientra iframe same-origin, contenitori scrollabili e shadow DOM aperti.
 * Restituisce anche i punti su cui il cursore deve passare mentre legge.
 */
function acScanStep(y, stepH, settleMaxMs, settleMinMs) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const pad = Math.max(40, Math.round(vh * 0.06));
    let finished = false;
    // Helper locali: la funzione viene serializzata nella pagina.
    const docHeight = () => Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0,
    );
    const docWidth = () => Math.max(
      document.documentElement ? document.documentElement.scrollWidth : 0,
      document.body ? document.body.scrollWidth : 0,
    );

    try { window.scrollTo({ top: y, left: window.scrollX || 0, behavior: "instant" }); }
    catch { try { window.scrollTo(0, y); } catch {} }

    const cap = (s, n) => (s || "").replace(/\s+/g, " ").trim().slice(0, n || 200);
    const rectOf = (el) => { try { return el.getBoundingClientRect(); } catch { return null; } };
    const inBand = (el, extra) => {
      const r = rectOf(el);
      if (!r || r.width < 2 || r.height < 2) return false;
      const slack = extra == null ? pad : extra;
      return r.bottom > -slack && r.top < vh + slack;
    };
    const isRendered = (el) => {
      try {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
        if (el.getAttribute && el.getAttribute("aria-hidden") === "true") return false;
        return true;
      } catch { return false; }
    };
    const addFocus = (points, el) => {
      if (points.length >= 4) return;
      const r = rectOf(el);
      if (!r || r.width < 2 || r.height < 2) return;
      const py = Math.max(26, Math.min(vh - 52, Math.round(r.top + Math.min(r.height, 48) / 2)));
      const px = Math.max(24, Math.min(vw - 24, Math.round(r.left + Math.min(r.width, 260) / 2)));
      points.push({ x: px, y: py });
    };

    // Raccoglie tutti i nodi rilevanti una sola volta, attraversando anche gli
    // shadow DOM aperti (con un tetto per non bloccare pagine enormi).
    // I contenitori scrollabili sono raccolti a parte: devono essere quelli
    // della fascia corrente, non i primi N della pagina.
    const collectRelevant = () => {
      const sel = "h1,h2,h3,h4,h5,h6,p,li,blockquote,dd,figcaption,a[href],img,form,table,iframe";
      const containerSel = "div,section,aside,main,ul,ol,pre,article,nav";
      const out = [];
      const containers = [];
      const visited = new Set();
      const walk = (root) => {
        if (!root || visited.has(root) || out.length >= 12000) return;
        visited.add(root);
        try { for (const el of root.querySelectorAll(sel)) out.push(el); } catch {}
        try {
          for (const el of root.querySelectorAll(containerSel)) {
            if (containers.length >= 24) break;
            const r = rectOf(el);
            if (!r || r.width < 2 || r.height < 2) continue;
            if (r.bottom < -pad || r.top > vh + pad) continue;
            try {
              const cs = getComputedStyle(el);
              const oy = cs.overflowY || "visible";
              if (/(auto|scroll|overlay)/.test(oy) && el.scrollHeight > el.clientHeight + 60 && el.clientHeight > 50) {
                containers.push(el);
              }
            } catch {}
          }
        } catch {}
        try {
          if (out.length < 12000) {
            for (const el of root.querySelectorAll("*")) {
              if (el.shadowRoot && !visited.has(el.shadowRoot)) walk(el.shadowRoot);
              if (out.length >= 12000) break;
            }
          }
        } catch {}
      };
      walk(document);
      return { nodes: out, containers };
    };

    const extract = () => {
      const section = {
        y: Math.round(window.scrollY),
        headings: [], paragraphs: [], links: [], images: [],
        forms: [], tables: [], extras: [], focus: [],
      };
      const collected = collectRelevant();
      const nodes = collected.nodes;
      const focus = section.focus;

      // Titoli nella fascia corrente (non i primi N della pagina).
      const hSeen = new Set();
      for (const h of nodes) {
        if (!/^H[1-6]$/.test(h.tagName)) continue;
        if (!isRendered(h) || !inBand(h)) continue;
        const text = cap(h.innerText || h.textContent, 160);
        if (!text || hSeen.has(text)) continue;
        hSeen.add(text);
        if (section.headings.length < 8) section.headings.push({ tag: h.tagName.toLowerCase(), text });
        addFocus(focus, h);
      }

      // Paragrafi, liste, citazioni e didascalie nella fascia. I <p> hanno
      // priorità sulla voce di menu, ma l'ordine di lettura resta quello del DOM.
      const pSeen = new Set();
      const paragraphs = [];
      for (const el of nodes) {
        if (!/^(P|LI|BLOCKQUOTE|DD|FIGCAPTION)$/.test(el.tagName)) continue;
        if (!isRendered(el) || !inBand(el, 30)) continue;
        const text = cap(el.innerText || el.textContent, 320);
        if (text.length < 12 || pSeen.has(text)) continue;
        pSeen.add(text);
        paragraphs.push({ text, weight: el.tagName === "P" ? 0 : 1, el });
      }
      paragraphs.sort((a, b) => a.weight - b.weight);
      for (const p of paragraphs.slice(0, 18)) {
        section.paragraphs.push(p.text);
        if (focus.length < 4 && section.paragraphs.length <= 2) addFocus(focus, p.el);
      }

      // Link visibili nella fascia.
      const lSeen = new Set();
      for (const a of nodes) {
        if (a.tagName !== "A" || !a.getAttribute("href")) continue;
        if (section.links.length >= 20) break;
        if (!isRendered(a) || !inBand(a, 20)) continue;
        const img = a.querySelector("img");
        const text = cap(a.innerText || a.textContent || a.getAttribute("aria-label") || a.getAttribute("title") || (img && img.alt), 90);
        const href = a.href || a.getAttribute("href");
        const key = `${text}|${href}`;
        if (lSeen.has(key)) continue;
        lSeen.add(key);
        section.links.push({ text, href });
      }

      // Immagini con alt (solo quelle della fascia, non i primi N globali).
      const iSeen = new Set();
      for (const img of nodes) {
        if (img.tagName !== "IMG" || section.images.length >= 12) continue;
        if (!isRendered(img) || !inBand(img)) continue;
        const r = rectOf(img);
        if (r && (r.width < 24 || r.height < 24)) continue;
        const alt = cap(img.alt || img.getAttribute("aria-label") || "", 120);
        const src = String(img.currentSrc || img.src || "").split("/").pop().slice(0, 70);
        const key = `${alt}|${src}`;
        if (iSeen.has(key)) continue;
        iSeen.add(key);
        section.images.push({ alt, src });
        if (focus.length < 4) addFocus(focus, img);
      }

      // Form: solo lettura (campi e azione, nessun submit).
      for (const f of nodes) {
        if (f.tagName !== "FORM" || section.forms.length >= 4) continue;
        if (!isRendered(f) || !inBand(f)) continue;
        try {
          const fields = Array.from(f.querySelectorAll("input,textarea,select")).slice(0, 10)
            .map((i) => `${i.tagName.toLowerCase()}${i.getAttribute("type") ? ":" + i.getAttribute("type") : ""}${i.getAttribute("name") ? ":" + i.getAttribute("name") : ""}${i.getAttribute("placeholder") ? ":" + cap(i.getAttribute("placeholder"), 30) : ""}`);
          const submit = f.querySelector("button,input[type='submit'],[role='button']");
          const submitT = cap((submit && (submit.innerText || submit.value)) || "", 40);
          const action = cap(f.getAttribute("action") || "", 80);
          section.forms.push(`${fields.join(",") || "(nessun campo)"}${submitT ? " · submit:" + submitT : ""}${action ? " · action:" + action : ""}`);
          if (focus.length < 4) addFocus(focus, f);
        } catch {}
      }

      // Tabelle: didascalia, intestazioni e prime righe.
      for (const t of nodes) {
        if (t.tagName !== "TABLE" || section.tables.length >= 3) continue;
        if (!isRendered(t) || !inBand(t)) continue;
        try {
          const caption = cap((t.caption && t.caption.innerText) || "", 90);
          const heads = Array.from(t.querySelectorAll("th")).slice(0, 8).map((th) => cap(th.innerText, 36));
          const rows = Array.from(t.querySelectorAll("tr")).slice(0, 3)
            .map((tr) => Array.from(tr.querySelectorAll("td")).slice(0, 8).map((td) => cap(td.innerText, 40)).join(" | "))
            .filter(Boolean);
          section.tables.push(`${caption || "(senza titolo)"} [${heads.join("|")}]${rows.length ? " righe: " + rows.join(" ; ") : ""}`);
          if (focus.length < 4) addFocus(focus, t);
        } catch {}
      }

      // Iframe: testo se same-origin, avviso esplicito se cross-origin.
      for (const f of nodes) {
        if (f.tagName !== "IFRAME" || section.extras.length >= 6) continue;
        if (!inBand(f, 40)) continue;
        let host = "";
        try { host = new URL(f.src || "", location.href).host; } catch {}
        try {
          const doc = f.contentDocument;
          const txt = doc && doc.body ? cap(doc.body.innerText, 600) : "";
          if (txt) section.extras.push(`iframe same-origin: ${txt}`);
          else if (!doc) section.extras.push(`iframe cross-origin non leggibile${host ? " (" + host + ")" : ""}`);
        } catch {
          section.extras.push(`iframe cross-origin non leggibile${host ? " (" + host + ")" : ""}`);
        }
      }

      // Contenitori con scroll interno: il testo scorrevole è nella pagina ma
      // non entra nel flusso normale, quindi va letto esplicitamente.
      try {
        for (const el of collected.containers) {
          if (section.extras.length >= 12) break;
          // textContent cattura anche la parte scorrevole non visibile.
          const txt = cap(el.textContent || el.innerText, 700);
          if (!txt) continue;
          section.extras.push(`contenitore scorrevole (${el.scrollHeight}px in ${el.clientHeight}px): ${txt}`);
        }
      } catch {}

      // Punto di ripiego se la fascia non contiene elementi agganciabili.
      if (!focus.length) focus.push({ x: Math.round(vw * 0.5), y: Math.round(vh * 0.42) });
      focus.sort((a, b) => a.y - b.y);
      return section;
    };

    // Attende stabilizzazione reale: mutation observer + altezza + immagini.
    let lastH = docHeight();
    let stable = 0;
    let lastMutation = Date.now();
    let mo = null;
    try {
      mo = new MutationObserver(() => { lastMutation = Date.now(); });
      mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    } catch {}

    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(iv);
      try { if (mo) mo.disconnect(); } catch {}
      let section = null;
      try { section = extract(); } catch {}
      if (!section) {
        resolve({ ok: false, error: "estrazione non riuscita", heightNow: docHeight(), yNow: Math.round(window.scrollY) });
        return;
      }
      resolve({
        ok: true,
        yNow: Math.round(window.scrollY),
        heightNow: docHeight(),
        widthNow: docWidth(),
        section,
        focus: section.focus,
      });
    };

    // Valori letterali: la funzione è serializzata e non vede le costanti del
    // service worker. I chiamanti passano comunque entrambi i parametri.
    const maxMs = Math.max(400, settleMaxMs || 1500);
    const minMs = Math.max(0, Math.min(settleMinMs == null ? 280 : settleMinMs, maxMs));
    const iv = setInterval(() => {
      try {
        const h = docHeight();
        if (h === lastH) stable++; else { stable = 0; lastH = h; }
        const elapsed = Date.now() - t0;
        const quiet = Date.now() - lastMutation;
        let pending = 0;
        try {
          for (const img of document.images) {
            if (img.complete || !img.getAttribute("src")) continue;
            const r = img.getBoundingClientRect();
            if (r.bottom > 0 && r.top < vh) pending++;
          }
        } catch {}
        if (elapsed >= minMs && stable >= 2 && quiet >= 180 && pending === 0) finish();
        else if (elapsed >= maxMs) finish();
      } catch {
        finish();
      }
    }, 100);
  });
}

/** Sonda il fondo pagina: aspetta che l'infinite scroll aggiunga contenuto. */
function acProbeBottom(waitMs) {
  return new Promise((resolve) => {
    // Anche questa funzione viene serializzata nella pagina.
    const docHeight = () => Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0,
    );
    const before = docHeight();
    const maxY = Math.max(0, before - window.innerHeight);
    try { window.scrollTo({ top: maxY, behavior: "instant" }); } catch { try { window.scrollTo(0, maxY); } catch {} }
    const t0 = Date.now();
    let mo = null;
    const finish = () => {
      clearInterval(iv);
      try { if (mo) mo.disconnect(); } catch {}
      const after = docHeight();
      resolve({ heightNow: after, grew: after > before + 24, scrolledTo: Math.round(window.scrollY) });
    };
    try {
      mo = new MutationObserver(() => {});
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch {}
    const iv = setInterval(() => {
      try {
        if (docHeight() > before + 24 || Date.now() - t0 >= Math.max(300, waitMs || 1200)) finish();
      } catch { finish(); }
    }, 120);
  });
}

/** Passo orizzontale: solo se c'è overflow orizzontale reale. */
function acScanSide(scrollWidth, vw, y) {
  try {
    const startY = typeof y === "number" ? y : window.scrollY;
    try { window.scrollTo({ top: startY, left: 0, behavior: "instant" }); } catch { try { window.scrollTo(0, startY); } catch {} }
    const per = Math.max(1, Math.floor((scrollWidth - vw) / Math.max(1, Math.min(3, Math.ceil((scrollWidth - vw) / vw)))));
    const cols = [];
    const cap = (s, n) => (s || "").replace(/\s+/g, " ").trim().slice(0, n || 150);
    for (let x = vw; x < scrollWidth - 20; x += Math.max(per, 1)) {
      if (cols.length >= 3) break;
      try { window.scrollTo({ top: startY, left: x, behavior: "instant" }); } catch { try { window.scrollTo(x, startY); } catch {} }
      cols.push({ x, text: cap(document.body ? document.body.innerText : "", 300) });
    }
    try { window.scrollTo({ top: startY, left: 0, behavior: "instant" }); } catch { try { window.scrollTo(0, startY); } catch {} }
    return { cols };
  } catch (e) {
    return { cols: [], error: String(e) };
  }
}

/** Ripristina lo scroll esatto dell'utente (posizione e orizzontale). */
function acRestoreScan(y, x) {
  try { window.scrollTo({ top: y, left: x || 0, behavior: "instant" }); } catch { try { window.scrollTo(0, y); } catch {} }
  return { restored: Math.round(window.scrollY) };
}

async function scanPageFull(tabId) {
  if (tabId == null) throw new Error("Nessuna scheda attiva da analizzare.");
  if (scanRunning) throw new Error("Un'analisi della pagina è già in corso: attendi o premi Stop.");
  scanRunning = true;
  scanAbort = false;

  let info = null;
  let y = 0;
  let totalH = 0;
  let steps = 0;
  let aborted = false;
  let limited = "";
  let limitedCode = "";
  let restored = false;
  let result = null;
  const t0 = Date.now();
  const blocks = [];
  const seen = new Set();
  const warnings = new Set();

  const merge = (section) => {
    if (!section) return false;
    const b = {
      index: blocks.length + 1, y: section.y,
      headings: [], paragraphs: [], links: [], images: [], forms: [], tables: [], extras: [],
    };
    const into = (list, items, keyOf) => {
      for (const it of items || []) {
        const k = keyOf(it);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        list.push(it);
      }
    };
    into(b.headings, section.headings, (h) => `h:${h.text}`);
    into(b.paragraphs, section.paragraphs, (p) => `p:${p}`);
    into(b.links, section.links, (l) => `l:${l.text}|${l.href}`);
    into(b.images, section.images, (i) => `i:${i.alt}|${i.src}`);
    into(b.forms, section.forms, (f) => `f:${f}`);
    into(b.tables, section.tables, (t) => `t:${t}`);
    into(b.extras, section.extras, (x) => `x:${x}`);
    for (const x of b.extras) {
      if (/non leggibile|non raggiungibile/i.test(x)) warnings.add(x);
    }
    const hasContent = b.headings.length || b.paragraphs.length || b.links.length || b.images.length ||
      b.forms.length || b.tables.length || b.extras.length;
    if (hasContent) blocks.push(b);
    return hasContent;
  };

  try {
    await injectCursor(tabId);
    sendCursor(tabId, "AC_CURSOR_SCAN_START", {}).catch(() => {});
    sendCursor(tabId, "AC_CURSOR_SHOW", { label: "AgentCloud sta analizzando l'intera pagina…" }).catch(() => {});

    try {
      info = await acExec(tabId, acPrepareScan);
    } catch (error) {
      throw new Error(`Impossibile accedere alla scheda per l'analisi (${error?.message || "accesso negato"}). Assicurati che la pagina sia http/https e riprova.`);
    }
    if (!info) throw new Error("Impossibile inizializzare l'analisi della pagina.");

    totalH = Math.max(1, info.scrollHeight || 1);
    const stepH = Math.max(200, Math.floor(info.vh * 0.9)); // 10% di sovrapposizione

    while (steps < SCAN_MAX_STEPS && Date.now() - t0 < SCAN_MAX_MS) {
      if (scanAbort) { aborted = true; break; }

      let res;
      try {
        res = await acExec(tabId, acScanStep, [y, stepH, SCAN_SETTLE_MAX_MS, SCAN_SETTLE_MIN_MS]);
      } catch {
        // Pagina che naviga via / viene chiusa a metà analisi: si chiude con
        // ciò che è stato raccolto, senza bloccare il flusso.
        limited = "la pagina è cambiata o è stata chiusa durante l'analisi";
        limitedCode = "changed";
        break;
      }
      if (!res || res.ok === false) {
        limited = "uno dei passi non è riuscito a leggere la pagina";
        limitedCode = "error";
        break;
      }

      if (res.heightNow > totalH + 1) totalH = res.heightNow; // lazy-load/infinite scroll
      if ((res.widthNow || 0) > (info.scrollWidth || 0)) info.scrollWidth = res.widthNow;
      merge(res.section);

      const percent = Math.max(2, Math.min(99, Math.round(((y + stepH) / Math.max(1, totalH)) * 100)));
      const points = Array.isArray(res.focus) && res.focus.length
        ? res.focus.slice(0, 3)
        : [{ x: Math.round(info.vw / 2), y: Math.round(info.vh * 0.42) }];

      // Sweep visibile: il cursore passa su titolo → paragrafo → immagine/
      // tabella/form della fascia, così si vede cosa sta leggendo.
      for (const point of points) {
        if (scanAbort) break;
        sendCursor(tabId, "AC_CURSOR_SCAN_STEP", {
          percent,
          x: point.x,
          y: point.y,
          label: `Analisi: ${percent}%`,
        }).catch(() => {});
        await new Promise((r) => setTimeout(r, info.reduced ? 40 : SCAN_SWEEP_MS));
      }
      if (scanAbort) { aborted = true; break; }

      steps++;
      // Il massimo scroll raggiungibile è totalH - vh: il confronto deve usare
      // il viewport intero, altrimenti l'ultima fascia non attiva il probe.
      const reachedBottom = res.yNow + info.vh >= totalH - 8;
      if (reachedBottom) {
        // Infinite scroll: il fondo potrebbe allungarsi dopo un attimo.
        let probe = null;
        try { probe = await acExec(tabId, acProbeBottom, [1200]); } catch {}
        if (probe && probe.heightNow > totalH + 24) {
          totalH = probe.heightNow;
          y += stepH;
          continue;
        }
        break;
      }
      y += stepH;
      if (y > totalH - 40) break; // ultima fascia già coperta
    }
    if (scanAbort) aborted = true;

    // Overflow orizzontale reale: una passata sulla fascia in cui si trova
    // l'utente, poi si torna alla posizione originale.
    if ((info.scrollWidth || 0) > info.vw + 40 && !aborted && !scanAbort) {
      try {
        const horizontal = await acExec(tabId, acScanSide, [info.scrollWidth, info.vw, info.scrollY0]);
        if (horizontal?.cols?.length) {
          blocks.push({
            index: blocks.length + 1, y: info.scrollY0,
            headings: [], paragraphs: [], links: [], images: [], forms: [], tables: [],
            extras: horizontal.cols.map((c) => `colonna orizzontale x=${c.x}: ${c.text}`),
          });
        }
      } catch {}
    }

    const scannedHeight = Math.min(totalH, Math.max(0, y) + info.vh);
    if (!aborted && !limited && scannedHeight < totalH - 24) {
      if (steps >= SCAN_MAX_STEPS) { limited = `limite di ${SCAN_MAX_STEPS} passi`; limitedCode = "steps"; }
      else if (Date.now() - t0 >= SCAN_MAX_MS) { limited = `limite di ${Math.round(SCAN_MAX_MS / 1000)} secondi`; limitedCode = "time"; }
      else { limited = "il fondo pagina non è stato raggiunto"; limitedCode = "incomplete"; }
    }

    result = {
      title: info.title,
      url: info.url,
      selection: info.selection || "",
      reducedMotion: Boolean(info.reduced),
      totalHeight: totalH,
      scannedHeight,
      coveragePercent: Math.round((scannedHeight / Math.max(1, totalH)) * 100),
      viewport: { h: info.vh, w: info.vw, horizontalOverflow: (info.scrollWidth || 0) > info.vw + 40 },
      steps,
      aborted,
      limited,
      limitedCode,
      scrollRestored: false,
      warnings: [...warnings],
      sections: blocks,
    };
  } finally {
    if (info) {
      try { await acExec(tabId, acRestoreScan, [info.scrollY0, info.scrollX0]); restored = true; } catch {}
    }
    sendCursor(tabId, "AC_CURSOR_SCAN_END", { label: aborted ? "Analisi interrotta" : "Analisi completata" }).catch(() => {});
    scanRunning = false;
  }

  // Il ripristino avviene nel finally: aggiorna il flag prima di consegnare
  // il risultato a chi ha richiesto l'analisi.
  if (result) result.scrollRestored = restored;
  return result;
}

/**
 * Riduzione per blocchi (map-reduce locale) del contenuto raccolto.
 * Se la pagina supera il budget di contesto non si tronca solo la coda: ogni
 * blocco riceve un budget, e se i blocchi sono troppi se ne campionano alcuni
 * mantenendo sempre il primo, l'ultimo e quindi il fondo pagina.
 */
function summarizeScanForContext(scan) {
  if (!scan?.sections?.length) return "";
  const CAP_TOTAL = 14_000;
  const blocks = scan.sections;

  // In modalità compatta mantiene inizio e FINE di ogni blocco: è l'unico modo
  // per non perdere il contenuto in fondo alla pagina quando il budget stringe.
  const linesOf = (b, compact) => {
    const out = [];
    const cut = (s, n) => String(s || "").slice(0, n);
    if (b.headings?.length) out.push(`Titoli: ${b.headings.map((h) => `${h.tag}: "${h.text}"`).join(" | ")}`);
    if (b.paragraphs?.length) {
      let ps = b.paragraphs;
      if (compact) {
        if (ps.length > 3) ps = [cut(ps[0], 120), cut(ps[1], 120), "…", cut(ps[ps.length - 1], 180)];
        else ps = ps.map((p) => cut(p, 160));
      }
      out.push(`Testo: ${ps.join(" ⏎ ")}`);
    }
    if (b.links?.length) {
      let ls = b.links;
      if (compact && ls.length > 5) ls = [...ls.slice(0, 4), { text: "…", href: "" }, ls[ls.length - 1]];
      out.push(`Link: ${ls.slice(0, compact ? 6 : 8).map((l) => `"${l.text}" → ${l.href}`).join(" ; ")}`);
    }
    if (b.images?.length) out.push(`Immagini: ${b.images.map((i) => (i.alt ? `"${i.alt}"` : i.src ? `[${i.src}]` : "")).filter(Boolean).join(" ; ")}`);
    if (b.forms?.length) out.push(`Form: ${b.forms.join(" ; ")}`);
    if (b.tables?.length) out.push(`Tabelle: ${b.tables.join(" ; ")}`);
    if (b.extras?.length) {
      let xs = b.extras;
      if (compact && xs.length > 3) xs = [...xs.slice(0, 2), "…", xs[xs.length - 1]];
      out.push(`Altro: ${xs.map((x) => cut(x, compact ? 180 : 300)).join(" ; ")}`);
    }
    return out;
  };

  const total = Math.round(scan.totalHeight || 0);
  const scanned = scan.scannedHeight != null ? Math.round(scan.scannedHeight) : total;
  const pct = scan.coveragePercent != null ? scan.coveragePercent : Math.round((scanned / Math.max(1, total)) * 100);
  let header = `Analisi della pagina dall'alto al basso con il cursore: ${blocks.length} blocchi, ${scan.steps || blocks.length} passi, altezza ${total}px, copertura ${pct}% (fino a ${scanned}px).\n`;
  if (scan.aborted) header += "Nota: scansione interrotta dall'utente PRIMA del fondo pagina.\n";
  else if (scan.limited) header += `Nota: scansione ferma prima del fondo pagina (${scan.limited}).\n`;
  const warnings = [...new Set((scan.warnings || []).map((w) => String(w).slice(0, 220)))].slice(0, 6);
  if (warnings.length) header += `Contenuti non raggiungibili: ${warnings.join(" ; ")}.\n`;
  header += "Ogni blocco è numerato e posizionato in px dall'alto; il fondo pagina è incluso quando raggiunto.\n";

  const render = (block, budget) => {
    let out = `[blocco ${block.index} · y≈${Math.round(block.y)}px]\n`;
    for (const line of linesOf(block, budget < 2000)) {
      const room = budget - out.length;
      if (room <= 24) { out += "…\n"; break; }
      out += (line.length > room ? line.slice(0, Math.max(24, room - 1)) + "…" : line) + "\n";
    }
    return out;
  };

  let full = header;
  for (const b of blocks) full += render(b, Number.POSITIVE_INFINITY) + "\n";
  if (full.length <= CAP_TOTAL) return full;

  // Campiona i blocchi se sono davvero troppi, mantenendo sempre l'ultimo.
  const available = Math.max(400, CAP_TOTAL - header.length - 300);
  const maxBlocks = Math.max(1, Math.floor(available / 130));
  let list = blocks;
  let sampledNote = "";
  if (list.length > maxBlocks) {
    const stride = list.length / maxBlocks;
    const sampled = [];
    for (let i = 0; i < maxBlocks; i++) {
      sampled.push(list[Math.min(list.length - 1, Math.round(i * stride))]);
    }
    sampled[sampled.length - 1] = list[list.length - 1];
    list = sampled.filter((b, i, arr) => i === 0 || b.index !== arr[i - 1].index);
    sampledNote = `(Campionati ${list.length} blocchi su ${blocks.length}; il fondo pagina è incluso.)\n`;
  }

  // L'ultimo blocco è il fondo pagina: gli si riserva un budget maggiore e,
  // se serve, i blocchi intermedi vengono saltati prima di tagliare lui.
  const lastBudget = 460;
  const perBlock = Math.max(110, Math.floor(
    (CAP_TOTAL - header.length - sampledNote.length - lastBudget - 120) / Math.max(1, list.length - 1),
  ));
  let out = header + sampledNote + `(Contenuto ridotto per blocchi: ~${perBlock} caratteri per blocco; l'ultimo blocco mantiene più spazio per il fondo pagina.)\n`;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const isLast = i === list.length - 1;
    const chunk = render(b, isLast ? Math.max(perBlock, lastBudget) : perBlock);
    if (out.length + chunk.length + 1 > CAP_TOTAL) {
      if (!isLast) {
        out += `… (${list.length - i - 1} blocchi intermedi omessi per limite di contesto)\n`;
        const lastRoom = CAP_TOTAL - out.length - 1;
        if (lastRoom > 80) out += render(list[list.length - 1], lastRoom);
      } else {
        const room = CAP_TOTAL - out.length - 1;
        if (room > 80) out += render(b, room);
      }
      break;
    }
    out += chunk + "\n";
  }
  return out;
}

// ─── Esecuzione agente in streaming (SSE) ──────────────────────────────────

async function runAgent({ agentId, messages, context, requestId, tabId: requestedTabId, approvalToken }) {
  if (!agentId || typeof agentId !== "string") {
    throw new Error("Nessun agente selezionato: scegli un agente dal pannello laterale e riprova.");
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messaggio mancante: scrivi qualcosa nel pannello prima di inviare.");
  }

  // ——— Cursore AgentCloud sulla pagina operativa dedicata ———
  // Priorità: tab richiesta dal pannello > pagina operativa memorizzata >
  // scheda attiva > apertura di una nuova pagina operativa per l'agente.
  let cursorTabId = requestedTabId ?? null;
  const isUsableTab = async (id) => {
    if (id == null) return false;
    try {
      const t = await api.tabs.get(id);
      return !!(t && t.url && /^https?:/.test(t.url));
    } catch { return false; }
  };
  if (cursorTabId && !(await isUsableTab(cursorTabId))) cursorTabId = null;
  if (!cursorTabId) {
    const stored = await getOperatingTab();
    if (stored && stored.id != null) cursorTabId = stored.id;
  }
  if (!cursorTabId) {
    const active = await getActiveTab();
    if (active && active.id != null && active.url && /^https?:/.test(active.url)) {
      cursorTabId = active.id;
    } else {
      const opened = await openOperatingPage(agentId).catch(() => null);
      if (opened && opened.id != null) cursorTabId = opened.id;
    }
  }
  // Porta in primo piano la pagina dove l'agente opera e mostra il cursore.
  if (cursorTabId != null) {
    try {
      const t = await api.tabs.get(cursorTabId);
      if (t && t.windowId != null) {
        await api.tabs.update(cursorTabId, { active: true }).catch(() => {});
        await api.windows.update(t.windowId, { focused: true }).catch(() => {});
      }
    } catch {}
    await injectCursor(cursorTabId).catch(() => {});
    await sendCursor(cursorTabId, "AC_CURSOR_SHOW", { label: "AgentCloud sta operando…" }).catch(() => {});
  }
  let cachedTargets = [];
  let targetsAt = 0;
  const getTargets = async () => {
    if (cursorTabId == null) return [];
    if (Date.now() - targetsAt < 4000 && cachedTargets.length) return cachedTargets;
    cachedTargets = await findOperableTargets(cursorTabId, 30);
    targetsAt = Date.now();
    return cachedTargets;
  };
  let scrollY = 0;

  let answer = "";
  try {
  // Contexto pagina arricchito: con la scansione completa il modello riceve
  // tutti i blocchi raccolti (ordinati per posizione), non solo il viewport.
  let contextPrompt = "";
  if (context) {
    contextPrompt =
      `Contesto pagina (fornito dall'utente):\nTitolo: ${context.title}\nURL: ${context.url}\nSelezione: ${context.selection || "(nessuna selezione)"}`;
    const scanSummary = context.scan ? summarizeScanForContext(context.scan) : "";
    if (scanSummary) {
      contextPrompt += `\n\n${scanSummary}`;
      // L'analisi deve dire cosa è stato coperto e cosa no, invece di
      // presentare come completo ciò che il cursore non ha potuto leggere.
      contextPrompt += "\nNella risposta finale indica esplicitamente quali parti della pagina hai analizzato (dall'alto al basso, blocchi/percentuale di copertura) e segnala ciò che non era raggiungibile (iframe cross-origin, contenuti dietro login o permessi, sezioni non caricate).";
    }
  }

  const response = await request(RUN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      messages: context
        ? [...messages.slice(0, -1), {
            role: "user",
            content: `${messages[messages.length - 1]?.content || ""}\n\n${contextPrompt}`,
          }]
        : messages,
      // Ripresa dopo la conferma umana: il token è firmato dal server, quindi
      // l'estensione non può cambiare tool né argomenti (solo approvare/annullare).
      ...(approvalToken ? { approval: { token: approvalToken } } : {}),
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
          // Durante la generazione scorri piano la pagina operativa così il
          // cursore resta su contenuto reale invece di muoversi a caso.
          if (answer.length % 160 === 0 && cursorTabId != null) {
            scrollY += 220;
            scrollPage(cursorTabId, scrollY).catch(() => {});
            const targets = await getTargets().catch(() => []);
            const first = targets.find((c) => c.tag === "button" || c.tag === "a") || targets[0];
            if (first) sendCursor(cursorTabId, "AC_CURSOR_MOVE", { x: first.x, y: first.y }).catch(() => {});
          }
        } else if (data.type === "tool_start") {
          emit({ type: "tool_start", toolName: data.toolName });
          const label = cursorMoveForTool(data.toolName);
          if (cursorTabId != null) {
            const targets = await getTargets().catch(() => []);
            const target = pickTargetForTool(targets, data.toolName, data.toolInput);
            if (target && /search|scrape|write|create|input/i.test(`${data.toolName} ${JSON.stringify(data.toolInput || {})}`) &&
                (target.tag === "input" || target.tag === "textarea")) {
              const q = data.toolInput?.query || data.toolInput?.text || data.toolInput?.input || messages[messages.length - 1]?.content || "";
              await typeIntoTarget(cursorTabId, target, String(q).slice(0, 200), label).catch(() => {});
            } else if (target) {
              await operateOnTarget(cursorTabId, target, label).catch(() => {});
            } else {
              sendCursor(cursorTabId, "AC_CURSOR_LABEL", { label }).catch(() => {});
            }
          }
        } else if (data.type === "tool_done") {
          emit({ type: "tool_done", toolName: data.toolName });
          if (cursorTabId != null) {
            const targets = await getTargets().catch(() => []);
            const target = pickTargetForTool(targets, data.toolName, null);
            if (target) operateOnTarget(cursorTabId, target, "Operazione completata").catch(() => {});
          }
        } else if (data.type === "file") emit({ type: "file", filename: data.filename });
        else if (data.type === "connection" && typeof data.provider === "string") {
          emit({ type: "connection", provider: data.provider });
        }
        else if (data.type === "tool_confirm") {
          // Il server ha messo in pausa la run: l'azione modifica contenuto
          // esistente. Il token firmato torna al pannello, che mostra la
          // conferma; lo stream si chiude con `awaiting_confirmation`.
          emit({
            type: "tool_confirm",
            toolName: data.toolName,
            toolInput: data.toolInput,
            token: data.token,
          });
        }
        else if (data.type === "awaiting_confirmation") {
          emit({ type: "awaiting_confirmation" });
        }
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
    sendCursor(cursorTabId, "AC_CURSOR_LABEL", { label: "Operazione completata" }).catch(() => {});
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
      if (message.action === "SCAN_PAGE") {
        let tabId = message.tabId ?? sender.tab?.id ?? null;
        if (tabId == null) {
          const active = await getActiveTab();
          tabId = active?.id ?? null;
        }
        sendResponse({ success: true, data: await scanPageFull(tabId) });
        return;
      }
      if (message.action === "AC_SCAN_ABORT") {
        // Dal cursore (Esc sulla pagina): interrompe la scansione al passo dopo.
        scanAbort = true;
        sendResponse({ success: true });
        return;
      }
      if (message.action === "RUN_AGENT") {
        sendResponse({ success: true, data: await runAgent(message.payload) });
        return;
      }
      if (message.action === "OPEN_OPERATING_PAGE") {
        const tab = await openOperatingPage(message.payload?.agentId);
        sendResponse({ success: true, data: { tabId: tab?.id ?? null, url: tab?.url ?? null } });
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
      if (message.action === "SEND_EMAIL_CODE") {
        const { email, createUser } = message.payload || {};
        if (!email) throw new Error("Email obbligatoria.");
        await supabaseSendEmailCode(email, Boolean(createUser));
        sendResponse({ success: true });
        return;
      }
      if (message.action === "VERIFY_EMAIL_CODE") {
        const { email, token } = message.payload || {};
        if (!email || !token) throw new Error("Email e codice sono obbligatori.");
        await supabaseVerifyEmailCode(email, token);
        await api.storage.local.remove(SESSION_KEY);
        sendResponse({ success: true, data: await checkSession(true) });
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


