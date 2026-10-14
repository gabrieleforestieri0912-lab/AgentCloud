/** Client API web (stessi contratti di CLI/mobile): Bearer + SSE. */
export const API_BASE = "https://www.agentcloud.agency";

export type SseEvent =
  | { type: "text"; content: string }
  | { type: "tool_start"; toolName: string }
  | { type: "tool_done"; toolName: string }
  | { type: "tool_confirm"; token: string; toolName: string }
  | { type: "connection"; provider: string }
  | { type: "file"; filename: string; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

async function* readSse(res: Response, onEvent?: (e: SseEvent) => void): AsyncGenerator<SseEvent> {
  if (!res.ok || !res.body) {
    let message = `Errore ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      /* corpo non JSON */
    }
    throw new Error(message);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const e = JSON.parse(line.slice(6)) as SseEvent;
        onEvent?.(e);
        yield e;
      } catch {
        /* riga parziale */
      }
    }
  }
}

export async function* runAgent(
  token: string,
  agentId: string,
  messages: Array<{ role: string; content: string }>,
  approvalToken?: string,
  onEvent?: (e: SseEvent) => void,
): AsyncGenerator<SseEvent> {
  const res = await fetch(`${API_BASE}/api/agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      agentId,
      messages,
      ...(approvalToken ? { approval: { token: approvalToken } } : {}),
    }),
  });
  yield* readSse(res, onEvent);
}

export async function* sendChat(
  token: string,
  messages: Array<{ role: string; content: string }>,
  agentId?: string,
  onEvent?: (e: SseEvent) => void,
): AsyncGenerator<SseEvent> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages, ...(agentId ? { agentId } : {}) }),
  });
  yield* readSse(res, onEvent);
}

export async function shareChat(
  token: string,
  title: string,
  messages: Array<{ role: string; content: string; agentSlug?: string }>,
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, messages }),
  });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) throw new Error(data?.error ?? "Condivisione fallita");
  return data.url.startsWith("http") ? data.url : `${API_BASE}${data.url}`;
}
