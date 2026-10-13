/**
 * 出站关联诊断（Outbound Request Correlation Diagnostics）。
 *
 * 目标：让「一次真实出站请求的准备 / HTTP 结果 / 流消费结果」能通过安全关联 ID
 * 配对；成功与失败都留痕，并能辨认实际路由、reasoning 回放处理与投影降级。
 *
 * 边界（与设计文档 §1「不做」一致）：
 * - 不记录消息、reasoning、工具参数、响应正文、完整错误文本或请求头。
 * - 不记录 endpoint、URL query、API key、credential ID、user ID、dialog ID。
 * - 不改变占位 / strip / thinking / 重试 / fallback / 流消费政策。
 * - 不添加探测请求，不为诊断多读一次响应体。
 * - 不新增任意响应头 / backend 指纹日志；上游 ID 只读白名单响应头
 *   （`x-request-id` / `request-id`），非法即省略，绝不从错误正文正则抠 ID。
 * - 不修改计费事件 schema；不改 `ProviderCallTelemetry`。
 * - sink 异常必须 fail-open（不影响请求结果）；客户端日志不自动上传到 server。
 *
 * 记录位置：现有进程日志，固定前缀 `[outbound-diagnostic]` + 白名单 JSON。
 * 开关：显式 opt-in、默认关闭。server / CLI 用 `NOLO_OUTBOUND_DIAGNOSTICS=1`；
 * 浏览器侧通过已有调用 options 注入 sink（不读 Node 环境变量）。
 *
 * 隐私守卫靠**白名单 serializer**：`serializeOutboundDiagnosticEvent()` 只从
 * 具名字段构造新对象，禁止 spread config / body / error / headers。
 *
 * 标识符守卫顺序（契约的一部分）：`sanitizeProviderModelToken` / `sanitizeCallId` /
 * `sanitizeUpstreamRequestId` 一律**先对原始值做长度与字符校验**（含 `\n` / `\r`
 * 等控制字符一律不合格），通过后才做 trim 归一化。任何「先 trim 再校验」的写法都会
 * 让 `"\nopenai\n"` 或「主要靠首尾空白凑长的超长 ID」被放行。
 *
 * 能力限制（**不要读成三 seam 三阶段全接线**）：
 * - `server-loop` seam 目前只产出 `dispatch` 与 `http-result`；**消费侧终态缺失**。
 *   补全需要接入实际 body 构造点 `packages/server/handlers/agentRun/loopRequestBody.ts`、
 *   调用者 `loop.ts` 与 stats 透传（side-channel 传到本 seam），**不在本次范围**。
 *   因此本层绝不为了凑齐三阶段而补造 `completed`。
 * - 「本次占位注入 / strip」只有塑形直连点（`preserveAgentStateFields` + collector）能
 *   观测；只拿到 wire body 的 seam（chat / server-loop）记 `null` = 未观测。
 */

/**
 * Shaping 统计：由消息塑形（`openAiCompatibleMessages.preserveAgentStateFields`）
 * 直连累计，数字来自「本次实际发生」的动作，不靠占位字符串相等反推。
 */
export type RequestShapingCounts = {
  assistantToolTurns: number;
  missingReasoningTurns: number;
  placeholderInjectedTurns: number;
  reasoningStrippedTurns: number;
};

export type OutboundDiagnosticSeam = "local-runtime" | "chat" | "server-loop";
export type OutboundDiagnosticHost = "client" | "server";
export type OutboundDiagnosticWire = "chat.completions" | "responses";

export type OutboundThinking = "enabled" | "disabled" | "unspecified" | "other";
export type OutboundReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "unspecified"
  | "other";

export type OutboundErrorCategory =
  | "none"
  | "reasoning-contract"
  | "invalid-request"
  | "authentication"
  | "rate-limit"
  | "upstream"
  | "other";

export type OutboundTerminalOutcome =
  | "completed"
  | "http-error"
  | "network-error"
  | "aborted"
  | "stream-error";

export type OutboundDiagnosticContext = {
  /** 一次逻辑调用；本地生成随机 ID。 */
  callId: string;
  /** 实际出站次数，从 1 开始。 */
  attempt: number;
  /** server 侧已有 attempt ID，用于关联 provider-call evidence。 */
  providerCallId?: string;
  seam: OutboundDiagnosticSeam;
  host: OutboundDiagnosticHost;
  wire: OutboundDiagnosticWire;
  /** 实际请求使用的 provider（不是最终对外展示的 provider）。 */
  provider: string;
  /** 实际请求使用的 model。 */
  model: string;
};

export type OutboundProjectionFacts =
  | { observed: false }
  | {
      observed: true;
      badArguments: { truncated: number; malformed: number };
      rewrittenToolCalls: number;
      rewrittenAssistantMessages: number;
      rewrittenToolMessages: number;
    };

export type OutboundRequestFacts = {
  assistantToolTurns: number;
  missingReasoningTurns: number;
  /**
   * 占位注入**只能在塑形直连点观测**（`preserveAgentStateFields` 真正写入占位的那一
   * 分支）。只拿到最终 wire body 的 seam 无法区分「值本来就在」与「本次被替换」，故记
   * `null` = 未观测，**绝不靠比较占位字符串反推成 1**；`null` 的含义与
   * `reasoningStrippedTurns` 相同。
   */
  placeholderInjectedTurns: number | null;
  /**
   * strip 在最终 wire body 上不留痕，只有塑形直连点（collector）能给出；
   * 只能从 body 反推的 seam 记 `null` = 未观测，**绝不伪造 0**。
   */
  reasoningStrippedTurns: number | null;
  thinking: OutboundThinking;
  reasoningEffort: OutboundReasoningEffort;
  projection: OutboundProjectionFacts;
};

export type OutboundDiagnosticEvent =
  | (OutboundDiagnosticContext & {
      version: 1;
      phase: "dispatch";
      facts: OutboundRequestFacts;
    })
  | (OutboundDiagnosticContext & {
      version: 1;
      phase: "http-result";
      status: number;
      upstreamRequestId?: string;
      errorCategory: OutboundErrorCategory;
    })
  | (OutboundDiagnosticContext & {
      version: 1;
      phase: "terminal";
      outcome: OutboundTerminalOutcome;
    });

export type OutboundDiagnosticSink = (event: OutboundDiagnosticEvent) => void;

/** 调用方注入的开关 / sink（浏览器侧只走这条，不读 Node 环境变量）。 */
export type OutboundDiagnosticsOption = {
  /** 显式开启/关闭；缺省时回落 `NOLO_OUTBOUND_DIAGNOSTICS=1`。 */
  enabled?: boolean;
  /** 显式 sink；给了 sink 即视为开启。 */
  sink?: OutboundDiagnosticSink;
  callId?: string;
  host?: OutboundDiagnosticHost;
  /**
   * 主 attempt 的**实际上游** provider/model 覆盖：平台托管 remap 时对外
   * provider 仍是展示用的 "nolo"，诊断要记的是真正打到的那家。
   * fallback attempt 一律用各自 attempt 的真值，不受此覆盖影响。
   */
  provider?: string;
  model?: string;
};

export const OUTBOUND_DIAGNOSTIC_PREFIX = "[outbound-diagnostic]";
export const OUTBOUND_DIAGNOSTICS_ENV = "NOLO_OUTBOUND_DIAGNOSTICS";

const MAX_PROVIDER_TOKEN_LENGTH = 96;
const MAX_CALL_ID_LENGTH = 128;
const MAX_UPSTREAM_REQUEST_ID_LENGTH = 128;

/** 允许的标识符字符：provider/model/ID 只能是可见 ASCII 标识符，绝不放行换行。 */
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._:@+/~-]+$/;
/** 上游 request id：更窄的安全 token（不含 `/`、空格、引号、控制字符）。 */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

/**
 * 控制字符（含 `\n` / `\r` / `\t`）：一旦在**原始值**里出现即判不合格。
 * 日志换行注入与 header 伪造都从这里进来，所以判定必须发生在任何 trim 之前。
 */
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;

/** 上游 request id 白名单响应头（只读这些，不从错误正文抠 ID）。 */
const UPSTREAM_REQUEST_ID_HEADERS = ["x-request-id", "request-id"];

const THINKING_VALUES: ReadonlySet<string> = new Set([
  "enabled",
  "disabled",
  "unspecified",
  "other",
]);

const REASONING_EFFORT_VALUES: ReadonlySet<string> = new Set([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "unspecified",
  "other",
]);

const ERROR_CATEGORY_VALUES: ReadonlySet<string> = new Set([
  "none",
  "reasoning-contract",
  "invalid-request",
  "authentication",
  "rate-limit",
  "upstream",
  "other",
]);

const TERMINAL_OUTCOME_VALUES: ReadonlySet<string> = new Set([
  "completed",
  "http-error",
  "network-error",
  "aborted",
  "stream-error",
]);

const SEAM_VALUES: ReadonlySet<string> = new Set([
  "local-runtime",
  "chat",
  "server-loop",
]);

const WIRE_VALUES: ReadonlySet<string> = new Set(["chat.completions", "responses"]);

const HOST_VALUES: ReadonlySet<string> = new Set(["client", "server"]);

/**
 * 原始值守门：类型 / **原始长度** / 控制字符。
 *
 * 三条都在未 trim 的原值上判定：`"\nopenai\n"` 与「长度主要来自首尾空白」的超长值
 * 都必须在这里被拦下，而不是被 trim 洗白后放行。
 */
function isRawIdentifierAcceptable(value: unknown, maxLength: number): value is string {
  if (typeof value !== "string") return false;
  if (value.length === 0) return false;
  if (value.length > maxLength) return false;
  if (CONTROL_CHAR_PATTERN.test(value)) return false;
  return true;
}

/**
 * 非法 / 超长 / 含控制字符（含首尾换行）的标识符一律归一化为 `other`，不保留原值。
 *
 * 顺序即契约：**先校验原始值，再做 trim 归一化**。
 */
export function sanitizeProviderModelToken(value: unknown): string {
  if (!isRawIdentifierAcceptable(value, MAX_PROVIDER_TOKEN_LENGTH)) return "other";
  const normalized = value.trim();
  if (!normalized || !IDENTIFIER_PATTERN.test(normalized)) return "other";
  return normalized;
}

/** callId / providerCallId 归一化；原始值含控制字符 / 超长一律丢弃（返回 undefined）。 */
export function sanitizeCallId(value: unknown): string | undefined {
  if (!isRawIdentifierAcceptable(value, MAX_CALL_ID_LENGTH)) return undefined;
  const normalized = value.trim();
  if (!normalized || !REQUEST_ID_PATTERN.test(normalized)) return undefined;
  return normalized;
}

/** 上游 request id 归一化：原始值含换行 / 超长一律省略（返回 undefined）。 */
export function sanitizeUpstreamRequestId(value: unknown): string | undefined {
  if (!isRawIdentifierAcceptable(value, MAX_UPSTREAM_REQUEST_ID_LENGTH)) return undefined;
  const normalized = value.trim();
  if (!normalized || !REQUEST_ID_PATTERN.test(normalized)) return undefined;
  return normalized;
}

/**
 * 只读白名单响应头里的上游 request id。非法即省略；绝不从错误正文正则抠 ID。
 * fail-open：headers 形状异常返回 undefined。
 */
export function pickUpstreamRequestId(
  headers: Headers | { get(name: string): string | null } | undefined,
): string | undefined {
  if (!headers || typeof headers.get !== "function") return undefined;
  try {
    for (const name of UPSTREAM_REQUEST_ID_HEADERS) {
      const raw = headers.get(name);
      const safe = sanitizeUpstreamRequestId(raw);
      if (safe) return safe;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * 从**已读取、已解析**的错误文本在内存中分类，只输出枚举。
 * 不为了分类再 clone / 读取响应。
 */
export function classifyOutboundErrorCategory(
  status: unknown,
  errorText?: unknown,
): OutboundErrorCategory {
  const numeric = typeof status === "number" && Number.isFinite(status) ? status : 0;
  if (numeric === 401 || numeric === 403) return "authentication";
  if (numeric === 429) return "rate-limit";
  if (numeric >= 500) return "upstream";
  const text = typeof errorText === "string" ? errorText : "";
  if (numeric >= 400) {
    if (looksLikeReasoningContractError(text)) return "reasoning-contract";
    return "invalid-request";
  }
  if (numeric === 0) return "other";
  return numeric >= 200 && numeric < 300 ? "none" : "other";
}

function looksLikeReasoningContractError(text: string): boolean {
  if (!text) return false;
  if (!/reasoning_content|reasoning/i.test(text)) return false;
  return /expected a sequence|invalid type|serde|deserializ|type error|missing field/i.test(text);
}

export function createRequestShapingCounts(): RequestShapingCounts {
  return {
    assistantToolTurns: 0,
    missingReasoningTurns: 0,
    placeholderInjectedTurns: 0,
    reasoningStrippedTurns: 0,
  };
}

export function createRequestFacts(): OutboundRequestFacts {
  return {
    assistantToolTurns: 0,
    missingReasoningTurns: 0,
    // 未观测：只有塑形直连点（collector）能给出「本次注入」。
    placeholderInjectedTurns: null,
    reasoningStrippedTurns: null,
    thinking: "unspecified",
    reasoningEffort: "unspecified",
    projection: { observed: false },
  };
}

/**
 * 把塑形**实际动作**的计数写进 facts。只有塑形直连点能给
 * `placeholderInjectedTurns` / `reasoningStrippedTurns`；给了 collector 就是观测到。
 */
export function applyShapingCounts(
  facts: OutboundRequestFacts,
  counts: RequestShapingCounts | undefined,
): OutboundRequestFacts {
  if (!counts) return facts;
  facts.assistantToolTurns = toCount(counts.assistantToolTurns);
  facts.missingReasoningTurns = toCount(counts.missingReasoningTurns);
  facts.placeholderInjectedTurns = toCount(counts.placeholderInjectedTurns);
  facts.reasoningStrippedTurns = toCount(counts.reasoningStrippedTurns);
  return facts;
}

/** 透传投影降级统计（有观测时）。没有观测的路径保持 `observed: false`。 */
export function attachProjectionFacts(
  facts: OutboundRequestFacts,
  stats:
    | {
        badArguments: { truncated: number; malformed: number };
        rewrittenToolCalls: number;
        rewrittenAssistantMessages: number;
        rewrittenToolMessages: number;
      }
    | undefined,
): OutboundRequestFacts {
  if (!stats) {
    facts.projection = { observed: false };
    return facts;
  }
  facts.projection = {
    observed: true,
    badArguments: {
      truncated: toCount(stats.badArguments?.truncated),
      malformed: toCount(stats.badArguments?.malformed),
    },
    rewrittenToolCalls: toCount(stats.rewrittenToolCalls),
    rewrittenAssistantMessages: toCount(stats.rewrittenAssistantMessages),
    rewrittenToolMessages: toCount(stats.rewrittenToolMessages),
  };
  return facts;
}

/** 从最终 normalized body 提取 thinking / reasoning_effort 枚举。 */
export function writeThinkingFacts(
  facts: OutboundRequestFacts,
  body: unknown,
): OutboundRequestFacts {
  const record = asRecord(body);
  facts.thinking = resolveThinkingEnum(record);
  facts.reasoningEffort = resolveReasoningEffortEnum(record);
  return facts;
}

function resolveThinkingEnum(body: Record<string, unknown>): OutboundThinking {
  const thinking = asRecord(body.thinking);
  if (typeof thinking.type === "string") {
    const type = thinking.type.trim().toLowerCase();
    if (type === "enabled") return "enabled";
    if (type === "disabled") return "disabled";
    return "other";
  }
  const chatTemplateKwargs = asRecord(body.chat_template_kwargs);
  const enableThinking = body.enable_thinking ?? chatTemplateKwargs.enable_thinking;
  if (typeof enableThinking === "boolean") return enableThinking ? "enabled" : "disabled";
  return "unspecified";
}

function resolveReasoningEffortEnum(body: Record<string, unknown>): OutboundReasoningEffort {
  const raw = body.reasoning_effort;
  if (typeof raw === "string") {
    const value = raw.trim().toLowerCase();
    if (REASONING_EFFORT_VALUES.has(value)) return value as OutboundReasoningEffort;
    return "other";
  }
  const reasoning = asRecord(body.reasoning);
  if (reasoning.enabled === false) return "none";
  return "unspecified";
}

/**
 * 只能拿到最终 wire body 的 seam（chat / server-loop）用它反推 facts。
 *
 * 反推口径（wire 级观测，不是塑形口径）：
 * - `assistantToolTurns`：带非空 `tool_calls` 的 assistant 消息数；
 * - `missingReasoningTurns`：没有非空 `reasoning_content` 的工具轮；
 * - `placeholderInjectedTurns`：**wire body 上无法观测**——`reasoning_content` 等于占位
 *   常量既可能是本次注入，也可能是上游/历史本来就带着同一个字符串。故记 `null`
 *   （未观测），**绝不靠占位字符串相等反推成 1**；只有传入塑形 collector
 *   （`shapingCounts`，取自真实注入点）时才写真实数字。
 * - `reasoningStrippedTurns`：同样无法区分「本来没有」与「被 strip」，无 collector 时
 *   记 `null`（未观测），不伪造 0。
 */
export function deriveRequestFactsFromBody(
  body: unknown,
  shapingCounts?: RequestShapingCounts,
): OutboundRequestFacts {
  const facts = createRequestFacts();
  writeThinkingFacts(facts, body);
  const messages = extractMessages(body);
  if (messages) {
    for (const message of messages) {
      const record = asRecord(message);
      if (record.role !== "assistant") continue;
      const toolCalls = record.tool_calls;
      if (!Array.isArray(toolCalls) || toolCalls.length === 0) continue;
      facts.assistantToolTurns += 1;
      const reasoning = typeof record.reasoning_content === "string" ? record.reasoning_content : "";
      if (reasoning.length === 0) {
        facts.missingReasoningTurns += 1;
      }
    }
  }
  // 有直连观测则覆盖 wire 反推值（占位 / strip 只能来自这里）。
  return applyShapingCounts(facts, shapingCounts);
}

/** 解析（已序列化的）请求体字符串；解析失败返回 undefined（fail-open）。 */
export function parseRequestBodyFacts(
  serializedBody: unknown,
  shapingCounts?: RequestShapingCounts,
): OutboundRequestFacts | undefined {
  if (typeof serializedBody !== "string") return undefined;
  try {
    return deriveRequestFactsFromBody(JSON.parse(serializedBody), shapingCounts);
  } catch {
    return undefined;
  }
}

function extractMessages(body: unknown): unknown[] | undefined {
  const record = asRecord(body);
  if (Array.isArray(record.messages)) return record.messages;
  if (Array.isArray(record.input)) return record.input;
  return undefined;
}

/** 从 endpoint / url 推导 wire（协议），不是 host。 */
export function resolveOutboundWire(
  value: unknown,
  explicit?: OutboundDiagnosticWire,
): OutboundDiagnosticWire {
  if (explicit) return explicit;
  const text = typeof value === "string" ? value : "";
  return /\/responses(?:[/?#]|$)/.test(text) ? "responses" : "chat.completions";
}

export function isOutboundDiagnosticsEnabled(
  env: Record<string, string | undefined> | undefined = readProcessEnv(),
): boolean {
  return env?.[OUTBOUND_DIAGNOSTICS_ENV] === "1";
}

function readProcessEnv(): Record<string, string | undefined> | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env as Record<string, string | undefined> | undefined;
}

/** 默认 sink：进程日志，固定前缀 + 白名单 JSON；fail-open。 */
export function createConsoleOutboundDiagnosticSink(
  log: (...args: unknown[]) => void = defaultLog,
): OutboundDiagnosticSink {
  return (event) => {
    try {
      const serialized = serializeOutboundDiagnosticEvent(event);
      log(`${OUTBOUND_DIAGNOSTIC_PREFIX} ${JSON.stringify(serialized)}`);
    } catch {
      // fail-open：诊断绝不影响请求结果
    }
  };
}

function defaultLog(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(...args);
}

/**
 * 解析此调用点是否启用诊断。
 * - 显式 sink → 用它（视为开启）；
 * - `enabled: false` → 关闭，不回落环境变量；
 * - `enabled: true` 或 `NOLO_OUTBOUND_DIAGNOSTICS=1` → 默认 console sink；
 * - 否则 undefined（关闭，不做任何额外扫描）。
 */
export function resolveOutboundDiagnosticSink(
  option?: OutboundDiagnosticsOption,
): OutboundDiagnosticSink | undefined {
  if (option?.sink) return option.sink;
  if (option?.enabled === false) return undefined;
  if (option?.enabled === true) return createConsoleOutboundDiagnosticSink();
  if (isOutboundDiagnosticsEnabled()) return createConsoleOutboundDiagnosticSink();
  return undefined;
}

export function createOutboundDiagnosticCallId(): string {
  return `obd_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/**
 * 一次逻辑调用的 recorder：持有 callId 与 sink，按 attempt 记三阶段事件。
 * 每一次真实出站都各自 dispatch / http-result / terminal；重试与 fallback
 * 不得压成「最终一次」。
 */
export type OutboundDiagnosticCall = {
  callId: string;
  dispatch(attempt: number, facts: OutboundRequestFacts): void;
  httpResult(
    attempt: number,
    result: {
      status: number;
      headers?: Headers | { get(name: string): string | null };
      errorCategory?: OutboundErrorCategory;
      /** server 侧 attempt ID：关联同一次 attempt 的三阶段事件。 */
      providerCallId?: string;
    },
  ): void;
  terminal(
    attempt: number,
    outcome: OutboundTerminalOutcome,
    providerCallId?: string,
  ): void;
};

export function createOutboundDiagnosticCall(args: {
  sink: OutboundDiagnosticSink;
  seam: OutboundDiagnosticSeam;
  host: OutboundDiagnosticHost;
  wire: OutboundDiagnosticWire;
  provider: unknown;
  model: unknown;
  callId?: string;
}): OutboundDiagnosticCall {
  const callId = sanitizeCallId(args.callId) ?? createOutboundDiagnosticCallId();
  const base = {
    callId,
    seam: args.seam,
    host: args.host,
    wire: args.wire,
    provider: sanitizeProviderModelToken(args.provider),
    model: sanitizeProviderModelToken(args.model),
  } as const;

  return {
    callId,
    dispatch(attempt, facts) {
      emitOutboundDiagnostic(args.sink, {
        ...base,
        version: 1,
        phase: "dispatch",
        attempt: toAttempt(attempt),
        facts,
      });
    },
    httpResult(attempt, result) {
      const upstreamRequestId = pickUpstreamRequestId(result.headers);
      const providerCallId = sanitizeCallId(result.providerCallId);
      emitOutboundDiagnostic(args.sink, {
        ...base,
        version: 1,
        phase: "http-result",
        attempt: toAttempt(attempt),
        status: toStatus(result.status),
        errorCategory: result.errorCategory ?? classifyOutboundErrorCategory(result.status),
        ...(providerCallId ? { providerCallId } : {}),
        ...(upstreamRequestId ? { upstreamRequestId } : {}),
      });
    },
    terminal(attempt, outcome, providerCallId) {
      const safeProviderCallId = sanitizeCallId(providerCallId);
      emitOutboundDiagnostic(args.sink, {
        ...base,
        version: 1,
        phase: "terminal",
        attempt: toAttempt(attempt),
        outcome,
        ...(safeProviderCallId ? { providerCallId: safeProviderCallId } : {}),
      });
    },
  };
}

/** 发事件：sink 抛错必须 fail-open，绝不影响请求结果。 */
export function emitOutboundDiagnostic(
  sink: OutboundDiagnosticSink | undefined,
  event: OutboundDiagnosticEvent,
): void {
  if (!sink) return;
  try {
    sink(event);
  } catch {
    // fail-open
  }
}

/**
 * 白名单 serializer：**只从具名字段构造新对象**。
 *
 * 禁止 spread event / config / body / error / headers；未在白名单里的字段
 * 一律丢弃；所有字符串都经归一化（非法值 → `other` 或省略）。
 */
export function serializeOutboundDiagnosticEvent(
  event: OutboundDiagnosticEvent,
): Record<string, unknown> {
  const record = event as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {
    version: 1,
    phase: toEnum(record.phase, new Set(["dispatch", "http-result", "terminal"]), "dispatch"),
    callId: sanitizeCallId(record.callId) ?? "unknown",
    attempt: toAttempt(record.attempt),
    seam: toEnum(record.seam, SEAM_VALUES, undefined) ?? undefined,
    host: toEnum(record.host, HOST_VALUES, undefined) ?? undefined,
    wire: toEnum(record.wire, WIRE_VALUES, undefined) ?? undefined,
    provider: sanitizeProviderModelToken(record.provider),
    model: sanitizeProviderModelToken(record.model),
  };
  const providerCallId = sanitizeCallId(record.providerCallId);
  if (providerCallId) out.providerCallId = providerCallId;

  if (out.phase === "dispatch") {
    out.facts = serializeRequestFacts(record.facts);
  } else if (out.phase === "http-result") {
    out.status = toStatus(record.status);
    out.errorCategory = toEnum(
      record.errorCategory,
      ERROR_CATEGORY_VALUES,
      "other",
    );
    const upstreamRequestId = sanitizeUpstreamRequestId(record.upstreamRequestId);
    if (upstreamRequestId) out.upstreamRequestId = upstreamRequestId;
  } else {
    out.outcome = toEnum(record.outcome, TERMINAL_OUTCOME_VALUES, "other");
  }

  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

function serializeRequestFacts(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const projection = asRecord(record.projection);
  const output: Record<string, unknown> = {
    assistantToolTurns: toCount(record.assistantToolTurns),
    missingReasoningTurns: toCount(record.missingReasoningTurns),
    placeholderInjectedTurns:
      typeof record.placeholderInjectedTurns === "number"
        ? toCount(record.placeholderInjectedTurns)
        : null,
    reasoningStrippedTurns:
      typeof record.reasoningStrippedTurns === "number"
        ? toCount(record.reasoningStrippedTurns)
        : null,
    thinking: toEnum(record.thinking, THINKING_VALUES, "unspecified"),
    reasoningEffort: toEnum(
      record.reasoningEffort,
      REASONING_EFFORT_VALUES,
      "unspecified",
    ),
  };
  if (projection.observed === true) {
    const bad = asRecord(projection.badArguments);
    output.projection = {
      observed: true,
      badArguments: {
        truncated: toCount(bad.truncated),
        malformed: toCount(bad.malformed),
      },
      rewrittenToolCalls: toCount(projection.rewrittenToolCalls),
      rewrittenAssistantMessages: toCount(projection.rewrittenAssistantMessages),
      rewrittenToolMessages: toCount(projection.rewrittenToolMessages),
    };
  } else {
    output.projection = { observed: false };
  }
  return output;
}

function toCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function toAttempt(value: unknown): number {
  const count = toCount(value);
  return count > 0 ? count : 1;
}

function toStatus(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.floor(value);
}

function toEnum<T extends string>(
  value: unknown,
  allowed: ReadonlySet<string>,
  fallback: T | undefined,
): T | undefined {
  if (typeof value === "string" && allowed.has(value)) return value as T;
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
