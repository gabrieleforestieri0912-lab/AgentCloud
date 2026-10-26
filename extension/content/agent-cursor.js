// AgentCloud — Cursore reattivo personalizzato per operazioni agente sulla pagina affianco.
// Viene iniettato programmaticamente dal background quando l'agente inizia a operare.
// Mostra un cursore branded (gradiente AgentCloud) che si muove, clicca, evidenzia e digita
// sulla pagina attiva. La pagina viene aperta se non è presente (gestito dal background).
(function () {
  if (window.__acCursorInjected) return;
  window.__acCursorInjected = true;

  const STYLE_ID = "ac-cursor-style";
  const CURSOR_ID = "ac-agent-cursor";
  const HIGHLIGHT_CLASS = "ac-cursor-highlight";

  // ——— Stili ———
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${CURSOR_ID} {
        position: fixed;
        left: 0; top: 0;
        width: 36px; height: 36px;
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(-50%, -50%);
        transition: transform 0.62s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
        opacity: 0;
        will-change: transform, opacity;
      }
      #${CURSOR_ID}.ac-visible { opacity: 1; }
      #${CURSOR_ID} .ac-cursor-dot {
        width: 36px; height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #038bfe 0%, #8b5cf6 100%);
        box-shadow: 0 4px 18px rgba(3,139,254,0.45), 0 0 0 4px rgba(139,92,246,0.18);
        display: grid; place-items: center;
        color: #fff; font-size: 16px; font-weight: 800;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      #${CURSOR_ID}.ac-clicking .ac-cursor-dot {
        transform: scale(0.82);
        box-shadow: 0 2px 10px rgba(3,139,254,0.5), 0 0 0 7px rgba(139,92,246,0.28);
      }
      #${CURSOR_ID} .ac-cursor-ring {
        position: absolute; inset: -6px;
        border-radius: 50%;
        border: 2px solid rgba(3,139,254,0.35);
        animation: ac-ring-pulse 1.6s ease-in-out infinite;
      }
      @keyframes ac-ring-pulse {
        0% { transform: scale(0.92); opacity: 0.9; }
        50% { transform: scale(1.08); opacity: 0.45; }
        100% { transform: scale(0.92); opacity: 0.9; }
      }
      #${CURSOR_ID} .ac-cursor-label {
        position: absolute;
        left: 42px; top: 50%;
        transform: translateY(-50%);
        background: #10131a;
        color: #e4ebf5;
        border: 1px solid #2b3140;
        border-radius: 8px;
        padding: 5px 9px;
        font-size: 11px; font-weight: 700; line-height: 1;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        opacity: 0; transition: opacity 0.2s ease;
        pointer-events: none;
      }
      #${CURSOR_ID}.ac-has-label .ac-cursor-label { opacity: 1; }
      #${CURSOR_ID} .ac-cursor-ripple {
        position: absolute; inset: 0;
        border-radius: 50%;
        border: 2px solid rgba(3,139,254,0.9);
        animation: ac-ripple 0.55s ease-out forwards;
        pointer-events: none;
      }
      @keyframes ac-ripple {
        0% { transform: scale(0.7); opacity: 1; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      .${HIGHLIGHT_CLASS} {
        outline: 2px solid #038bfe !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(3,139,254,0.18) !important;
        transition: outline 0.2s ease, box-shadow 0.2s ease !important;
      }
      .ac-typing-caret {
        display: inline-block;
        width: 2px; height: 1em;
        background: #038bfe;
        margin-left: 1px;
        vertical-align: text-bottom;
        animation: ac-caret-blink 0.9s step-end infinite;
      }
      @keyframes ac-caret-blink { 50% { opacity: 0; } }
      /* Barra di avanzamento della scansione pagina */
      #ac-scan-progress {
        position: fixed;
        left: 0; top: 0; right: 0;
        height: 3px;
        background: rgba(255,255,255,0.08);
        z-index: 2147483646;
        display: none;
        pointer-events: none;
      }
      #ac-scan-progress.ac-on { display: block; }
      #ac-scan-progress .ac-scan-fill {
        height: 100%; width: 0%;
        background: linear-gradient(90deg, #038bfe, #8b5cf6);
        transition: width 0.25s ease;
      }
      /* Badge percentuale: sempre leggibile anche se la barra è sottile */
      #ac-scan-badge {
        position: fixed;
        top: 12px; right: 12px;
        z-index: 2147483646;
        display: none;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(139,92,246,0.5);
        background: rgba(16,19,26,0.92);
        color: #e4ebf5;
        font: 700 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 4px 16px rgba(0,0,0,0.35);
        pointer-events: none;
      }
      #ac-scan-badge.ac-on { display: inline-flex; }
      #ac-scan-badge .ac-scan-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: #038bfe;
        box-shadow: 0 0 0 3px rgba(3,139,254,0.18);
      }
      /* prefers-reduced-motion: niente animazioni del cursore, della barra e del badge */
      #${CURSOR_ID}.ac-reduce { transition: none !important; }
      #${CURSOR_ID}.ac-reduce .ac-cursor-dot { transition: none !important; }
      #ac-scan-progress.ac-reduce .ac-scan-fill { transition: none !important; }
      #ac-scan-badge.ac-reduce .ac-scan-dot { animation: none !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // ——— DOM cursore ———
  function ensureCursor() {
    let el = document.getElementById(CURSOR_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = CURSOR_ID;
    el.innerHTML = `
      <div class="ac-cursor-ring"></div>
      <div class="ac-cursor-dot"></div>
      <div class="ac-cursor-label">AgentCloud</div>
    `;
    document.documentElement.appendChild(el);
    return el;
  }

  const cursor = ensureCursor();
  let lastX = window.innerWidth / 2;
  let lastY = window.innerHeight / 2;
  let visible = false;
  let highlightEl = null;

  function setPosition(x, y, immediate) {
    lastX = Math.max(18, Math.min(window.innerWidth - 18, x));
    lastY = Math.max(18, Math.min(window.innerHeight - 50, y));
    if (immediate) {
      cursor.style.transition = "none";
      cursor.style.transform = `translate(${lastX}px, ${lastY}px) translate(-50%, -50%)`;
      // force reflow
      void cursor.offsetHeight;
      cursor.style.transition = "";
    }
    cursor.style.transform = `translate(${lastX}px, ${lastY}px) translate(-50%, -50%)`;
  }

  function show(label) {
    ensureCursor();
    visible = true;
    cursor.classList.add("ac-visible");
    if (label) {
      cursor.querySelector(".ac-cursor-label").textContent = label;
      cursor.classList.add("ac-has-label");
    }
    // posizione iniziale al centro
    setPosition(window.innerWidth * 0.52, window.innerHeight * 0.42, true);
    // piccolo movimento dimostrativo
    setTimeout(() => setPosition(window.innerWidth * 0.55, window.innerHeight * 0.45), 180);
  }

  function hide() {
    visible = false;
    cursor.classList.remove("ac-visible", "ac-has-label");
    clearHighlight();
    // Se l'analisi viene interrotta, non lasciare barra/badge orfani.
    const bar = document.getElementById("ac-scan-progress");
    if (bar) bar.classList.remove("ac-on");
    const badge = document.getElementById("ac-scan-badge");
    if (badge) badge.classList.remove("ac-on");
  }

  function moveTo(x, y, label) {
    if (!visible) show(label);
    if (label) {
      cursor.querySelector(".ac-cursor-label").textContent = label;
      cursor.classList.add("ac-has-label");
    }
    setPosition(x, y);
  }

  function clickEffect() {
    cursor.classList.add("ac-clicking");
    const ripple = document.createElement("div");
    ripple.className = "ac-cursor-ripple";
    cursor.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    setTimeout(() => cursor.classList.remove("ac-clicking"), 180);
    // feedback aptico visivo: breve vibrazione (se supportata dall'elemento sotto)
  }

  function highlight(selectorOrEl) {
    clearHighlight();
    let el = null;
    if (typeof selectorOrEl === "string") {
      try { el = document.querySelector(selectorOrEl); } catch {}
      if (!el) {
        // fallback: cerca per testo visibile
        const all = document.querySelectorAll("button, a, input, [role='button'], [data-testid]");
        for (const n of all) {
          if (n.textContent && n.textContent.toLowerCase().includes(selectorOrEl.toLowerCase().slice(0, 20))) { el = n; break; }
        }
      }
    } else if (selectorOrEl instanceof Element) el = selectorOrEl;
    if (!el) return;
    el.classList.add(HIGHLIGHT_CLASS);
    highlightEl = el;
    const r = el.getBoundingClientRect();
    moveTo(r.left + r.width / 2, r.top + r.height / 2);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearHighlight() {
    if (highlightEl) {
      highlightEl.classList.remove(HIGHLIGHT_CLASS);
      highlightEl = null;
    }
  }

  // ——— Modalità analisi pagina (scansione completa dall'alto al basso) ———
  // Lo scan è pilotato dal service worker step per step: qui il cursore mostra
  // la barra di avanzamento, segue la posizione di lettura e sospende il drift
  // casuale. Esc notifica al background la richiesta di interruzione.
  const BAR_ID = "ac-scan-progress";
  const BADGE_ID = "ac-scan-badge";
  let scanActive = false;
  const reduceMq = (typeof window.matchMedia === "function") ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const prefersReducedMotion = () => !!(reduceMq && reduceMq.matches);

  function ensureProgressBar() {
    let bar = document.getElementById(BAR_ID);
    if (!bar) {
      bar = document.createElement("div");
      bar.id = BAR_ID;
      bar.innerHTML = `<div class="ac-scan-fill"></div>`;
      document.documentElement.appendChild(bar);
    }
    return bar.querySelector(".ac-scan-fill");
  }

  function ensureScanBadge() {
    let badge = document.getElementById(BADGE_ID);
    if (!badge) {
      badge = document.createElement("div");
      badge.id = BADGE_ID;
      badge.innerHTML = `<span class="ac-scan-dot"></span><span class="ac-scan-text">Analisi 0%</span>`;
      document.documentElement.appendChild(badge);
    }
    return badge;
  }

  function setScanPercent(percent) {
    const value = Math.max(0, Math.min(100, Math.round(percent || 0)));
    const bar = document.getElementById(BAR_ID);
    const fill = bar && bar.querySelector(".ac-scan-fill");
    if (fill) fill.style.width = `${value}%`;
    const badge = ensureScanBadge();
    const text = badge.querySelector(".ac-scan-text");
    if (text) text.textContent = `Analisi ${value}%`;
    return value;
  }

  function scanStart() {
    ensureCursor();
    ensureProgressBar();
    const bar = document.getElementById(BAR_ID);
    const badge = ensureScanBadge();
    bar.classList.add("ac-on");
    badge.classList.add("ac-on");
    if (prefersReducedMotion()) {
      bar.classList.add("ac-reduce");
      badge.classList.add("ac-reduce");
      cursor.classList.add("ac-reduce");
    }
    setScanPercent(0);
    scanActive = true;
    show("Analisi della pagina…");
  }

  function scanProgress(payload) {
    const percent = setScanPercent(payload.percent);
    moveTo(
      typeof payload.x === "number" ? payload.x : lastX,
      typeof payload.y === "number" ? payload.y : lastY,
      payload.label || `Analisi: ${percent}%`,
    );
  }

  function scanEnd(payload = {}) {
    scanActive = false;
    const bar = document.getElementById(BAR_ID);
    if (bar) bar.classList.remove("ac-on", "ac-reduce");
    const badge = document.getElementById(BADGE_ID);
    if (badge) badge.classList.remove("ac-on", "ac-reduce");
    setScanPercent(0);
    cursor.classList.remove("ac-reduce");
    const label = payload.label || "Analisi completata";
    cursor.querySelector(".ac-cursor-label").textContent = label;
    cursor.classList.add("ac-has-label");
    // Al termine torna allo stato normale: cursore nascosto.
    setTimeout(() => { if (!scanActive) hide(); }, 1200);
  }

  function typeInto(selector, text) {
    let el = null;
    try { el = document.querySelector(selector); } catch {}
    if (!el) {
      // prova a trovare input visibile
      el = document.querySelector("input:not([type='hidden']), textarea, [contenteditable='true']");
    }
    if (el) {
      try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
      highlight(el);
      el.focus();
      // simula digitazione
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.value = "";
        let i = 0;
        const iv = setInterval(() => {
          if (i >= text.length) { clearInterval(iv); el.dispatchEvent(new Event("change", { bubbles: true })); return; }
          el.value += text[i++];
          el.dispatchEvent(new Event("input", { bubbles: true }));
          // cursore resta vicino all'input
          const r = el.getBoundingClientRect();
          setPosition(r.left + 12 + (el.value.length * 5), r.top + r.height / 2);
        }, 38);
      } else {
        el.textContent = text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  function scrollTo(y) {
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  // ——— Messaggi dal background ———
  const api = (typeof chrome !== "undefined" ? chrome : (typeof browser !== "undefined" ? browser : null));
  if (api && api.runtime && api.runtime.onMessage) {
    api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg || !msg.action || !msg.action.startsWith("AC_CURSOR_")) return;
      try {
        switch (msg.action) {
          case "AC_CURSOR_SHOW":
            show(msg.label || "AgentCloud sta operando…");
            break;
          case "AC_CURSOR_HIDE":
            hide();
            break;
          case "AC_CURSOR_MOVE":
            moveTo(msg.x ?? lastX, msg.y ?? lastY, msg.label);
            break;
          case "AC_CURSOR_CLICK":
            if (typeof msg.x === "number" && typeof msg.y === "number") moveTo(msg.x, msg.y, msg.label);
            clickEffect();
            // se c'è un selettore, clicca davvero dopo l'animazione
            if (msg.selector) {
              setTimeout(() => {
                let target = null;
                try { target = document.querySelector(msg.selector); } catch {}
                if (target) {
                  try { target.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
                  setTimeout(() => { try { target.focus({ preventScroll: true }); } catch {} try { target.click(); } catch {} }, 250);
                }
              }, 220);
            }
            break;
          case "AC_CURSOR_HIGHLIGHT":
            highlight(msg.selector || msg.text);
            break;
          case "AC_CURSOR_TYPE":
            typeInto(msg.selector, msg.text || "");
            break;
          case "AC_CURSOR_SCROLL":
            scrollTo(msg.y ?? 0);
            break;
          case "AC_CURSOR_LABEL":
            cursor.querySelector(".ac-cursor-label").textContent = msg.label || "AgentCloud";
            cursor.classList.add("ac-has-label");
            break;
          case "AC_CURSOR_CLEAR":
            clearHighlight();
            break;
          case "AC_CURSOR_SCAN_START":
            scanStart();
            break;
          case "AC_CURSOR_SCAN_STEP":
            scanProgress(msg);
            break;
          case "AC_CURSOR_SCAN_END":
            scanEnd(msg);
            break;
        }
      } catch (e) {
        // ignora errori di DOM su pagine non standard
      }
      if (sendResponse) sendResponse({ success: true });
      return true;
    });
  }

  // ——— Esc durante la scansione: interruzione verso il background ———
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && scanActive) {
      try { api?.runtime?.sendMessage?.({ action: "AC_SCAN_ABORT" }); } catch {}
    }
  }, true);

  // ——— Auto-demo quando mostrato senza comandi: movimento dolce a onda ———
  let idleTimer = null;
  function startIdleMotion() {
    if (idleTimer) clearInterval(idleTimer);
    idleTimer = setInterval(() => {
      // Durante la scansione il cursore segue la lettura: niente drift casuale.
      if (!visible || scanActive) return;
      // piccolo drift casuale attorno alla posizione attuale
      const dx = (Math.random() - 0.5) * 40;
      const dy = (Math.random() - 0.5) * 24;
      setPosition(lastX + dx, lastY + dy);
    }, 1100);
  }
  startIdleMotion();

  // Esponi API globale per debug / fallback executeScript
  window.__acCursor = { show, hide, moveTo, clickEffect, highlight, clearHighlight, typeInto, scrollTo, setPosition, scanStart, scanProgress, scanEnd };

  // Notifica background che il cursore è pronto
  try { api?.runtime?.sendMessage?.({ action: "AC_CURSOR_READY" }); } catch {}
})();
