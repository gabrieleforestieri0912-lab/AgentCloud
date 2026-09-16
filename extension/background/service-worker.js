// AgentCloud Background Service Worker (Manifest V3) — cross-browser (Chrome/Edge/Brave/Opera/Firefox)
// Firefox MV3 espone `browser`, Chromium `chrome`. Il polyfill garantisce compatibilità senza dipendenze.
if (typeof chrome === "undefined" && typeof browser !== "undefined") {
  // eslint-disable-next-line no-global-assign
  var chrome = browser;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("AgentCloud Copilot extension installed.");
});

// Listener per messaggi provenienti da popup o content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "RUN_AGENT") {
    handleRunAgent(request.payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Asynchronous response
  }

  if (request.action === "GET_PAGE_CONTEXT") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ success: false, error: "No active tab" });
        return;
      }
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "EXTRACT_PAGE_TEXT" },
        (res) => {
          sendResponse(res || { success: false, error: "Could not extract text" });
        }
      );
    });
    return true;
  }
});

async function handleRunAgent({ agent, prompt, context, token }) {
  const response = await fetch("https://agentcloud.agency/api/agent/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      agent,
      prompt,
      context,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Agent execution failed (${response.status}): ${errorText}`);
  }

  return await response.json();
}
