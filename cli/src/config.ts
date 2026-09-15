import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface AgentCloudConfig {
  apiUrl: string;
  token?: string;
  defaultAgent?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".agentcloud");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: AgentCloudConfig = {
  apiUrl: "https://agentcloud.agency",
  defaultAgent: "support-agent",
};

export function loadConfig(): AgentCloudConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return DEFAULT_CONFIG;
    }
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(updates: Partial<AgentCloudConfig>): AgentCloudConfig {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const current = loadConfig();
    const updated = { ...current, ...updates };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (err) {
    console.error("Impossibile salvare la configurazione locale:", err);
    throw err;
  }
}
