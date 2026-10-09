/**
 * Pure chat-message shaping for OpenAI-compatible request bodies.
 *
 * Locality: one seam for "runtime chat message → completions message" so
 * openAiCompatibleProvider and platformChatProvider cannot drift on optional
 * tool_call_id / tool_calls / reasoning_content passthrough.
 */
import type { AgentRuntimeChatMessage } from "./types";

type AgentStateMessageLike = {
  role?: unknown;
  content?: unknown;
  reasoning_content?: unknown;
  tool_calls?: unknown;
  tool_call_id?: unknown;
  toolCallId?: unknown;
};

export type OpenAiCompatibleRequestMessage = {
  role: AgentRuntimeChatMessage["role"];
  content: NonNullable<AgentRuntimeChatMessage["content"]> | "";
  tool_call_id?: string;
  tool_calls?: AgentRuntimeChatMessage["tool_calls"];
  reasoning_content?: string;
};

/**
 * Options for shaping outbound messages.
 *
 * `stripReasoningContent` removes the `reasoning_content` field from assistant
 * messages. Some providers (e.g. DeepSeek-V4-flash) reject a string
 * `reasoning_content` on inbound history with a serde "expected a sequence"
 * error, so the field must be dropped when replaying prior turns.
 */
export type PreserveAgentStateOptions = {
  stripReasoningContent?: boolean;
  /**
   * When set to a non-empty string, assistant messages that still carry a
   * non-empty `tool_calls` array but no usable `reasoning_content` get the
   * option's value injected as their `reasoning_content`. This satisfies the
   * DeepSeek-family thinking-mode replay contract ("the reasoning_content in
   * the thinking mode must be passed back to the API") for history turns
   * where the upstream never returned reasoning.
   *
   * Default-off: when the option is absent the output is byte-identical to
   * the old behavior. An empty/missing string is ignored so callers cannot
   * accidentally inject a field the upstream would reject as empty.
   * `stripReasoningContent` wins when both apply — a provider that rejects
   * string reasoning_content would reject the placeholder too.
   */
  replayReasoningPlaceholder?: string;
  targetProvider?: string;
  targetModel?: string;
  allowThoughtSignature?: boolean;
};

export function isGeminiCompatibleTarget(provider?: string, model?: string): boolean {
  const p = (provider ?? "").trim().toLowerCase();
  const m = (model ?? "").trim().toLowerCase();
  return (
    p === "google" ||
    p === "google-antigravity" ||
    p.startsWith("google-") ||
    p.includes("gemini") ||
    m.includes("gemini")
  );
}

/**
 * Copy only provider-visible agent state. Keeping this in one seam prevents
 * the Chat Completions, server loop, and provider adapters from disagreeing
 * about empty reasoning or tool-call identifiers.
 */
export function preserveAgentStateFields<T extends Record<string, any>>(
  source: AgentStateMessageLike,
  target: T,
  options?: PreserveAgentStateOptions,
): T & { tool_call_id?: string; tool_calls?: AgentRuntimeChatMessage["tool_calls"]; reasoning_content?: string } {
  const mutableTarget = target as Record<string, any>;
  if (source.role === "assistant") {
    if (
      !options?.stripReasoningContent &&
      typeof source.reasoning_content === "string"
    ) {
      mutableTarget.reasoning_content = source.reasoning_content;
    }
    if (Array.isArray(source.tool_calls)) {
      const isExplicitTarget = Boolean(options?.targetProvider || options?.targetModel);
      const allowSignature =
        options?.allowThoughtSignature ??
        (isExplicitTarget ? isGeminiCompatibleTarget(options?.targetProvider, options?.targetModel) : true);
      mutableTarget.tool_calls = source.tool_calls.map((call: any) => {
        if (!call || typeof call !== "object") return call;
        const cleaned: Record<string, any> = {
          id: call.id,
          type: call.type ?? "function",
          function: call.function,
        };
        if (allowSignature) {
          if (call.extra_content !== undefined) cleaned.extra_content = call.extra_content;
          if (call.thought_signature !== undefined) cleaned.thought_signature = call.thought_signature;
        }
        return cleaned;
      });
      const replayPlaceholder = options?.replayReasoningPlaceholder;
      if (
        typeof replayPlaceholder === "string" &&
        replayPlaceholder.length > 0 &&
        !options?.stripReasoningContent &&
        source.tool_calls.length > 0 &&
        !(
          typeof mutableTarget.reasoning_content === "string" &&
          mutableTarget.reasoning_content.length > 0
        )
      ) {
        // Covers both a missing field and an unusable empty string — the
        // upstream contract needs a non-empty reasoning_content back.
        mutableTarget.reasoning_content = replayPlaceholder;
      }
    }
  }
  if (source.role === "tool") {
    const toolCallId =
      typeof source.tool_call_id === "string"
        ? source.tool_call_id.trim()
        : typeof source.toolCallId === "string"
          ? source.toolCallId.trim()
          : "";
    if (toolCallId) mutableTarget.tool_call_id = toolCallId;
  }
  return target;
}

export function findAgentStatePairingIssues(
  messages: AgentStateMessageLike[],
): string[] {
  const issues: string[] = [];
  const callIds = new Set<string>();
  const resultIds = new Set<string>();
  for (const message of messages) {
    if (message.role === "assistant" && Array.isArray(message.tool_calls)) {
      for (const call of message.tool_calls as Array<Record<string, any>>) {
        const id = typeof call?.id === "string" ? call.id.trim() : "";
        if (!id) {
          issues.push("assistant tool call is missing id");
        } else if (callIds.has(id)) {
          issues.push(`duplicate assistant tool call id: ${id}`);
        } else {
          callIds.add(id);
        }
      }
    }
    if (message.role === "tool") {
      const id = typeof message.tool_call_id === "string"
        ? message.tool_call_id.trim()
        : typeof message.toolCallId === "string"
          ? message.toolCallId.trim()
          : "";
      if (!id) {
        issues.push("tool result is missing tool_call_id");
      } else if (resultIds.has(id)) {
        issues.push(`duplicate tool result id: ${id}`);
      } else {
        resultIds.add(id);
        if (!callIds.has(id)) issues.push(`orphan tool result id: ${id}`);
      }
    }
  }
  for (const id of callIds) {
    if (!resultIds.has(id)) issues.push(`missing tool result id: ${id}`);
  }
  return issues;
}

export function toOpenAiCompatibleMessages(
  messages: AgentRuntimeChatMessage[],
  options?: PreserveAgentStateOptions,
): OpenAiCompatibleRequestMessage[] {
  return messages.map((message) =>
    preserveAgentStateFields(message, {
      role: message.role,
      content: message.content ?? "",
    }, options),
  );
}

/**
 * Determine whether the outbound (history replay) request should omit
 * `reasoning_content` from assistant messages.
 *
 * DeepSeek-V4-flash rejects a string `reasoning_content` on inbound history
 * with a serde deserialization error ("expected a sequence"). Both Chat
 * Completions messages and Responses input conversion apply this policy.
 */
export function shouldStripReasoningContentForOutbound(
  provider?: string,
  model?: string,
): boolean {
  const p = provider?.trim().toLowerCase();
  const m = model?.trim().toLowerCase();
  if (!p || !m) return false;
  // DeepSeek V4 rejects string reasoning_content on history replay.
  // Applies to both legacy "deepseek" provider and current "nolo" provider.
  if (p === "deepseek" || p === "nolo") {
    return m === "deepseek-flash" ||
      m === "deepseek-v4-flash" ||
      m === "deepseek-v4-flash-vision-exp" ||
      m === "deepseek-v4-pro";
  }
  return false;
}

/**
 * Determine whether the outbound (history replay) request should inject a
 * placeholder `reasoning_content` into assistant tool-call turns that lack
 * one — the inverse-side contract of `shouldStripReasoningContentForOutbound`.
 *
 * Evidence (2026-10-08): a local CLI run of agent
 * `agent-0e95801d90-opencode-deepseek-v4.1-flash` (provider `opencode-go`,
 * model `deepseek-v4.1-flash`, reasoning_effort medium) intermittently got
 * HTTP 400 `[invalid_request_error] The reasoning_content in the thinking
 * mode must be passed back to the API.` — the channel omits reasoning on some
 * tool-call rounds, Nolo persists an assistant message with tool_calls but no
 * reasoning_content, and replaying that history violates the contract.
 * External corroboration: `deepseek-ai/deepseek-harness` discussion #7050
 * (this exact failure), which suggests replaying a placeholder reasoning —
 * a NON-EMPTY one, in case the validator rejects empty strings.
 *
 * Covers catalog `deepseek-v4-flash`/`deepseek-v4-pro` and custom model ids
 * like `deepseek-v4.1-flash` (substring match on the lowercased model).
 *
 * Mutually exclusive with `shouldStripReasoningContentForOutbound` by
 * construction: the strip predicate only fires for provider `deepseek`/`nolo`,
 * this one only for `opencode-go`.
 */
export function shouldReplayReasoningContentForOutbound(
  provider?: string,
  model?: string,
): boolean {
  const p = provider?.trim().toLowerCase();
  const m = model?.trim().toLowerCase();
  if (!p || !m) return false;
  return p === "opencode-go" && m.includes("deepseek");
}
