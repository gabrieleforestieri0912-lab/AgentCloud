// AgentCloud Content Script — cross-browser
if (typeof chrome === "undefined" && typeof browser !== "undefined") {
  var chrome = browser;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXTRACT_PAGE_TEXT") {
    const title = document.title || "";
    const url = window.location.href || "";
    // Cattura la selezione attiva o una porzione rilevante di testo della pagina
    const selection = window.getSelection()?.toString() || "";
    const bodyText = selection.length > 0 
      ? selection 
      : document.body.innerText.substring(0, 3000);

    sendResponse({
      success: true,
      data: {
        title,
        url,
        text: bodyText,
        isSelection: selection.length > 0
      }
    });
  }
});
