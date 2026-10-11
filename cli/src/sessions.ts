import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatSession = {
  code: string;
  agent: string;
  messages: ChatMessage[];
  updatedAt: string;
};

const SESSIONS_DIR = path.join(os.homedir(), ".agentcloud", "sessions");

function ensureDir(): void {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function sessionFile(code: string): string {
  return path.join(SESSIONS_DIR, `${code}.json`);
}

function isValidCode(code: string): boolean {
  return /^[a-f0-9]{8}$/.test(code);
}

/**
 * Salva la cronologia di una chat su disco e restituisce la sessione.
 *
 * Il codice è corto (8 esadecimali) così si detta a voce e si ribatte senza
 * errori. Passando `existingCode` si sovrascrive la stessa sessione invece di
 * crearne una nuova (usato quando si riprende e si riesce da una chat).
 */
export function saveChatSession(
  agent: string,
  messages: ChatMessage[],
  existingCode?: string,
): ChatSession {
  ensureDir();
  const code =
    existingCode && isValidCode(existingCode) ? existingCode : crypto.randomBytes(4).toString("hex");
  const session: ChatSession = {
    code,
    agent,
    messages,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(sessionFile(code), JSON.stringify(session, null, 2), "utf8");
  return session;
}

/**
 * Carica una sessione salvata dal suo codice. Lancia un errore leggibile se
 * il codice non esiste o il file è corrotto: mai uno stack trace grezzo.
 */
export function loadChatSession(code: string): ChatSession {
  const clean = code.trim().toLowerCase();
  if (!isValidCode(clean)) {
    throw new Error(
      `Codice sessione non valido: "${code}". Il codice sono 8 caratteri esadecimali, quello stampato all'uscita dalla chat.`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(sessionFile(clean), "utf8")) as unknown;
  } catch {
    throw new Error(
      `Sessione "${clean}" non trovata su questo computer. Le sessioni vivono in ~/.agentcloud/sessions e non seguono l'account su altri PC.`,
    );
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as ChatSession).agent !== "string" ||
    !Array.isArray((parsed as ChatSession).messages)
  ) {
    throw new Error(`Sessione "${clean}" illeggibile: file danneggiato.`);
  }
  return parsed as ChatSession;
}

/** Frase stampata all'uscita dalla chat per tornarci dopo. */
export function resumeHint(agent: string, code: string): string {
  return `Sessione salvata. Per tornare a questa chat:\n  agentcloud chat ${agent} --resume ${code}`;
}
