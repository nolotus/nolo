/**
 * Pure chat-message shaping for OpenAI-compatible request bodies.
 *
 * Locality: one seam for "runtime chat message → completions message" so
 * openAiCompatibleProvider and platformChatProvider cannot drift on optional
 * tool_call_id / tool_calls / reasoning_content passthrough.
 */
import type { AgentRuntimeChatMessage } from "./types";
import type { RequestShapingCounts } from "./outboundRequestDiagnostics";
import { hasDowngradedToolTurnOrigin } from "./outboundHistorySanitize";

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
   * When set to a non-empty string, assistant messages that carry a non-empty
   * `tool_calls` array — or that came from a tool turn whose calls were fully
   * downgraded to text by `sanitizeForOutbound` (marked internally, see
   * `outboundHistorySanitize`) — but have no usable `reasoning_content` get the
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
  /**
   * 可选 shaping 计数收集器（出站诊断用；默认 undefined = 现状行为）。
   * 由本函数**就地**累计「本次实际发生」的动作：是否真的注入了占位、是否真的
   * strip 了 reasoning、工具轮是否本就缺 reasoning。纯数字、绝不携带内容，
   * 也不进入 wire 消息，因此不影响投影行为与请求字节。
   */
  shapingCounts?: RequestShapingCounts;
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
    // 计数收集器在「带 tool_calls 的工具轮」计数块与占位注入块两处使用。
    const shapingCounts = options?.shapingCounts;
    if (
      !options?.stripReasoningContent &&
      typeof source.reasoning_content === "string"
    ) {
      mutableTarget.reasoning_content = source.reasoning_content;
    }
    if (Array.isArray(source.tool_calls)) {
      if (shapingCounts && source.tool_calls.length > 0) {
        // 只有「带非空 tool_calls 的工具轮」参与统计；计数与实际动作同源。
        shapingCounts.assistantToolTurns += 1;
        const hadUsableReasoning =
          typeof source.reasoning_content === "string" &&
          source.reasoning_content.length > 0;
        if (options?.stripReasoningContent) {
          // strip 优先：有内容的 reasoning 被剥掉，没内容的本来就没有。
          if (hadUsableReasoning) shapingCounts.reasoningStrippedTurns += 1;
          else shapingCounts.missingReasoningTurns += 1;
        } else if (!hadUsableReasoning) {
          shapingCounts.missingReasoningTurns += 1;
        }
      }
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
    }
    // 占位注入的**唯一候选条件点**：候选 =「仍有非空 tool_calls」**或**「本条
    // assistant 消息来自一次被整体降级成文本的工具轮」。后者是 2026-10-10 实机 400
    // 的代码侧盲区：sanitize 先于本函数运行，整体降级会删掉 tool_calls，旧条件（只看
    // tool_calls）因此在注入阶段看不到这一轮。**机制假设（未证实）**：上游可能仍按
    // 「工具轮」校验该轮回放契约，故这里补占位（防御性兼容）。
    // 来源标记是非枚举 Symbol（见 outboundHistorySanitize），不进入消息投影。
    const hasReplayableToolCalls =
      Array.isArray(mutableTarget.tool_calls) && mutableTarget.tool_calls.length > 0;
    const replayPlaceholder = options?.replayReasoningPlaceholder;
    if (
      typeof replayPlaceholder === "string" &&
      replayPlaceholder.length > 0 &&
      // strip 优先：拒 string reasoning_content 的 provider 也会拒这个占位。
      !options?.stripReasoningContent &&
      (hasReplayableToolCalls || hasDowngradedToolTurnOrigin(source)) &&
      !(
        // 真实 reasoning_content 优先，永不被占位覆盖。
        typeof mutableTarget.reasoning_content === "string" &&
        mutableTarget.reasoning_content.length > 0
      )
    ) {
      // Covers both a missing field and an unusable empty string — the
      // upstream contract needs a non-empty reasoning_content back.
      mutableTarget.reasoning_content = replayPlaceholder;
      if (shapingCounts) shapingCounts.placeholderInjectedTurns += 1;
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
 * this one only for the OpenCode channel. `opencode` is an alias of
 * `opencode-go`, not a different channel: `packages/ai/llm/providers.ts`
 * (`MODEL_LOOKUP_MAP`) maps both ids to the same `opencodeGoModels` catalog,
 * so both reach the same upstream and share this replay contract.
 *
 * Re-verification gate (added 2026-10-10 at review request): keep this only
 * while the contract is unproven for the live channel. A probe the same day
 * sent 16 real requests (8 history shapes × stream / non-stream) to
 * `opencode.ai/zen/go/v1` and every one answered 200 — including tool calls
 * with no reasoning at all — so the placeholder is defensive, not a locally
 * reproducible necessity. Delete this predicate and
 * `REASONING_REPLAY_PLACEHOLDER` once the channel is confirmed not to enforce
 * the contract; if the same 400 comes back, widen the predicate (provider /
 * model ids from `opencodeGoModels`) instead of downgrading tool_calls to
 * text, which would break call/result pairing.
 *
 * The width is deliberate: matching the `deepseek` family on this channel
 * covers custom ids such as `deepseek-v4.1-flash`, at the cost of a needless
 * field if a non-thinking `deepseek*` id ever lands in `opencodeGoModels`
 * (narrow it then). A different provider that starts requiring the contract
 * needs its own entry here.
 */
export const REASONING_REPLAY_PLACEHOLDER = "(reasoning not captured for this turn)";

export function shouldReplayReasoningContentForOutbound(
  provider?: string,
  model?: string,
): boolean {
  const p = provider?.trim().toLowerCase();
  const m = model?.trim().toLowerCase();
  if (!p || !m) return false;
  return (p === "opencode-go" || p === "opencode") && m.includes("deepseek");
}

/**
 * Single decision point for "should this outbound request replay a
 * `reasoning_content` placeholder?".
 *
 * Every live outbound seam must spread this result into
 * `preserveAgentStateFields` options instead of re-assembling the
 * `stripReasoningContent` / `shouldReplayReasoningContentForOutbound()` /
 * `REASONING_REPLAY_PLACEHOLDER` triple itself. The three current callers:
 *  - `packages/agent-runtime/openAiCompatibleProvider.ts` (local/desktop chat-completions wire)
 *  - `packages/server/handlers/agentRun/loopMessageSanitize.ts` (server agent loop)
 *  - `packages/integrations/openai/generateOpenAIRequestBody.ts` (client body, forwarded verbatim by the server proxy)
 *
 * Why: the decision was previously assembled once per seam and one seam
 * silently missed it, which cost a 400 from the OpenCode DeepSeek channel.
 * **A new outbound seam must go through this function** — a seam that hand-rolls
 * the check is a bug waiting to happen; `reasoningReplaySeamParity.test.ts`
 * guards the seams that exist today.
 *
 * `stripReasoningContent` wins when both apply: a provider that rejects a
 * string `reasoning_content` would reject the placeholder too.
 */
export function resolveReasoningReplayOptions(
  provider?: string,
  model?: string,
  stripReasoningContent?: boolean,
): { replayReasoningPlaceholder?: string } {
  if (stripReasoningContent) return {};
  return shouldReplayReasoningContentForOutbound(provider, model)
    ? { replayReasoningPlaceholder: REASONING_REPLAY_PLACEHOLDER }
    : {};
}
