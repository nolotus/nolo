import {
  resolveBillableForAgent,
  resolveTokenUsagePricing,
  type BillingAgentConfig,
} from "./prepareTokenUsageData";
import type { RawUsage } from "./types";

/**
 * 展示层积分 cost 解析（纯函数）：把「定价 → billable → cost」这条共同管线
 * 收敛为单一路径，供两条调用方复用，消除双源漂移：
 *
 *   1. chat proxy 展示帧（packages/server/handlers/chatProxyBilling.ts 的
 *      resolveChatProxyUsageCost）——流式过程中为客户端实时显示积分。
 *   2. agent-run done 帧（packages/server/handlers/agentRun/runBilling.ts 的
 *      resolveAgentRunUsageCost）——本轮 agentRun 结束时透传积分。
 *
 * 两条路径都必须与记账（prepareTokenUsageData）走完全相同的定价与计费决策，
 * 保证「展示值 == 记账值」。
 *
 * 语义：仅当 billable 且 cost > 0（真正平台计费）时返回 cost；否则返回
 * undefined（cost <= 0 / 非 billable / 异常），此时调用方不写 cost /
 * billing_unit，客户端不显示积分。
 *
 * catch 语义：定价或计费抛异常时绝不阻断响应路径——返回 undefined 只是让
 * 客户端不显示积分。调用方若需额外前置短路（如 runBilling 的 local/空
 * userId 与无 provider 判定）应在壳层自行处理，本函数不隐含这些判定，
 * 以保持与两条调用方各自的既有行为完全等价。
 */
export function resolveDisplayableUsageCost(args: {
  /** 已组装好的计费配置（含 provider/model/price/apiSource/apiKeyRef 等）。 */
  billingAgentConfig: BillingAgentConfig;
  /** 本次用量；null/undefined 视为空 usage。 */
  usage?: RawUsage | null;
  /** 归属用户。空 / "local"（未登录）由 resolveBillableForAgent 判为不计费。 */
  userId?: string | null;
}): number | undefined {
  try {
    const { usage: normalized, cost, hasExternalPrice } =
      resolveTokenUsagePricing({
        rawUsage: (args.usage ?? {}) as RawUsage,
        agentConfig: args.billingAgentConfig,
      });
    if (cost <= 0) return undefined;
    const billable = resolveBillableForAgent({
      usage: normalized,
      cost,
      userId: args.userId ?? undefined,
      agentConfig: args.billingAgentConfig,
      hasExternalPrice,
    });
    return billable ? cost : undefined;
  } catch {
    // 定价异常绝不阻断响应路径：无 cost 只是客户端不显示积分。
    return undefined;
  }
}
