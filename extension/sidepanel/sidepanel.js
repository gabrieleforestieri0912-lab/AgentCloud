// AgentCloud Copilot — pannello laterale: unica UI dell'estensione.
// Gestisce accesso, selezione dell'agente e chat in streaming sulla pagina attiva.
const api = globalThis.browser || globalThis.chrome;
const SITE = "https://www.agentcloud.agency";
const SELECTED_AGENT_KEY = "ac_selected_agent";

const views = {
  loading: document.getElementById("loadingView"),
  loggedOut: document.getElementById("loggedOutView"),
  error: document.getElementById("errorView"),
  agents: document.getElementById("agentsView"),
  chat: document.getElementById("chatView"),
};
const statusBadge = document.getElementById("statusBadge");
const agentNameEl = document.getElementById("agentName");
const changeAgentBtn = document.getElementById("changeAgentBtn");
const accountName = document.getElementById("accountName");
const ownedBlock = document.getElementById("ownedBlock");
const ownedAgents = document.getElementById("ownedAgents");
const emptyBlock = document.getElementById("emptyBlock");
const catalog = document.getElementById("catalog");
const errorMessage = document.getElementById("errorMessage");
const notice = document.getElementById("sessionNotice");
const contextCard = document.getElementById("contextCard");
const messagesEl = document.getElementById("messages");
const promptEl = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const selectionBtn = document.getElementById("selectionBtn");
const typingEl = document.getElementById("typing");

let session = null;
let agentId = null;
let context = null;
let messages = [];
let requestId = null;
let loading = false;
let extMode = "login";
let extThrottleUntil = 0;
let extAttempts = 0;

// ——— Estensione: replica del design di src/app/login e src/app/signup ———
const extTitle = document.getElementById("extTitle");
const extHint = document.getElementById("extHint");
const extNameLabel = document.getElementById("extNameLabel");
const extName = document.getElementById("extName");
const extEmail = document.getElementById("extEmail");
const extPassword = document.getElementById("extPassword");
const extHoneypot = document.getElementById("extHoneypot");
const extError = document.getElementById("extError");
const extSuccess = document.getElementById("extSuccess");
const extSubmit = document.getElementById("extSubmit");
const extSubmitText = document.getElementById("extSubmitText");
const extSubmitIcon = document.getElementById("extSubmitIcon");
const extForgotBtn = document.getElementById("extForgotBtn");
const extGoogleBtn = document.getElementById("extGoogleBtn");
const extSwitchBtn = document.getElementById("extSwitchBtn");
const extSwitchPrompt = document.getElementById("extSwitchPrompt");
const extForm = document.getElementById("extForm");

function extSetError(msg) {
  if (!extError) return;
  if (!msg) { extError.textContent = ""; extError.classList.add("hidden"); return; }
  extError.textContent = msg;
  extError.classList.remove("hidden");
  if (extSuccess) { extSuccess.textContent = ""; extSuccess.classList.add("hidden"); }
}
function extSetSuccess(msg) {
  if (!extSuccess) return;
  if (!msg) { extSuccess.textContent = ""; extSuccess.classList.add("hidden"); return; }
  extSuccess.textContent = msg;
  extSuccess.classList.remove("hidden");
  if (extError) { extError.textContent = ""; extError.classList.add("hidden"); }
}
function extUpdateMode(mode) {
  extMode = mode;
  const isSignup = mode === "signup";
  if (extTitle) extTitle.textContent = isSignup ? "Crea il tuo account" : "Bentornato";
  if (extHint) extHint.textContent = isSignup ? "Registrati con email e password o con Google" : "Accedi con email e password o con Google";
  if (extNameLabel) extNameLabel.classList.toggle("hidden", !isSignup);
  if (extSubmitText) extSubmitText.textContent = isSignup ? "Crea account" : "Accedi";
  if (extSubmitIcon) extSubmitIcon.textContent = isSignup ? "＋" : "✉";
  if (extSwitchPrompt) extSwitchPrompt.textContent = isSignup ? "Hai già un account?" : "Non hai ancora un account?";
  if (extSwitchBtn) extSwitchBtn.textContent = isSignup ? "Accedi" : "Registrati";
  if (extPassword) extPassword.placeholder = isSignup ? "Minimo 8 caratteri" : "La tua password";
  if (extForgotBtn) extForgotBtn.style.display = isSignup ? "none" : "inline";
  extSetError(""); extSetSuccess("");
}
function extValidateEmail(v) {
  const t = String(v || "").trim();
  if (!t) return "L'indirizzo email è obbligatorio.";
  if (t.length > 254) return "Email troppo lunga.";
  if (/[\x00-\x08\x0A-\x1F\x7F]/.test(t)) return "Caratteri non ammessi nell'email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "Inserisci un indirizzo email valido (es. nome@dominio.it).";
  return null;
}
async function handleExtSubmit(e) {
  e.preventDefault();
  if (extHoneypot && extHoneypot.value.trim().length > 0) { extSetError("Richiesta non valida."); return; }
  if (Date.now() < extThrottleUntil) {
    const s = Math.ceil((extThrottleUntil - Date.now())/1000);
    extSetError(`Troppi tentativi falliti. Riprova tra ${s} secondi.`);
    return;
  }
  const email = extEmail ? extEmail.value.trim() : "";
  const password = extPassword ? extPassword.value : "";
  const name = extName ? extName.value.trim() : "";
  const emailErr = extValidateEmail(email);
  if (emailErr) { extSetError(emailErr); return; }
  if (!password || password.length < 8) { extSetError(password.length < 8 ? "La password deve contenere almeno 8 caratteri." : "Password non valida."); return; }
  if (password.length > 128) { extSetError("La password non può superare i 128 caratteri."); return; }
  if (password.includes("\0")) { extSetError("La password contiene caratteri non ammessi."); return; }
  if (extMode === "signup" && name.length > 80) { extSetError("Il nome non può superare gli 80 caratteri."); return; }
  extSetError(""); extSetSuccess("");
  if (extSubmit) { extSubmit.disabled = true; extSubmit.style.opacity = "0.7"; }
  const action = extMode === "signup" ? "SIGNUP" : "LOGIN_WITH_PASSWORD";
  const payload = extMode === "signup" ? { email, password, name } : { email, password };
  const res = await send({ action, payload });
  if (extSubmit) { extSubmit.disabled = false; extSubmit.style.opacity = ""; }
  if (!res?.success) {
    extAttempts += 1;
    if (extAttempts >= 5) { extThrottleUntil = Date.now() + 30000; extAttempts = 0; }
    extSetError(res?.error || (extMode === "signup" ? "Registrazione non riuscita. Riprova." : "Email o password non corretti."));
    return;
  }
  extAttempts = 0;
  if (res?.needsEmailConfirm) { extSetSuccess(res.message || "Controlla la tua email per confermare la registrazione."); return; }
  await loadSession(true);
}
async function handleExtForgot() {
  const email = extEmail ? extEmail.value.trim() : "";
  const err = extValidateEmail(email);
  if (err) { extSetError(err); return; }
  extSetError(""); extSetSuccess("");
  if (extForgotBtn) extForgotBtn.disabled = true;
  const res = await send({ action: "FORGOT_PASSWORD", payload: { email } });
  if (extForgotBtn) extForgotBtn.disabled = false;
  if (!res?.success) { extSetError(res?.error || "Impossibile inviare il reset. Riprova."); return; }
  extSetSuccess("Ti abbiamo inviato un link per reimpostare la password.");
}
function initExtAuth() {
  extUpdateMode(extMode);
  if (extForm && !extForm.dataset.bound) {
    extForm.dataset.bound = "1";
    extForm.addEventListener("submit", handleExtSubmit);
  }
  if (extSwitchBtn && !extSwitchBtn.dataset.bound) {
    extSwitchBtn.dataset.bound = "1";
    extSwitchBtn.addEventListener("click", () => extUpdateMode(extMode === "login" ? "signup" : "login"));
  }
  if (extForgotBtn && !extForgotBtn.dataset.bound) {
    extForgotBtn.dataset.bound = "1";
    extForgotBtn.addEventListener("click", handleExtForgot);
  }
  if (extGoogleBtn && !extGoogleBtn.dataset.bound) {
    extGoogleBtn.dataset.bound = "1";
    extGoogleBtn.addEventListener("click", () => send({ action: "OPEN_LOGIN" }));
  }
  const refreshBtn = document.getElementById("refreshLoggedOutBtn");
  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.dataset.bound = "1";
    refreshBtn.addEventListener("click", () => loadSession(true));
  }
}

function send(message) {
  // Compatibile sia con chrome (callback) che con browser (Promise)
  try {
    const maybePromise = api.runtime.sendMessage(message);
    if (maybePromise && typeof maybePromise.then === "function") {
      return maybePromise;
    }
  } catch {}
  return new Promise((resolve) => {
    try {
      api.runtime.sendMessage(message, resolve);
    } catch (e) {
      resolve({ success: false, error: e?.message || String(e) });
    }
  });
}

function safeOn(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function showOnly(viewName) {
  Object.entries(views).forEach(([name, element]) => element.classList.toggle("hidden", name !== viewName));
}

function setStatus(label, isError = false) {
  statusBadge.textContent = label;
  statusBadge.classList.toggle("is-error", isError);
}

function setNotice(text) {
  notice.textContent = text || "";
  notice.classList.toggle("hidden", !text);
}

function getAgentName() {
  return getAgent(agentId)?.name || agentId || "il tuo agente";
}

function addMessage(role, content, extra = "") {
  if (!messagesEl) return { textContent: content };
  const node = document.createElement("div");
  node.className = `message ${role} ${extra}`.trim();
  node.textContent = content;
  messagesEl.appendChild(node);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return node;
}

function renderContext(value) {
  context = value;
  contextCard.textContent = `Selezione inclusa: ${value.selection ? value.selection.slice(0, 150) : "nessuna selezione"} · ${value.title || value.url}`;
  contextCard.classList.remove("hidden");
}

function resetContext() {
  context = null;
  contextCard.classList.add("hidden");
}

function renderWelcome() {
  if (!messagesEl) return;
  messagesEl.innerHTML = "";
  addMessage("assistant", `Ciao! Sono ${getAgentName()}. Posso lavorare sulla pagina che stai visualizzando: seleziona del testo oppure scrivimi cosa vuoi fare.`);
}

function setComposerEnabled(enabled) {
  promptEl.disabled = !enabled;
  sendBtn.disabled = !enabled;
  selectionBtn.disabled = !enabled;
}

function showError(message) {
  errorMessage.textContent = message;
  setStatus("Errore", true);
  changeAgentBtn.classList.add("hidden");
  setComposerEnabled(false);
  showOnly("error");
}

function renderAgents(state) {
  const owned = Array.isArray(state.owned) ? state.owned : [];
  ownedAgents.innerHTML = "";
  owned.forEach((slug) => {
    const agent = getAgent(slug) || { slug, name: slug, category: "Agent", description: "Agente AgentCloud" };
    const item = document.createElement("article");
    item.className = "agent-card";
    item.innerHTML = `<span class="agent-symbol">✦</span><div><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(agent.category)} · Attivo</small></div><button class="open-agent">Usa</button>`;
    item.querySelector(".open-agent").addEventListener("click", () => selectAgent(slug));
    ownedAgents.appendChild(item);
  });

  ownedBlock.classList.toggle("hidden", owned.length === 0);
  emptyBlock.classList.toggle("hidden", owned.length > 0);
  if (owned.length === 0) renderCatalog();
}

function renderCatalog() {
  catalog.innerHTML = "";
  AGENT_CATALOG.forEach((agent) => {
    const card = document.createElement("article");
    card.className = "catalog-card";
    card.innerHTML = `<a href="${SITE}/agents/${encodeURIComponent(agent.slug)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(agent.name)}</strong></a><small>${escapeHtml(agent.category)}<br>${escapeHtml(agent.description)}</small><span class="price">${escapeHtml(agent.price)}</span>`;
    catalog.appendChild(card);
  });
}

function showAgents() {
  changeAgentBtn.classList.add("hidden");
  agentNameEl.textContent = agentId ? getAgentName() : "Seleziona un agente";
  setStatus("Online");
  setComposerEnabled(false);
  showOnly("agents");
}

function openChat() {
  changeAgentBtn.classList.remove("hidden");
  agentNameEl.textContent = getAgentName();
  setStatus("Online");
  setNotice("");
  setComposerEnabled(true);
  resetContext();
  messages = [];
  requestId = null;
  renderWelcome();
  showOnly("chat");
}

async function selectAgent(slug) {
  agentId = slug;
  await api.storage.local.set({ [SELECTED_AGENT_KEY]: slug });
  openChat();
}

async function loadSession(force = false) {
  if (loading) return;
  loading = true;
  showOnly("loading");
  setStatus(force ? "Aggiornamento" : "Controllo");
  setComposerEnabled(false);
  changeAgentBtn.classList.add("hidden");

  const response = await send({ action: "CHECK_SESSION", force });
  loading = false;

  if (!response?.success || !response.data) {
    showError(response?.error || "Impossibile verificare la sessione.");
    return;
  }

  session = response.data;

  if (session.status === "loggedOut") {
    setStatus("Non autenticato");
    showOnly("loggedOut");
    initExtAuth();
    return;
  }
  if (session.status === "error") {
    showError(session.error || "Impossibile verificare la sessione.");
    return;
  }

  accountName.textContent = session.name || session.email || "Account AgentCloud";
  const owned = Array.isArray(session.owned) ? session.owned : [];
  const stored = await api.storage.local.get(SELECTED_AGENT_KEY);
  const requested = stored?.[SELECTED_AGENT_KEY];
  agentId = owned.includes(requested) ? requested : owned[0] || null;
  if (agentId) await api.storage.local.set({ [SELECTED_AGENT_KEY]: agentId });

  renderAgents(session);
  if (agentId) openChat();
  else showAgents();
}

function setBusy(busy) {
  sendBtn.disabled = busy;
  selectionBtn.disabled = busy;
  typingEl.classList.toggle("hidden", !busy);
}

// ─── Eventi UI ─────────────────────────────────────────────────────────────

safeOn("loginBtn", "click", () => send({ action: "OPEN_LOGIN" }));
safeOn("signupBtn", "click", () => send({ action: "OPEN_SIGNUP" }));
safeOn("refreshLoggedOutBtn", "click", () => loadSession(true));
safeOn("retryBtn", "click", () => loadSession(true));
safeOn("refreshBtn", "click", () => loadSession(true));
if (changeAgentBtn) changeAgentBtn.addEventListener("click", () => showAgents());
safeOn("openMarketplaceBtn", "click", () => {
  const fn = api.tabs?.create ? api.tabs.create.bind(api.tabs) : (u) => window.open(u.url, "_blank");
  fn({ url: `${SITE}/agents` });
});
safeOn("openSiteBtn", "click", () => {
  const fn = api.tabs?.create ? api.tabs.create.bind(api.tabs) : (u) => window.open(u.url, "_blank");
  fn({ url: SITE });
});

if (selectionBtn) selectionBtn.addEventListener("click", async () => {
  try {
    const tabs = await (api.tabs?.query ? api.tabs.query({ active: true, currentWindow: true }) : Promise.resolve([]));
    const response = await send({ action: "GET_PAGE_CONTEXT", tabId: tabs[0]?.id });
    if (!response?.success) {
      setNotice(response?.error || "Impossibile leggere la selezione della pagina attiva.");
      return;
    }
    renderContext(response.data);
    setNotice(response.data.selection ? "" : "Nessun testo selezionato: verranno inviati titolo e URL della pagina.");
  } catch (e) {
    setNotice(e?.message || "Impossibile leggere la selezione.");
  }
});

const composerEl = document.getElementById("composer");
if (composerEl) composerEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = promptEl.value.trim();
  if (!text || !agentId || requestId) return;

  promptEl.value = "";
  const history = [...messages, { role: "user", content: text }];
  messages.push({ role: "user", content: text });
  addMessage("user", text);

  const bubble = addMessage("assistant", "");
  requestId = crypto.randomUUID();
  setBusy(true);
  setNotice("");

  // Recupera tab attiva per far operare il cursore AgentCloud sulla pagina affianco (la apre se non è aperta)
  let tabId = null;
  try {
    const tabs = await (api.tabs?.query ? api.tabs.query({ active: true, currentWindow: true }) : Promise.resolve([]));
    tabId = tabs[0]?.id ?? null;
  } catch {}

  const response = await send({ action: "RUN_AGENT", payload: { agentId, messages: history, context, requestId, tabId } });

  if (!response?.success) {
    bubble.textContent = response?.error || "Impossibile completare la richiesta.";
    if (response?.status === 401) {
      setNotice("La sessione è scaduta: accedi di nuovo.");
      requestId = null;
      setBusy(false);
      await loadSession(true);
      return;
    }
    if (response?.status === 402 || response?.status === 429) {
      setNotice(`${response.error} Gestisci il piano dalla dashboard.`);
    }
  }

  messages.push({ role: "assistant", content: bubble.textContent });
  requestId = null;
  setBusy(false);
  resetContext();
});

// ─── Messaggi dal service worker ───────────────────────────────────────────

api.runtime.onMessage.addListener((message) => {
  if (message.action === "SESSION_UPDATED") {
    if (!requestId) loadSession(true);
    return;
  }
  if (message.action !== "AGENT_STREAM" || message.requestId !== requestId) return;

  if (message.type === "text") {
    if (!messagesEl) return;
    const assistants = messagesEl.querySelectorAll(".message.assistant");
    const current = assistants[assistants.length - 1];
    if (current) current.textContent += message.content;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } else if (message.type === "tool_start") {
    addMessage("tool", `Uso ${message.toolName || "uno strumento"}…`);
  } else if (message.type === "tool_done") {
    addMessage("tool", `Completato ${message.toolName || "strumento"}.`);
  } else if (message.type === "error") {
    addMessage("assistant", message.message || message.error || "Errore dell'agente.");
    if (typingEl) typingEl.classList.add("hidden");
  } else if (message.type === "done") {
    if (typingEl) typingEl.classList.add("hidden");
  }
});

loadSession();


