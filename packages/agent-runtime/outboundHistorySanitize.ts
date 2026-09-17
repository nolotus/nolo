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
function renderToolCallAsText(call: AgentRuntimeToolCall): string {
  const name = call?.function?.name ?? "unknown";
  const rawArgs = call?.function?.arguments;
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
 * Returns null if the call is too malformed to keep.
 */
function normalizeToolCall(
  call: unknown,
  assistantIndex: number,
  callIndex: number,
): AgentRuntimeToolCall | null {
  if (!call || typeof call !== "object") return null;
  const c = call as Record<string, any>;
  const fn = c.function;
  if (!fn || typeof fn !== "object" || !isString(fn.name)) return null;
  const id = isNonEmptyString(c.id) ? c.id : stableToolCallId(assistantIndex, callIndex);
  return {
    id,
    type: isString(c.type) && c.type ? (c.type as "function") : "function",
    function: { name: fn.name, arguments: jsonStringifyArguments(fn.arguments) },
    ...(typeof c.thought_signature === "string"
      ? { thought_signature: c.thought_signature }
      : {}),
  };
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
  // convertMessagesToResponsesInput) already applies the right policy per
  // target. Sanitize only fixes cross-provider tool_call / tool-result shape
  // issues that gateways reject before the body even reaches the model.
  const declared = options?.declaredToolNames;

  // First pass: collect the set of tool_call ids we MIGHT keep structurally
  // (those whose name is declared, or all if no declaredToolNames filter).
  const candidateCallIds = new Set<string>();
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "assistant" || !Array.isArray(m.tool_calls)) continue;
    m.tool_calls.forEach((call, callIndex) => {
      const name = call?.function?.name;
      const declaredAllows = !declared || (isString(name) && declared.has(name));
      if (!declaredAllows) return; // will be downgraded, don't pair its result
      if (!hasParsableObjectArguments(call?.function?.arguments)) {
        return; // truncated/unparsable JSON arguments → downgrade, don't pair result
      }
      const id = isNonEmptyString(call?.id)
        ? call.id
        : stableToolCallId(i, callIndex);
      candidateCallIds.add(id);
    });
  }

  // Second pass: a candidate is only KEPT structurally if it has a matching
  // tool result in the history. A structural tool_call with no result would
  // leave a dangling call that gateways like ollama reject with
  // "mismatch between tool calls and tool results" (400). Downgrade instead.
  const resultIds = new Set<string>();
  for (const m of messages) {
    if (m.role === "tool" && isNonEmptyString(m.tool_call_id)) {
      resultIds.add(m.tool_call_id);
    }
  }
  const keepCallIds = new Set<string>();
  for (const id of candidateCallIds) {
    if (resultIds.has(id)) keepCallIds.add(id);
  }
  // Set relationship: keepCallIds = candidateCallIds ∩ resultIds.
  // candidateCallIds = tool_calls that passed the declared-name filter.
  // resultIds = tool messages with a non-empty tool_call_id.
  // A tool_call is kept structurally only if it is both declared AND has a
  // matching tool result; everything else (undeclared or dangling) is
  // downgraded to text in the loop below.

  const out: AgentRuntimeChatMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];

    if (m.role === "assistant") {
      let toolCalls: AgentRuntimeToolCall[] | undefined;
      const downgradedLines: string[] = [];

      if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
        const kept: AgentRuntimeToolCall[] = [];
        m.tool_calls.forEach((call, callIndex) => {
          const name = call?.function?.name;
          const declaredAllows =
            !declared || (isString(name) && declared.has(name));
          const id = isNonEmptyString(call?.id)
            ? call.id
            : stableToolCallId(i, callIndex);
          // Keep structurally only if declared AND has a matching tool result
          // (dangling calls without results get downgraded to text to avoid
          // gateway "mismatch between tool calls and tool results" 400).
          const keepStructural = declaredAllows && keepCallIds.has(id);
          if (keepStructural) {
            const normalized = normalizeToolCall(call, i, callIndex);
            if (normalized) kept.push(normalized);
          } else {
            // Downgrade (undeclared name OR dangling with no result) to text.
            downgradedLines.push(renderToolCallAsText(call as AgentRuntimeToolCall));
          }
        });
        toolCalls = kept.length > 0 ? kept : undefined;
      }

      const downgradedText = joinLines(...downgradedLines);
      const contentWithDowngrade =
        downgradedText.length > 0
          ? combineContentWithText(m.content, downgradedText)
          : m.content;

      // Spread the source first so future-added neutral fields survive, then
      // override content and tool_calls. tool_calls must be EXPLICITLY set
      // (undefined when fully downgraded) — a conditional spread would leave
      // the source's original tool_calls in place via the `...m` spread.
      const sanitizedAssistant: AgentRuntimeChatMessage = {
        ...m,
        content: contentWithDowngrade,
        tool_calls: toolCalls,
      };
      // Drop tool_calls entirely when none survived (undefined would still
      // serialize as a present-but-undefined field on some transports).
      if (!toolCalls) delete sanitizedAssistant.tool_calls;
      out.push(sanitizedAssistant);
      continue;
    }

    if (m.role === "tool") {
      const id = isNonEmptyString(m.tool_call_id) ? m.tool_call_id : "";
      // Keep the tool result structurally only if it pairs with a kept tool_call.
      if (id && keepCallIds.has(id)) {
        out.push({ ...m, content: m.content ?? "", tool_call_id: id });
      } else {
        // Orphan tool result (no matching kept tool_call) → downgrade to text.
        out.push({
          role: "assistant",
          content: renderToolResultAsText(m),
        });
      }
      continue;
    }

    // user / system / other: pass through unchanged.
    out.push({ ...m });
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
 */
export function downgradeUnparsableToolCalls(
  messages: AgentRuntimeChatMessage[],
): { messages: AgentRuntimeChatMessage[]; downgraded: number } {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { messages, downgraded: 0 };
  }

  const poisonIds = new Set<string>();
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "assistant" || !Array.isArray(m.tool_calls)) continue;
    m.tool_calls.forEach((call, callIndex) => {
      if (!hasParsableObjectArguments(call?.function?.arguments)) {
        // Derive the same stable id sanitizeOutboundHistory mints for ID-less
        // calls, so an id-less poison still pairs (and downgrades) its result.
        const id = isNonEmptyString(call?.id)
          ? call.id
          : stableToolCallId(i, callIndex);
        poisonIds.add(id);
      }
    });
  }
  if (poisonIds.size === 0) return { messages, downgraded: 0 };

  let downgraded = 0;
  const out: AgentRuntimeChatMessage[] = [];
  for (const m of messages) {
    if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      const kept: AgentRuntimeToolCall[] = [];
      const lines: string[] = [];
      for (const call of m.tool_calls) {
        if (!hasParsableObjectArguments(call?.function?.arguments)) {
          lines.push(renderToolCallAsText(call as AgentRuntimeToolCall));
          downgraded++;
        } else {
          kept.push(call);
        }
      }
      if (lines.length === 0) {
        out.push(m);
        continue;
      }
      const sanitized: AgentRuntimeChatMessage = {
        ...m,
        content: combineContentWithText(m.content, joinLines(...lines)),
        tool_calls: kept.length > 0 ? kept : undefined,
      };
      // Explicitly drop the field when nothing survived — same rationale as
      // sanitizeOutboundHistory: undefined would still serialize as a
      // present-but-undefined field on some transports.
      if (kept.length === 0) delete sanitized.tool_calls;
      out.push(sanitized);
      continue;
    }
    if (m.role === "tool") {
      const id = isNonEmptyString(m.tool_call_id) ? m.tool_call_id : "";
      if (id && poisonIds.has(id)) {
        // The call this result pairs with was downgraded → orphan result.
        out.push({ role: "assistant", content: renderToolResultAsText(m) });
        continue;
      }
    }
    out.push(m);
  }
  return { messages: out, downgraded };
}