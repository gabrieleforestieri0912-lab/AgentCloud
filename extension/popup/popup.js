// AgentCloud Popup Logic — cross-browser
if (typeof chrome === "undefined" && typeof browser !== "undefined") {
  var chrome = browser;
}

let pageContext = null;

const agentSelect = document.getElementById("agentSelect");
const promptInput = document.getElementById("promptInput");
const attachContextBtn = document.getElementById("attachContextBtn");
const contextPreview = document.getElementById("contextPreview");
const runBtn = document.getElementById("runBtn");
const resultContainer = document.getElementById("resultContainer");
const resultText = document.getElementById("resultText");
const copyBtn = document.getElementById("copyBtn");
const statusBadge = document.getElementById("statusBadge");

// Cattura contesto della pagina
attachContextBtn.addEventListener("click", () => {
  attachContextBtn.disabled = true;
  attachContextBtn.innerText = "Caricamento...";

  chrome.runtime.sendMessage({ action: "GET_PAGE_CONTEXT" }, (response) => {
    attachContextBtn.disabled = false;
    if (response && response.success && response.data) {
      pageContext = response.data;
      contextPreview.classList.remove("hidden");
      contextPreview.innerText = `Contesto: ${pageContext.title || "Pagina"} (${pageContext.text.length} caratteri)`;
      attachContextBtn.innerText = "✓ Incluso";
    } else {
      attachContextBtn.innerText = "! Errore";
    }
  });
});

// Esegui agente
runBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  const agent = agentSelect.value;

  if (!prompt && !pageContext) {
    alert("Inserisci un prompt o includi il contesto della pagina.");
    return;
  }

  runBtn.disabled = true;
  runBtn.innerText = "Esecuzione in corso...";
  statusBadge.innerText = "In elaborazione";
  statusBadge.style.color = "#818cf8";
  resultContainer.classList.add("hidden");

  // Recupera eventuale token salvato nello storage dell'estensione
  chrome.storage.sync.get(["agentcloud_token"], (items) => {
    const token = items.agentcloud_token || null;

    chrome.runtime.sendMessage(
      {
        action: "RUN_AGENT",
        payload: {
          agent,
          prompt: prompt || "Analizza e riassumi le informazioni fornite.",
          context: pageContext,
          token,
        },
      },
      (res) => {
        runBtn.disabled = false;
        runBtn.innerText = "Esegui Agente";
        statusBadge.innerText = "Pronto";
        statusBadge.style.color = "#34d399";

        if (res && res.success && res.data) {
          resultContainer.classList.remove("hidden");
          const output = res.data.output || res.data.response || JSON.stringify(res.data, null, 2);
          resultText.innerText = output;
        } else {
          resultContainer.classList.remove("hidden");
          resultText.innerText = `Errore: ${res?.error || "Impossibile completare la richiesta"}`;
        }
      }
    );
  });
});

// Copia risultato
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(resultText.innerText).then(() => {
    copyBtn.innerText = "Copiato!";
    setTimeout(() => {
      copyBtn.innerText = "Copia";
    }, 1500);
  });
});
