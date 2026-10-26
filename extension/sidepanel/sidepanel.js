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
const stopScanBtn = document.getElementById("stopScanBtn");
const typingEl = document.getElementById("typing");
const approvalCard = document.getElementById("approvalCard");
const approvalText = document.getElementById("approvalText");
const approveBtn = document.getElementById("approveBtn");
const denyBtn = document.getElementById("denyBtn");

let session = null;
let agentId = null;
let context = null;
let messages = [];
let requestId = null;
let loading = false;
let scanning = false;
// Conferma umana: il server mette in pausa la run (`tool_confirm`) quando un tool
// modifica contenuto esistente. `lastRequest` è il body originale da rimandare
// con il token firmato per riprendere (stessa semantica della chat web).
let pendingApproval = null;
let lastRequest = null;
let extMode = "login";
// Modalità "code" (accesso senza password): "email" = invio del codice,
// "code" = conferma del codice ricevuto. Per login/signup non è usata.
let extCodeStep = "email";
let extThrottleUntil = 0;
let extAttempts = 0;

// ——— Estensione: replica del design di src/app/login e src/app/signup ———
const extTitle = document.getElementById("extTitle");
const extHint = document.getElementById("extHint");
const extNameLabel = document.getElementById("extNameLabel");
const extName = document.getElementById("extName");
const extEmail = document.getElementById("extEmail");
const extPasswordLabel = document.getElementById("extPasswordLabel");
const extPassword = document.getElementById("extPassword");
const extCodeLabel = document.getElementById("extCodeLabel");
const extCode = document.getElementById("extCode");
const extHoneypot = document.getElementById("extHoneypot");
const extError = document.getElementById("extError");
const extSuccess = document.getElementById("extSuccess");
const extSubmit = document.getElementById("extSubmit");
const extSubmitText = document.getElementById("extSubmitText");
const extForgot = document.getElementById("extForgot");
const extForgotBtn = document.getElementById("extForgotBtn");
const extCodeLinks = document.getElementById("extCodeLinks");
const extCodeModeBtn = document.getElementById("extCodeModeBtn");
const extResendCodeBtn = document.getElementById("extResendCodeBtn");
const extChangeEmailBtn = document.getElementById("extChangeEmailBtn");
const extGoogleBtn = document.getElementById("extGoogleBtn");
const extSwitchRow = document.getElementById("extSwitchRow");
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
  extCodeStep = "email";
  const isSignup = mode === "signup";
  const isCode = mode === "code";
  if (extTitle) extTitle.textContent = isSignup ? "Crea il tuo account" : "Bentornato";
  if (extHint) {
    extHint.textContent = isSignup
      ? "Registrati con email e password o con Google"
      : isCode
        ? "Inserisci l'email e conferma con il codice che ricevi"
        : "Accedi con email e password o con Google";
  }
  if (extNameLabel) extNameLabel.classList.toggle("hidden", !isSignup);
  // In modalità "code" la password non serve: la nascondiamo per non confondere.
  if (extPasswordLabel) extPasswordLabel.classList.toggle("hidden", isCode);
  if (extPassword) {
    extPassword.required = !isCode;
    extPassword.placeholder = isSignup ? "Minimo 8 caratteri" : "La tua password";
    if (isCode) extPassword.value = "";
  }
  if (extCodeLabel) extCodeLabel.classList.add("hidden");
  if (extCode) extCode.value = "";
  if (extSubmitText) extSubmitText.textContent = isSignup ? "Crea account" : isCode ? "Invia codice" : "Accedi";
  if (extForgot) extForgot.classList.toggle("hidden", isCode);
  if (extForgotBtn) extForgotBtn.style.display = isSignup ? "none" : "inline";
  if (extCodeLinks) extCodeLinks.classList.add("hidden");
  if (extCodeModeBtn) extCodeModeBtn.classList.toggle("hidden", isCode);
  if (extSwitchRow) extSwitchRow.classList.toggle("hidden", isCode);
  if (extSwitchPrompt) extSwitchPrompt.textContent = isSignup ? "Hai già un account?" : "Non hai ancora un account?";
  if (extSwitchBtn) extSwitchBtn.textContent = isSignup ? "Accedi" : "Registrati";
  extSetError(""); extSetSuccess("");
}

// Dopo l'invio del codice: mostra il campo a 6 cifre e i link di ripristino.
function extShowCodeStep(email) {
  extCodeStep = "code";
  if (extCodeLabel) extCodeLabel.classList.remove("hidden");
  if (extSubmitText) extSubmitText.textContent = "Conferma codice";
  if (extCodeLinks) extCodeLinks.classList.remove("hidden");
  extSetSuccess(`Codice inviato a ${email}. Controlla l'email (anche lo spam) e inseriscilo qui sotto.`);
  if (extCode) { extCode.value = ""; extCode.focus(); }
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
  const emailErr = extValidateEmail(email);
  if (emailErr) { extSetError(emailErr); return; }

  // ——— Accesso senza password: invio del codice o conferma ———
  if (extMode === "code") {
    if (extCodeStep === "email") {
      extSetError(""); extSetSuccess("");
      if (extSubmit) { extSubmit.disabled = true; extSubmit.style.opacity = "0.7"; }
      const res = await send({ action: "SEND_EMAIL_CODE", payload: { email, createUser: false } });
      if (extSubmit) { extSubmit.disabled = false; extSubmit.style.opacity = ""; }
      if (!res?.success) { extSetError(res?.error || "Impossibile inviare il codice. Riprova."); return; }
      extShowCodeStep(email);
      return;
    }
    const code = (extCode ? extCode.value : "").replace(/\D/g, "");
    if (code.length !== 6) { extSetError("Inserisci il codice a 6 cifre ricevuto per email."); return; }
    extSetError(""); extSetSuccess("");
    if (extSubmit) { extSubmit.disabled = true; extSubmit.style.opacity = "0.7"; }
    const res = await send({ action: "VERIFY_EMAIL_CODE", payload: { email, token: code } });
    if (extSubmit) { extSubmit.disabled = false; extSubmit.style.opacity = ""; }
    if (!res?.success) {
      extAttempts += 1;
      if (extAttempts >= 5) { extThrottleUntil = Date.now() + 30000; extAttempts = 0; }
      extSetError(res?.error || "Codice non valido o scaduto.");
      return;
    }
    extAttempts = 0;
    await loadSession(true);
    return;
  }

  const password = extPassword ? extPassword.value : "";
  const name = extName ? extName.value.trim() : "";
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
async function handleExtResendCode() {
  const email = extEmail ? extEmail.value.trim() : "";
  const err = extValidateEmail(email);
  if (err) { extSetError(err); return; }
  extSetError("");
  if (extResendCodeBtn) extResendCodeBtn.disabled = true;
  const res = await send({ action: "SEND_EMAIL_CODE", payload: { email, createUser: false } });
  if (extResendCodeBtn) extResendCodeBtn.disabled = false;
  if (!res?.success) { extSetError(res?.error || "Impossibile inviare il codice. Riprova."); return; }
  extSetSuccess(`Nuovo codice inviato a ${email}.`);
}
// Torna al passo email della modalità codice (per correggere l'indirizzo).
function handleExtChangeEmail() {
  extCodeStep = "email";
  if (extCodeLabel) extCodeLabel.classList.add("hidden");
  if (extCode) extCode.value = "";
  if (extSubmitText) extSubmitText.textContent = "Invia codice";
  if (extCodeLinks) extCodeLinks.classList.add("hidden");
  extSetError(""); extSetSuccess("");
  if (extEmail) extEmail.focus();
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
  if (extCodeModeBtn && !extCodeModeBtn.dataset.bound) {
    extCodeModeBtn.dataset.bound = "1";
    extCodeModeBtn.addEventListener("click", () => {
      extUpdateMode("code");
      if (extEmail) extEmail.focus();
    });
  }
  if (extResendCodeBtn && !extResendCodeBtn.dataset.bound) {
    extResendCodeBtn.dataset.bound = "1";
    extResendCodeBtn.addEventListener("click", handleExtResendCode);
  }
  if (extChangeEmailBtn && !extChangeEmailBtn.dataset.bound) {
    extChangeEmailBtn.dataset.bound = "1";
    extChangeEmailBtn.addEventListener("click", handleExtChangeEmail);
  }
  if (extCode && !extCode.dataset.bound) {
    extCode.dataset.bound = "1";
    extCode.addEventListener("input", () => {
      extCode.value = extCode.value.replace(/\D/g, "").slice(0, 6);
    });
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
  if (value.scan) {
    // Scansione completa: la card riassume ciò che il cursore ha percorso e
    // cosa non è stato raggiungibile.
    const s = value.scan;
    const parts = [`Pagina analizzata: ${s.sections.length} blocchi, ${s.steps} passi, copertura ${s.coveragePercent ?? 100}%`];
    if (s.aborted) parts.push("interrotta prima del fondo (Stop/Esc)");
    else if (s.limited) parts.push(`ferma prima del fondo (${s.limited})`);
    if (s.warnings?.length) parts.push(`${s.warnings.length} contenuti non raggiungibili`);
    if (value.selection) parts.push(`selezione: ${value.selection.slice(0, 100)}`);
    contextCard.textContent = parts.join(" · ");
  } else {
    contextCard.textContent = `Selezione inclusa: ${value.selection ? value.selection.slice(0, 150) : "nessuna selezione"} · ${value.title || value.url}`;
  }
  contextCard.classList.remove("hidden");
}

function resetContext() {
  context = null;
  contextCard.classList.add("hidden");
}

function renderWelcome() {
  if (!messagesEl) return;
  messagesEl.innerHTML = "";
  addMessage("assistant", `Ciao! Sono ${getAgentName()}. Posso analizzare l'intera pagina che stai visualizzando o operarci sopra: premi "Analizza pagina" (o scrivi "analizza la pagina") oppure dimmi cosa vuoi fare.`);
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
    item.innerHTML = `<div><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(agent.category)} · Attivo</small></div><button class="open-agent">Usa</button>`;
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
    const priceLabel = agent.comingSoon ? `${agent.price} · Prossimamente` : agent.price;
    card.innerHTML = `<a href="${SITE}/agents/${encodeURIComponent(agent.slug)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(agent.name)}</strong></a><small>${escapeHtml(agent.category)}<br>${escapeHtml(agent.description)}</small><span class="price">${escapeHtml(priceLabel)}</span>`;
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
  pendingApproval = null;
  lastRequest = null;
  if (approvalCard) approvalCard.classList.add("hidden");
  renderWelcome();
  showOnly("chat");
}

async function selectAgent(slug) {
  agentId = slug;
  await api.storage.local.set({ [SELECTED_AGENT_KEY]: slug });
  openChat();
  // L'agente scelto apre una NUOVA scheda operativa dove il cursore reattivo
  // attua davvero le operazioni (click/input/scroll su elementi reali).
  setNotice("Apro la pagina operativa dove l'agente lavorerà…");
  try {
    const res = await send({ action: "OPEN_OPERATING_PAGE", payload: { agentId: slug } });
    if (res?.success) {
      setNotice("Pagina operativa pronta: il cursore mostra dal vivo ogni azione dell'agente.");
    } else {
      setNotice(res?.error || "Impossibile aprire la pagina operativa: l'agente userà la scheda attiva.");
    }
  } catch (e) {
    setNotice("Impossibile aprire la pagina operativa: l'agente userà la scheda attiva.");
  }
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

function setScanning(on) {
  scanning = !!on;
  if (selectionBtn) selectionBtn.disabled = scanning;
  if (stopScanBtn) stopScanBtn.classList.toggle("hidden", !scanning);
  if (sendBtn) sendBtn.disabled = scanning || loading;
}

/**
 * Percorre tutta la pagina con il cursore e allega la scansione al prossimo
 * messaggio. Il service worker estrae ogni fascia di viewport; qui mostriamo
 * l'avanzamento e lasciamo sempre una via d'uscita (Stop o Esc).
 */
async function scanCurrentPage() {
  const tabs = await (api.tabs?.query ? api.tabs.query({ active: true, currentWindow: true }) : Promise.resolve([]));
  const tabId = tabs[0]?.id;
  if (tabId == null) throw new Error("Nessuna scheda attiva da analizzare.");

  setScanning(true);
  setNotice("Analisi della pagina in corso — il cursore percorre l'intera pagina. Premi Stop o Esc per interrompere.");
  try {
    const response = await send({ action: "SCAN_PAGE", tabId });
    if (!response?.success) throw new Error(response?.error || "Scansione non riuscita.");
    const scan = response.data;
    if (!scan?.sections?.length) {
      context = null;
      contextCard.classList.add("hidden");
      setNotice("La pagina non presenta contenuti leggibili (o è bloccata da login/permessi).");
      return null;
    }
    context = { title: scan.title, url: scan.url, selection: scan.selection || "", scan };
    renderContext(context);
    const parts = [`Analisi completata: ${scan.sections.length} blocchi, ${scan.steps} passi, copertura ${scan.coveragePercent ?? 100}%`];
    if (scan.aborted) parts.push("interrotta prima del fondo");
    else if (scan.limited) parts.push(`ferma prima del fondo (${scan.limited})`);
    if (scan.warnings?.length) parts.push(`${scan.warnings.length} contenuti non raggiungibili`);
    setNotice(parts.join(" · "));
    return scan;
  } finally {
    setScanning(false);
  }
}

/** Fallback storico: titolo, URL e selezione se la scansione non parte. */
async function useSelectionFallback(error) {
  try {
    const tabs = await (api.tabs?.query ? api.tabs.query({ active: true, currentWindow: true }) : Promise.resolve([]));
    const response = await send({ action: "GET_PAGE_CONTEXT", tabId: tabs[0]?.id });
    if (response?.success) {
      renderContext(response.data);
      setNotice(`Analisi completa non disponibile (${error?.message || "errore"}): inviati solo titolo, URL e selezione.`);
      return;
    }
    setNotice(response?.error || error?.message || "Impossibile analizzare la pagina.");
  } catch (e2) {
    setNotice(e2?.message || error?.message || "Impossibile analizzare la pagina.");
  }
}

if (selectionBtn) selectionBtn.addEventListener("click", async () => {
  if (scanning) return;
  try { await scanCurrentPage(); }
  catch (e) { await useSelectionFallback(e); }
});

if (stopScanBtn) stopScanBtn.addEventListener("click", async () => {
  if (!scanning) return;
  stopScanBtn.disabled = true;
  setNotice("Interruzione richiesta: ripristino scroll e cursore…");
  try { await send({ action: "AC_SCAN_ABORT" }); }
  catch (e) { setNotice(e?.message || "Impossibile interrompere l'analisi."); }
  finally { setTimeout(() => { stopScanBtn.disabled = false; }, 600); }
});

/**
 * Riconosce una richiesta in linguaggio naturale del tipo "analizza la pagina
 * corrente" (IT/EN) per avviare la scansione completa anche senza il bottone.
 */
function isPageAnalysisRequest(text) {
  const t = String(text || "").toLowerCase();
  const verb = /(analizz|analisi|scansion|esamin|riassum|riassunto|legg|studi|summar|analy[sz]|scan|read|inspect)/.test(t);
  const target = /(pagina|page|sito|site|documento|document|articolo|article|contenut|content|schermata|screen)/.test(t);
  return verb && target;
}

const composerEl = document.getElementById("composer");
if (composerEl) composerEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = promptEl.value.trim();
  if (!text || !agentId || requestId) return;

  promptEl.value = "";
  const history = [...messages, { role: "user", content: text }];
  messages.push({ role: "user", content: text });
  addMessage("user", text);

  // Se l'utente chiede di analizzare la pagina percorriamo TUTTA la pagina
  // prima di passare la richiesta. Una scansione interrotta o limitata non
  // vale come "pagina già analizzata": va rifatta per non mandare all'agente
  // un contesto parziale spacciandolo per completo.
  const existingScan = context?.scan;
  const scanIncomplete = !existingScan || existingScan.aborted || existingScan.limited;
  if (scanIncomplete && isPageAnalysisRequest(text)) {
    try {
      await scanCurrentPage();
    } catch (e) {
      setNotice(`Analisi completa non riuscita (${e?.message || "errore"}): procedo con il contesto disponibile.`);
    }
  }

  // Recupera tab attiva per far operare il cursore AgentCloud sulla pagina affianco (la apre se non è aperta)
  let tabId = null;
  try {
    const tabs = await (api.tabs?.query ? api.tabs.query({ active: true, currentWindow: true }) : Promise.resolve([]));
    tabId = tabs[0]?.id ?? null;
  } catch {}

  // La cronologia pre-run viene conservata in `lastRequest`: alla ripresa dopo
  // una conferma va rimandato lo stesso body più il token firmato.
  lastRequest = { agentId, messages: history, context, tabId };
  await startRun(lastRequest);
});

/**
 * Esegue una run nel pannello (nuovo prompt o ripresa dopo conferma).
 * Apre una bolla assistant e lascia che gli eventi AGENT_STREAM la riempiano.
 */
async function startRun(request) {
  requestId = crypto.randomUUID();
  setBusy(true);
  setNotice("");
  const bubble = addMessage("assistant", "");

  const response = await send({ action: "RUN_AGENT", payload: { ...request, requestId } });

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
}

/** Approva il tool in attesa e riprende la run con il token firmato. */
async function approvePendingRun() {
  const pending = pendingApproval;
  if (!pending || !lastRequest) return;
  pendingApproval = null;
  if (approvalCard) approvalCard.classList.add("hidden");
  await startRun({ ...lastRequest, approvalToken: pending.token });
}

/** Annulla: nessun tool eseguito, la chat torna disponibile. */
function denyPendingRun() {
  if (!pendingApproval) return;
  pendingApproval = null;
  if (approvalCard) approvalCard.classList.add("hidden");
  addMessage("assistant", "Operazione annullata: nessuna modifica è stata applicata.");
  setBusy(false);
}

if (approveBtn) approveBtn.addEventListener("click", () => { approvePendingRun(); });
if (denyBtn) denyBtn.addEventListener("click", denyPendingRun);

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
  } else if (message.type === "connection" && message.provider) {
    // La connessione OAuth si completa sul sito: qui solo l'avviso operativo.
    addMessage("tool", `Connessione richiesta (${message.provider}): completala dal sito per sbloccare le azioni reali.`);
  } else if (message.type === "tool_confirm" && typeof message.token === "string" && message.token) {
    // Il server ha messo in pausa la run: mostriamo la conferma. Il token è
    // firmato, quindi il pannello può solo approvare o annullare.
    pendingApproval = { token: message.token, toolName: String(message.toolName || "l'operazione") };
    if (approvalText) {
      approvalText.textContent = `"${pendingApproval.toolName}" modifica un contenuto esistente. Approvare l'operazione?`;
    }
    if (approvalCard) approvalCard.classList.remove("hidden");
    if (typingEl) typingEl.classList.add("hidden");
  } else if (message.type === "awaiting_confirmation") {
    if (typingEl) typingEl.classList.add("hidden");
  } else if (message.type === "error") {
    addMessage("assistant", message.message || message.error || "Errore dell'agente.");
    if (typingEl) typingEl.classList.add("hidden");
  } else if (message.type === "done") {
    if (typingEl) typingEl.classList.add("hidden");
  }
});

loadSession();


