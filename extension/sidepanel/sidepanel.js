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

function send(message) {
  return new Promise((resolve) => api.runtime.sendMessage(message, resolve));
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

document.getElementById("loginBtn").addEventListener("click", () => send({ action: "OPEN_LOGIN" }));
document.getElementById("refreshLoggedOutBtn").addEventListener("click", () => loadSession(true));
document.getElementById("retryBtn").addEventListener("click", () => loadSession(true));
document.getElementById("refreshBtn").addEventListener("click", () => loadSession(true));
changeAgentBtn.addEventListener("click", () => showAgents());
document.getElementById("openMarketplaceBtn").addEventListener("click", () => api.tabs.create({ url: `${SITE}/agents` }));
document.getElementById("openSiteBtn").addEventListener("click", () => api.tabs.create({ url: SITE }));

selectionBtn.addEventListener("click", async () => {
  const tabs = await api.tabs.query({ active: true, currentWindow: true });
  const response = await send({ action: "GET_PAGE_CONTEXT", tabId: tabs[0]?.id });
  if (!response?.success) {
    setNotice(response?.error || "Impossibile leggere la selezione della pagina attiva.");
    return;
  }
  renderContext(response.data);
  setNotice(response.data.selection ? "" : "Nessun testo selezionato: verranno inviati titolo e URL della pagina.");
});

document.getElementById("composer").addEventListener("submit", async (event) => {
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

  const response = await send({ action: "RUN_AGENT", payload: { agentId, messages: history, context, requestId } });

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
    const assistants = messagesEl.querySelectorAll(".message.assistant");
    const current = assistants[assistants.length - 1];
    if (current) current.textContent += message.content;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } else if (message.type === "tool_start") {
    addMessage("tool", `Uso ${message.toolName || "uno strumento"}…`);
  } else if (message.type === "done") {
    typingEl.classList.add("hidden");
  }
});

loadSession();


