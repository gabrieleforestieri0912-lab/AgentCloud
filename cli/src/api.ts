import { loadConfig } from "./config.js";

export async function executeAgent(agentSlug: string, prompt: string) {
  const config = loadConfig();
  const url = `${config.apiUrl}/api/agent/run`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agent: agentSlug,
      prompt,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Richiesta fallita [${response.status}]: ${errorBody}`);
  }

  return await response.json();
}
