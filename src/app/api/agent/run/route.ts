import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { getEnabledToolsForAgent } from "@/lib/agents/feature-flags";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/agents/tools";
import {
  assertRunAllowed,
  recordUsageAndReportOverage,
} from "@/lib/billing/usage-tracking";
import { apiErrorMessageForLocale } from "@/lib/i18n/api-errors";
import { getLocale } from "@/lib/i18n/locale";
import { getLLMProvider } from "@/lib/llm";
import type { LLMMessage, LLMToolResult } from "@/lib/llm";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { getSessionUser } from "@/lib/supabase/server";

const MAX_TOKENS = Number(process.env.AGENT_MAX_TOKENS || 4096);
const MAX_ITERATIONS = 10;

// Rate limit for anonymous preview callers (public agent pages / embeds).
// Two layers: a cheap in-memory burst filter (per instance) and the
// authoritative distributed limit via Supabase (holds across instances).
const ANON_LIMIT_MAX = Number(process.env.AGENT_ANON_RATE_LIMIT || 30);
const ANON_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOWS.MINUTE_MS;
const anonBuckets = new Map<string, number[]>();

function isAnonRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - ANON_LIMIT_WINDOW_MS;
  const hits = (anonBuckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= ANON_LIMIT_MAX) {
    anonBuckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  anonBuckets.set(ip, hits);
  return false;
}

/**
 * POST /api/agent/run
 *
 * Body: { agentId, messages, files? }
 *
 * The caller is resolved server-side from the Supabase session, never from the
 * request body. Logged-in users go through the subscription + monthly limit
 * checks; anonymous callers (public agent pages / embeds) are allowed as
 * previews but have no usage quota.
 *
 * The model backend is selected via `getLLMProvider()`: the production
 * Anthropic provider once `ANTHROPIC_API_KEY` is configured, otherwise the
 * local Ollama fallback.
 */
export async function POST(req: Request) {
  const locale = await getLocale();

  let body: { agentId?: string; messages?: unknown; files?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: apiErrorMessageForLocale(locale, "invalidJson") },
      { status: 400 },
    );
  }

  const { agentId, messages, files } = body;

  if (!agentId || !Array.isArray(messages)) {
    return Response.json(
      { error: apiErrorMessageForLocale(locale, "missingAgentOrMessages") },
      { status: 400 },
    );
  }

  const config = AGENT_RUNTIME[agentId];
  if (!config) {
    return Response.json(
      { error: apiErrorMessageForLocale(locale, "agentNotFound") },
      { status: 404 },
    );
  }

  // Resolve the caller from the authenticated session (never trust the body).
  const sessionUser = await getSessionUser();
  const userId = sessionUser?.id ?? "anonymous";

  // Enforce subscription + plan limits for real users (skipped for anonymous).
  const check = await assertRunAllowed(userId, agentId, locale);
  if (!check.allowed) {
    return Response.json(
      { error: check.message, code: check.code },
      { status: check.status },
    );
  }

  // Throttle anonymous preview callers: per-instance burst filter first, then
  // the distributed limit (authoritative across all instances).
  if (userId === "anonymous") {
    const ip = getClientIp(req);
    const burstLimited = isAnonRateLimited(ip);
    const distributed = await rateLimit("agent-run-anon", ip, {
      limit: ANON_LIMIT_MAX,
      windowMs: ANON_LIMIT_WINDOW_MS,
    });
    if (burstLimited || !distributed.allowed) {
      return Response.json(
        {
          error: apiErrorMessageForLocale(locale, "rateLimited"),
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(distributed.retryAfterSeconds),
          },
        },
      );
    }
  }

  // Respect feature flags: expose only the tools enabled for this agent.
  const enabledToolNames = getEnabledToolsForAgent(agentId);
  const enabledTools = enabledToolNames
    .map((tool) => TOOL_DEFINITIONS[tool])
    .filter(Boolean);

  // Resolve the model backend once per request (Anthropic or local Ollama).
  const provider = getLLMProvider();

  // Normalize inbound messages into the shared LLMMessage shape. The client
  // always sends plain { role, content } strings.
  const initialMessages: LLMMessage[] = (messages as unknown[]).map((m) => {
    const msg = m as { role?: string; content?: unknown };
    return {
      role: msg.role === "assistant" ? "assistant" : "user",
      content:
        typeof msg.content === "string"
          ? msg.content
          : (msg.content as string) ?? "",
    };
  });

  const encoder = new TextEncoder();
  const conversationId = crypto.randomUUID();
  const executionErrorMessage = apiErrorMessageForLocale(
    locale,
    "executionError",
  );
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        let conversationMessages = [...initialMessages];
        let iterations = 0;

        while (iterations < MAX_ITERATIONS) {
          iterations++;

          const response = await provider.chat({
            model: config.model,
            system: config.systemPrompt,
            messages: conversationMessages,
            tools: enabledTools,
            maxTokens: MAX_TOKENS,
          });

          inputTokens += response.usage.inputTokens;
          outputTokens += response.usage.outputTokens;

          if (response.text) {
            send({ type: "text", content: response.text });
          }

          if (response.stopReason === "end_turn") {
            send({ type: "done" });
            break;
          }

          if (response.stopReason === "tool_use" && response.toolUses.length > 0) {
            const toolResults: LLMToolResult[] = [];

            for (const use of response.toolUses) {
              send({
                type: "tool_start",
                toolName: use.name,
                toolInput: use.input,
              });

              const result = await executeTool(
                use.name,
                use.input as Record<string, string>,
                {
                  userId,
                  // Tenant id === authenticated user id: this is what lets the
                  // Shopify (and other) tools read the user's own connected
                  // store credentials instead of falling back to env vars.
                  tenantId: userId,
                  files: files as Record<string, string> | undefined,
                },
              );

              send({ type: "tool_done", toolName: use.name });

              if (result.startsWith('{"type":"file_created"')) {
                try {
                  const parsed = JSON.parse(result);
                  send({
                    type: "file",
                    filename: parsed.filename,
                    content: parsed.content,
                  });
                } catch {
                  // ignore malformed file payload
                }
              }

              toolResults.push({ id: use.id, content: result });
            }

            conversationMessages = [
              ...conversationMessages,
              { role: "assistant", content: response.toolUses },
              { role: "user", content: toolResults },
            ];
          } else {
            // Unexpected stop (max_tokens / length / stop): no tool loop.
            send({ type: "done" });
            break;
          }
        }

        // Record the run (conversation + tokens) once the agent finishes.
        // Tokens above the monthly allowance are billed automatically via the
        // Stripe overage meter (best-effort — never fails the stream).
        await recordUsageAndReportOverage({
          user_id: userId,
          agent_slug: agentId,
          conversation_id: conversationId,
          tokens_input: inputTokens,
          tokens_output: outputTokens,
        });
      } catch {
        send({
          type: "error",
          message: executionErrorMessage,
        });
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
}
