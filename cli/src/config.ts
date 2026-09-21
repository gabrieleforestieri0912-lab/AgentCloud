import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export type UserCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email?: string;
};

export type CliConfig = {
  apiUrl: string;
  defaultAgent?: string;
};

const CONFIG_DIR = path.join(os.homedir(), ".agentcloud");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const CREDENTIALS_FILE = path.join(CONFIG_DIR, "credentials.json");

const DEFAULT_CONFIG: CliConfig = {
  apiUrl: process.env.AGENTCLOUD_API_URL || "https://www.agentcloud.agency",
  defaultAgent: "support-agent",
};

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

export function loadConfig(): CliConfig {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(updates: Partial<CliConfig>): CliConfig {
  ensureDir();
  const next = { ...loadConfig(), ...updates };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function loadCredentials(): UserCredentials | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8")) as UserCredentials;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: UserCredentials) {
  ensureDir();
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), "utf8");
  try { fs.chmodSync(CREDENTIALS_FILE, 0o600); } catch { /* Windows ACL/chmod limitation is non-blocking. */ }
}

export function clearCredentials() {
  try { fs.rmSync(CREDENTIALS_FILE, { force: true }); } catch { /* already logged out */ }
}

export function credentialsPath() { return CREDENTIALS_FILE; }
