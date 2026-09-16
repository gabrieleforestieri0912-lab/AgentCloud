# AgentCloud Copilot — Estensione Browser

Estensione ufficiale di **AgentCloud** per portare gli agenti AI autonomi su qualsiasi pagina web. **Compatibile con Chrome, Edge, Brave, Opera e Firefox** (Manifesto V3 + gecko id).

## Funzionalità
- **Copilota universale**: esegui prompt veloci con qualsiasi agente della piattaforma.
- **Context injection**: acquisisce testo pagina/selezione e lo invia come contesto all'agente.
- **Manifest V3** con `browser_specific_settings` per Firefox (109+). Stesso codebase Chromium → Firefox.

## Compatibilità browser
| Browser | Versione minima | Metodo |
|---------|-----------------|--------|
| **Chrome** | 88+ | `chrome://extensions` → Load unpacked |
| **Edge** | 88+ | `edge://extensions` → Load unpacked |
| **Brave** | 1.19+ | `brave://extensions` → Load unpacked |
| **Opera** | 76+ | `opera://extensions` → Developer mode |
| **Firefox** | 109+ | `about:debugging#/runtime/this-firefox` → Load Temporary Add-on |
| **Safari** | 14+ | Conversione: `xcrun safari-web-extension-converter extension/` poi Xcode |

Tutti i browser Chromium condividono lo stesso `manifest.json` (MV3). Firefox usa lo stesso file grazie a `browser_specific_settings.gecko.id = copilot@agentcloud.agency` (strict_min_version 109). Safari richiede conversione Xcode.

## Installazione locale (sviluppo)

**Chromium (Chrome / Edge / Brave / Opera):**
1. Apri `chrome://extensions/` (o `edge://extensions`, `brave://extensions`).
2. Attiva **Modalità sviluppatore**.
3. **Carica estensione non pacchettizzata** → seleziona `extension/`.

**Firefox:**
1. Apri `about:debugging#/runtime/this-firefox`.
2. **Carica componente aggiuntivo temporaneo…** → seleziona `extension/manifest.json`.
3. Per distribuzione permanente: firma su `addons.mozilla.org` (AMO).

**Safari:**
```bash
xcrun safari-web-extension-converter extension/ --project-location ./SafariExtension
open SafariExtension/*.xcodeproj # build in Xcode
```

## Build per store
```bash
# Chrome Web Store / Edge Add-ons: zip della cartella extension/
cd extension && zip -r ../agentcloud-copilot-chrome.zip . -x "*.git*" "*.DS_Store"
# Firefox AMO: stesso zip (con gecko id, MV3 109+)
```
