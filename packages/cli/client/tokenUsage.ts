import {
  BUILTIN_NOLO_AGENT_KEY,
  BUILTIN_NOLO_AGENT_NAME,
  parseBuiltinPlatformAgentId,
} from "core/builtinAgents";
import { API_REPORTED_COST_MULTIPLIER } from "../../ai/token/calculatePrice";
import { findModelConfig } from "../../ai/llm/providers";
import { findModelContextWindow } from "../../ai/llm/getModelContextWindow";
import {
  estimateMessagesTokens,
  resolveOccupancy,
  resolveOccupancyWindow,
} from "../../ai/context/contextOccupancy";
import { builtinAgentCatalogEntryById } from "core/builtinAgentCatalog";
import { parsePublicAgentId } from "core/prefix";
import { normalizeUsage } from "../../ai/token/normalizeUsage";
import type { EnvLike } from "./agentRunTypes";

export type TurnTokenUsage = {
  input: number;
  output: number;
  contextWindow?: number;
  remaining?: number;
  /**
   * 本轮累计消耗的平台积分。
   * 单位语义：仅当 usage 显式携带 billing_unit === "credits"（服务端 billing 帧
   * 恒带此标记）时，cost 才是平台积分，credits 原样取值；否则（含上游伪造
   * billing_provider/billing_model、字段缺失、cost 无元数据）一律按外部 provider
   * 自报美元 ×8 credits/USD 换算。非平台计费且无 cost 时无此值。
   */
  credits?: number;
  /**
   * 命中缓存的输入 token（已含在 `input` 里，不是额外量）。
   * 命中与未命中的单价可差一到两个数量级，光看 input 看不出账单为什么是那个数。
   */
  cacheRead?: number;
  /** 写入缓存的输入 token（同样已含在 `input` 里）。 */
  cacheWrite?: number;
};

/** 平台计费帧自述的单位标记；与 chatBillingSse / runBilling 的写入端同一常量语义。 */
export const PLATFORM_CREDIT_UNIT = "credits";

const isUsableModelId = (model?: string | null): model is string => {
  const raw = model?.trim();
  return Boolean(raw) && raw !== "-" && raw !== "auto";
};

export type AgentModelRef = {
  agentKey?: string;
  agentName?: string;
  model?: string | null;
};

/**
 * 「这个 agent 实际跑哪个模型」——本文件唯一的一处判断。
 *
 * 顺序：显式 model → 该 key 在 builtinAgentCatalog 里声明的模型。
 * 都不命中返回 undefined，由调用方决定怎么兜底。
 *
 * 直接查 catalog，而不是维护一张「档位 key → 模型」的小表：catalog 本来就覆盖
 * 内置 + 广场 + 内部管线的全部条目，小表只认三个档位 key 且三个值完全相同。
 *
 * 上下文窗口和 token 估算都建在它上面。这两条链曾经各写各的：窗口查了档位 key
 * 而估算没查，同一个 key 一边解析出 1M、另一边说不知道。
 */
function resolveEffectiveModel(opts: AgentModelRef): string | undefined {
  if (isUsableModelId(opts.model)) return opts.model;

  const agentKey = opts.agentKey?.trim();
  if (!agentKey) return undefined;

  return builtinAgentCatalogEntryById(
    parseBuiltinPlatformAgentId(agentKey) ?? parsePublicAgentId(agentKey),
  )?.model;
}

/**
 * 供 `estimateDefaultCliContextTokens` 展开的展示名 + 模型。
 *
 * 初始状态 / `/new` / `/compact` / `/switch` 共用这一处解析，之前各处手抄
 * "DeepSeek V4 Flash" / "deepseek-v4-flash" 已随型号换代漂移成过期值。
 * 字段都可选：解析不出来就不给，让下游用自己的兜底，不塞空串冒充有值。
 */
export function resolveAgentModelIdentity(
  opts: AgentModelRef,
): { agentName?: string; model?: string } {
  const model = resolveEffectiveModel(opts);
  // 默认档用 catalog 的品牌名（"nolo"），除非调用方显式给了 model——那说明
  // 它已经知道自己在跑什么，名字也该由它说了算。
  const useCatalogName =
    !isUsableModelId(opts.model) && opts.agentKey?.trim() === BUILTIN_NOLO_AGENT_KEY;
  const agentName = useCatalogName ? BUILTIN_NOLO_AGENT_NAME : opts.agentName?.trim();

  return {
    ...(agentName ? { agentName } : {}),
    ...(model ? { model } : {}),
  };
}

/**
 * Resolve the context window for a TUI agent selection.
 *
 * 顺序：`resolveEffectiveModel`（显式 model / catalog）→ 显示名 fuzzy → 从
 * agentKey / agentName 派生的 model slug → `DEFAULT_CONTEXT_WINDOW`。
 *
 * 修掉过的历史 bug（两处，同一个病根：查不到就默默当 256k）：
 * - agentName "nolo" 一路落到 256k，而它实际跑在 1M 的模型上；
 * - 自定义 / 广场 agent 不在 builtinAgentCatalog 里，显示名 "OpenDesign V4.1 Flash"
 *   fuzzy miss 后落 256k，而它实际跑在 1M 的模型上，百分比因此虚高 4 倍。
 *
 * 兜底里不写死任何具体模型的数字：猜得到就查模型表，猜不到才用通用默认值。
 * 窗口跟随模型，所以 NOLO_AUTO_ROUTE 不再影响它。
 */
export function resolveAgentContextWindow(opts: AgentModelRef): number | undefined {
  const model = resolveEffectiveModel(opts);
  if (model) return resolveContextWindow(model);

  // 显示名直接命中（含 fuzzy）就不用猜 slug 了。
  const byName = opts.agentName?.trim()
    ? resolveOccupancyWindow({ model: opts.agentName })
    : undefined;
  if (byName !== undefined) return byName;

  const candidates = [
    ...modelSlugCandidates(opts.agentKey, 2),
    ...modelSlugCandidates(opts.agentName, 1),
  ];
  for (const candidate of candidates) {
    const window = resolveOccupancyWindow({ model: candidate });
    if (window !== undefined) return window;
  }

  // 查不到窗口时返回 undefined，进入未知态（"context: —"），不得静默用 DEFAULT_CONTEXT_WINDOW 冒充真值。
  return undefined;
}

/** agentKey 的 `agent-<uid>-` 前缀：uid 是确定性 seed，不是模型名的一部分。 */
const AGENT_KEY_PREFIX = /^agent-[a-z0-9]+-/i;

/**
 * 从 agentKey / agentName 猜「可能是什么模型」的 slug 候选。
 *
 * key 形如 `agent-0e95801d90-amr-deepseek-v4-1-flash`：去掉 `agent-<uid>-` 前缀后
 * 剩 `<provider>-<model>`，provider 前缀（`amr-`）也不是模型名，逐段剥离；显示名
 * 形如 `OpenDesign V4.1 Flash`：空格换连字符、点号保留。
 *
 * 这里**不写死任何 provider / 模型名**：候选只是字符串，命中与否交给模型表与
 * fuzzy（`findModelContextWindow`），全 miss 才算查不到。候选按「越完整越靠前」
 * 排列，只有前面的都查不到时才会用到更激进的剥离结果。
 */
function modelSlugCandidates(source: string | undefined, maxDrop: number): string[] {
  const raw = source?.trim();
  if (!raw) return [];
  const base = raw.replace(/\s+/g, "-").toLowerCase();
  const seed = base.replace(AGENT_KEY_PREFIX, "");
  const out = [seed];
  if (seed !== base) out.push(base);
  const segments = seed.split("-");
  for (let drop = 1; drop <= maxDrop && drop < segments.length; drop++) {
    out.push(segments.slice(drop).join("-"));
  }
  return [...new Set(out.filter(Boolean))];
}

const PROVIDER_LOOKUP_ORDER = [
  "openrouter",
  "fireworks",
  "openai",
  "mimo",
  "gmi",
  "google",
  "nolo",
  "mistral",
  "vultr",
  "deepinfra",
  "cloudflare",
] as const;

export function parseUsageRecord(usage?: Record<string, unknown> | null): TurnTokenUsage | undefined {
  if (!usage || typeof usage !== "object") return undefined;
  const input = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0);
  const output = Number(usage.output_tokens ?? usage.completion_tokens ?? 0);
  if (!Number.isFinite(input) || !Number.isFinite(output)) return undefined;
  if (!input && !output) return undefined;
  // Cache field names differ per provider — Anthropic uses
  // cache_read_input_tokens, DeepSeek uses top-level prompt_cache_hit_tokens /
  // prompt_cache_miss_tokens, OpenAI nests cached_tokens under
  // prompt_tokens_details. normalizeUsage already knows all of them, so read
  // through it rather than keeping a second, narrower list here.
  const normalized = normalizeUsage(usage as never);
  const cacheRead = normalized.cache_read_input_tokens || undefined;
  const cacheWrite = normalized.cache_creation_input_tokens || undefined;
  return {
    input,
    output,
    ...(cacheRead === undefined ? {} : { cacheRead }),
    ...(cacheWrite === undefined ? {} : { cacheWrite }),
  };
}

export function mergeUsageRecords(
  current?: Record<string, unknown> | null,
  next?: Record<string, unknown> | null
) {
  const left = parseUsageRecord(current);
  const right = parseUsageRecord(next);
  // Nothing on the left: hand back `next` untouched. Reshaping it here used to
  // drop the cache fields, which is how a merged total could disagree with the
  // provider's own numbers.
  if (!left) return right ? next ?? undefined : current ?? undefined;
  if (!right) return current ?? undefined;
  const cacheRead = (left.cacheRead ?? 0) + (right.cacheRead ?? 0);
  const cacheWrite = (left.cacheWrite ?? 0) + (right.cacheWrite ?? 0);
  // 这是**计费/统计**口径：input 累加成总输入量（cache 命中率等统计要的是总量）。
  // 「上下文占用」要的是「最近一次请求的 input」，那是另一条路——
  // buildTurnTokenUsage 直接取最后一次 provider 上报的 usage，两者不要混。
  // 曾在这里改成取 max 想服务占用口径，结果累计输入量统计变少，且同分支上
  // 两条互斥契约（toolOutputClip 断言累加、sessionRender DoD 5 断言取 max）
  // 同时存在、只有一条能绿——已把 DoD 5 一并改写成两侧分工断言。
  const inputTokens = left.input + right.input;
  return {
    input_tokens: inputTokens,
    output_tokens: left.output + right.output,
    ...(cacheRead > 0 ? { cache_read_input_tokens: cacheRead } : {}),
    ...(cacheWrite > 0 ? { cache_creation_input_tokens: cacheWrite } : {}),
  };
}

export function resolveContextWindow(model?: string): number | undefined {
  const raw = model?.trim();
  if (!raw) return undefined;

  for (const provider of PROVIDER_LOOKUP_ORDER) {
    const config = findModelConfig(provider, raw);
    if (config?.contextWindow) return config.contextWindow;
  }

  // PROVIDER_LOOKUP_ORDER 不含 qwen / moonshot / nolo / xai / zai / anthropic，
  // 且对命名变体（显示名、未在表内的自定义 id）也会 miss。回退到全量模型表 +
  // fuzzy 兜底（resolveOccupancyWindow）。查不到时返回 undefined 进入未知态，
  // 严禁用 DEFAULT_CONTEXT_WINDOW 伪装成真值。
  return resolveOccupancyWindow({ model: raw });
}

export function buildTurnTokenUsage(
  usage?: Record<string, unknown> | null,
  model?: string
): TurnTokenUsage | undefined {
  const parsed = parseUsageRecord(usage);
  if (!parsed) return undefined;
  const contextWindow = resolveContextWindow(model);
  const remaining =
    contextWindow && parsed.input > 0
      ? Math.max(0, contextWindow - parsed.input)
      : undefined;
  const rawCost = typeof usage?.cost === "number" ? usage.cost : undefined;
  // 严格单位匹配：仅当 usage 显式携带 billing_unit === "credits" 才视 cost 为平台
  // 积分原样取值。服务端 billing 帧恒带 billing_unit（与 cost 同生共死），故平台
  // 计费路径必然命中；否则（含上游伪造 billing_provider/billing_model、字段缺失、
  // cost 无元数据）一律保守按外部 provider 自报美元 ×8 credits/USD 换算。
  const isPlatformBilled = usage?.billing_unit === PLATFORM_CREDIT_UNIT;
  const credits =
    rawCost !== undefined && rawCost > 0
      ? isPlatformBilled
        ? rawCost
        : rawCost * API_REPORTED_COST_MULTIPLIER
      : undefined;
  return {
    ...parsed,
    ...(contextWindow ? { contextWindow } : {}),
    ...(remaining != null ? { remaining } : {}),
    ...(credits !== undefined ? { credits } : {}),
  };
}

/**
 * localLoop 每轮返回的逐次调用计费证据。一轮 agent turn 通常有 N 次 provider
 * 调用（工具循环每轮一次 + 自动压缩摘要 + 标题生成），每条 usage 都已由
 * platformChatProvider 的 `mergeBillingIntoUsage` 合并过该次调用的 billing 帧。
 */
export type UsageRecordLike = { usage?: Record<string, unknown> | null };

/**
 * 一轮内全部 provider 调用的平台积分之和。
 *
 * 为什么需要它：`result.usage` 只是**最后一次**调用的 usage，而 localLoop 的
 * `mergeTurnUsage` 累加时只保留 token 字段、把 `cost` / `billing_unit` 丢掉。
 * 于是只看 result.usage 的话，一轮跑 20 次工具、状态行只算得到第 20 次那一笔。
 *
 * 单位口径比 `buildTurnTokenUsage` 更严：这里**只认** `billing_unit === "credits"`
 * 的平台计费帧，不做外部 provider 自报美元 ×8 的换算。状态行的积分 chip 回答的是
 * 「我这次在平台上花了多少积分」——自有 API / 订阅制（cli）本就不扣平台积分，
 * 把它们的自报成本折算进来会凭空造出一笔并不存在的消费。
 *
 * 返回 undefined 表示本轮没有任何平台计费调用（而不是「花了 0」）。
 */
export function sumPlatformCredits(
  records?: readonly UsageRecordLike[] | null,
): number | undefined {
  if (!records?.length) return undefined;
  let total = 0;
  let sawPlatformCall = false;
  for (const record of records) {
    const credits = platformCreditsFromUsage(record?.usage);
    if (credits === undefined) continue;
    sawPlatformCall = true;
    total += credits;
  }
  return sawPlatformCall ? total : undefined;
}

/**
 * 单次调用的平台积分。口径与 `sumPlatformCredits` 同源：只认平台 billing 帧，
 * 不做外部 provider 自报美元的换算。返回 undefined = 这次调用不是平台计费。
 *
 * 用在只拿得到一个聚合 usage 的路径上（server/HTTP 派发的 done 帧——那里的
 * cost 已由 runBilling 汇总为整个 run 的总额，不像本地 loop 需要逐次相加）。
 */
export function platformCreditsFromUsage(
  usage?: Record<string, unknown> | null,
): number | undefined {
  if (!usage || usage.billing_unit !== PLATFORM_CREDIT_UNIT) return undefined;
  const cost = typeof usage.cost === "number" ? usage.cost : 0;
  return Number.isFinite(cost) && cost > 0 ? cost : 0;
}

/**
 * 用逐次调用求和出来的积分覆盖 `buildTurnTokenUsage` 从最后一次调用读到的
 * `credits`。token 字段原样保留——只有计费口径需要全轮汇总。
 *
 * `tokens` 可能是 undefined（provider 没回 usage），此时积分也无处安放：调用方
 * 拿到 undefined，会话累计这一轮就不加数，而不是凭空造一个只有 credits 的壳。
 */
export function withTurnCredits(
  tokens: TurnTokenUsage | undefined,
  credits: number | undefined,
): TurnTokenUsage | undefined {
  if (!tokens) return tokens;
  if (credits === undefined) return tokens;
  return { ...tokens, credits };
}

/**
 * 平台积分的 UI 统一口径。所有展示位（状态行 chip、面板行、dock 行、
 * /credits 诊断）都从这一处取格式——改文案/精度只动这里。
 *
 * - 完整形（默认）：`⚡ 0.04 积分`
 * - 紧凑形（compact，多 run 行/极限窄宽）：`⚡0.04`
 */
export function formatCreditsChip(
  credits: number,
  options?: { compact?: boolean }
): string {
  return options?.compact
    ? `⚡${credits.toFixed(2)}`
    : `⚡ ${credits.toFixed(2)} 积分`;
}

export function formatTokenCount(value: number) {  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 1000) return String(Math.round(value));
  if (value < 1_000_000) {
    const compact = value / 1000;
    if (Number.isInteger(compact)) return `${compact}k`;
    return `${compact.toFixed(1).replace(/\.0$/, "")}k`;
  }
  const compact = value / 1_000_000;
  return compact >= 100 ? `${Math.round(compact)}M` : `${compact.toFixed(1).replace(/\.0$/, "")}M`;
}

/**
 * 「这一轮上下文占用了多少」——TUI 里唯一的一处口径。
 *
 * 状态栏 chip 与 `/context` 面板的令牌行都必须走这里，两边各算一套才会出现
 * 「chip 说 13.6k、面板说 in —」这种自相矛盾。
 *
 * - `used`：**下一轮会重新发出去的上下文**。有 provider usage 时是 `input`
 *   （prompt 实际大小）；还没收到 usage 时退到系统提示 + 工具的本地估算。
 *   刻意不加 `output`：那是生成量，不是下一轮的上下文占用。
 * - `contextWindow`：usage 自带的窗口优先，其次调用方给的状态兜底。
 * - `left` / `pct`：只有 used 与 window 都有值才给，缺一个就不编数字。
 * - `estimated`：used 来自本地估算（而非 provider usage）时为 true，供展示层
 *   标 `~`。面板标，状态栏 chip 不标（宽度紧，且首轮就标噪声大于信息）。
 */
export type ContextUsage = {
  used?: number;
  contextWindow?: number;
  left?: number;
  pct?: number;
  estimated: boolean;
};

/**
 * 与 Web 线完全对齐：权威到达时计算权威切片点。
 * provider input 是回答生成前的快照。
 * 若末条为 assistant，权威快照产生在该 assistant 生成之前（turns.length - 1）；
 * 若末条非 assistant，权威快照已包含当前所有历史（turns.length）。
 * 底层对齐共享 historyTokensBeforeLatestAssistant 契约。
 */
export function resolveAuthorityTurnCount(
  turns: readonly { role?: string; content?: unknown }[],
): number {
  if (turns.length === 0) return 0;
  const latest = turns[turns.length - 1];
  if (latest?.role === "assistant") {
    return Math.max(0, turns.length - 1);
  }
  return turns.length;
}

export interface ComputeBaselineContextOptions {
  authoritativeInput?: number;
  lastAuthorityTurnCount?: number;
  turns: readonly { role?: string; content?: unknown }[];
  fallbackEstimate: number | (() => number);
}

/**
 * 计算 turn 开始时的上下文占用基线（纯函数，供 TUI turn runner 使用）：
 * 1. 只有当存在真实权威 input（> 0）且 lastAuthorityTurnCount 有效（>= 0）时，
 *    才使用切片增量分支：authoritativeInput + estimateMessagesTokens(turns.slice(authTurnCount))。
 * 2. 否则（无真权威、或 authTurnCount 为 undefined），绝不假装权威，走 fallbackEstimate 估算分支。
 */
export function computeBaselineContextTokens(
  options: ComputeBaselineContextOptions,
): number {
  const { authoritativeInput, lastAuthorityTurnCount, turns, fallbackEstimate } = options;
  if (
    authoritativeInput !== undefined &&
    authoritativeInput > 0 &&
    lastAuthorityTurnCount !== undefined &&
    lastAuthorityTurnCount >= 0
  ) {
    const turnsSinceAuthority = turns.slice(lastAuthorityTurnCount);
    const addedTokens = estimateMessagesTokens(turnsSinceAuthority);
    return authoritativeInput + addedTokens;
  }
  return typeof fallbackEstimate === "function" ? fallbackEstimate() : fallbackEstimate;
}

export type ResolveContextUsageInput = {
  tokens?: TurnTokenUsage;
  fallbackContextWindow?: number;
  estimatedContextTokens?: number;
  /**
   * turn 内实时推进值（如流式生成阶段的估算增量），随流式实时单调增长。
   * turn 结束拿到权威 input 后由权威值接管。
   */
  turnEstimatedTokens?: number;
};

export function resolveContextUsage(
  opts: ResolveContextUsageInput = {}
): ContextUsage {
  const tokens = opts.tokens;
  const contextWindow = tokens?.contextWindow ?? opts.fallbackContextWindow;
  const authoritativeInput = tokens && tokens.input > 0 ? tokens.input : undefined;
  const baselineEstimate =
    opts.estimatedContextTokens != null && opts.estimatedContextTokens > 0
      ? opts.estimatedContextTokens
      : undefined;
  const generatedSinceAuthority =
    opts.turnEstimatedTokens != null && opts.turnEstimatedTokens > 0
      ? opts.turnEstimatedTokens
      : undefined;

  const occupancy = resolveOccupancy({
    authoritativeInput,
    baselineEstimate:
      authoritativeInput === undefined && baselineEstimate !== undefined
        ? baselineEstimate + (generatedSinceAuthority ?? 0)
        : baselineEstimate,
    generatedSinceAuthority,
  });

  const hasInputSignal =
    authoritativeInput !== undefined ||
    baselineEstimate !== undefined ||
    generatedSinceAuthority !== undefined;
  const used = hasInputSignal ? occupancy.tokens : undefined;

  const usage: ContextUsage = { estimated: occupancy.estimated };
  if (used !== undefined) usage.used = used;
  if (contextWindow != null) usage.contextWindow = contextWindow;
  if (used !== undefined && contextWindow != null && contextWindow > 0) {
    usage.left = Math.max(0, contextWindow - used);
    usage.pct = (used / contextWindow) * 100;
  }
  return usage;
}

export function renderTokenStatus(
  tokens?: TurnTokenUsage,
  fallback?: {
    contextWindow?: number;
    estimatedContextTokens?: number;
    turnEstimatedTokens?: number;
  }
) {
  const usage = resolveContextUsage({
    tokens,
    fallbackContextWindow: fallback?.contextWindow,
    estimatedContextTokens: fallback?.estimatedContextTokens,
    turnEstimatedTokens: fallback?.turnEstimatedTokens,
  });
  const cache =
    tokens?.cacheRead != null && tokens.cacheRead > 0
      ? ` (cache ${formatTokenCount(tokens.cacheRead)})`
      : "";

  // 窗口未知态：若无窗口，严禁硬编未知百分比或默认值，展示为未知态
  if (usage.contextWindow === undefined) {
    const inStr =
      usage.used !== undefined
        ? `${usage.estimated ? "~" : ""}${formatTokenCount(usage.used)}`
        : "—";
    const outStr = tokens ? formatTokenCount(tokens.output) : "—";
    return `in ${inStr}${cache} out ${outStr} left —`;
  }

  // 没有 provider usage 但知道窗口 + 估算时，给真实数字而不是三个破折号；
  // 估算值前面加 `~`，避免和 provider 报的数混为一谈。
  if (!tokens) {
    if (usage.used === undefined) return "in — out — left —";
    const left =
      usage.left !== undefined ? `~${formatTokenCount(usage.left)}` : "—";
    return `in ~${formatTokenCount(usage.used)} out — left ${left}`;
  }
  const inputText =
    tokens.input > 0 || usage.used === undefined
      ? formatTokenCount(tokens.input)
      : `~${formatTokenCount(usage.used)}`;
  const left =
    tokens.remaining != null
      ? formatTokenCount(tokens.remaining)
      : usage.left !== undefined
        ? `${usage.estimated ? "~" : ""}${formatTokenCount(usage.left)}`
        : "—";
  // Cache hits are a slice of `input`, so they read as a parenthetical on it
  // rather than a separate column.
  return `in ${inputText}${cache} out ${formatTokenCount(tokens.output)} left ${left}`;
}

export function shouldShowUsage(env: EnvLike) {
  return env.NOLO_DEBUG === "1" || env.NOLO_SHOW_USAGE === "1";
}

export function formatUsage(usage: any, dialogId: unknown) {
  const parts: string[] = [];
  if (typeof dialogId === "string" && dialogId)
    parts.push(`dialog=${dialogId}`);

  if (usage && typeof usage === "object") {
    const normalized = normalizeUsage(usage as never);
    const input = Number(normalized.input_tokens || usage?.input_tokens || usage?.prompt_tokens || 0);
    const output = Number(normalized.output_tokens || usage?.output_tokens || usage?.completion_tokens || 0);
    const cacheHit = Number(normalized.cache_read_input_tokens || 0);

    if (input || output) {
      let tokenStr = `tokens=${input}+${output}`;
      if (cacheHit > 0 && input > 0) {
        const hitPercent = ((cacheHit / (input + cacheHit)) * 100).toFixed(1).replace(/\.0$/, "");
        tokenStr += ` (cache: ${formatTokenCount(cacheHit)} / ${hitPercent}%)`;
      }
      parts.push(tokenStr);
    }
  }

  return parts.length ? `  (${parts.join("  ")})` : "";
}