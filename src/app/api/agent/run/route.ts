import Anthropic from "@anthropic-ai/sdk"
import { AGENT_RUNTIME } from "@/lib/agents/registry"
import { TOOL_DEFINITIONS, executeTool } from "@/lib/agents/tools"

const anthropic = new Anthropic()

export async function POST(req: Request) {
  const { agentId, messages, files, userId } = await req.json()

  const config = AGENT_RUNTIME[agentId]
  if (!config) {
    return Response.json({ error: "Agent not found" }, { status: 404 })
  }

  const enabledTools = config.tools
    .map((t) => TOOL_DEFINITIONS[t])
    .filter(Boolean)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        let conversationMessages = [...messages]
        let iterations = 0
        const MAX_ITERATIONS = 10

        while (iterations < MAX_ITERATIONS) {
          iterations++

          const response = await anthropic.messages.create({
            model: config.model,
            max_tokens: 4096,
            system: config.systemPrompt,
            tools: enabledTools,
            messages: conversationMessages,
          })

          for (const block of response.content) {
            if (block.type === "text") {
              send({ type: "text", content: block.text })
            }
          }

          if (response.stop_reason === "end_turn") {
            send({ type: "done" })
            break
          }

          if (response.stop_reason === "tool_use") {
            const toolResults: Anthropic.ContentBlockParam[] = []

            for (const block of response.content) {
              if (block.type === "tool_use") {
                send({
                  type: "tool_start",
                  toolName: block.name,
                  toolInput: block.input,
                })

                const result = await executeTool(
                  block.name,
                  block.input as Record<string, string>,
                  { userId, files }
                )

                send({ type: "tool_done", toolName: block.name })

                if (result.startsWith('{"type":"file_created"')) {
                  try {
                    const parsed = JSON.parse(result)
                    send({ type: "file", filename: parsed.filename, content: parsed.content })
                  } catch {}
                }

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: result,
                } as Anthropic.ContentBlockParam)
              }
            }

            conversationMessages = [
              ...conversationMessages,
              { role: "assistant", content: response.content },
              { role: "user", content: toolResults },
            ]
          }
        }
    } catch {
      send({ type: "error", message: "An error occurred during agent execution" })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
