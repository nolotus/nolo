/**
 * 共享的 Agent `readDialog` 响应预算 projection seam（纯函数，零依赖）。
 *
 * 已证实的根因：`limit` 只限制消息条数；in-process（readDialogInProcess）、
 * server/Web 共享工具（readDialogFunc）、server-side Agent 工具
 * （noloWorkspaceServerTools）与 CLI bridge 都会先构建完整 meta+messages 再整体
 * JSON.stringify，且消息里可能保留完整 reasoning_content / tool_calls arguments /
 * tool result content / metadata。工具密集对话因此产生无界的多份内存副本
 * （快照 + 序列化串 + 持久 transcript），直接把进程推向 OOM。
 *
 * 本模块是各入口共享的唯一 seam：
 * - in-process：`noloWorkspaceTools.node.ts` readDialogInProcess —— 通过
 *   `createStreamingDialogReadProjector` 边迭代边累计/投影，不先持有完整
 *   rawMessages。
 * - server 数据源：`packages/server/api/methods.ts` fetchConvMsgs 接受可选
 *   `maxChars`，在数据源侧用 `projectDialogReadFromNewestFirst` 完成预算裁剪，
 *   返回 `{ messages, projection }`（升序、有界），agent 调用方不再全量
 *   materialize。人工/UI 调用不传 `maxChars`，保持原有裸数组完整导出。
 * - server-side Agent 工具 / Web 共享工具：`noloWorkspaceServerTools.readDialog`
 *   与 `noloWorkspaceReadTools.readDialogFunc` 走上述 bounded RPC，meta 用
 *   `projectDialogMetaForAgent` 有界。
 * - CLI bridge：bridge 传 `--max-response-chars` 给子进程，子进程在打印前
 *   用同一 seam 裁剪；父进程另外用 `readTextStreamUpToChars` 给 stdout 加硬顶，
 *   不先收全量 stdout 再截。人工 `nolo dialog read` 不带该 flag 时保留完整导出，
 *   与 Agent bridge 显式分离。
 *
 * 顺序契约（防二次 reverse 事故）：**seam 输入必须是升序（旧→新）**；
 * 超预算时从旧的一侧丢弃、保留最新消息。`/rpc/getConvMsgs` 与 fetchMessages
 * 的返回是「从新到旧」，跨过该边界时必须显式经过
 * `projectDialogReadFromNewestFirst`（或 `reverse()` 归一）。
 *
 * 契约：
 * - 普通短消息逐字节保真（verbatim，引用不变）。
 * - 超过 per-message 预算的消息做字段级裁剪：content / reasoning_content /
 *   tool_calls arguments / tool_result_metadata·metadata 只保留头部切片；
 *   content 数组截断标记保持合法 typed text part，tool_calls 只保留合法对象，
 *   省略统计进 per-message `projection` 元数据；裁剪后仍超预算的病态消息
 *   退化为 envelope stub（保 role/id/统计）。
 * - meta 超预算同样裁剪或 stub。
 * - 整体响应有硬顶（默认 DEFAULT_READ_DIALOG_MAX_RESPONSE_CHARS，最小被钳到
 *   MIN_RESPONSE_BUDGET_CHARS）：硬顶按「实际序列化后的完整结果（含 stats）」
 *   强制收敛，极小预算同样不越界。
 * - 超限时报 truncated、messagesTotal/messagesReturned、
 *   estimatedOriginalChars/omittedChars 与安全继续方式。
 * - 估算用 estimateJsonChars 的结构遍历，不对全量数据做整体 stringify，
 *   因此 projection 本身不产生无界大字符串。
 */

export interface DialogReadBudgetOptions {
  /** 序列化后总预算（chars）。默认 DEFAULT_READ_DIALOG_MAX_RESPONSE_CHARS。 */
  maxResponseChars?: number;
  /** 单条消息超过该估算值即进入字段级裁剪。 */
  maxMessageChars?: number;
  /** 单字段（content/reasoning_content/tool args/metadata）保留的头部切片长度。 */
  maxFieldChars?: number;
  /** meta 的预算上限（会被 maxResponseChars 进一步约束，防 meta 独吞预算）。 */
  maxMetaChars?: number;
  /** in-process 流式投影专用：最多保留多少条最新消息（对应 limit 语义）。 */
  maxMessages?: number;
}

export interface DialogReadProjectionStats {
  truncated: boolean;
  messagesTotal: number;
  /**
   * false 时 messagesTotal 只是已扫描条数的下界（atLeast）——
   * 数据源为省内存提前 break（预算/limit 触发）时不得谎报精确 total。
   */
  messagesTotalKnown: boolean;
  messagesReturned: number;
  estimatedOriginalChars: number;
  estimatedReturnedChars: number;
  omittedChars: number;
  /** messagesTotal/estimatedOriginalChars 仅统计已扫描输入时显式标记。 */
  estimatedOriginalCharsIsLowerBound?: boolean;
  /** truncated 时的安全继续方式；未截断为空串。 */
  continuation: string;
}

export interface ProjectedDialogRead {
  meta: unknown;
  /** 升序（旧→新）的有界消息数组。 */
  messages: unknown[];
  stats: DialogReadProjectionStats;
}

export const DEFAULT_READ_DIALOG_MAX_RESPONSE_CHARS = 32_000;
/** 总预算硬下限：保证极小预算下 envelope + stats 仍装得下，硬顶可收敛。 */
export const MIN_RESPONSE_BUDGET_CHARS = 1024;
const DEFAULT_MAX_MESSAGE_CHARS = 8_000;
const DEFAULT_MAX_FIELD_CHARS = 2_000;
const DEFAULT_MAX_META_CHARS = 6_000;
const MAX_TOOL_CALLS_PER_PROJECTED_MESSAGE = 20;
const MAX_CONTENT_PARTS_PER_PROJECTED_MESSAGE = 40;
/** 结构遍历的深度上限，防御深嵌套循环引用。 */
const ESTIMATE_MAX_DEPTH = 12;
/** 最终硬顶收敛时按实际序列化结果驱逐的最大迭代数（防御性上限）。 */
const HARD_CAP_MAX_ITERATIONS = 64;

const FIELD_TRUNCATION_MARKER = "…[truncated";

function resolveBudget(options?: DialogReadBudgetOptions) {
  const positive = (value: number | undefined, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? Math.floor(value)
      : fallback;
  const maxResponseChars = Math.max(
    MIN_RESPONSE_BUDGET_CHARS,
    positive(options?.maxResponseChars, DEFAULT_READ_DIALOG_MAX_RESPONSE_CHARS),
  );
  return {
    maxResponseChars,
    maxMessageChars: Math.min(
      positive(options?.maxMessageChars, DEFAULT_MAX_MESSAGE_CHARS),
      maxResponseChars,
    ),
    maxFieldChars: positive(options?.maxFieldChars, DEFAULT_MAX_FIELD_CHARS),
    maxMetaChars: positive(options?.maxMetaChars, DEFAULT_MAX_META_CHARS),
    maxMessages: options?.maxMessages,
  };
}

/**
 * 结构化估算 JSON 序列化后的字符数。只做遍历累加，不拼接大字符串，
 * 因此对超大单字段也是 O(字段自身长度) 而非 O(全量序列化)。
 */
export function estimateJsonChars(value: unknown, depth = 0): number {
  if (value === null || value === undefined) return 4;
  const type = typeof value;
  if (type === "string") return (value as string).length + 2;
  if (type === "number") {
    const text = String(value);
    return text.length > 0 ? text.length : 1;
  }
  if (type === "boolean") return value ? 4 : 5;
  if (type !== "object") return 8;
  if (depth >= ESTIMATE_MAX_DEPTH) return 16;
  if (Array.isArray(value)) {
    let total = 2;
    for (const item of value) total += estimateJsonChars(item, depth + 1) + 1;
    return total;
  }
  let total = 2;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    total += key.length + 4 + estimateJsonChars(item, depth + 1);
  }
  return total;
}

function truncateHead(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars))}${FIELD_TRUNCATION_MARKER} +${text.length - maxChars} chars]`;
}

function boundValueDeep(
  value: unknown,
  maxFieldChars: number,
  depth = 0,
): unknown {
  if (typeof value === "string") return truncateHead(value, maxFieldChars);
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (depth >= ESTIMATE_MAX_DEPTH) return FIELD_TRUNCATION_MARKER + " depth]";
  if (Array.isArray(value)) {
    return value.map((item) => boundValueDeep(item, maxFieldChars, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = boundValueDeep(item, maxFieldChars, depth + 1);
  }
  return out;
}

interface MetaProjection {
  meta: unknown;
  truncated: boolean;
  originalChars: number;
  returnedChars: number;
}

function projectMeta(meta: unknown, maxMetaChars: number): MetaProjection {
  const originalChars = estimateJsonChars(meta);
  if (originalChars <= maxMetaChars) {
    return { meta, truncated: false, originalChars, returnedChars: originalChars };
  }
  const bounded = boundValueDeep(meta, Math.min(DEFAULT_MAX_FIELD_CHARS, maxMetaChars));
  const returnedChars = estimateJsonChars(bounded);
  if (returnedChars <= maxMetaChars) {
    return { meta: bounded, truncated: true, originalChars, returnedChars };
  }
  return {
    meta: { projectionTruncated: true, estimatedOriginalChars: originalChars },
    truncated: true,
    originalChars,
    returnedChars: estimateJsonChars({ projectionTruncated: true, estimatedOriginalChars: originalChars }),
  };
}

/**
 * 只对 meta 做预算投影（消息已在数据源侧有界的调用方使用，
 * 例如 server-side Agent 工具消费 bounded RPC 响应时）。
 */
export function projectDialogMetaForAgent(
  meta: unknown,
  options?: DialogReadBudgetOptions,
): { meta: unknown; truncated: boolean } {
  const budget = resolveBudget(options);
  const maxMetaChars = Math.min(budget.maxMetaChars, Math.floor(budget.maxResponseChars / 2));
  const projected = projectMeta(meta, maxMetaChars);
  return { meta: projected.meta, truncated: projected.truncated };
}

interface ProjectedMessage {
  message: unknown;
  originalChars: number;
  returnedChars: number;
  projected: boolean;
}

function asRecord(message: unknown): Record<string, any> {
  return message && typeof message === "object"
    ? ({ ...(message as Record<string, any>) } as Record<string, any>)
    : { value: message };
}

function buildEnvelopeStub(src: Record<string, any>, originalChars: number): Record<string, unknown> {
  return {
    role: src.role ?? src.authorRole ?? null,
    ...(typeof src.id === "string" ? { id: src.id } : {}),
    ...(typeof src.createdAt === "string" ? { createdAt: src.createdAt } : {}),
    projectionTruncated: true,
    estimatedOriginalChars: originalChars,
  };
}

/**
 * 字段级消息裁剪。content 数组截断标记保持合法 typed text part；
 * tool_calls 只保留合法 call 对象（截断/省略统计进 per-message projection
 * 元数据，绝不混入裸字符串）。
 */
function projectDialogMessage(
  message: unknown,
  budget: {
    maxMessageChars: number;
    maxFieldChars: number;
    maxResponseChars?: number;
  },
): ProjectedMessage {
  const originalChars = estimateJsonChars(message);
  if (originalChars <= budget.maxMessageChars) {
    return { message, originalChars, returnedChars: originalChars, projected: false };
  }

  const out = asRecord(message);
  const src = message && typeof message === "object"
    ? (message as Record<string, any>)
    : out;
  let projected = false;
  let contentPartsTotal: number | undefined;
  let contentPartsReturned: number | undefined;
  let toolCallsTotal: number | undefined;
  let toolCallsReturned: number | undefined;

  if (typeof src.content === "string") {
    const bounded = truncateHead(src.content, budget.maxFieldChars);
    if (bounded !== src.content) {
      out.content = bounded;
      projected = true;
    }
  } else if (Array.isArray(src.content)) {
    const total = src.content.length;
    if (total > MAX_CONTENT_PARTS_PER_PROJECTED_MESSAGE) {
      out.content = [
        ...src.content
          .slice(0, MAX_CONTENT_PARTS_PER_PROJECTED_MESSAGE)
          .map((part) => boundValueDeep(part, budget.maxFieldChars)),
        // 合法 typed text part：不得向 content 数组混入裸字符串标记。
        { type: "text", text: `${FIELD_TRUNCATION_MARKER} +${total - MAX_CONTENT_PARTS_PER_PROJECTED_MESSAGE} content parts]` },
      ];
      contentPartsTotal = total;
      contentPartsReturned = MAX_CONTENT_PARTS_PER_PROJECTED_MESSAGE;
      projected = true;
    } else {
      const boundedParts = src.content.map((part) => boundValueDeep(part, budget.maxFieldChars));
      if (estimateJsonChars(boundedParts) < estimateJsonChars(src.content)) {
        out.content = boundedParts;
        projected = true;
        contentPartsTotal = total;
        contentPartsReturned = total;
      }
    }
  }

  if (typeof src.reasoning_content === "string") {
    const bounded = truncateHead(src.reasoning_content, budget.maxFieldChars);
    if (bounded !== src.reasoning_content) {
      out.reasoning_content = bounded;
      projected = true;
    }
  }

  if (Array.isArray(src.tool_calls)) {
    const total = src.tool_calls.length;
    let calls = src.tool_calls;
    if (total > MAX_TOOL_CALLS_PER_PROJECTED_MESSAGE) {
      calls = calls.slice(0, MAX_TOOL_CALLS_PER_PROJECTED_MESSAGE);
      toolCallsTotal = total;
      toolCallsReturned = MAX_TOOL_CALLS_PER_PROJECTED_MESSAGE;
      projected = true;
    }
    // 只保留合法 call 对象；arguments 仍是字符串切片（对象形状不变）。
    const boundedCalls = calls.map((call: any) => {
      if (!call || typeof call !== "object" || Array.isArray(call)) {
        return call;
      }
      const next = { ...call };
      if (next.function && typeof next.function === "object" && !Array.isArray(next.function)) {
        next.function = { ...next.function };
        if (typeof next.function.arguments === "string") {
          next.function.arguments = truncateHead(
            next.function.arguments,
            budget.maxFieldChars,
          );
        }
      }
      return next;
    });
    if (estimateJsonChars(boundedCalls) < estimateJsonChars(src.tool_calls)) {
      out.tool_calls = boundedCalls;
      projected = true;
      if (toolCallsReturned === undefined) {
        toolCallsTotal = total;
        toolCallsReturned = total;
      }
    }
  }

  for (const key of ["tool_result_metadata", "metadata"] as const) {
    const value = src[key];
    if (value && typeof value === "object") {
      const bounded = boundValueDeep(value, budget.maxFieldChars);
      if (estimateJsonChars(bounded) < estimateJsonChars(value)) {
        out[key] = bounded;
        projected = true;
      }
    }
  }

  let returnedChars = estimateJsonChars(out);

  // 兜底硬顶：字段级裁剪后仍超过单条预算的病态消息退化为 envelope stub，
  // 保证单条消息永远无法击穿整体响应预算。允许裁剪后消息有少量结构余量（15%），
  // 避免合法裁剪后的 40 content parts + 20 tool calls 被过度 stub 化。
  const stubThreshold = Math.max(
    Math.floor(budget.maxMessageChars * 1.15),
    budget.maxFieldChars,
  );
  if (returnedChars > stubThreshold) {
    const stub = buildEnvelopeStub(src, originalChars);
    const stubChars = estimateJsonChars(stub);
    if (stubChars < returnedChars) {
      return {
        message: stub,
        originalChars,
        returnedChars: stubChars,
        projected: true,
      };
    }
  }

  if (projected) {
    out.projection = {
      truncated: true,
      originalChars,
      returnedChars,
      ...(contentPartsTotal !== undefined
        ? { contentPartsTotal, contentPartsReturned }
        : {}),
      ...(toolCallsTotal !== undefined
        ? { toolCallsTotal, toolCallsReturned }
        : {}),
    };
    returnedChars = estimateJsonChars(out);
  }

  return { message: out, originalChars, returnedChars, projected };
}

const CONTINUATION_HINT =
  "To continue safely: re-run readDialog with a smaller limit, or use mode=\"status\" for meta + runtimeCheckpoint only. " +
  "Oversized messages keep head slices of content/reasoning_content/tool_calls with per-message projection stats.";

function buildStats(args: {
  truncated: boolean;
  total: number;
  totalKnown?: boolean;
  returned: number;
  estimatedOriginalChars: number;
  estimatedReturnedChars: number;
}): DialogReadProjectionStats {
  return {
    truncated: args.truncated,
    messagesTotal: args.total,
    messagesTotalKnown: args.totalKnown ?? true,
    messagesReturned: args.returned,
    estimatedOriginalChars: args.estimatedOriginalChars,
    estimatedReturnedChars: args.estimatedReturnedChars,
    omittedChars: Math.max(0, args.estimatedOriginalChars - args.estimatedReturnedChars),
    continuation: args.truncated ? CONTINUATION_HINT : "",
  };
}

/**
 * 唯一共享的 readDialog 预算 projection。messages 必须是升序（旧→新）；
 * 预算耗尽时从旧的一侧丢弃，保留最新消息。对「从新到旧」的数据源
 * （/rpc/getConvMsgs、fetchMessages）请改用 projectDialogReadFromNewestFirst。
 */
export function projectDialogReadForAgent(args: {
  meta?: unknown;
  messages?: unknown;
  options?: DialogReadBudgetOptions;
}): ProjectedDialogRead {
  const budget = resolveBudget(args.options);
  const messages: unknown[] = Array.isArray(args.messages)
    ? (args.messages as unknown[])
    : [];
  const maxMetaChars = Math.min(budget.maxMetaChars, Math.floor(budget.maxResponseChars / 2));

  const metaProjection = projectMeta(args.meta, maxMetaChars);
  const messagesOverhead = 64;
  const envelopeOverhead = Math.min(1024, Math.max(256, Math.floor(budget.maxResponseChars / 8)));
  const statsOverhead = estimateJsonChars({
    truncated: true,
    messagesTotal: messages.length,
    messagesReturned: messages.length,
    estimatedOriginalChars: 88_888_888,
    estimatedReturnedChars: 88_888_888,
    omittedChars: 88_888_888,
    continuation: CONTINUATION_HINT,
  });
  // 消息净预算基数必须是总预算 budget.maxResponseChars（而非 MIN_RESPONSE_BUDGET_CHARS
  // 下限），否则默认 32K 会被压成几百字（CRITICAL 回归门：禁止静默缩水）。
  // 预留 envelopeOverhead 给调用方信封与派生摘要（summary），避免消息填满导致 summary 被迫驱逐。
  const budgetForMessages = Math.max(
    budget.maxResponseChars - metaProjection.returnedChars - messagesOverhead - statsOverhead - envelopeOverhead,
    128,
  );

  const kept: { message: unknown; returnedChars: number; projected: boolean }[] = [];
  let estimatedOriginalChars = metaProjection.originalChars;
  let returnedChars = metaProjection.returnedChars + messagesOverhead;
  let anyProjected = false;
  let index = messages.length;
  while (index > 0) {
    const message = messages[index - 1];
    const projectedMessage = projectDialogMessage(message, budget);
    estimatedOriginalChars += projectedMessage.originalChars + 1;
    if (returnedChars + projectedMessage.returnedChars <= budgetForMessages) {
      kept.push(projectedMessage);
      returnedChars += projectedMessage.returnedChars + 1;
      anyProjected = anyProjected || projectedMessage.projected;
      index -= 1;
      continue;
    }
    // 超限保留最新：从新到旧扫描，遇到放不下的消息即停，
    // 不再尝试更旧的消息（防止旧小消息挤掉最新消息）。
    // 对剩余未保留的消息累加 originalChars，如实统计 estimatedOriginalChars
    index -= 1;
    while (index > 0) {
      index -= 1;
      estimatedOriginalChars += estimateJsonChars(messages[index]) + 1;
    }
    break;
  }

  // 统计必须如实反映原始输入规模，未扫描的更旧消息同样计入 estimatedOriginalChars。
  while (index > 1) {
    index -= 1;
    estimatedOriginalChars += estimateJsonChars(messages[index - 1]) + 1;
  }

  // 至少保底返回最新一条（必要时 stub 化），避免完全空手。
  if (kept.length === 0 && messages.length > 0) {
    const newest = messages[messages.length - 1];
    let projectedMessage = projectDialogMessage(newest, budget);
    if (projectedMessage.returnedChars + returnedChars > budgetForMessages) {
      const stub = buildEnvelopeStub(
        newest && typeof newest === "object"
          ? (newest as Record<string, any>)
          : { value: newest },
        projectedMessage.originalChars,
      );
      projectedMessage = {
        message: stub,
        originalChars: projectedMessage.originalChars,
        returnedChars: estimateJsonChars(stub),
        projected: true,
      };
    }
    kept.push(projectedMessage);
    returnedChars += projectedMessage.returnedChars + 1;
    anyProjected = true;
  }

  kept.reverse();
  const truncated =
    metaProjection.truncated ||
    anyProjected ||
    kept.length < messages.length;
  let stats = buildStats({
    truncated,
    total: messages.length,
    returned: kept.length,
    estimatedOriginalChars,
    estimatedReturnedChars: returnedChars + estimateJsonChars({
      truncated,
      messagesTotal: messages.length,
      messagesReturned: kept.length,
      estimatedOriginalChars,
      estimatedReturnedChars: returnedChars,
      omittedChars: Math.max(0, estimatedOriginalChars - returnedChars),
      continuation: truncated ? CONTINUATION_HINT : "",
    }),
  });

  // 最终硬顶：以实际序列化结果为准（含 stats），逐条驱逐直到收敛。
  let result = { meta: metaProjection.meta, messages: kept.map((e) => e.message), stats };
  let guard = HARD_CAP_MAX_ITERATIONS;
  while (JSON.stringify(result).length > budget.maxResponseChars && kept.length > 0 && guard-- > 0) {
    kept.shift();
    stats = buildStats({
      truncated: true,
      total: messages.length,
      returned: kept.length,
      estimatedOriginalChars,
      estimatedReturnedChars: returnedChars,
    });
    result = { meta: metaProjection.meta, messages: kept.map((e) => e.message), stats };
  }
  if (JSON.stringify(result).length > budget.maxResponseChars) {
    // 底线形态：meta mini-stub + 空 stats hint，MIN_RESPONSE_BUDGET_CHARS 保证可收敛。
    const miniMeta = metaProjection.truncated
      ? metaProjection.meta
      : { projectionTruncated: true, estimatedOriginalChars: metaProjection.originalChars };
    result = {
      meta: miniMeta,
      messages: [],
      stats: { ...stats, continuation: "", messagesReturned: 0 },
    };
    if (JSON.stringify(result).length > budget.maxResponseChars) {
      result = {
        meta: { projectionTruncated: true },
        messages: [],
        stats: { ...stats, continuation: "", messagesReturned: 0 },
      };
    }
  }
  return result;
}

/**
 * 「从新到旧」数据源（/rpc/getConvMsgs、fetchMessages 默认 reverse:true）的
 * 显式归一入口：先反转为升序，再走统一 seam。数据源侧 agent-safe bounded
 * 响应由该函数完成，调用方不得自行二次 reverse。
 */
export function projectDialogReadFromNewestFirst(args: {
  meta?: unknown;
  messages?: unknown;
  options?: DialogReadBudgetOptions;
}): ProjectedDialogRead {
  const ascending = Array.isArray(args.messages)
    ? [...(args.messages as unknown[])].reverse()
    : [];
  return projectDialogReadForAgent({ meta: args.meta, messages: ascending, options: args.options });
}

/**
 * in-process 流式投影器：边迭代边累计/投影，不持有完整 rawMessages。
 * 按 addMessage 的调用顺序视为升序（旧→新）；预算与 count 上限超限时
 * 从旧的一侧驱逐，保留最新。
 */
export interface StreamingDialogReadProjector {
  addMessage(message: unknown): void;
  finish(meta: unknown): ProjectedDialogRead;
}

export function createStreamingDialogReadProjector(
  options?: DialogReadBudgetOptions,
): StreamingDialogReadProjector {
  const budget = resolveBudget(options);
  const maxMetaChars = Math.min(budget.maxMetaChars, Math.floor(budget.maxResponseChars / 2));
  const limit = typeof budget.maxMessages === "number" && budget.maxMessages > 0
    ? Math.floor(budget.maxMessages)
    : undefined;

  const kept: { message: unknown; returnedChars: number; originalChars: number; projected: boolean }[] = [];
  let totalSeen = 0;
  let totalOriginalChars = 0;
  let keptChars = 0;
  let anyProjected = false;

  const evictOldest = () => {
    const evicted = kept.shift();
    if (evicted) keptChars -= evicted.returnedChars + 1;
  };

  return {
    addMessage(message: unknown) {
      totalSeen += 1;
      const projectedMessage = projectDialogMessage(message, budget);
      totalOriginalChars += projectedMessage.originalChars + 1;
      kept.push({
        message: projectedMessage.message,
        returnedChars: projectedMessage.returnedChars,
        originalChars: projectedMessage.originalChars,
        projected: projectedMessage.projected,
      });
      keptChars += projectedMessage.returnedChars + 1;
      anyProjected = anyProjected || projectedMessage.projected;
      // 消息数上限（limit 语义：保留最新 N 条）。
      while (limit !== undefined && kept.length > limit) evictOldest();
      // 字符预算上限：超限从旧的一侧驱逐；仅剩一条时 stub 化，绝不越预算。
      const messagesBudget = budget.maxResponseChars - Math.floor(budget.maxResponseChars / 4);
      while (keptChars > messagesBudget && kept.length > 1) evictOldest();
      if (keptChars > messagesBudget && kept.length === 1) {
        const only = kept[0];
        const stubSource = only.message && typeof only.message === "object"
          ? (only.message as Record<string, any>)
          : { value: only.message };
        const stub = buildEnvelopeStub(stubSource, only.originalChars);
        const stubChars = estimateJsonChars(stub);
        if (stubChars < only.returnedChars) {
          keptChars -= only.returnedChars;
          kept[0] = { message: stub, returnedChars: stubChars, originalChars: only.originalChars, projected: true };
          keptChars += stubChars;
          anyProjected = true;
        }
      }
    },
    finish(meta: unknown): ProjectedDialogRead {
      const metaProjection = projectMeta(meta, maxMetaChars);
      const estimatedOriginalChars = metaProjection.originalChars + totalOriginalChars;
      const keptProjected = anyProjected || kept.some((entry) => entry.projected);
      const truncated =
        metaProjection.truncated || keptProjected || totalSeen > kept.length;
      const estimatedReturnedChars =
        metaProjection.returnedChars + keptChars + 64;
      let stats = buildStats({
        truncated,
        total: totalSeen,
        returned: kept.length,
        estimatedOriginalChars,
        estimatedReturnedChars,
      });
      let result = { meta: metaProjection.meta, messages: kept.map((e) => e.message), stats };
      let guard = HARD_CAP_MAX_ITERATIONS;
      while (JSON.stringify(result).length > budget.maxResponseChars && kept.length > 0 && guard-- > 0) {
        const evicted = kept.shift();
        if (evicted) keptChars -= evicted.returnedChars + 1;
        stats = buildStats({
          truncated: true,
          total: totalSeen,
          returned: kept.length,
          estimatedOriginalChars,
          estimatedReturnedChars: metaProjection.returnedChars + keptChars + 64,
        });
          result = { meta: metaProjection.meta, messages: kept.map((e) => e.message), stats };
      }
      if (JSON.stringify(result).length > budget.maxResponseChars) {
        result = {
          meta: metaProjection.truncated
            ? metaProjection.meta
            : { projectionTruncated: true, estimatedOriginalChars: metaProjection.originalChars },
          messages: [],
          stats: { ...stats, continuation: "", messagesReturned: 0 },
        };
        if (JSON.stringify(result).length > budget.maxResponseChars) {
          result = {
            meta: { projectionTruncated: true },
            messages: [],
            stats: { ...stats, continuation: "", messagesReturned: 0 },
          };
        }
      }
      return result;
    },
  };
}

/**
 * 小型摘要字段（summary.lastAssistantMessage.contentHead 等）的统一裁剪口径。
 */
export function boundSummaryText(text: string, maxChars = 200): string {
  return truncateHead(text, maxChars);
}

/**
 * 「从新到旧」数据源专用的流式投影器：直接在底层 LevelDB iterator 上
 * 按 newest-first 顺序驱动，fill-until-budget，达到 limit/预算即停
 * （addMessage 返回 false，调用方立即 break），不为精确 total 继续扫描。
 * 输出消息为升序（旧→新），与 seam 输出契约一致。
 */
export interface NewestFirstStreamingProjector {
  /** false = 预算/条数已满，调用方必须停止迭代；此后 totalKnown=false。 */
  addMessage(message: unknown): boolean;
  /** totalKnown=false 时 messagesTotal 为已扫描下界（atLeast）。 */
  finish(meta: unknown, args?: { totalKnown?: boolean }): ProjectedDialogRead;
  /** 已保留条数（供调用方在 limit 维度提前止损）。 */
  readonly keptCount: number;
}

export function createNewestFirstStreamingProjector(
  options?: DialogReadBudgetOptions,
): NewestFirstStreamingProjector {
  const budget = resolveBudget(options);
  const maxMetaChars = Math.min(budget.maxMetaChars, Math.floor(budget.maxResponseChars / 2));
  const limit = typeof budget.maxMessages === "number" && budget.maxMessages > 0
    ? Math.floor(budget.maxMessages)
    : undefined;
  const messagesBudget = Math.max(
    budget.maxResponseChars - Math.floor(budget.maxResponseChars / 4),
    128,
  );

  // 保留顺序 newest-first；finish 时反转为升序输出。
  const kept: { message: unknown; returnedChars: number; originalChars: number; projected: boolean }[] = [];
  let keptChars = 0;
  let scanned = 0;
  let estimatedOriginalChars = 0;
  let anyProjected = false;
  let stoppedEarly = false;

  return {
    get keptCount() {
      return kept.length;
    },
    addMessage(message: unknown): boolean {
      if (stoppedEarly) return false;
      if (limit !== undefined && kept.length >= limit) {
        stoppedEarly = true;
        return false;
      }
      scanned += 1;
      estimatedOriginalChars += estimateJsonChars(message) + 1;
      const projectedMessage = projectDialogMessage(message, budget);
      if (keptChars + projectedMessage.returnedChars + 1 > messagesBudget) {
        // 该消息（更新）已放不下；其后的消息只会更旧，直接停止。
        // 它仍计入已扫描原始大小；不能回退该统计。
        stoppedEarly = true;
        return false;
      }
      kept.push({
        message: projectedMessage.message,
        returnedChars: projectedMessage.returnedChars,
        originalChars: projectedMessage.originalChars,
        projected: projectedMessage.projected,
      });
      keptChars += projectedMessage.returnedChars + 1;
      anyProjected = anyProjected || projectedMessage.projected;
      return true;
    },
    finish(meta: unknown, args?: { totalKnown?: boolean }): ProjectedDialogRead {
      const totalKnown = args?.totalKnown ?? true;
      const metaProjection = projectMeta(meta, maxMetaChars);
      estimatedOriginalChars += metaProjection.originalChars;
      const estimatedReturnedChars = metaProjection.returnedChars + keptChars + 64;
      const truncated =
        metaProjection.truncated || anyProjected || stoppedEarly || !totalKnown;
      kept.reverse();
      let stats = buildStats({
        truncated,
        total: totalKnown ? scanned : scanned,
        totalKnown,
        returned: kept.length,
        estimatedOriginalChars,
        estimatedReturnedChars,
      });
      if (!totalKnown) stats = { ...stats, estimatedOriginalCharsIsLowerBound: true };
      let result = { meta: metaProjection.meta, messages: kept.map((e) => e.message), stats };
      let guard = HARD_CAP_MAX_ITERATIONS;
      while (JSON.stringify(result).length > budget.maxResponseChars && kept.length > 0 && guard-- > 0) {
        // 最旧的一侧在数组头部（已反转）。
        const evicted = kept.shift();
        if (evicted) keptChars -= evicted.returnedChars + 1;
        stats = buildStats({
          truncated: true,
          total: scanned,
          totalKnown,
          returned: kept.length,
          estimatedOriginalChars,
          estimatedReturnedChars: metaProjection.returnedChars + keptChars + 64,
        });
        if (!totalKnown) stats = { ...stats, estimatedOriginalCharsIsLowerBound: true };
        result = { meta: metaProjection.meta, messages: kept.map((e) => e.message), stats };
      }
      if (JSON.stringify(result).length > budget.maxResponseChars) {
        result = {
          meta: metaProjection.truncated
            ? metaProjection.meta
            : { projectionTruncated: true, estimatedOriginalChars: metaProjection.originalChars },
          messages: [],
          stats: { ...stats, continuation: "", messagesReturned: 0 },
        };
        if (JSON.stringify(result).length > budget.maxResponseChars) {
          result = {
            meta: { projectionTruncated: true },
            messages: [],
            stats: { ...stats, continuation: "", messagesReturned: 0 },
          };
        }
      }
      return result;
    },
  };
}

export interface DialogReadEnvelopeResult {
  /** 有界且结构合法的最终 envelope（与 serialized 完全一致）。 */
  envelope: Record<string, unknown>;
  /** JSON.stringify(envelope)，由 builder 自证 serialized.length <= maxResponseChars。 */
  serialized: string;
  maxResponseChars: number;
  withinBudget: boolean;
}

/**
 * 共享最终 envelope builder/serializer：唯一拥有 maxResponseChars。
 * 统一覆盖 meta / messages / stats / summary（toolsUsed、toolSummary、
 * writtenFiles、toolErrors、lastAssistant 小摘要等派生字段）/ 调用方信封字段
 * 及 JSON 格式开销；总量硬顶按实际序列化结果自证收敛。
 * Agent bridge / server-side / Web readDialog 全部经由它出 final JSON，
 * 禁止调用方各自拼 envelope 后再猜预算。
 *
 * stats 传入时视为「上游 seam/数据源已完成消息级投影」，builder 只做
 * meta 投影 + 总量收敛（含 stats 缺失时的内部完整投影兜底路径）。
 */
export function buildDialogReadEnvelope(args: {
  meta?: unknown;
  messages?: unknown;
  stats?: DialogReadProjectionStats;
  envelope?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  options?: DialogReadBudgetOptions;
}): DialogReadEnvelopeResult {
  const budget = resolveBudget(args.options);

  let meta: unknown;
  let messages: unknown[];
  let stats: DialogReadProjectionStats;
  if (args.stats) {
    meta = projectDialogMetaForAgent(args.meta, args.options).meta;
    messages = Array.isArray(args.messages) ? (args.messages as unknown[]) : [];
    stats = { ...args.stats };
  } else {
    const projected = projectDialogReadForAgent({
      meta: args.meta,
      messages: args.messages,
      options: args.options,
    });
    meta = projected.meta;
    messages = projected.messages;
    stats = projected.stats;
  }

  let extras: Record<string, unknown> = { ...(args.envelope ?? {}) };
  let summary: Record<string, unknown> = { ...(args.summary ?? {}) };
  let summaryDropped = false;
  let hintDropped = false;
  let metaStubbed = false;
  let extrasDropped = false;

  const assemble = (): Record<string, unknown> => {
    stats = { ...stats, messagesReturned: messages.length };
    if (Object.prototype.hasOwnProperty.call(extras, "messagesCount")) {
      extras = { ...extras, messagesCount: messages.length };
    }
    const env: Record<string, unknown> = { ...extras, ...stats, meta, messages };
    if (Object.keys(summary).length > 0) env.summary = summary;
    return env;
  };

  let envelope = assemble();
  let serialized = JSON.stringify(envelope);
  // 降级阶梯（语义价值从低到高丢弃）：summary → continuation hint →
  // 驱逐最旧消息 → meta stub → 信封字段剥离 → 极简形态。
  for (;;) {
    if (serialized.length <= budget.maxResponseChars) break;
    if (!summaryDropped && Object.keys(summary).length > 0) {
      summary = {};
      summaryDropped = true;
    } else if (!hintDropped && stats.continuation) {
      stats = { ...stats, continuation: "" };
      hintDropped = true;
    } else if (messages.length > 0) {
      messages = messages.slice(1);
      stats = { ...stats, messagesReturned: messages.length, truncated: true };
    } else if (!metaStubbed) {
      meta = { projectionTruncated: true };
      metaStubbed = true;
    } else if (!extrasDropped) {
      extrasDropped = true;
      const minimalExtras: Record<string, unknown> = {};
      for (const key of ["source", "dialogId", "dialogKey"] as const) {
        if (extras[key] !== undefined) minimalExtras[key] = extras[key];
      }
      extras = minimalExtras;
    } else {
      envelope = { projectionTruncated: true, messages: [] };
      serialized = JSON.stringify(envelope);
      break;
    }
    envelope = assemble();
    serialized = JSON.stringify(envelope);
  }

  return {
    envelope,
    serialized,
    maxResponseChars: budget.maxResponseChars,
    withinBudget: serialized.length <= budget.maxResponseChars,
  };
}

/**
 * CLI bridge 的 stdout 硬顶：流式读取并在超过 maxChars 后取消读取端，
 * 保证父进程内存有界（子进程写入会在管道关闭后收到 EPIPE 退出）。
 * 禁止 bridge 先收全量 stdout 再截。
 */
export const BRIDGE_STREAM_MAX_CHARS = 262_144;

export async function readTextStreamUpToChars(
  stream: ReadableStream<Uint8Array> | null,
  maxChars: number,
): Promise<{ text: string; truncated: boolean }> {
  if (!stream) return { text: "", truncated: false };
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) text += decoder.decode(value, { stream: true });
    if (text.length >= maxChars) {
      truncated = true;
      try {
        await reader.cancel();
      } catch {
        // cancel 失败不影响结果：剩余数据被丢弃即可。
      }
      break;
    }
  }
  text += decoder.decode();
  if (truncated) {
    text += `\n\n[bridged output truncated at ${maxChars} chars; narrow the request or use readDialog mode="status"]`;
  }
  return { text, truncated };
}
