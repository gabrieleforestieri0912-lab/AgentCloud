import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, runAgent, sendChat, shareChat, type SseEvent } from "./lib/api";
import { AGENTS, connectUrlFor } from "./lib/agents";
import { parseChatFiles, renderMarkdown, type ChatFile } from "./lib/chat";
import { useAuth } from "./auth";

type Msg = { role: "user" | "assistant"; text: string; files: ChatFile[]; error?: boolean };

/** Vista chat: sidebar agenti + streaming + approvazioni + file + share. */
export function ChatView({ token }: { token: string }) {
  const [agentSlug, setAgentSlug] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const [pending, setPending] = useState<{ token: string; toolName: string } | null>(null);
  const [connects, setConnects] = useState<string[]>([]);
  const [preview, setPreview] = useState<ChatFile | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, running]);

  const send = useCallback(
    async (approvalToken?: string) => {
      const text = input.trim();
      if ((!text && !approvalToken) || running) return;
      setInput("");
      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.text })),
        ...(text ? [{ role: "user", content: text }] : []),
      ];
      if (text) setMessages((prev) => [...prev, { role: "user", text, files: [] }]);
      setRunning(true);
      setActivity(null);
      setPending(null);
      setConnects([]);
      let acc = "";
      let files: ChatFile[] = [];
      const pushAssistant = () =>
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          const parsed = parseChatFiles(acc);
          files = parsed.files;
          if (last && last.role === "assistant" && !last.error) {
            return [...prev.slice(0, -1), { role: "assistant", text: parsed.text, files: parsed.files }];
          }
          return [...prev, { role: "assistant", text: parsed.text, files: parsed.files }];
        });
      try {
        const stream = agentSlug
          ? runAgent(token, agentSlug, history, approvalToken)
          : sendChat(token, history, undefined);
        for await (const e of stream) {
          handleEvent(e);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Errore: ${err instanceof Error ? err.message : String(err)}`, files: [], error: true },
        ]);
      } finally {
        setRunning(false);
        setActivity(null);
      }

      function handleEvent(e: SseEvent): void {
        if (e.type === "text") {
          acc += e.content;
          pushAssistant();
        } else if (e.type === "tool_start") {
          setActivity(`Uso ${e.toolName}…`);
        } else if (e.type === "tool_done") {
          setActivity(null);
        } else if (e.type === "tool_confirm") {
          setPending({ token: e.token, toolName: e.toolName ?? "tool" });
        } else if (e.type === "connection" && typeof e.provider === "string") {
          setConnects((prev) => (prev.includes(e.provider) ? prev : [...prev, e.provider]));
        } else if (e.type === "file") {
          acc += `\n\n<agentcloud_file id="f${files.length}" name="${e.filename}" type="html">${e.content}</agentcloud_file>`;
          pushAssistant();
        }
      }
    },
    [input, running, messages, token, agentSlug],
  );

  const doShare = useCallback(async () => {
    try {
      const url = await shareChat(
        token,
        "Chat desktop",
        messages.map((m) => ({ role: m.role, content: m.text })),
      );
      await navigator.clipboard.writeText(url);
      alert(`Link copiato (sola lettura):\n${url}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }, [token, messages]);

  return (
    <div className="chat">
      <aside className="side">
        <div className="brand">
          <img src="./assets/logo.png" alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          <strong>AgentCloud</strong>
        </div>
        <button className={agentSlug === "" ? "agent active" : "agent"} onClick={() => { setAgentSlug(""); setMessages([]); }}>
          Assistente generico
        </button>
        {AGENTS.map((a) => (
          <button
            key={a.slug}
            className={agentSlug === a.slug ? "agent active" : "agent"}
            onClick={() => {
              setAgentSlug(a.slug);
              setMessages([]);
            }}
          >
            <span>{a.name}</span>
            <small>{a.category}</small>
          </button>
        ))}
      </aside>
      <main className="main">
        <header className="topbar">
          <strong>{agentSlug ? AGENTS.find((a) => a.slug === agentSlug)?.name : "Assistente"}</strong>
          <div>
            <button onClick={() => void doShare()} disabled={messages.length === 0}>Condividi</button>
          </div>
        </header>
        <div className="msgs">
          {messages.length === 0 && <p className="hint">Scegli un agente e scrivi. Quiz e flashcard si aprono in anteprima.</p>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "msg user" : "msg assistant"}>
              {m.role === "assistant" ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text || "…") }} />
              ) : (
                <span>{m.text}</span>
              )}
              {m.files.map((f) => (
                <button key={f.id} className="filecard" onClick={() => setPreview(f)}>
                  {f.title || f.name} · apri
                </button>
              ))}
            </div>
          ))}
          {running && activity && <p className="hint">{activity}</p>}
          {connects.map((p) => (
            <div key={p} className="connect">
              <span>Collega {p} per continuare.</span>
              <button
                onClick={() => {
                  void window.agentcloud.openExternal(connectUrlFor(API_BASE, p));
                }}
              >
                Collega
              </button>
            </div>
          ))}
          {pending && (
            <div className="approval">
              <p>
                <strong>{pending.toolName}</strong> modifica un contenuto esistente. Approvare?
              </p>
              <button onClick={() => void send(pending.token)}>Approva</button>
              <button onClick={() => setPending(null)}>Annulla</button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form
          className="input"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Scrivi un messaggio…" disabled={running} />
          <button type="submit" disabled={running || !input.trim()}>
            Invia
          </button>
        </form>
      </main>
      {preview && (
        <div className="preview-overlay" onClick={() => setPreview(null)}>
          <div className="preview" onClick={(e) => e.stopPropagation()}>
            <div className="preview-head">
              <strong>{preview.title || preview.name}</strong>
              <button onClick={() => setPreview(null)}>Chiudi</button>
            </div>
            {preview.type === "html" || preview.type === "svg" ? (
              <iframe title="anteprima" sandbox="allow-scripts" srcDoc={preview.content} />
            ) : (
              <pre>{preview.content}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
