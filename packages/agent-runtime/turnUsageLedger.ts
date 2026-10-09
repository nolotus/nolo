/**
 * Turn usage ledger（localLoop 拆分第二批）：一个 turn 的计费/用量账本。
 *
 * 职责：
 * - recordProviderCall：主循环每次 provider.complete 后记账——累计 turnUsage、
 *   记录最后一次调用的原始 usage（contextUsage，轮内压缩的真实遥测来源）、
 *   追加逐次调用证据 usageRecords（callId 优先 provider_call_id）。
 * - addCompaction：带外摘要调用用量入账。首次直接保留完整对象（含
 *   provider_call_id 等字段），之后才做 token 字段合并——与拆分前
 *   「initial 赋值 / in-loop 合并」两条路径的口径逐字节一致。
 * - records()：全部计费证据，压缩记录排首位；成功与失败两条路径共用同一
 *   出口（失败路径缺 result，fallbackModel 由调用方给）。
 * - accounting()：turnUsage + 带外用量的结算口径（saveTurn.accountingUsage）。
 *
 * 带外用量只进 accountingUsage 与 usageRecords（费用结算），绝不进入
 * lastContextUsage（run 结果的上下文占用快照）。
 */
import type { AgentRuntimeSaveTurnInput } from "./hostAdapter";
import {
  readCacheCreationInputTokens,
  readCacheReadInputTokens,
} from "../ai/token/cacheTokenFields";

type UsageRecord = NonNullable<AgentRuntimeSaveTurnInput["usageRecords"]>[number];

function mergeTurnUsage(
  current: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined
) {
  if (!next) return current;
  // 缓存字段走共享别名表：OpenAI Responses / chat.completions 只在嵌套的
  // *_tokens_details.cached_tokens 里给缓存命中，只认顶层字段会让本轮记账
  // 显示 0 缓存，而同一次调用的 DB token 记录（走 normalizeUsage）却有值。
  const read = (usage: Record<string, unknown>) => ({
    input: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
    output: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
    cacheHit: readCacheReadInputTokens(usage),
    cacheMiss: readCacheCreationInputTokens(usage),
  });
  const right = read(next);
  const left = current ? read(current) : { input: 0, output: 0, cacheHit: 0, cacheMiss: 0 };
  return {
    input_tokens: left.input + right.input,
    output_tokens: left.output + right.output,
    cache_read_input_tokens: left.cacheHit + right.cacheHit,
    cache_creation_input_tokens: left.cacheMiss + right.cacheMiss,
  };
}

/**
 * 把一次带外 LLM 调用（目前只有自动压缩的摘要生成）的用量加进本轮记账 usage (accountingUsage)。
 *
 * 摘要是主工具循环之外的独立 provider call。这里保留独立 helper，让调用方
 * 明确区分主循环累计与带外累计，并兼容旧的字段别名。注意：带外用量仅进入 accountingUsage
 * 与 usageRecords 用于费用结算，不得进入 run 结果的 context usage 快照。
 */
export function addOutOfBandUsage(
  turn: Record<string, unknown> | undefined,
  extra: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!extra) return turn;
  const num = (u: Record<string, unknown> | undefined, ...keys: string[]) => {
    if (!u) return 0;
    for (const k of keys) {
      const v = Number(u[k]);
      if (Number.isFinite(v) && v !== 0) return v;
    }
    return 0;
  };
  return {
    ...(turn ?? {}),
    input_tokens:
      num(turn, "input_tokens", "prompt_tokens") +
      num(extra, "input_tokens", "prompt_tokens"),
    output_tokens:
      num(turn, "output_tokens", "completion_tokens") +
      num(extra, "output_tokens", "completion_tokens"),
    cache_read_input_tokens:
      readCacheReadInputTokens(turn) + readCacheReadInputTokens(extra),
    cache_creation_input_tokens:
      readCacheCreationInputTokens(turn) + readCacheCreationInputTokens(extra),
  };
}

function resolveRecordCallId(usage: Record<string, unknown>): string {
  return typeof usage.provider_call_id === "string" &&
    usage.provider_call_id.trim()
    ? usage.provider_call_id.trim()
    : crypto.randomUUID();
}

export type TurnUsageLedger = {
  /** 主循环一次 provider 调用入账（usage 缺失时什么都不记）。 */
  recordProviderCall(args: {
    usage?: Record<string, unknown>;
    model?: string;
    provider?: string;
    telemetry?: import("./providerCallTelemetry").ProviderCallTelemetry;
  }): void;
  /** 带外摘要调用用量入账（undefined 为 no-op）。 */
  addCompaction(usage: Record<string, unknown> | undefined): void;
  /** 结算口径：turnUsage + 带外用量。 */
  accounting(): Record<string, unknown> | undefined;
  /**
   * 全部计费证据（压缩记录排首位）。fallbackModel 用于压缩记录的 model
   * 兜底（成功路径传 result.model，失败路径缺省）。
   */
  records(fallbackModel?: string): UsageRecord[];
  /** 最后一次 provider 调用的原始 usage（轮内压缩真实遥测来源）。 */
  lastContextUsage(): Record<string, unknown> | undefined;
};

export function createTurnUsageLedger(args: {
  model?: string;
  provider?: string;
  stablePrefixHash?: string;
  stablePrefixEstimatedTokens?: number;
}): TurnUsageLedger {
  let turnUsage: Record<string, unknown> | undefined;
  let lastContextUsage: Record<string, unknown> | undefined;
  let compactionUsage: Record<string, unknown> | undefined;
  const providerRecords: UsageRecord[] = [];
  return {
    recordProviderCall: ({ usage, model, provider, telemetry }) => {
      turnUsage = mergeTurnUsage(turnUsage, usage);
      lastContextUsage = usage;
      if (usage && Object.keys(usage).length > 0) {
        providerRecords.push({
          callId: resolveRecordCallId(usage),
          usage,
          model: model || args.model || "unknown",
          ...(provider || args.provider
            ? { provider: provider || args.provider }
            : {}),
          ...(telemetry && Object.keys(telemetry).length > 0 ? { telemetry } : {}),
          ...(args.stablePrefixHash
            ? {
                stablePrefixHash: args.stablePrefixHash,
                stablePrefixEstimatedTokens: args.stablePrefixEstimatedTokens,
              }
            : {}),
        });
      }
    },
    addCompaction: (usage) => {
      if (!usage) return;
      // 首次保留完整对象（含 provider_call_id 等字段）；之后才做 token 合并——
      // 与拆分前「initial 赋值 / in-loop 合并」两条路径的口径一致。
      compactionUsage = compactionUsage
        ? addOutOfBandUsage(compactionUsage, usage)
        : usage;
    },
    accounting: () => addOutOfBandUsage(turnUsage, compactionUsage),
    records: (fallbackModel) => [
      // 压缩记录仅在用量非空时入账（成功/失败两条路径同一口径）。
      ...(compactionUsage && Object.keys(compactionUsage).length > 0
        ? [{
            callId: resolveRecordCallId(compactionUsage),
            usage: compactionUsage,
            model: args.model || fallbackModel || "unknown",
            ...(args.provider ? { provider: args.provider } : {}),
          }]
        : []),
      ...providerRecords,
    ],
    lastContextUsage: () => lastContextUsage,
  };
}
