/**
 * Outbound history sanitization for cross-wire / cross-provider replay.
 *
 * When a dialog is replayed to a provider via `/switch` (or any continuation
 * after a model/provider change), the neutral history may contain
 * `tool_calls`, `tool` results, and `reasoning_content` produced by a *prior*
 * model. Different provider gateways validate this inbound history with
 * different strictness — ollama, for example, rejects:
 *   - tool_calls whose name is not in the current `tools` array (400),
 *   - assistant tool_calls without a matching `tool` result (mismatch 400),
 *   - orphan `tool` results with no preceding tool_call (400),
 *   - non-string `arguments` on some clients.
 *
 * This module is the single seam that cleans neutral history into a shape the
 * target provider will accept, BEFORE the wire adapter turns it into the
 * provider-specific request body. It is a pure function (no IO) so it can be
 * unit-tested directly and shared by the CLI local runtime and the web
 * wireAdapters.
 *
 * Principles:
 *   - Idempotent: sanitize(sanitize(x)) === sanitize(x). Repeated replay must
 *     not accumulate rewrites.
 *   - Non-destructive when nothing needs cleaning: pass through unchanged.
 *   - Downgrade, never drop: a tool_call that can't be replayed structurally is
 *     rendered as readable text so the next model still sees the intent and
 *     can re-issue the call itself.
 */
import type {
  AgentRuntimeChatMessage,
  AgentRuntimeToolCall,
} from "./types";
import { extractDeclaredToolNames } from "./declaredToolNames";
import { classifyUnparsableToolArgs } from "./toolArgsShape";

/**
 * 毒丸投影的分类统计（纯数字；绝不携带 raw 或预览，也绝不进入 wire 消息）。
 *
 * 两类计数口径不同、允许不相等：
 * - `badArguments`：arguments 实际不可用的调用数（truncated + malformed），
 *   在实际降级使用的分类 pass 里一次只计一个坏调用；
 * - `rewritten*`：因坏参数或同 ID 连带降级而实际改写的调用/消息数。
 *   例如同 ID 一坏一好：坏参数 1，改写调用 2。
 */
export type ToolArgsProjectionStats = {
  badArguments: {
    truncated: number;
    malformed: number;
  };
  rewrittenToolCalls: number;
  rewrittenAssistantMessages: number;
  rewrittenToolMessages: number;
};

/** 降级结果：`downgraded` 保留兼容，恒等于 `stats.rewrittenToolCalls`。 */
export type DowngradeResult = {
  messages: AgentRuntimeChatMessage[];
  downgraded: number;
  stats: ToolArgsProjectionStats;
};

function emptyToolArgsProjectionStats(): ToolArgsProjectionStats {
  return {
    badArguments: { truncated: 0, malformed: 0 },
    rewrittenToolCalls: 0,
    rewrittenAssistantMessages: 0,
    rewrittenToolMessages: 0,
  };
}

export interface OutboundHistorySanitizeOptions {
  /**
   * Tool names declared in the *current* request's `tools` array. A history
   * tool_call whose `function.name` is not in this set is downgraded to text
   * rather than sent structurally (some gateways reject unknown tool names on
   * inbound history with 400). When undefined (caller has no tools concept),
   * no tool-name filtering is done. An EMPTY Set means "no tools declared this
   * turn" → all history tool_calls downgrade.
   */
  declaredToolNames?: Set<string>;
}

/**
 * Convenience wrapper: sanitize history for outbound replay, deriving the
 * declared-tool-name set from the current request's `tools` array in one call.
 * This is the shape every outbound seam wants — `sanitizeForOutbound(messages,
 * tools)` — so the three call sites don't each repeat the
 * `extractDeclaredToolNames(tools)` + `sanitize(messages, {declaredToolNames})`
 * pair.
 */
export function sanitizeForOutbound(
  messages: AgentRuntimeChatMessage[],
  tools?: unknown[],
): AgentRuntimeChatMessage[] {
  return sanitizeOutboundHistory(messages, {
    declaredToolNames: extractDeclaredToolNames(tools),
  });
}

/**
 * Stable id minted to repair a tool_call missing an id, so its tool result can
 * still be paired. Deterministic per (assistantIndex, callIndex) so a second
 * sanitize pass produces the same id (idempotency).
 */
function stableToolCallId(assistantIndex: number, callIndex: number): string {
  return `call_sanitize_${assistantIndex}_${callIndex}`;
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/** Join non-empty string fragments with newlines (skips empty/undefined). */
function joinLines(...parts: (string | undefined)[]): string {
  return parts.filter(isNonEmptyString).join("\n");
}

function jsonStringifyArguments(args: unknown): string {
  // Already a string: keep as-is, even if it is not valid JSON — rewriting a
  // malformed string would silently change semantics. The target provider's
  // own validation will surface it, which is the honest failure mode.
  if (typeof args === "string") return args;
  // Object/array: stringify for providers that expect a string arguments field
  // (the OpenAI Chat Completions spec). Fails safe to "" for null/undefined.
  try {
    return JSON.stringify(args ?? "");
  } catch {
    return "";
  }
}

/**
 * Render a tool_call as readable text so the next model can still see the
 * intent after a structural downgrade. Always produces a string arguments
 * representation (object args would otherwise render as `[object Object]`).
 */
function renderToolCallAsText(call: unknown): string {
  const c = (call && typeof call === "object") ? (call as Record<string, any>) : {};
  const name = isString(c.function?.name) && c.function.name.length > 0 ? c.function.name : "unknown";
  const rawArgs = c.function?.arguments;
  const args = jsonStringifyArguments(rawArgs);
  return `[tool_call: ${name}(${args})]`;
}

function renderToolResultAsText(message: AgentRuntimeChatMessage): string {
  const name = isNonEmptyString(message.toolName) ? message.toolName : "tool";
  const body = typeof message.content === "string" ? message.content : "";
  return `[tool_result: ${name}: ${body}]`;
}

/**
 * Normalize a single tool_call: ensure id, string arguments, type=function.
 * Returns null if the call is too malformed to keep structurally.
 */
function normalizeToolCall(
  call: unknown,
  assistantIndex: number,
  callIndex: number,
): AgentRuntimeToolCall | null {
  if (!call || typeof call !== "object") return null;
  const c = call as Record<string, any>;
  const fn = c.function;
  if (!fn || typeof fn !== "object" || !isString(fn.name) || fn.name.length === 0) return null;
  const id = isNonEmptyString(c.id) ? c.id : stableToolCallId(assistantIndex, callIndex);
  return {
    id,
    type: isString(c.type) && c.type ? (c.type as "function") : "function",
    function: { name: fn.name, arguments: jsonStringifyArguments(fn.arguments) },
    ...(typeof c.extra_content?.google?.thought_signature === "string"
      ? { extra_content: { google: { thought_signature: c.extra_content.google.thought_signature } } }
      : {}),
    ...(typeof c.thought_signature === "string"
      ? { thought_signature: c.thought_signature }
      : {}),
  };
}

/**
 * Helper to classify tool_calls within a single assistant message:
 * detects unparsable arguments and duplicate IDs within the turn.
 * Shared between sanitizeOutboundHistory and downgradeUnparsableToolCalls to avoid drift (M2).
 */
interface AssistantCallClassification {
  /** Map of callIndex to resolved call ID */
  callIds: string[];
  /** Set of call IDs that appear more than once in this assistant */
  duplicateIds: Set<string>;
  /** Set of call indices whose arguments cannot be parsed as a JSON object */
  unparsableIndices: Set<number>;
  /** Set of call IDs that have at least one unparsable call */
  unparsableIds: Set<string>;
}

function classifyAssistantCalls(
  toolCalls: unknown[],
  assistantIndex: number,
): AssistantCallClassification {
  const callIds: string[] = [];
  const idCounts = new Map<string, number>();
  const unparsableIndices = new Set<number>();
  const unparsableIds = new Set<string>();

  toolCalls.forEach((rawCall, callIndex) => {
    const c = (rawCall && typeof rawCall === "object") ? (rawCall as Record<string, any>) : {};
    const id = isNonEmptyString(c.id) ? c.id : stableToolCallId(assistantIndex, callIndex);
    callIds.push(id);
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1);

    if (!hasParsableObjectArguments(c.function?.arguments)) {
      unparsableIndices.add(callIndex);
      unparsableIds.add(id);
    }
  });

  const duplicateIds = new Set<string>();
  for (const [id, count] of idCounts) {
    if (count > 1) duplicateIds.add(id);
  }

  return { callIds, duplicateIds, unparsableIndices, unparsableIds };
}

/**
 * Sanitize neutral history for outbound replay to a target provider.
 *
 * See module doc for the cleaning rules and design principles.
 */
export function sanitizeOutboundHistory(
  messages: AgentRuntimeChatMessage[],
  options?: OutboundHistorySanitizeOptions,
): AgentRuntimeChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return messages;

  // NOTE: reasoning_content stripping is deliberately NOT done here. It is a
  // wire-specific concern (DeepSeek completions rejects string
  // reasoning_content on replay; Responses wire converts it to array content
  // parts). Each wire converter (toOpenAiCompatibleMessages /
  // convertMessagesToResponsesInput) applies the right policy per
  // target. Sanitize only fixes cross-provider tool_call / tool-result shape
  // issues that gateways reject before the body even reaches the model.
  const declared = options?.declaredToolNames;

  // Local block pairing: pair within each contiguous assistant-calls + tool-results
  // block. IDs are not globally unique across turns/providers. Results separated
  // by user/assistant cannot pair with prior assistant calls.
  //
  // Pass 1: scan messages and partition into contiguous blocks.
  // For each assistant with tool_calls, detect duplicate IDs in the same turn.
  // Duplicate call IDs in the same turn cannot safely pair (causes ambiguous matching
  // and gateway 400 mismatch) — so duplicate IDs are marked for total downgrade.
  const keptCallIndicesPerAssistant = new Map<number, Set<number>>();
  const keptToolIndices = new Set<number>();

  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      const asstIdx = i;
      const { callIds, duplicateIds, unparsableIndices } = classifyAssistantCalls(m.tool_calls, asstIdx);

      // Gather candidate call IDs (only those that appear exactly once, have function.name,
      // are declared, and have parsable args)
      const candidateCallMap = new Map<string, number>(); // id -> callIndex
      m.tool_calls.forEach((call, callIndex) => {
        const id = callIds[callIndex];
        if (duplicateIds.has(id)) return;
        if (unparsableIndices.has(callIndex)) return;
        const name = (call as any)?.function?.name;
        if (!isString(name) || name.length === 0) return; // L1: nameless call cannot be candidate
        const declaredAllows = !declared || declared.has(name);
        if (!declaredAllows) return;

        candidateCallMap.set(id, callIndex);
      });

      // Scan subsequent contiguous tool messages
      let j = i + 1;
      const matchedCallIndices = new Set<number>();
      const matchedToolIds = new Set<string>();

      while (j < messages.length && messages[j].role === "tool") {
        const toolMsg = messages[j];
        const toolCallId = isNonEmptyString(toolMsg.tool_call_id) ? toolMsg.tool_call_id : "";
        if (toolCallId && candidateCallMap.has(toolCallId) && !matchedToolIds.has(toolCallId)) {
          matchedToolIds.add(toolCallId);
          matchedCallIndices.add(candidateCallMap.get(toolCallId)!);
          keptToolIndices.add(j);
        }
        j++;
      }

      keptCallIndicesPerAssistant.set(asstIdx, matchedCallIndices);
      i = j;
    } else {
      i++;
    }
  }

  // Pass 2: emit messages with structural keeps and deferred downgrades.
  // Crucial invariant: never insert downgraded assistant text between an assistant
  // that kept structural tool_calls and its following tool results.
  // Instead, collect all downgraded tool_calls and duplicate/orphan tool results
  // in that block, and emit them as a downgraded assistant message AFTER the
  // contiguous tool block (before the next user/assistant message).
  const out: AgentRuntimeChatMessage[] = [];
  let k = 0;
  while (k < messages.length) {
    const m = messages[k];

    if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      const asstIdx = k;
      const keptIndices = keptCallIndicesPerAssistant.get(asstIdx) ?? new Set<number>();

      const keptToolCalls: AgentRuntimeToolCall[] = [];
      const downgradedCallLines: string[] = [];

      m.tool_calls.forEach((call, callIndex) => {
        const name = (call as any)?.function?.name;
        const declaredAllows = !declared || (isString(name) && declared.has(name));
        const keep = keptIndices.has(callIndex) && declaredAllows && hasParsableObjectArguments((call as any)?.function?.arguments);
        if (keep) {
          const normalized = normalizeToolCall(call, asstIdx, callIndex);
          if (normalized) {
            keptToolCalls.push(normalized);
          } else {
            // L1: normalize failed (e.g. malformed or missing name) -> downgrade to text, do NOT drop!
            downgradedCallLines.push(renderToolCallAsText(call));
          }
        } else {
          downgradedCallLines.push(renderToolCallAsText(call));
        }
      });

      // Case A: All calls were downgraded (none kept).
      // The assistant carries the downgraded lines directly in its content.
      if (keptToolCalls.length === 0) {
        const downgradedText = joinLines(...downgradedCallLines);
        const contentWithDowngrade = downgradedText.length > 0
          ? combineContentWithText(m.content, downgradedText)
          : m.content;
        const sanitizedAssistant: AgentRuntimeChatMessage = {
          ...m,
          content: contentWithDowngrade,
        };
        delete sanitizedAssistant.tool_calls;
        out.push(sanitizedAssistant);

        // Process any following contiguous tool messages: all must be downgraded to text
        let nextIdx = k + 1;
        while (nextIdx < messages.length && messages[nextIdx].role === "tool") {
          out.push({
            role: "assistant",
            content: renderToolResultAsText(messages[nextIdx]),
          });
          nextIdx++;
        }
        k = nextIdx;
        continue;
      }

      // Case B: Some (or all) calls survived structurally.
      // Do NOT modify assistant.content with downgraded text!
      // Keep assistant.content pristine so no gateway sees text splitting calls and results.
      const sanitizedAssistant: AgentRuntimeChatMessage = {
        ...m,
        tool_calls: keptToolCalls,
      };
      out.push(sanitizedAssistant);

      // Process following contiguous tool messages
      let nextIdx = k + 1;
      const deferredResultLines: string[] = [];

      while (nextIdx < messages.length && messages[nextIdx].role === "tool") {
        if (keptToolIndices.has(nextIdx)) {
          const toolMsg = messages[nextIdx];
          out.push({
            ...toolMsg,
            content: toolMsg.content ?? "",
            tool_call_id: toolMsg.tool_call_id!,
          });
        } else {
          deferredResultLines.push(renderToolResultAsText(messages[nextIdx]));
        }
        nextIdx++;
      }

      // If there were any downgraded calls or downgraded results in this block,
      // emit them together as an assistant message deferred AFTER the tool results!
      const deferredLines = [...downgradedCallLines, ...deferredResultLines];
      if (deferredLines.length > 0) {
        out.push({
          role: "assistant",
          content: joinLines(...deferredLines),
        });
      }

      k = nextIdx;
      continue;
    }

    if (m.role === "tool") {
      // An isolated tool message outside of any assistant tool block (e.g. orphan)
      out.push({
        role: "assistant",
        content: renderToolResultAsText(m),
      });
      k++;
      continue;
    }

    // user / system / assistant without tool_calls: pass through
    out.push({ ...m });
    k++;
  }

  return out;
}

function combineContentWithText(
  base: AgentRuntimeChatMessage["content"],
  extra: string,
): AgentRuntimeChatMessage["content"] {
  if (typeof base === "string") {
    return base ? `${base}\n${extra}` : extra;
  }
  if (Array.isArray(base)) {
    return [...base, { type: "text", text: extra }];
  }
  return extra;
}

/**
 * Whether a tool_call's `arguments` is structurally usable on the wire:
 * absent (→ normalizeToolCall stringifies to {}), object/array form (→
 * stringified downstream), or a string that parses to a JSON object/array.
 * The empty string is allowed: parameterless calls legitimately arrive as
 * `arguments: ""` and gateways accept it. Poison: a non-empty string that
 * fails JSON.parse (or parses to a non-object, e.g. a double-encoded string),
 * and runtime-malformed scalars (number/boolean/null) which violate the
 * OpenAI-compatible wire shape — chat-completions gateways validate inbound
 * history `tool_calls[].function.arguments` and reject the WHOLE request with
 * 400 (observed: RunInfra/GLM "UPSTREAM_400 ... received invalid JSON string").
 */
export function hasParsableObjectArguments(raw: unknown): boolean {
  if (raw === undefined) return true;
  if (raw === null || typeof raw === "number" || typeof raw === "boolean") {
    return false;
  }
  if (typeof raw !== "string") return true;
  if (raw.trim() === "") return true;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object";
  } catch {
    return false;
  }
}

type JsonTailScan = {
  inString: boolean;
  /** 需要补齐的尾随闭合符（按需）。 */
  closers: string;
  /** 最后一个「字符串外」逗号的位置与当时的容器栈（用于回退丢尾成员）。 */
  lastCommaOutsideString: { index: number; closers: string } | null;
};

/**
 * 严格 JSON 字符串 token（RFC 8259）：`\.` 只允许合法转义（" \ / b f n r t 与 \uXXXX），
 * 且不允许未转义控制字符。用于判断「逗号之后是否只有一个完全没开始的悬空 key」——
 * 宽松正则（`\\.` / 未转义控制字符）会把被截断或非法的 key 误判成悬空 key，
 * 于是静默丢成员后执行（独立 review 两轮都抓到了这一类，2026-09-17）。
 */
const STRICT_JSON_STRING_TOKEN =
  /^"(?:[^"\\\u0000-\u001F]|\\["\\/bfnrt]|\\u[0-9A-Fa-f]{4})*"$/;

function isStrictJsonStringToken(value: string): boolean {
  if (!STRICT_JSON_STRING_TOKEN.test(value)) return false;
  try {
    // 双重验证：正则 + 真解析（正则的字符类再怎么写也只是近似）。
    return typeof JSON.parse(value) === "string";
  } catch {
    return false;
  }
}

function closersOf(openStack: readonly string[]): string {
  return openStack
    .slice()
    .reverse()
    .map((ch) => (ch === "{" ? "}" : "]"))
    .join("");
}

/** 单次扫描：跟踪字符串/转义与容器栈，产出补全所需的闭合符。 */
function scanJsonForTailRepair(input: string): JsonTailScan | null {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let lastCommaOutsideString: JsonTailScan["lastCommaOutsideString"] = null;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      stack.push(ch);
      continue;
    }
    if (ch === "}" || ch === "]") {
      const open = stack.pop();
      if (open !== (ch === "}" ? "{" : "[")) return null; // 结构本身已坏，不修
      continue;
    }
    if (ch === ",") {
      lastCommaOutsideString = { index: i, closers: closersOf(stack) };
      continue;
    }
  }

  return { inString, closers: closersOf(stack), lastCommaOutsideString };
}

/**
 * 保守修复被上游截断的 tool_call arguments（2026-09-17，TUI 实测触发）。
 *
 * 只接受「**内容零损失**」的截断：扫描后 EOF 落在字符串之外，且最后一个完整
 * token 是结构边界（`"` / `}` / `]`）或原文以**至多一个**尾逗号结尾（逗号证明
 * 前一个 token 已完整；连续逗号=结构已坏 → 拒绝）。补上缺失的 `}` / `]`；
 * 回退只在「被丢弃的尾成员是完全没开始的悬空 key」（逗号后仅一个字符串字面量、
 * 无 `:` 无值）时允许。补全结果与模型原本生成的参数逐字节一致或仅少一个未开始
 * 的成员，因此可安全执行。
 *
 * 拒绝的形态（返回 null，调用方保持显式报错 + 让模型重试）：
 * - EOF 落在字符串内（`{"command":"ls -la`）：末尾字符串内容可能已被截短，
 *   补全执行等于把截短的参数当真 —— 对 exec_command / writeFile 不可接受；
 * - 末尾是数字/字面量且无逗号（`{"a":12` 可能是 `1234` 被截）：无法区分截断与完整；
 * - 连续逗号等结构已坏（`{"a":1,,}`）；尾成员已出现 `:`/值（`{"a":1,"b":}`）；
 * - 补全后无法解析为非空对象。
 */
export function repairTruncatedToolArguments(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // 只剥「空白 + 至多一个尾逗号」：逗号证明前一个 token 已完整，但连续逗号
  // （{"a":1,,）意味着结构本身已坏 —— 必须拒绝，不能吞掉。
  const withoutTrailingSpace = raw.replace(/\s+$/, "");
  const endsWithComma = withoutTrailingSpace.endsWith(",");
  const trimmed = endsWithComma
    ? withoutTrailingSpace.slice(0, -1).replace(/\s+$/, "")
    : withoutTrailingSpace;
  if (trimmed === "" || trimmed.endsWith(",")) return null;

  const scan = scanJsonForTailRepair(trimmed);
  if (!scan || scan.inString) return null;

  const lastChar = trimmed[trimmed.length - 1];
  const tailIsCompleteToken =
    endsWithComma || lastChar === '"' || lastChar === "}" || lastChar === "]";
  if (!tailIsCompleteToken) return null;

  const candidates: string[] = [trimmed + scan.closers];
  const lastComma = scan.lastCommaOutsideString;
  if (lastComma && lastComma.index > 0) {
    // 回退(候选 2)只在「被丢弃的尾成员是完全没开始的悬空 key」时允许：
    // 逗号之后必须只有空白 + 一个**严格合法的** JSON 字符串字面量（key），
    // 不含 `:`、不含任何值 token、不含非法/被截断的转义序列。
    // 否则（{"a":1,"b":}、{"a":1,"b":true、{"a":1,"b\u12 …）一律拒绝走原报错路径。
    const tailAfterComma = trimmed.slice(lastComma.index + 1).trim();
    if (isStrictJsonStringToken(tailAfterComma)) {
      const head = trimmed.slice(0, lastComma.index);
      candidates.push(head + lastComma.closers);
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        Object.keys(parsed).length > 0
      ) {
        return candidate;
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/**
 * Local-loop send-seam poison defense: downgrade assistant tool_calls whose
 * string `arguments` cannot be parsed as a JSON object (typical cause: the
 * upstream truncated the arguments mid-stream — observed with GLM parallel
 * tool calls losing the closing `"}]}`).
 *
 * Why a send-seam pass in addition to {@link sanitizeOutboundHistory}: the
 * same-provider continuation path does NOT run full sanitize (that is the
 * cross-provider replay seam), and the poisoned assistant message is already
 * persisted — every turn rebuilds the request from stored history, so the
 * gateway rejects every retry with 400 and the dialog deadlocks ("继续"
 * replays the same poison forever). Downgrading here, at the last seam before
 * the provider, makes every subsequent request clean regardless of what is
 * stored, so the dialog self-heals; the persisted history is untouched
 * (audit trail preserved) and the downgrade is idempotent across turns.
 *
 * Scope is deliberately narrower than full sanitize: only unparsable
 * arguments are touched. When history contains no poison the input array is
 * returned by reference and nothing else changes (no declared-name filtering,
 * no dangling-call handling — those remain cross-provider replay concerns).
 *
 * The returned `stats` is derived from the SAME classification pass that drives
 * the rewrites (bad-argument breakdown) plus the emit pass (actual rewrites),
 * so log/diagnostic call sites never re-scan the raw history. It is metadata
 * only: no diagnostic field is ever merged into the messages, so the wire body
 * stays byte-identical to before.
 */
export function downgradeUnparsableToolCalls(
  messages: AgentRuntimeChatMessage[],
): DowngradeResult {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { messages, downgraded: 0, stats: emptyToolArgsProjectionStats() };
  }

  // Check if any assistant tool_call has unparsable arguments
  let hasAnyPoison = false;
  for (const m of messages) {
    if (m.role === "assistant" && Array.isArray(m.tool_calls)) {
      for (const call of m.tool_calls) {
        if (!hasParsableObjectArguments((call as any)?.function?.arguments)) {
          hasAnyPoison = true;
          break;
        }
      }
    }
    if (hasAnyPoison) break;
  }

  if (!hasAnyPoison) return { messages, downgraded: 0, stats: emptyToolArgsProjectionStats() };

  // Local block pairing: only pair bad call IDs within each contiguous assistant + tool block.
  // Avoid global poisonIds to prevent cross-turn contamination.
  // M1 fix: When an ID within the same assistant has mixed good/bad arguments, or duplicate
  // instances where any is poisoned, downgrade ALL calls sharing that ID to avoid hanging good calls!
  const poisonedCallsPerAssistant = new Map<number, Set<string>>();
  const poisonedToolIndices = new Set<number>();
  // 坏参数数：与实际降级同源的分类 pass 里统计，对 unparsableIndices 的原始
  // raw 参数逐个归类，一次只计一个坏调用（同 ID 的连带降级不计入这里）。
  const badArguments: ToolArgsProjectionStats["badArguments"] = {
    truncated: 0,
    malformed: 0,
  };

  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      const asstIdx = i;
      const { unparsableIds, unparsableIndices } = classifyAssistantCalls(m.tool_calls, asstIdx);
      for (const badIndex of unparsableIndices) {
        const badCall = m.tool_calls[badIndex] as Record<string, any> | undefined;
        badArguments[classifyUnparsableToolArgs(badCall?.function?.arguments)] += 1;
      }

      let j = i + 1;
      while (j < messages.length && messages[j].role === "tool") {
        const toolMsg = messages[j];
        const toolCallId = isNonEmptyString(toolMsg.tool_call_id) ? toolMsg.tool_call_id : "";
        if (toolCallId && unparsableIds.has(toolCallId)) {
          poisonedToolIndices.add(j);
        }
        j++;
      }

      if (unparsableIds.size > 0) {
        poisonedCallsPerAssistant.set(asstIdx, unparsableIds);
      }
      i = j;
    } else {
      i++;
    }
  }

  let downgraded = 0;
  let rewrittenAssistantMessages = 0;
  let rewrittenToolMessages = 0;
  const out: AgentRuntimeChatMessage[] = [];
  let k = 0;
  while (k < messages.length) {
    const m = messages[k];
    if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      const badIds = poisonedCallsPerAssistant.get(k);
      if (!badIds || badIds.size === 0) {
        out.push(m);
        k++;
        continue;
      }

      const kept: AgentRuntimeToolCall[] = [];
      const lines: string[] = [];
      const { callIds } = classifyAssistantCalls(m.tool_calls, k);
      // 这条 assistant 消息必然被改写（降级的调用正文 + / 或 tool_calls 变化）。
      rewrittenAssistantMessages += 1;

      m.tool_calls.forEach((call, callIndex) => {
        const id = callIds[callIndex];
        // If this ID is poisoned (has unparsable args, or shares ID with an unparsable call), downgrade it!
        if (badIds.has(id)) {
          lines.push(renderToolCallAsText(call));
          downgraded++;
        } else {
          kept.push(call as AgentRuntimeToolCall);
        }
      });

      // If nothing survived structurally:
      if (kept.length === 0) {
        const sanitized: AgentRuntimeChatMessage = {
          ...m,
          content: combineContentWithText(m.content, joinLines(...lines)),
        };
        delete sanitized.tool_calls;
        out.push(sanitized);

        // Process following contiguous tool messages: poisoned ones become assistant messages
        let nextIdx = k + 1;
        while (nextIdx < messages.length && messages[nextIdx].role === "tool") {
          if (poisonedToolIndices.has(nextIdx)) {
            out.push({ role: "assistant", content: renderToolResultAsText(messages[nextIdx]) });
            rewrittenToolMessages += 1;
          } else {
            out.push(messages[nextIdx]);
          }
          nextIdx++;
        }
        k = nextIdx;
        continue;
      }

      // Some calls survived structurally:
      // Keep assistant.content as-is or append lines, but tool_calls is kept.
      // Crucial: do NOT emit downgraded tool result messages BEFORE the kept tool results!
      const sanitized: AgentRuntimeChatMessage = {
        ...m,
        content: lines.length > 0 ? combineContentWithText(m.content, joinLines(...lines)) : m.content,
        tool_calls: kept,
      };
      out.push(sanitized);

      // Scan subsequent contiguous tool messages:
      // Emit healthy tool messages first, defer poisoned tool results!
      let nextIdx = k + 1;
      const deferredResultLines: string[] = [];
      while (nextIdx < messages.length && messages[nextIdx].role === "tool") {
        if (poisonedToolIndices.has(nextIdx)) {
          deferredResultLines.push(renderToolResultAsText(messages[nextIdx]));
          rewrittenToolMessages += 1;
        } else {
          out.push(messages[nextIdx]);
        }
        nextIdx++;
      }

      // Deferred poisoned tool results are emitted AFTER the healthy tool results
      if (deferredResultLines.length > 0) {
        out.push({
          role: "assistant",
          content: joinLines(...deferredResultLines),
        });
      }

      k = nextIdx;
      continue;
    }

    if (m.role === "tool") {
      if (poisonedToolIndices.has(k)) {
        out.push({ role: "assistant", content: renderToolResultAsText(m) });
        rewrittenToolMessages += 1;
      } else {
        out.push(m);
      }
      k++;
      continue;
    }

    out.push(m);
    k++;
  }

  return {
    messages: out,
    downgraded,
    stats: {
      badArguments,
      // 投影改写数与坏参数数是两套口径：rewrittenToolCalls 含同 ID 连带降级的
      // 调用，二者允许不相等（同 ID 一坏一好 → 坏参数 1、改写调用 2）。
      rewrittenToolCalls: downgraded,
      rewrittenAssistantMessages,
      rewrittenToolMessages,
    },
  };
}
