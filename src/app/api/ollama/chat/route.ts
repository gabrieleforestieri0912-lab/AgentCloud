import { AGENT_RUNTIME } from "@/lib/agents/registry";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { messages, model = "llama3.2", agentId } = await req.json();

    // Get agent config if provided
    let systemPrompt = "You are a helpful AI assistant.";
    if (agentId && AGENT_RUNTIME[agentId]) {
      systemPrompt = AGENT_RUNTIME[agentId].systemPrompt;
    }

    // Ollama API endpoint (local)
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = new TextDecoder().decode(value);
            const lines = text.split("\n").filter((line) => line.trim());

            for (const line of lines) {
              try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "text", content: json.message.content })}\n\n`,
                    ),
                  );
                }
                if (json.done) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "done" })}\n\n`,
                    ),
                  );
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Stream error" })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Ollama chat error:", error);
    return Response.json(
      {
        error:
          "Failed to connect to Ollama. Make sure it's running on localhost:11434",
      },
      { status: 500 },
    );
  }
}
