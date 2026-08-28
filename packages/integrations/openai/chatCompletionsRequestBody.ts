import {
  convertResponsesInputToMessages,
  convertResponsesToolsToChatCompletions,
} from "./responsesHelpers";
import { getUsageRequestOptions } from "ai/llm/usageRequestOptions";

/**
 * Normalize an inbound proxy body for a **chat.completions** upstream.
 *
 * Mirror image of {@link buildResponsesRequestBody}, which normalizes for a
 * `/responses` upstream. Together they make the proxy accept either wire
 * format regardless of which one the client chose.
 *
 * Why this exists: the client picks its wire format from its own model→wire
 * table, but the server picks the upstream endpoint. A hosted model that
 * switches provider (DeepSeek V4 Flash moved official Responses ↔ DeepInfra
 * chat.completions) leaves the two sides disagreeing for the whole rollout
 * window — clients are desktop/CLI builds that upgrade on their own schedule.
 * Without this, a Responses-wire client hitting a chat.completions upstream
 * sends `input` with no `messages` and the provider answers HTTP 422
 * `Field required`.
 *
 * Only fills the gap: an existing non-empty `messages` always wins, so bodies
 * that are already correct pass through untouched.
 */
export function buildChatCompletionsRequestBody(
  body: Record<string, any>,
  model: string,
  providerName?: string,
): Record<string, any> {
  const usageRequestOptions =
    body.stream === true && providerName
      ? getUsageRequestOptions(providerName, { api: "chat-completions" })
      : {};
  // Tools are normalized independently of messages: a client can send the
  // Responses tool shape together with plain `messages` (that is exactly what
  // the TUI does today), so keying tool conversion off `input` would miss it.
  const normalizedTools = Array.isArray(body.tools)
    ? convertResponsesToolsToChatCompletions(body.tools)
    : undefined;
  const withTools = normalizedTools ? { tools: normalizedTools } : {};

  const hasMessages = Array.isArray(body.messages) && body.messages.length > 0;
  if (hasMessages || !Array.isArray(body.input) || body.input.length === 0) {
    return { ...body, ...usageRequestOptions, ...withTools, model };
  }

  return {
    ...body,
    ...usageRequestOptions,
    ...withTools,
    model,
    messages: convertResponsesInputToMessages(body.input),
    input: undefined,
    // Responses-only knobs have no completions equivalent.
    max_output_tokens: undefined,
    ...(typeof body.max_output_tokens === "number" && body.max_tokens === undefined
      ? { max_tokens: body.max_output_tokens }
      : {}),
  };
}
