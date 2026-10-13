/**
 * Quiz e flashcard interattivi per la chat.
 *
 * Modulo puro (niente rete, niente token): dal contenuto fornito dal modello
 * genera un documento HTML autonomo (CSS/JS inline, nessuna risorsa esterna)
 * che l'agente consegna in un blocco <agentcloud_file type="html">. La preview
 * laterale lo esegue in iframe sandbox con script inline consentiti.
 *
 * Perché generato dal codice e non scritto dal modello: l'interattività
 * (punteggio, flip delle card, shuffle) deve funzionare al primo colpo senza
 * dipendere dal JS scritto dal modello. Il modello fornisce solo i contenuti
 * (domande, opzioni, risposte), validati qui con errori leggibili.
 */

export type QuizQuestion = {
  question: string;
  options: string[];
  /** Indice (0-based) dell'opzione corretta. */
  answer: number;
  explanation?: string;
};

export type Flashcard = {
  front: string;
  back: string;
};

export type StudyLang = "it" | "en" | "es" | "de" | "fr";

const MAX_QUIZ_QUESTIONS = 15;
const MAX_FLASHCARDS = 100;

function clean(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

/** Escape HTML per i contenuti del modello (mai markup arbitrario nel doc). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** JSON embedded in <script>: neutralizza la sequenza di chiusura. */
function safeJson(v: unknown): string {
  return JSON.stringify(v).replace(/</g, "\\u003c");
}

function langOf(raw: unknown): StudyLang {
  const l = String(raw ?? "it").toLowerCase().slice(0, 2);
  return l === "en" || l === "es" || l === "de" || l === "fr" ? l : "it";
}

const STRINGS: Record<StudyLang, Record<string, string>> = {
  it: {
    check: "Verifica risposte", restart: "Ricomincia", score: "Punteggio",
    question: "Domanda", of: "di", correct: "Corretto!", wrong: "Sbagliato.",
    correctAnswer: "Risposta corretta:", unanswered: "Non hai risposto a tutte le domande.",
    flipHint: "Clicca la carta per girarla", prev: "← Precedente", next: "Successiva →",
    shuffle: "Mischia", cardOf: "Carta",
  },
  en: {
    check: "Check answers", restart: "Restart", score: "Score",
    question: "Question", of: "of", correct: "Correct!", wrong: "Wrong.",
    correctAnswer: "Correct answer:", unanswered: "You haven't answered all questions.",
    flipHint: "Click the card to flip it", prev: "← Previous", next: "Next →",
    shuffle: "Shuffle", cardOf: "Card",
  },
  es: {
    check: "Comprobar respuestas", restart: "Reiniciar", score: "Puntuación",
    question: "Pregunta", of: "de", correct: "¡Correcto!", wrong: "Incorrecto.",
    correctAnswer: "Respuesta correcta:", unanswered: "No has respondido a todas las preguntas.",
    flipHint: "Haz clic en la tarjeta para girarla", prev: "← Anterior", next: "Siguiente →",
    shuffle: "Mezclar", cardOf: "Tarjeta",
  },
  de: {
    check: "Antworten prüfen", restart: "Neustart", score: "Punktestand",
    question: "Frage", of: "von", correct: "Richtig!", wrong: "Falsch.",
    correctAnswer: "Richtige Antwort:", unanswered: "Du hast nicht alle Fragen beantwortet.",
    flipHint: "Klicke die Karte zum Umdrehen", prev: "← Zurück", next: "Weiter →",
    shuffle: "Mischen", cardOf: "Karte",
  },
  fr: {
    check: "Vérifier les réponses", restart: "Recommencer", score: "Score",
    question: "Question", of: "sur", correct: "Correct !", wrong: "Faux.",
    correctAnswer: "Bonne réponse :", unanswered: "Tu n'as pas répondu à toutes les questions.",
    flipHint: "Clique la carte pour la retourner", prev: "← Précédente", next: "Suivante →",
    shuffle: "Mélanger", cardOf: "Carte",
  },
};

const BASE_CSS = `
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
background:#f4f4f5;color:#18181b;margin:0;padding:24px;line-height:1.5}
.wrap{max-width:640px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}
.sub{color:#71717a;font-size:13px;margin-bottom:20px}
.card{background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:18px;margin-bottom:14px}
.btn{display:inline-block;border:0;border-radius:999px;padding:10px 22px;font-size:14px;font-weight:700;
cursor:pointer;background:#18181b;color:#fff;margin:4px 6px 4px 0}
.btn.secondary{background:#e4e4e7;color:#18181b}.btn:disabled{opacity:.5;cursor:default}
.opt{display:block;width:100%;text-align:left;background:#fafafa;border:2px solid #e4e4e7;border-radius:10px;
padding:10px 14px;margin:8px 0;font-size:14px;cursor:pointer}
.opt.sel{border-color:#18181b;background:#f4f4f5}
.opt.ok{border-color:#16a34a;background:#f0fdf4}
.opt.ko{border-color:#dc2626;background:#fef2f2}
.opt:disabled{cursor:default}
.expl{font-size:13px;color:#52525b;margin-top:8px;display:none}
.score{font-size:17px;font-weight:800;margin:14px 0}
.qnum{font-size:12px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.05em}
.fcard{perspective:1200px;cursor:pointer;min-height:260px}
.fin{position:relative;width:100%;min-height:260px;transition:transform .5s;transform-style:preserve-3d}
.fcard.flipped .fin{transform:rotateY(180deg)}
.face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;
backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#fff;border:1px solid #e4e4e7;
border-radius:16px;padding:28px;font-size:19px;font-weight:600}
.face.back{transform:rotateY(180deg);background:#18181b;color:#fafafa}
.nav{display:flex;align-items:center;gap:8px;margin-top:16px;flex-wrap:wrap}
.count{font-size:13px;color:#71717a;font-weight:700;margin-left:auto}
.hint{text-align:center;color:#a1a1aa;font-size:12px;margin-top:10px}`;

function parseQuestions(raw: unknown): { ok: true; questions: QuizQuestion[] } | { ok: false; error: string } {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  if (list.length < 2) return { ok: false, error: "quiz_create needs at least 2 questions." };
  if (list.length > MAX_QUIZ_QUESTIONS) {
    return { ok: false, error: `quiz_create supports at most ${MAX_QUIZ_QUESTIONS} questions.` };
  }
  const questions: QuizQuestion[] = [];
  for (let i = 0; i < list.length; i++) {
    const q = (list[i] ?? {}) as Record<string, unknown>;
    const question = clean(q.question, 500);
    const options = (Array.isArray(q.options) ? q.options : []).map((o) => clean(o, 300)).filter(Boolean);
    const answer = Number(q.answer);
    if (!question) return { ok: false, error: `Question ${i + 1}: missing text.` };
    if (options.length < 2 || options.length > 6) {
      return { ok: false, error: `Question ${i + 1}: provide 2-6 options.` };
    }
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      return { ok: false, error: `Question ${i + 1}: "answer" must be the 0-based index of the correct option.` };
    }
    questions.push({ question, options, answer, explanation: clean(q.explanation, 500) || undefined });
  }
  return { ok: true, questions };
}

function parseFlashcards(raw: unknown): { ok: true; cards: Flashcard[] } | { ok: false; error: string } {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  if (list.length < 2) return { ok: false, error: "flashcards_create needs at least 2 cards." };
  if (list.length > MAX_FLASHCARDS) {
    return { ok: false, error: `flashcards_create supports at most ${MAX_FLASHCARDS} cards.` };
  }
  const cards: Flashcard[] = [];
  for (let i = 0; i < list.length; i++) {
    const c = (list[i] ?? {}) as Record<string, unknown>;
    const front = clean(c.front, 1000);
    const back = clean(c.back, 1000);
    if (!front || !back) return { ok: false, error: `Card ${i + 1}: front and back are both required.` };
    cards.push({ front, back });
  }
  return { ok: true, cards };
}

/**
 * Quiz a scelta multipla: seleziona un'opzione per domanda, "Verifica" mostra
 * corrette/errate con spiegazioni e punteggio, "Ricomincia" azzera.
 */
export function buildQuizHtml(input: {
  title?: unknown;
  questions?: unknown;
  lang?: unknown;
}): { ok: true; html: string; count: number } | { ok: false; error: string } {
  const parsed = parseQuestions(input.questions);
  if (!parsed.ok) return parsed;
  const lang = langOf(input.lang);
  const t = STRINGS[lang];
  const title = escapeHtml(clean(input.title, 120) || "Quiz");
  const data = safeJson(parsed.questions.map((q) => ({ answer: q.answer })));

  const blocks = parsed.questions
    .map(
      (q, i) => `<div class="card" data-q="${i}"><div class="qnum">${escapeHtml(t.question)} ${i + 1} ${escapeHtml(t.of)} ${parsed.questions.length}</div>
<div style="font-weight:700;margin:6px 0 4px">${escapeHtml(q.question)}</div>
${q.options.map((o, j) => `<button class="opt" data-q="${i}" data-o="${j}">${escapeHtml(o)}</button>`).join("")}
<div class="expl" id="expl-${i}">${q.explanation ? escapeHtml(q.explanation) : ""}</div></div>`,
    )
    .join("\n");

  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>${BASE_CSS}</style></head><body><div class="wrap">
<h1>${title}</h1><div class="sub">${parsed.questions.length} ${escapeHtml(t.question.toLowerCase())}</div>
${blocks}
<div id="score" class="score"></div>
<button class="btn" id="check">${escapeHtml(t.check)}</button>
<button class="btn secondary" id="retry">${escapeHtml(t.restart)}</button>
</div><script>
var ANSWERS=${data};
var sel={};
document.querySelectorAll(".opt").forEach(function(b){
b.addEventListener("click",function(){
var q=b.getAttribute("data-q");
document.querySelectorAll('.opt[data-q="'+q+'"]').forEach(function(x){x.classList.remove("sel")});
b.classList.add("sel");sel[q]=parseInt(b.getAttribute("data-o"),10);});
});
document.getElementById("check").addEventListener("click",function(){
var qs=document.querySelectorAll(".card[data-q]"),score=0,missing=0;
qs.forEach(function(card){
var i=parseInt(card.getAttribute("data-q"),10);
var picked=sel[i];
if(picked===undefined||picked===null){missing++;return}
var ok=picked===ANSWERS[i].answer;if(ok)score++;
card.querySelectorAll(".opt").forEach(function(b){
var o=parseInt(b.getAttribute("data-o"),10);b.disabled=true;
if(o===ANSWERS[i].answer)b.classList.add("ok");
else if(o===picked)b.classList.add("ko");});
var ex=document.getElementById("expl-"+i);
if(ex&&(ex.textContent||ok===false)){ex.style.display="block";}
});
var s=document.getElementById("score");
if(missing>0){s.textContent=${safeJson(t.unanswered)};}
else{s.textContent=${safeJson(t.score)}+": "+score+"/"+qs.length;}
});
document.getElementById("retry").addEventListener("click",function(){
sel={};document.querySelectorAll(".opt").forEach(function(b){b.disabled=false;b.classList.remove("sel","ok","ko")});
document.querySelectorAll(".expl").forEach(function(e){e.style.display="none"});
document.getElementById("score").textContent="";});
</script></body></html>`;
  return { ok: true, html, count: parsed.questions.length };
}

/**
 * Flashcard: carta fronte/retro con flip al click, frecce avanti/indietro,
 * mischia e contatore. Navigabile anche da tastiera (frecce, spazio).
 */
export function buildFlashcardsHtml(input: {
  title?: unknown;
  cards?: unknown;
  lang?: unknown;
}): { ok: true; html: string; count: number } | { ok: false; error: string } {
  const parsed = parseFlashcards(input.cards);
  if (!parsed.ok) return parsed;
  const lang = langOf(input.lang);
  const t = STRINGS[lang];
  const title = escapeHtml(clean(input.title, 120) || "Flashcard");
  const data = safeJson(parsed.cards);

  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>${BASE_CSS}</style></head><body><div class="wrap">
<h1>${title}</h1><div class="sub">${parsed.cards.length} ${escapeHtml(t.cardOf.toLowerCase())}</div>
<div class="fcard" id="fcard" role="button" tabindex="0" aria-label="${escapeHtml(t.flipHint)}"><div class="fin">
<div class="face front" id="front"></div><div class="face back" id="back"></div>
</div></div><div class="hint">${escapeHtml(t.flipHint)}</div>
<div class="nav"><button class="btn secondary" id="prev">${escapeHtml(t.prev)}</button>
<button class="btn secondary" id="next">${escapeHtml(t.next)}</button>
<button class="btn secondary" id="shuf">${escapeHtml(t.shuffle)}</button>
<span class="count" id="count"></span></div>
</div><script>
var CARDS=${data},order=CARDS.map(function(_,i){return i}),pos=0,flipped=false;
function render(){
var c=CARDS[order[pos]];
document.getElementById("front").textContent=c.front;
document.getElementById("back").textContent=c.back;
document.getElementById("fcard").classList.remove("flipped");flipped=false;
document.getElementById("count").textContent=(pos+1)+" / "+CARDS.length;}
function flip(){flipped=!flipped;document.getElementById("fcard").classList.toggle("flipped",flipped)}
function go(d){pos=(pos+d+CARDS.length)%CARDS.length;render()}
document.getElementById("fcard").addEventListener("click",flip);
document.getElementById("prev").addEventListener("click",function(e){e.stopPropagation();go(-1)});
document.getElementById("next").addEventListener("click",function(e){e.stopPropagation();go(1)});
document.getElementById("shuf").addEventListener("click",function(e){e.stopPropagation();
for(var i=order.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var k=order[i];order[i]=order[j];order[j]=k}
pos=0;render()});
document.addEventListener("keydown",function(e){
if(e.key==="ArrowRight")go(1);else if(e.key==="ArrowLeft")go(-1);
else if(e.key===" "||e.key==="Enter"){e.preventDefault();flip()}});
render();
</script></body></html>`;
  return { ok: true, html, count: parsed.cards.length };
}
