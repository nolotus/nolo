// ai/token/providerCallTiming.ts
//
// 共享的 Nolo logical invocation observed timing 采集器与「首个有效输出」判据。
//
// ── Authoritative timing 契约（observed timing Phase 1）────────────────────
// - canonical 字段：`firstOutputMs`（logical invocation start 到第一个被接受的
//   meaningful model output 的毫秒数，仅流式观测）与 `callDurationMs`（logical
//   invocation start 到 accepted invocation completion 的毫秒数）。后者包含该
//   logical invocation 内的 transparent auth refresh、retry 与 backoff。语义是
//   一次 Nolo 逻辑调用（agent-runtime provider call，或 server chat 代理的一次
//   上游调用）的 observed timing；monotonic 相对毫秒，落盘只存数值。
// - 只做观测：不参与 billing / 定价 / cache 命中等任何计算。
// - 没有独立 performance DB：timing 只作为既有 token 记录
//   （TokenUsageData / TokenRecord）上的可选数值字段随记录持久化。
// - model selector 尚未消费：observed speed 目前只有纯解析器
//   （ai/token/observedSpeedResolver.ts）；selector / profile / 公开 benchmark
//   均未接入，timing 也不得暗中影响计费或路由。
//
// 事实链：provider/runtime / server 代理在一次真实模型调用里采集两个字段，
// 附加到该次调用的 usage 对象上；usage 沿既有链路（normalizeUsage →
// prepareTokenUsageData → saveTokenRecord / writeServerTokenRecord）落盘进
// token 记录。本模块只产出纯数值事实，不引入任何身份字段。
//
// 判据约定（reasoning/text/tool-call 都算 meaningful output）：
//   - heartbeat 注释帧、usage-only 帧、billing metadata 帧、空 delta 一律不算；
//   - 首个有效输出只记一次（first-write-wins）；
//   - 错误路径不产生负值（写侧 max(0) 截断 + normalizeTimingMs 丢弃负值）；
//   - 非流式调用没有 first-output 语义，不得伪造 firstOutputMs（只记
//     callDurationMs）。
//
// 时钟：默认 monotonic（performance.now），落盘只存相对毫秒数值。

export type MonotonicNow = () => number;

const defaultNow: MonotonicNow = () => {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return typeof perf?.now === "function" ? perf.now() : Date.now();
};

/**
 * 共享 timing 毫秒归一化：有限、非负、取整毫秒；无效值（非数字 / NaN / ±∞ /
 * 负值）一律丢弃为 undefined，绝不落 NaN，也绝不让负值伪装成 0 落盘。
 * 所有 timing 边界（采集收尾、normalizeUsage、server billing 载荷、
 * observed-speed resolver 读记录）都必须经过它，保证全链路只有一种 timing
 * 真值形态。tracker 收尾对时钟回退的 max(0) 截断在本模块的 finalize 内显式
 * 完成（见 finalizeProviderCallTiming）。
 */
export const normalizeTimingMs = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.round(value);
};

/** 落盘的 timing 数值字段（TokenUsageData / TokenRecord 上的可选字段）。 */
export type ProviderCallTimingFields = {
  /** request 发出到第一条真实模型输出的毫秒数；非流式无此字段。 */
  firstOutputMs?: number;
  /** 完整 provider call 的毫秒数。 */
  callDurationMs?: number;
};

export interface ProviderCallTimingTracker {
  /** monotonic 锚点：provider request 发出时刻。 */
  startMonotonicMs: number;
  /** 首个有效模型输出到达的 monotonic 时刻；观测到才存在。 */
  firstMeaningfulMonotonicMs?: number;
  now: MonotonicNow;
}

export const createProviderCallTimingTracker = (
  now: MonotonicNow = defaultNow,
): ProviderCallTimingTracker => ({
  startMonotonicMs: now(),
  now,
});

/**
 * 记录一次有效模型输出（首个有效输出只记一次）。
 * 调用方负责用共享判据过滤：只有 reasoning/text/tool-call 的非空 delta 才调用。
 */
export const observeMeaningfulProviderResponseAt = (
  tracker: ProviderCallTimingTracker | undefined,
  observedAt: number,
): void => {
  if (!tracker || tracker.firstMeaningfulMonotonicMs !== undefined) return;
  tracker.firstMeaningfulMonotonicMs = observedAt;
};

export const observeMeaningfulProviderResponse = (
  tracker: ProviderCallTimingTracker | undefined,
): void => {
  if (!tracker) return;
  observeMeaningfulProviderResponseAt(tracker, tracker.now());
};

/** 调用收尾时换算成可落盘的相对毫秒字段。 */
export const finalizeProviderCallTiming = (
  tracker: ProviderCallTimingTracker | undefined,
): ProviderCallTimingFields => {
  if (!tracker) return {};
  // 时钟回退（monotonic clock 被换页/换进程重置）只可能发生在写侧：显式
  // max(0) 截断保留观测（0ms），再交给 normalizeTimingMs 取整。
  const callDurationMs = normalizeTimingMs(
    Math.max(0, tracker.now() - tracker.startMonotonicMs),
  );
  const firstOutputMs =
    tracker.firstMeaningfulMonotonicMs !== undefined
      ? normalizeTimingMs(
          Math.max(0, tracker.firstMeaningfulMonotonicMs - tracker.startMonotonicMs),
        )
      : undefined;
  return {
    ...(firstOutputMs !== undefined ? { firstOutputMs } : {}),
    ...(callDurationMs !== undefined ? { callDurationMs } : {}),
  };
};

/** 把收尾 timing 附加到 usage 对象上（usage 不存在则原样返回，无载体不硬造）。 */
export const withProviderCallTimingFields = (
  usage: Record<string, any> | undefined | null,
  timing: ProviderCallTimingFields,
): Record<string, any> | undefined | null => {
  if (!usage || typeof usage !== "object") return usage;
  return {
    ...usage,
    ...(timing.firstOutputMs !== undefined ? { firstOutputMs: timing.firstOutputMs } : {}),
    ...(timing.callDurationMs !== undefined ? { callDurationMs: timing.callDurationMs } : {}),
  };
};

/**
 * Chat Completions 协议判据：一个 `choices[].delta` 对象是否携带真实模型
 * 输出。agent-runtime 的结构化流（processChatCompletionDelta）与 server 代理
 * 的原始帧路径（chatProxyBilling）共用本判据，两侧不得各自造第二套语义：
 *   - reasoning（reasoning_content / reasoning）/ text / tool-call 的非空
 *     delta → true；
 *   - 空 delta、usage-only 帧、billing metadata 帧、错误帧 → false。
 */
export const isMeaningfulChatCompletionOutput = (delta: unknown): boolean => {
  if (!delta || typeof delta !== "object") return false;
  const d = delta as Record<string, any>;
  if (typeof d.content === "string" && d.content) return true;
  if (typeof d.reasoning_content === "string" && d.reasoning_content) return true;
  if (typeof d.reasoning === "string" && d.reasoning) return true;
  return Array.isArray(d.tool_calls) && d.tool_calls.length > 0;
};

/**
 * Responses 协议判据：一个 SSE event 对象是否携带真实模型输出。agent-runtime
 * （responsesSseStream / codex）与 server 代理共用：
 *   - `response.*.delta` 事件（text / reasoning / refusal / function args）
 *     携带非空字符串 delta 或 `{ text }` → true；
 *   - 完整 function_call item 一次性下发（无后续参数 delta 流）→ true；
 *   - usage-only / completed / created / failed 等非输出事件 → false。
 */
export const isMeaningfulResponsesOutput = (event: unknown): boolean => {
  if (!event || typeof event !== "object") return false;
  const e = event as Record<string, any>;
  const type = typeof e.type === "string" ? e.type : "";

  // Responses 线：*.delta 事件（text / reasoning / refusal / function args）。
  if (type.startsWith("response.") && type.endsWith(".delta")) {
    const delta = e.delta;
    if (typeof delta === "string" && delta.length > 0) return true;
    if (
      delta &&
      typeof delta === "object" &&
      typeof delta.text === "string" &&
      delta.text
    ) {
      return true;
    }
    return false;
  }

  // Responses 线：完整 function_call item 一次性下发（无后续参数 delta 流）。
  if (type === "response.output_item.added" || type === "response.output_item.done") {
    return e.item?.type === "function_call";
  }

  return false;
};

/**
 * 原始 SSE data 帧分发器：给不区分线协议的调用方（server chat 代理的 usage
 * 累积器等只能看到原始 JSON 帧的路径）按帧内特征分流到上面两个协议判据。
 * 能预知协议的调用方应直接用 isMeaningfulChatCompletionOutput /
 * isMeaningfulResponsesOutput。
 */
export const isMeaningfulModelSsePayload = (parsed: unknown): boolean => {
  if (!parsed || typeof parsed !== "object") return false;
  const event = parsed as Record<string, any>;
  const type = typeof event.type === "string" ? event.type : "";
  if (type.startsWith("response.")) return isMeaningfulResponsesOutput(parsed);
  return isMeaningfulChatCompletionOutput(event.choices?.[0]?.delta);
};
