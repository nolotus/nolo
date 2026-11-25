/**
 * 结构化对话级回溯（`nolo dialog trace`）的**纯聚合**模块。
 *
 * 为什么需要：一次对话的真实成本分布在三个真源里，逐个翻很贵——
 * 1. dialog 存储里的消息（谁问的、几次工具调用、什么时候）；
 * 2. 逐次 LLM 调用的 token 明细（LevelDB token 记录 / 远端 usage records，
 *    与 `nolo dialog usage` 同源同口径）；
 * 3. `~/.nolo/runs/*.json` 里的子 Agent run（哪个档位、哪个凭证组、花了多少
 *    token、是否 escalated）。
 *
 * 本模块只做「读进来 → 结构化出去」，**不碰存储层、不写库、不改路由**：
 * 输入全部由调用方注入（消息数组、token 记录、run 记录），因此可以完全用
 * 纯函数单测覆盖。缺失数据的处理原则是「不伪造」：任何拿不到的来源都写进
 * `dataNotes`，绝不用 0 冒充实测值。
 */
import { extractCustomId } from "core/prefix";
import { parseDialogKey } from "database/dialogKey";
import { scrubSecrets } from "../agent-runtime/secretScrubber";
import { sanitizeToolOutputText } from "../agent-runtime/toolOutputSanitizer";
import { resolveModelTier } from "../ai/agent/dispatchSelectionPolicy";

/** 报告格式版本：字段增删都靠它区分，消费方（jq / Agent）据此兼容。 */
export const DIALOG_TRACE_SCHEMA_VERSION = 1;

/** timeline 单条摘要的硬上限（字符）：trace 是观测视图，不是对话备份。 */
export const DIALOG_TRACE_SUMMARY_MAX_CHARS = 120;

export type DialogTraceUsage = {
  inputTokens: number;
  cachedTokens: number;
  uncachedInputTokens: number;
  outputTokens: number;
  cacheHitRatio: number | null;
};

export type DialogTraceModelBucket = {
  model: string;
  modelTier: string;
  llmCalls: number;
  inputTokens: number;
  cachedTokens: number;
  uncachedInputTokens: number;
  outputTokens: number;
  cacheHitRatio: number | null;
};

export type DialogTraceSubagent = {
  runId: string;
  title?: string;
  agentKey?: string;
  agentName?: string;
  model?: string;
  modelTier: string;
  credentialGroup?: string;
  difficulty?: string;
  batchId?: string;
  continuedFrom?: string;
  childDialogId?: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  llmCalls?: number;
  toolCalls?: number;
  fileEdits?: number;
  inputTokens?: number;
  cachedTokens?: number;
  uncachedInputTokens?: number;
  outputTokens?: number;
  cacheHitRatio?: number | null;
  escalated?: boolean;
  reviewVerdict?: string;
  failureClass?: string;
  credits?: number;
};

export type DialogTraceTimelineKind =
  | "user"
  | "assistant"
  | "subagent_start"
  | "subagent_end";

export type DialogTraceTimelineEntry = {
  at?: string;
  kind: DialogTraceTimelineKind;
  summary: string;
  runId?: string;
  model?: string;
  toolNames?: string[];
  tokens?: { input?: number; cached?: number; output?: number };
};

export type DialogTraceReport = {
  schemaVersion: number;
  dialogKey: string;
  dialogId: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  root: {
    userMessages: number;
    assistantMessages: number;
    toolCallsTotal: number;
    toolCallsByName: Record<string, number>;
    llmCalls: number;
    usage: DialogTraceUsage;
    byModel: DialogTraceModelBucket[];
  };
  subagents: DialogTraceSubagent[];
  totals: {
    combinedInputTokens: number;
    combinedCachedTokens: number;
    combinedUncachedInputTokens: number;
    combinedOutputTokens: number;
    combinedCacheHitRatio: number | null;
    totalSubagentRuns: number;
    failedOrEscalatedRuns: number;
    byTier: Record<
      string,
      {
        runs: number;
        llmCalls: number;
        inputTokens: number;
        cachedTokens: number;
        uncachedInputTokens: number;
        outputTokens: number;
      }
    >;
    byCredentialGroup: Record<
      string,
      { runs: number; inputTokens: number; outputTokens: number }
    >;
    rootShare: {
      inputRatio: number | null;
      outputRatio: number | null;
      llmCallRatio: number | null;
    };
  };
  timeline: DialogTraceTimelineEntry[];
  /** 任何缺失/不可归因的数据来源都记在这里：0 不等于「实测为 0」。 */
  dataNotes: string[];
};

/**
 * run 记录的结构子集：真实调用方直接传 `RunRecord[]`（结构兼容），测试可以
 * 只给需要的字段。除 `runId` 外全部可选 —— 缺失即未知。
 */
export type DialogTraceRunLike = {
  runId: string;
  status?: string;
  parentDialogId?: string;
  dialogId?: string;
  agentKey?: string;
  /** 宿主注入的派发者身份（与 agentKey 同形：`agent-<userId>-<slug>`）。 */
  callerAgentKey?: string;
  /** 宿主派生身份范围：裸 parentDialogId 的归属证据（缺失 = 未知）。 */
  evidenceScope?: { userId: string; serverOrigin?: string };
  agentName?: string;
  title?: string;
  model?: string;
  modelTier?: string;
  selectionCheck?: { modelTier?: string; difficulty?: string };
  credentialGroup?: string;
  batchId?: string;
  continuedFrom?: string;
  startedAt?: string;
  endedAt?: string;
  escalated?: boolean;
  reviewVerdict?: string;
  failureClass?: string;
  credits?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheCachedTokens?: number | null;
  cacheHitRatio?: number | null;
  toolCallCount?: number;
  activity?: {
    counters?: { llmCalls?: number; toolCalls?: number; fileEdits?: number };
  };
};

export type BuildDialogTraceInput = {
  /** 完整 dialog key（`dialog-<user>-<id>`）或裸 id。 */
  dialogKey: string;
  /** 显式 dialog id；缺省从 dialogKey 推导。 */
  dialogId?: string;
  /** dialog 消息（原样透传，内部只做防御性读取）。 */
  messages?: readonly unknown[];
  /** 逐次 LLM 调用的 token 记录（与 `nolo dialog usage` 同源）。 */
  usageRecords?: readonly unknown[];
  /** `~/.nolo/runs` 的 run 记录（传全量，内部按 parentDialogId 过滤）。 */
  runs?: readonly DialogTraceRunLike[];
  /** 调用方已知的额外数据说明（例如远端用量不可达、已回退本地）。 */
  notes?: readonly string[];
};

const TOOL_CALL_PART_TYPES = new Set([
  "tool-call",
  "tool_call",
  "tool-call-request",
  "tool-call-response",
  "function_call",
]);

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const asCount = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : undefined;

/**
 * 时间戳归一：接受 ISO 字符串、毫秒或秒级 epoch 数字。
 * 数字小于 1e11 视为秒（1e11 ms ≈ 1973 年，早于本项目的任何记录），
 * 这样 LevelDB 里混着两种单位时也不会把 2026 年读成 1970 年。
 */
const asTimeIso = (value: unknown): string | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const ms = value < 1e11 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value.trim());
    return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
  }
  return undefined;
};

const round4 = (value: number): number => Math.round(value * 10000) / 10000;

/** 命中率：没有可用输入量时返回 null（未知），不返回 0 冒充「命中 0」。 */
const ratioOrNull = (inputTokens: number, cachedTokens: number): number | null =>
  inputTokens > 0 ? round4(cachedTokens / inputTokens) : null;

/**
 * 多行带引号密码赋值：`scrubSecrets` 的同行密码规则
 * 用 `[^\s'"]{4,}` 取值，只吃得到第一行，引号内的剩余行会原样漏出；而且它一旦
 * 先跑，`PASSWORD=` 后面就不再是引号，后续规则也接不上。所以整段遮除必须**在
 * `scrubSecrets` 与空白折叠之前**、对带换行的完整原文执行。
 *
 * 覆盖的形态（三条都靠引号内的 `\\[\s\S]` 分支与「闭合 or 串尾」分支）：
 * - 等号后换行：赋值符后允许跨行空白；
 * - 引号内转义与续行：`(?:\\[\s\S]|[^"\\])*` 不在转义处断开；
 * - 未闭合引号或截断在末尾孤立反斜杠：`(?:"|\\?$)` 保守遮盖到串尾。
 */
const MULTILINE_QUOTED_PASSWORD_RE =
  /\b((?:DB_|DATABASE_|ADMIN_|ROOT_|MYSQL_|POSTGRES_)?(?:PASSWORD|PASSWD|SECRET_KEY))\s*=\s*(?:"(?:\\[\s\S]|[^"\\])*(?:"|\\?$)|'(?:\\[\s\S]|[^'\\])*(?:'|\\?$))/gi;

/** 未闭合的 PEM 私钥块（输入被截断）：`scrubSecrets` 只匹配 BEGIN…END 成对形态。 */
const UNCLOSED_PEM_RE = /-----BEGIN (?:[A-Z0-9 ]+)?PRIVATE KEY-----[\s\S]*$/;

/** 保守遮盖「标准规则覆盖不到的跨行形态」（幂等、纯函数）。 */
const redactMultilineSecrets = (text: string): string =>
  text
    .replace(MULTILINE_QUOTED_PASSWORD_RE, "$1=[REDACTED:PASSWORD]")
    .replace(UNCLOSED_PEM_RE, "[REDACTED:PRIVATE_KEY]");

/**
 * trace 里任何要展示/序列化的文本都走这一条脱敏链（单一真值）：
 * 控制序列清洗 → 跨行形态遮盖 → 标准凭证清洗。**顺序不可交换**：
 * 抹完控制序列再抹跨行形态，最后才交给标准规则；反过来会让跨行残段漏网。
 */
export const scrubTextForTrace = (text: string): string =>
  scrubSecrets(redactMultilineSecrets(sanitizeToolOutputText(text))).cleaned;

/**
 * timeline 摘要脱敏 + 截断：trace 输出可能被贴进另一个 Agent 的上下文或日志，
 * 所以**先对完整多行原文脱敏**，再压成单行并截断到 120 字符。
 * 顺序不可交换：先折叠空白会把跨行密码/PEM 块切成「看起来正常」的碎片，
 * 让标准规则再也匹配不上，残段就随 `--json` 泄露出去。
 */
export const summarizeForTrace = (text: unknown): string => {
  const raw = typeof text === "string" ? text : "";
  const scrubbed = raw ? scrubTextForTrace(raw) : raw;
  const collapsed = scrubbed.replace(/\s+/g, " ").trim();
  if (!collapsed) return raw.trim() ? "(已脱敏)" : "(无文本)";
  if (collapsed.length <= DIALOG_TRACE_SUMMARY_MAX_CHARS) return collapsed;
  return `${collapsed.slice(0, DIALOG_TRACE_SUMMARY_MAX_CHARS - 1)}…`;
};

const textOfContent = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const part of content) {
    if (typeof part === "string") {
      parts.push(part);
      continue;
    }
    const record = asRecord(part);
    if (!record) continue;
    const text = asString(record.text) ?? asString(record.content);
    if (text) parts.push(text);
  }
  return parts.join(" ");
};

const toolCallNameOf = (value: unknown): string | undefined => {
  const record = asRecord(value);
  if (!record) return undefined;
  const fn = asRecord(record.function);
  return (
    asString(record.toolName) ??
    asString(record.name) ??
    asString(fn?.name) ??
    asString(record.tool)
  );
};

/** 从一条消息里读出工具名（容忍 content part / tool_calls 两种历史形态）。 */
const toolNamesOf = (message: Record<string, unknown>): string[] => {
  const names: string[] = [];
  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      const record = asRecord(part);
      if (!record) continue;
      const type = asString(record.type)?.toLowerCase();
      if (!type || !TOOL_CALL_PART_TYPES.has(type)) continue;
      const name = toolCallNameOf(record);
      if (name) names.push(name);
    }
  }
  for (const key of ["tool_calls", "toolCalls"] as const) {
    const list = message[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const name = toolCallNameOf(item);
      if (name) names.push(name);
    }
  }
  return names;
};

const roleOf = (message: Record<string, unknown>): string => {
  const raw =
    asString(message.role) ??
    asString(message.authorRole) ??
    asString(asRecord(message.author)?.role) ??
    "";
  return raw.toLowerCase();
};

const messageTimeOf = (message: Record<string, unknown>): string | undefined =>
  asTimeIso(message.createdAt) ??
  asTimeIso(message.timestamp) ??
  asTimeIso(message.at) ??
  asTimeIso(message.time);

type UsageAggregate = {
  llmCalls: number;
  inputTokens: number;
  cachedTokens: number;
  /**
   * 只累加「同一条记录里 input 与 cached 同时已知」的 `max(0, input - cached)`。
   * 未知缓存**不**当成 100% 未命中 —— 与子 run 的 `uncachedInputTokens`
   * （同样要求两者都已知）保持同一口径，任务总计才不会虚高。
   */
  uncachedInputTokens: number;
  outputTokens: number;
  /** 缺 input 字段的记录数（>0 → input 只是已知部分之和）。 */
  inputUnknownRecords: number;
  /** 缺 cached 字段的记录数（>0 → 命中率整体未知）。 */
  cachedUnknownRecords: number;
  /** 缺 output 字段的记录数（>0 → output 只是已知部分之和）。 */
  outputUnknownRecords: number;
};

const emptyAggregate = (): UsageAggregate => ({
  llmCalls: 0,
  inputTokens: 0,
  cachedTokens: 0,
  uncachedInputTokens: 0,
  outputTokens: 0,
  inputUnknownRecords: 0,
  cachedUnknownRecords: 0,
  outputUnknownRecords: 0,
});

const readUsageRecordCached = (
  record: Record<string, unknown>,
): number | undefined =>
  asCount(record.cache_read_input_tokens) ??
  asCount(record.cached_tokens) ??
  asCount(record.prompt_cache_hit_tokens) ??
  asCount(asRecord(record.input_tokens_details)?.cached_tokens);

const usageRecordModelOf = (record: Record<string, unknown>): string =>
  asString(record.model) ?? asString(record.billing_model) ?? "(unknown)";

const aggregateUsageRecords = (records: readonly unknown[]): UsageAggregate => {
  const aggregate = emptyAggregate();
  for (const raw of records) {
    const record = asRecord(raw);
    if (!record) continue;
    aggregate.llmCalls += 1;
    const input = asCount(record.input_tokens) ?? asCount(record.prompt_tokens);
    if (input === undefined) aggregate.inputUnknownRecords += 1;
    else aggregate.inputTokens += input;
    const cached = readUsageRecordCached(record);
    if (cached === undefined) aggregate.cachedUnknownRecords += 1;
    else aggregate.cachedTokens += cached;
    // 未命中量只在两者都已知时才有意义（未知缓存 ≠ 全未命中）。
    if (input !== undefined && cached !== undefined) {
      aggregate.uncachedInputTokens += Math.max(0, input - cached);
    }
    const output =
      asCount(record.output_tokens) ?? asCount(record.completion_tokens);
    if (output === undefined) aggregate.outputUnknownRecords += 1;
    else aggregate.outputTokens += output;
  }
  return aggregate;
};

/**
 * aggregate → 对外 usage。`cacheHitRatio` 的口径必须与 `totals.combinedCacheHitRatio`
 * **完全一致**：根端只要有任意一条记录缺 input 或缺 cached，分子/分母就只是「已知
 * 部分之和」，此时一律返回 null（未知），绝不拿部分覆盖算出一个看起来完整的比率。
 */
const toTraceUsage = (aggregate: UsageAggregate): DialogTraceUsage => ({
  inputTokens: aggregate.inputTokens,
  cachedTokens: aggregate.cachedTokens,
  uncachedInputTokens: aggregate.uncachedInputTokens,
  outputTokens: aggregate.outputTokens,
  cacheHitRatio:
    aggregate.inputUnknownRecords === 0 &&
    aggregate.cachedUnknownRecords === 0 &&
    aggregate.inputTokens > 0
      ? round4(aggregate.cachedTokens / aggregate.inputTokens)
      : null,
});

const pickEarliest = (
  values: ReadonlyArray<string | undefined>,
): string | undefined => {
  let best: string | undefined;
  let bestMs = Number.POSITIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (Number.isNaN(ms) || ms >= bestMs) continue;
    best = value;
    bestMs = ms;
  }
  return best;
};

const pickLatest = (
  values: ReadonlyArray<string | undefined>,
): string | undefined => {
  let best: string | undefined;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (Number.isNaN(ms) || ms <= bestMs) continue;
    best = value;
    bestMs = ms;
  }
  return best;
};

const durationBetween = (
  startedAt: string | undefined,
  endedAt: string | undefined,
): number | undefined => {
  if (!startedAt || !endedAt) return undefined;
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
  return Math.max(0, end - start);
};

const resolveRunTier = (run: DialogTraceRunLike): string => {
  const declared = run.modelTier ?? run.selectionCheck?.modelTier;
  if (declared && declared !== "unknown") return declared;
  const derived = resolveModelTier(run.model);
  if (derived !== "unknown") return derived;
  return declared ?? "unknown";
};

/** 运行终态里算「失败或已升级」的那些状态（cancelled 不算失败，只算停手）。 */
const FAILED_RUN_STATUSES = new Set(["failed", "killed", "stalled", "error"]);

/**
 * 从全部 run 记录里挑出属于该 dialog 的子 run：
 * 1. `parentDialogId` **精确命中**该对话（完整 `dialog-<userId>-<id>`，或裸 id
 *    且能证明同一 owner）——主路径；
 * 2. `continuedFrom` 指向已收入的 run（复审 / continue 产生的串）；
 * 3. 与已收入的 run 同 `batchId`（同一批扇出里的其余成员）。
 *
 * 归属纪律（绝不跨 owner / 跨对话拉人）：`batchId` 是派发批次的标识，不是归属
 * 证明——别的对话（甚至别的用户）的 run 完全可能共用同一个 batchId。因此在直接
 * 匹配与链式补充**之前**，先统一过滤掉「可信归属冲突」的 run：
 * - `evidenceScope?.userId`（宿主派生的身份范围，**唯一权威**）存在且 !== 目标
 *   对话 owner。
 * 不从 `callerAgentKey` 反推 owner：`agent-<userId>-<slug>` 的 userId 可含 `-`，
 * 前缀无法区分 `user` 与 `user-team`，前缀推断会跨 owner 拉人。
 * 链式补充**绝不能覆盖**这个冲突结论。裸 `parentDialogId`（只有 `<id>`）也必须
 * 有精确命中目标 owner 的 `evidenceScope.userId` 才纳入；缺失（或指向他人）一律
 * 跳过并在 dataNotes 说明。
 * 注意 `run.agentKey` 是**被派发的子 Agent** 自己的 key，不是父对话 owner，
 * 不能用来推断归属（用它推断等于把「谁执行的」当成「谁发起的」）。
 */
const selectSubagentRuns = (
  runs: readonly DialogTraceRunLike[],
  dialogKey: string,
  dialogId: string,
): {
  runs: DialogTraceRunLike[];
  chainedWithoutDirectParent: number;
  unattributedBareParentRuns: number;
  conflictingAttributionRuns: number;
} => {
  const targetKey = dialogKey.trim();
  const targetId = dialogId.trim();
  const targetUserId = parseDialogKey(targetKey)?.userId?.trim() || undefined;

  /**
   * 可信归属冲突：**只认**宿主派生的 `evidenceScope.userId` 做精确比较。
   * 绝不从 `callerAgentKey` 前缀反推 owner：私有 key 形如 `agent-<userId>-<slug>`，
   * 而 userId 自身可能含 `-`（如 `user` 与 `user-team`），`startsWith("agent-user-")`
   * 会把 `agent-user-team-main` 误判成 `user` 名下的派发者。
   */
  const conflictsTargetOwner = (run: DialogTraceRunLike): boolean => {
    if (!targetUserId) return false;
    const scopeUserId = asString(run.evidenceScope?.userId);
    return Boolean(scopeUserId && scopeUserId !== targetUserId);
  };

  /**
   * 裸 parentDialogId 的归属证据：只认精确命中目标 owner 的
   * `evidenceScope.userId`（=== 即归属证据，!== 即冲突，缺失即无法验证）。
   */
  const belongsToTargetUser = (run: DialogTraceRunLike): boolean => {
    if (!targetUserId) return false;
    return asString(run.evidenceScope?.userId) === targetUserId;
  };

  const included = new Map<string, DialogTraceRunLike>();
  let direct = 0;
  let unattributedBareParentRuns = 0;
  let conflictingAttributionRuns = 0;
  for (const run of runs) {
    if (!run?.runId) continue;
    // 归属冲突先行判决（先于 parentDialogId 匹配与任何链式补充）：
    // 跨用户冲突的 run 即使共享 batchId、或碰巧裸 ID 同名，也不得纳入。
    if (conflictsTargetOwner(run)) {
      conflictingAttributionRuns += 1;
      continue;
    }
    const parent = asString(run.parentDialogId);
    if (!parent) continue;
    if (parent === targetKey) {
      included.set(run.runId, run);
      direct += 1;
      continue;
    }
    if (parent !== targetId) continue;
    // 裸 dialog id：只有能证明同一 owner 才敢归入（否则可能是别的用户的同名对话）
    if (belongsToTargetUser(run)) {
      included.set(run.runId, run);
      direct += 1;
    } else {
      unattributedBareParentRuns += 1;
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    const batchIds = new Set(
      [...included.values()]
        .map((run) => run.batchId)
        .filter((value): value is string => Boolean(value)),
    );
    for (const run of runs) {
      if (!run?.runId || included.has(run.runId)) continue;
      // 归属冲突守卫（跨用户 → 一律排除，先于任何链式理由）。
      if (conflictsTargetOwner(run)) continue;
      // 冲突守卫：自带 parentDialogId 且不是该对话的完整 key → 一律排除，
      // 绝不因 batchId / continuedFrom 被“顺带”拉进来。
      const parent = asString(run.parentDialogId);
      if (parent && parent !== targetKey) continue;
      const continuedFromIncluded = run.continuedFrom
        ? included.has(run.continuedFrom)
        : false;
      const sameBatch = Boolean(run.batchId) && batchIds.has(run.batchId!);
      if (!continuedFromIncluded && !sameBatch) continue;
      included.set(run.runId, run);
      changed = true;
    }
  }
  const selected = [...included.values()].sort((a, b) => {
    const aMs = a.startedAt ? Date.parse(a.startedAt) : Number.POSITIVE_INFINITY;
    const bMs = b.startedAt ? Date.parse(b.startedAt) : Number.POSITIVE_INFINITY;
    return (Number.isNaN(aMs) ? Number.POSITIVE_INFINITY : aMs) -
      (Number.isNaN(bMs) ? Number.POSITIVE_INFINITY : bMs);
  });
  return {
    runs: selected,
    chainedWithoutDirectParent: Math.max(0, selected.length - direct),
    unattributedBareParentRuns,
    conflictingAttributionRuns,
  };
};

const toSubagent = (run: DialogTraceRunLike): DialogTraceSubagent => {
  const inputTokens = asCount(run.inputTokens);
  const outputTokens = asCount(run.outputTokens);
  const cachedTokens = asCount(run.cacheCachedTokens ?? undefined);
  // 标题来自派发方（任务主题/用户输入），同样可能夹带凭据：与 timeline 摘要
  // 走同一条脱敏链，绝不因为「只是个标题」就原样进 --json。
  const rawTitle = asString(run.title);
  const title = rawTitle ? scrubTextForTrace(rawTitle).trim() : "";
  const llmCalls = asCount(run.activity?.counters?.llmCalls);
  const toolCalls =
    asCount(run.activity?.counters?.toolCalls) ?? asCount(run.toolCallCount);
  const fileEdits = asCount(run.activity?.counters?.fileEdits);
  const startedAt = asTimeIso(run.startedAt);
  const endedAt = asTimeIso(run.endedAt);
  const derivedRatio =
    inputTokens !== undefined && cachedTokens !== undefined
      ? ratioOrNull(inputTokens, cachedTokens)
      : null;
  return {
    runId: run.runId,
    ...(title ? { title } : {}),
    ...(asString(run.agentKey) ? { agentKey: run.agentKey!.trim() } : {}),
    ...(asString(run.agentName) ? { agentName: run.agentName!.trim() } : {}),
    ...(asString(run.model) ? { model: run.model!.trim() } : {}),
    modelTier: resolveRunTier(run),
    ...(asString(run.credentialGroup)
      ? { credentialGroup: run.credentialGroup!.trim() }
      : {}),
    ...(asString(run.selectionCheck?.difficulty)
      ? { difficulty: run.selectionCheck!.difficulty!.trim() }
      : {}),
    ...(asString(run.batchId) ? { batchId: run.batchId!.trim() } : {}),
    ...(asString(run.continuedFrom)
      ? { continuedFrom: run.continuedFrom!.trim() }
      : {}),
    ...(asString(run.dialogId) ? { childDialogId: run.dialogId!.trim() } : {}),
    status: asString(run.status) ?? "unknown",
    ...(startedAt ? { startedAt } : {}),
    ...(endedAt ? { endedAt } : {}),
    ...(durationBetween(startedAt, endedAt) !== undefined
      ? { durationMs: durationBetween(startedAt, endedAt)! }
      : {}),
    ...(llmCalls !== undefined ? { llmCalls } : {}),
    ...(toolCalls !== undefined ? { toolCalls } : {}),
    ...(fileEdits !== undefined ? { fileEdits } : {}),
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(cachedTokens !== undefined ? { cachedTokens } : {}),
    ...(inputTokens !== undefined && cachedTokens !== undefined
      ? { uncachedInputTokens: Math.max(0, inputTokens - cachedTokens) }
      : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(typeof run.cacheHitRatio === "number" || run.cacheHitRatio === null
      ? { cacheHitRatio: run.cacheHitRatio }
      : cachedTokens !== undefined
        ? { cacheHitRatio: derivedRatio }
        : {}),
    ...(run.escalated === true ? { escalated: true } : {}),
    ...(asString(run.reviewVerdict) ? { reviewVerdict: run.reviewVerdict!.trim() } : {}),
    ...(asString(run.failureClass) ? { failureClass: run.failureClass!.trim() } : {}),
    ...(typeof run.credits === "number" && Number.isFinite(run.credits)
      ? { credits: run.credits }
      : {}),
  };
};

/**
 * dialog key → 裸 dialog id：与 `dialog read/status` 同一条身份解析
 * （`parseDialogKey`，唯一真值），解析不了时退回 `extractCustomId`。
 */
const resolveDialogIdFromKey = (dialogKey: string): string =>
  parseDialogKey(dialogKey)?.dialogId ??
  (dialogKey.startsWith("dialog-") ? extractCustomId(dialogKey) : dialogKey);

/**
 * 端到端纯聚合：消息 + token 明细 + run 记录 → `DialogTraceReport`。
 * 无 I/O、无全局状态；缺失数据只进 `dataNotes`，不编数字。
 */
export function buildDialogTraceReport(
  input: BuildDialogTraceInput,
): DialogTraceReport {
  const dialogKey = input.dialogKey?.trim() ?? "";
  const dialogId = (input.dialogId?.trim() || resolveDialogIdFromKey(dialogKey)).trim();
  const messages = input.messages ?? [];
  const usageRecords = input.usageRecords ?? [];
  const dataNotes: string[] = [...(input.notes ?? [])];

  // ---- root：消息统计 + 工具调用 ----
  let userMessages = 0;
  let assistantMessages = 0;
  // 工具调用有两个可能的记录形态：独立的 `role:"tool"` 结果消息（本仓库
  // dialog 记录的实际形态，带 toolName），或 assistant 消息里的 tool-call
  // 部件 / tool_calls 数组。两者通常只有一个存在；都在时以 tool 结果消息为准
  // （一次执行一条，最接近「实际调用次数」）。
  const toolMessageCounts: Record<string, number> = {};
  const assistantPartCounts: Record<string, number> = {};
  const messageTimes: Array<string | undefined> = [];
  const timeline: DialogTraceTimelineEntry[] = [];

  for (const raw of messages) {
    const message = asRecord(raw);
    if (!message) continue;
    const role = roleOf(message);
    const at = messageTimeOf(message);
    messageTimes.push(at);
    const callNames = toolNamesOf(message);
    for (const name of callNames) {
      assistantPartCounts[name] = (assistantPartCounts[name] ?? 0) + 1;
    }
    if (role === "tool") {
      const toolName = asString(message.toolName) ?? asString(message.name);
      if (toolName) {
        toolMessageCounts[toolName] = (toolMessageCounts[toolName] ?? 0) + 1;
      }
    }
    if (role === "user") {
      userMessages += 1;
      timeline.push({
        ...(at ? { at } : {}),
        kind: "user",
        summary: summarizeForTrace(textOfContent(message.content) || message.text),
      });
      continue;
    }
    if (role === "assistant") {
      assistantMessages += 1;
      timeline.push({
        ...(at ? { at } : {}),
        kind: "assistant",
        summary: summarizeForTrace(
          textOfContent(message.content) || message.text,
        ),
        ...(callNames.length > 0 ? { toolNames: [...new Set(callNames)] } : {}),
      });
    }
  }

  const useToolMessages = Object.keys(toolMessageCounts).length > 0;
  const toolCallsByName: Record<string, number> = useToolMessages
    ? toolMessageCounts
    : assistantPartCounts;
  let toolCallsTotal = 0;
  for (const count of Object.values(toolCallsByName)) toolCallsTotal += count;
  const usedAssistantPartFallback =
    !useToolMessages && Object.keys(assistantPartCounts).length > 0;

  // ---- root：逐次调用 token 明细（按 model 分组）----
  const rootAggregate = aggregateUsageRecords(usageRecords);
  const usageByModel = new Map<string, UsageAggregate>();
  const usageRecordTimes: Array<string | undefined> = [];
  for (const raw of usageRecords) {
    const record = asRecord(raw);
    if (!record) continue;
    usageRecordTimes.push(
      asTimeIso(record.createdAt) ?? asTimeIso(record.timestamp),
    );
    const model = usageRecordModelOf(record);
    const bucket = usageByModel.get(model) ?? emptyAggregate();
    const single = aggregateUsageRecords([record]);
    bucket.llmCalls += single.llmCalls;
    bucket.inputTokens += single.inputTokens;
    bucket.cachedTokens += single.cachedTokens;
    bucket.uncachedInputTokens += single.uncachedInputTokens;
    bucket.outputTokens += single.outputTokens;
    bucket.inputUnknownRecords += single.inputUnknownRecords;
    bucket.cachedUnknownRecords += single.cachedUnknownRecords;
    bucket.outputUnknownRecords += single.outputUnknownRecords;
    usageByModel.set(model, bucket);
  }
  const byModel: DialogTraceModelBucket[] = [...usageByModel.entries()]
    .map(([model, aggregate]) => ({
      model,
      modelTier: resolveModelTier(model),
      llmCalls: aggregate.llmCalls,
      ...toTraceUsage(aggregate),
    }))
    .sort((a, b) => b.inputTokens - a.inputTokens || b.llmCalls - a.llmCalls);

  // ---- 子 Agent runs ----
  const selection = selectSubagentRuns(input.runs ?? [], dialogKey, dialogId);
  const subagents = selection.runs.map(toSubagent);

  // ---- 时间边界 ----
  const runStarts = selection.runs.map((run) => asTimeIso(run.startedAt));
  const runEnds = selection.runs.map((run) => asTimeIso(run.endedAt));
  const startedAt = pickEarliest([
    ...messageTimes,
    ...usageRecordTimes,
    ...runStarts,
  ]);
  const endedAt = pickLatest([
    ...messageTimes,
    ...usageRecordTimes,
    ...runEnds,
    ...runStarts,
  ]);
  const durationMs = durationBetween(startedAt, endedAt);
  const messageTimestampsMissing =
    messages.length > 0 && messageTimes.every((value) => !value);

  // ---- 子 run 的起止事件进 timeline ----
  for (const subagent of subagents) {
    const tokens =
      subagent.inputTokens !== undefined ||
      subagent.cachedTokens !== undefined ||
      subagent.outputTokens !== undefined
        ? {
            ...(subagent.inputTokens !== undefined
              ? { input: subagent.inputTokens }
              : {}),
            ...(subagent.cachedTokens !== undefined
              ? { cached: subagent.cachedTokens }
              : {}),
            ...(subagent.outputTokens !== undefined
              ? { output: subagent.outputTokens }
              : {}),
          }
        : undefined;
    timeline.push({
      ...(subagent.startedAt ? { at: subagent.startedAt } : {}),
      kind: "subagent_start",
      summary: summarizeForTrace(
        `派发 ${subagent.agentName ?? subagent.agentKey ?? subagent.runId}` +
          `${subagent.model ? ` · ${subagent.model}` : ""}` +
          `${subagent.title ? ` — ${subagent.title}` : ""}`,
      ),
      runId: subagent.runId,
      ...(subagent.model ? { model: subagent.model } : {}),
      ...(tokens ? { tokens } : {}),
    });
    timeline.push({
      ...(subagent.endedAt ? { at: subagent.endedAt } : {}),
      kind: "subagent_end",
      summary: summarizeForTrace(
        `${subagent.runId} ${subagent.status}` +
          `${subagent.reviewVerdict ? ` · ${subagent.reviewVerdict}` : ""}` +
          `${subagent.failureClass ? ` · ${subagent.failureClass}` : ""}`,
      ),
      runId: subagent.runId,
      ...(subagent.model ? { model: subagent.model } : {}),
    });
  }
  const timeValue = (at?: string): number =>
    at ? Date.parse(at) : Number.POSITIVE_INFINITY;
  timeline.sort((a, b) => {
    const aMs = timeValue(a.at);
    const bMs = timeValue(b.at);
    const aSafe = Number.isNaN(aMs) ? Number.POSITIVE_INFINITY : aMs;
    const bSafe = Number.isNaN(bMs) ? Number.POSITIVE_INFINITY : bMs;
    return aSafe - bSafe;
  });

  // ---- totals ----
  let combinedInputTokens = rootAggregate.inputTokens;
  let combinedCachedTokens = rootAggregate.cachedTokens;
  // 未命中量与 byTier / 子 run 同一口径：只累加「input 与 cached 同时已知」的
  // 差值，未知缓存绝不按 100% 未命中计（否则 combined 会虚高）。
  let combinedUncachedInputTokens = rootAggregate.uncachedInputTokens;
  let combinedOutputTokens = rootAggregate.outputTokens;
  let runInputMissing = 0;
  let runOutputMissing = 0;
  let runCachedMissing = 0;
  let runLlmCallsMissing = 0;
  // cached 已知但 input 未知的旧 run：把它们的 cached 加进去会让
  // cached > input（口径不一致的假数字），因此不计入合计，单独计数。
  let runCachedWithoutInput = 0;
  let unknownTierRuns = 0;
  const byTier: DialogTraceReport["totals"]["byTier"] = {};
  const byCredentialGroup: DialogTraceReport["totals"]["byCredentialGroup"] = {};
  let subagentLlmCalls = 0;
  let failedOrEscalatedRuns = 0;

  for (const subagent of subagents) {
    if (subagent.inputTokens === undefined) runInputMissing += 1;
    else combinedInputTokens += subagent.inputTokens;
    if (subagent.cachedTokens === undefined) {
      runCachedMissing += 1;
    } else if (subagent.inputTokens === undefined) {
      runCachedWithoutInput += 1;
    } else {
      combinedCachedTokens += subagent.cachedTokens;
    }
    if (subagent.outputTokens === undefined) runOutputMissing += 1;
    else combinedOutputTokens += subagent.outputTokens;
    // 未命中量未知时不加任何数：保持与 byTier 的 uncachedInputTokens 同一口径。
    if (
      subagent.inputTokens !== undefined &&
      subagent.cachedTokens !== undefined
    ) {
      combinedUncachedInputTokens += Math.max(
        0,
        subagent.inputTokens - subagent.cachedTokens,
      );
    }
    if (subagent.modelTier === "unknown") unknownTierRuns += 1;
    if (typeof subagent.llmCalls === "number") subagentLlmCalls += subagent.llmCalls;
    else runLlmCallsMissing += 1;
    if (
      subagent.escalated === true ||
      subagent.failureClass !== undefined ||
      FAILED_RUN_STATUSES.has(subagent.status)
    ) {
      failedOrEscalatedRuns += 1;
    }

    const tierKey = subagent.modelTier;
    const tier = byTier[tierKey] ?? {
      runs: 0,
      llmCalls: 0,
      inputTokens: 0,
      cachedTokens: 0,
      uncachedInputTokens: 0,
      outputTokens: 0,
    };
    tier.runs += 1;
    tier.llmCalls += subagent.llmCalls ?? 0;
    tier.inputTokens += subagent.inputTokens ?? 0;
    tier.cachedTokens += subagent.cachedTokens ?? 0;
    tier.uncachedInputTokens += subagent.uncachedInputTokens ?? 0;
    tier.outputTokens += subagent.outputTokens ?? 0;
    byTier[tierKey] = tier;

    const groupKey = subagent.credentialGroup ?? "(unknown)";
    const group = byCredentialGroup[groupKey] ?? {
      runs: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
    group.runs += 1;
    group.inputTokens += subagent.inputTokens ?? 0;
    group.outputTokens += subagent.outputTokens ?? 0;
    byCredentialGroup[groupKey] = group;
  }

  // 根端缺失计数（与子 run 的 runInputMissing / runOutputMissing / runCachedMissing
  // 完全对称）：根端只要有一条记录缺该字段，root 的分子就只是「已知部分之和」，
  // 相关占比 / 命中率必须返回 null —— 不拿部分覆盖算出一个「完整」比率。
  const rootInputMissingCount = rootAggregate.inputUnknownRecords;
  const rootOutputMissingCount = rootAggregate.outputUnknownRecords;
  const rootCachedMissingCount = rootAggregate.cachedUnknownRecords;
  const combinedCachedKnown =
    rootInputMissingCount === 0 &&
    rootCachedMissingCount === 0 &&
    runCachedMissing === 0 &&
    runCachedWithoutInput === 0 &&
    runInputMissing === 0 &&
    combinedInputTokens > 0;
  const totalLlmCalls = rootAggregate.llmCalls + subagentLlmCalls;
  // 分子分母完整性：根端或任一子 run 缺该维度 → 该 ratio 无法成立（返回 null，
  // 绝不把缺失当成 0 算出「主对话 100%」这种假结论）。
  const rootUsageKnown = rootAggregate.llmCalls > 0;
  const rootInputComplete =
    rootUsageKnown &&
    rootInputMissingCount === 0 &&
    runInputMissing === 0 &&
    combinedInputTokens > 0;
  const rootOutputComplete =
    rootUsageKnown &&
    rootOutputMissingCount === 0 &&
    runOutputMissing === 0 &&
    combinedOutputTokens > 0;
  const rootLlmCallsComplete = rootUsageKnown && runLlmCallsMissing === 0;
  // 未命中量口径：只要有一处 cached 未知，combinedUncachedInputTokens 就只是
  // 「已知缓存子集」的合计（与 byTier 完全一致），必须在 dataNotes 说明。
  const uncachedCoverageIncomplete =
    rootCachedMissingCount > 0 ||
    runCachedMissing > 0 ||
    runCachedWithoutInput > 0 ||
    runInputMissing > 0;
  const totals: DialogTraceReport["totals"] = {
    combinedInputTokens,
    combinedCachedTokens,
    combinedUncachedInputTokens,
    combinedOutputTokens,
    combinedCacheHitRatio: combinedCachedKnown
      ? ratioOrNull(combinedInputTokens, combinedCachedTokens)
      : null,
    totalSubagentRuns: subagents.length,
    failedOrEscalatedRuns,
    byTier,
    byCredentialGroup,
    rootShare: {
      inputRatio:
        rootInputComplete
          ? round4(rootAggregate.inputTokens / combinedInputTokens)
          : null,
      outputRatio:
        rootOutputComplete
          ? round4(rootAggregate.outputTokens / combinedOutputTokens)
          : null,
      llmCallRatio:
        rootLlmCallsComplete && totalLlmCalls > 0
          ? round4(rootAggregate.llmCalls / totalLlmCalls)
          : null,
    },
  };

  // ---- dataNotes：诚实标注缺失，绝不把缺失算成实测 0 ----
  if (messages.length === 0) {
    dataNotes.push(
      "未读取到 dialog 消息：root 的消息与工具调用统计为 0 表示「无数据」，不是「实测 0 次调用」",
    );
  }
  if (messageTimestampsMissing) {
    dataNotes.push(
      "消息记录缺少时间戳：startedAt/endedAt 由 token 记录与子 run 时间推算",
    );
  }
  if (usageRecords.length === 0) {
    dataNotes.push(
      "未找到该对话的逐次 token 记录（远端与本地均无）：root.usage 全 0 表示「无记录」",
    );
  }
  if (rootInputMissingCount > 0) {
    dataNotes.push(
      `${rootInputMissingCount} 条 token 记录缺少 input_tokens：root.usage.inputTokens 只累加已知部分（部分覆盖），rootShare.inputRatio 与 combinedCacheHitRatio 均置 null`,
    );
  }
  if (rootCachedMissingCount > 0) {
    dataNotes.push(
      `${rootCachedMissingCount} 条 token 记录缺少 cache_read_input_tokens：cachedTokens 只累加已知部分（部分覆盖），cacheHitRatio 与 combinedCacheHitRatio 均置 null`,
    );
  }
  if (rootOutputMissingCount > 0) {
    dataNotes.push(
      `${rootOutputMissingCount} 条 token 记录缺少 output_tokens：root.usage.outputTokens 只累加已知部分（部分覆盖），rootShare.outputRatio 置 null`,
    );
  }
  if (usageRecords.length > 0) {
    dataNotes.push(
      "token 记录不含 messageId：timeline 的 user/assistant 条目不带 per-message tokens（逐个调用的用量只在 root.usage / byModel 里）",
    );
  }
  if (runInputMissing > 0) {
    dataNotes.push(
      `${runInputMissing} 条子 run 缺少 inputTokens（旧记录未写该字段）：combined / byTier / byCredentialGroup 的 input 只含已知部分`,
    );
  }
  if (runOutputMissing > 0) {
    dataNotes.push(
      `${runOutputMissing} 条子 run 缺少 outputTokens（旧记录未写该字段）：combined / byTier / byCredentialGroup 的 output 只含已知部分`,
    );
  }
  if (runCachedWithoutInput > 0) {
    dataNotes.push(
      `${runCachedWithoutInput} 条子 run 有 cachedTokens 但缺 inputTokens：这些 cached 未计入 combinedCachedTokens（否则 cached 会大于 input，口径不一致）`,
    );
  }
  if (runCachedMissing > 0) {
    dataNotes.push(
      `${runCachedMissing} 条子 run 缺少 cachedTokens：combinedCachedTokens 只含已知部分，combinedCacheHitRatio 置 null`,
    );
  }
  if (unknownTierRuns > 0) {
    dataNotes.push(
      `${unknownTierRuns} 条子 run 的模型档位无法判定（modelTier=unknown）：未从模型名或 selectionCheck 推断出档位`,
    );
  }
  if (usedAssistantPartFallback) {
    dataNotes.push(
      "该对话没有 tool 结果消息：工具调用数取自 assistant 的 tool-call 部件（一次调用可能对应多条部件，属近似计数）",
    );
  }
  if (selection.chainedWithoutDirectParent > 0) {
    dataNotes.push(
      `${selection.chainedWithoutDirectParent} 条子 run 经 batchId / continuedFrom 串联收入（其 parentDialogId 未命中该对话）`,
    );
  }
  if (selection.unattributedBareParentRuns > 0) {
    dataNotes.push(
      `${selection.unattributedBareParentRuns} 条 run 的 parentDialogId 只是裸 dialog id 且无同 userId 证据（evidenceScope.userId 缺失或指向他人）：跳过了无法验证归属的裸 ID run，不纳入子 run 列表（执行者 agentKey 与 callerAgentKey 前缀都不是父对话 owner 的证据，不参与判断）`,
    );
  }
  if (selection.conflictingAttributionRuns > 0) {
    dataNotes.push(
      `${selection.conflictingAttributionRuns} 条 run 的可信归属证据指向另一个用户（evidenceScope.userId 与目标对话 owner 精确不等）：先于 parentDialogId 匹配与 batchId 串联被排除`,
    );
  }
  if (uncachedCoverageIncomplete) {
    dataNotes.push(
      "存在缺少 cachedTokens 的记录（缓存覆盖不全）：combinedUncachedInputTokens 只累加 input 与 cached 同时已知的记录（已知缓存子集的合计），不把未知缓存当成 100% 未命中，因此它低于真实未命中量；口径与 byTier 完全一致，combinedCacheHitRatio 同步为 null",
    );
  }
  if (!combinedCachedKnown && usageRecords.length > 0) {
    dataNotes.push(
      `combinedCacheHitRatio 置 null：根端缺 input ${rootInputMissingCount} 条 / 缺 cached ${rootCachedMissingCount} 条，子 run 缺 input ${runInputMissing} 条 / 缺 cached ${runCachedMissing} 条（部分覆盖，不按已知部分伪造完整比率）`,
    );
  }
  if (!rootInputComplete) {
    dataNotes.push(
      "主对话 usage 不全（含根端记录缺 input_tokens）或存在子 run 缺少 inputTokens：rootShare.inputRatio 返回 null（分子/分母不完整，不报告占比）",
    );
  }
  if (!rootOutputComplete) {
    dataNotes.push(
      "存在子 run 缺少 outputTokens：rootShare.outputRatio 返回 null（分子/分母不完整，不报告占比）",
    );
  }
  if (!rootLlmCallsComplete) {
    dataNotes.push(
      "存在子 run 缺少 llmCalls：rootShare.llmCallRatio 返回 null（分子/分母不完整，不报告占比）",
    );
  }

  return {
    schemaVersion: DIALOG_TRACE_SCHEMA_VERSION,
    dialogKey,
    dialogId,
    ...(startedAt ? { startedAt } : {}),
    ...(endedAt ? { endedAt } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    root: {
      userMessages,
      assistantMessages,
      toolCallsTotal,
      toolCallsByName,
      llmCalls: rootAggregate.llmCalls,
      usage: toTraceUsage(rootAggregate),
      byModel,
    },
    subagents,
    totals,
    timeline,
    dataNotes,
  };
}

const formatRatio = (value: number | null | undefined): string =>
  typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "未知";

/** 默认文本输出：一眼能读的成本与派发分布；需要逐字段就加 `--json`。 */
export function formatDialogTraceReport(report: DialogTraceReport): string {
  const lines: string[] = [];
  lines.push(`Dialog: ${report.dialogKey}`);
  lines.push(
    `时间: ${report.startedAt ?? "未知"} → ${report.endedAt ?? "未知"}${
      report.durationMs !== undefined ? `（${report.durationMs} ms）` : ""
    }`,
  );
  lines.push(
    `主对话: user=${report.root.userMessages}, assistant=${report.root.assistantMessages}, toolCalls=${report.root.toolCallsTotal}, llmCalls=${report.root.llmCalls}`,
  );
  const toolNames = Object.entries(report.root.toolCallsByName)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}×${count}`);
  if (toolNames.length > 0) lines.push(`  工具: ${toolNames.join(", ")}`);
  lines.push(
    `主对话 tokens: input=${report.root.usage.inputTokens}, cached=${report.root.usage.cachedTokens}, uncached=${report.root.usage.uncachedInputTokens}, output=${report.root.usage.outputTokens}, 命中率=${formatRatio(report.root.usage.cacheHitRatio)}`,
  );
  for (const bucket of report.root.byModel) {
    lines.push(
      `  model ${bucket.model} [${bucket.modelTier}]: calls=${bucket.llmCalls}, input=${bucket.inputTokens}, output=${bucket.outputTokens}, 命中率=${formatRatio(bucket.cacheHitRatio)}`,
    );
  }
  lines.push(
    `子 Agent: ${report.totals.totalSubagentRuns} 个 run（失败/升级 ${report.totals.failedOrEscalatedRuns}）`,
  );
  for (const subagent of report.subagents) {
    const parts = [
      subagent.runId,
      subagent.status,
      subagent.agentName ?? subagent.agentKey ?? "?",
      subagent.modelTier,
      ...(subagent.credentialGroup ? [`凭证组=${subagent.credentialGroup}`] : []),
      ...(subagent.inputTokens !== undefined
        ? [`in=${subagent.inputTokens}`]
        : []),
      ...(subagent.outputTokens !== undefined
        ? [`out=${subagent.outputTokens}`]
        : []),
      ...(subagent.llmCalls !== undefined ? [`llm=${subagent.llmCalls}`] : []),
      ...(subagent.escalated ? ["escalated"] : []),
      ...(subagent.reviewVerdict ? [subagent.reviewVerdict] : []),
    ];
    lines.push(`  - ${parts.join(" · ")}`);
  }
  lines.push(
    `合计 tokens: input=${report.totals.combinedInputTokens}, cached=${report.totals.combinedCachedTokens}, uncached=${report.totals.combinedUncachedInputTokens}, output=${report.totals.combinedOutputTokens}`,
  );
  lines.push(
    `主对话占比: input=${formatRatio(report.totals.rootShare.inputRatio)}, output=${formatRatio(report.totals.rootShare.outputRatio)}, llmCalls=${formatRatio(report.totals.rootShare.llmCallRatio)}`,
  );
  const tiers = Object.entries(report.totals.byTier)
    .sort((a, b) => b[1].runs - a[1].runs)
    .map(
      ([tier, value]) =>
        `${tier}: runs=${value.runs}, input=${value.inputTokens}, output=${value.outputTokens}`,
    );
  if (tiers.length > 0) lines.push(`按档位: ${tiers.join("; ")}`);
  const groups = Object.entries(report.totals.byCredentialGroup)
    .sort((a, b) => b[1].runs - a[1].runs)
    .map(
      ([group, value]) =>
        `${group}: runs=${value.runs}, input=${value.inputTokens}, output=${value.outputTokens}`,
    );
  if (groups.length > 0) lines.push(`按凭证组: ${groups.join("; ")}`);
  lines.push(`timeline: ${report.timeline.length} 条（--json 看完整结构）`);
  if (report.dataNotes.length > 0) {
    lines.push("数据说明:");
    for (const note of report.dataNotes) lines.push(`  - ${note}`);
  }
  return `${lines.join("\n")}\n`;
}
