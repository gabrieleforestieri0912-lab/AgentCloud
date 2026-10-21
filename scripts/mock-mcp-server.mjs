/**
 * Server MCP di prova (mock).
 *
 * Implementa il minimo del protocollo Streamable HTTP necessario per
 * testare il client: `initialize`, `tools/list`, `tools/call`, `ping`.
 *
 * Serve a tre cose:
 *   - verificare che il nostro client parli davvero MCP;
 *   - verificare che i tool arrivino al modello con il namespace giusto;
 *   - verificare che un risultato enorme venga troncato.
 *
 * Non è un server di produzione: niente sessioni, niente SSE, niente
 * autenticazione.
 */

import http from "node:http";

/** Tool di default: uno di lettura e uno di scrittura. */
export const DEFAULT_TOOLS = [
  {
    name: "search_notes",
    description: "Search the notes of the connected account.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to search for." },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: "create_note",
    description: "Create a note in the connected account. This writes data.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
      },
      required: ["title"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  {
    name: "echo",
    description: "Echo back the arguments received.",
    inputSchema: {
      type: "object",
      properties: {
        value: { type: "string" },
        huge: { type: "string", description: "When set to 'big', returns a huge payload." },
      },
    },
    annotations: { readOnlyHint: true },
  },
];

/**
 * Avvia il server mock.
 * Ritorna `{ url, close }`.
 */
export async function startMockMcpServer(options = {}) {
  const tools = options.tools ?? DEFAULT_TOOLS;
  const failWithUnauthorized = options.failWithUnauthorized === true;

  const server = http.createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "method_not_allowed" }));
      return;
    }

    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_json" }));
        return;
      }

      const handle = (message) => handleMessage(message, tools, failWithUnauthorized);

      if (Array.isArray(payload)) {
        const responses = payload.map(handle).filter(Boolean);
        if (responses.length === 0) {
          res.writeHead(202).end();
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(responses));
        return;
      }

      const result = handle(payload);
      // Notifica (nessun id): nessuna risposta, solo 202.
      if (!result) {
        res.writeHead(202).end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    });
  });

  await new Promise((resolve) => server.listen(options.port ?? 0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}/mcp`,
    port,
    close: () => new Promise((resolve) => server.close(() => resolve(undefined))),
  };
}

function handleMessage(message, tools, failWithUnauthorized) {
  const { id, method, params } = message ?? {};

  if (method === "notifications/initialized" || method?.startsWith("notifications/")) {
    return null;
  }

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "mock-mcp", version: "1.0.0" },
      },
    };
  }

  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools } };
  }

  if (method === "tools/call") {
    if (failWithUnauthorized) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32001, message: "Unauthorized" },
      };
    }
    const name = params?.name;
    const args = params?.arguments ?? {};
    if (name === "echo" && args.huge === "big") {
      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: "x".repeat(50_000) }] },
      };
    }
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          { type: "text", text: `mock:${name}:${JSON.stringify(args)}` },
        ],
        isError: false,
      },
    };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}
