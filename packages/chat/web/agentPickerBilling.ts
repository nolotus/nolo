// packages/chat/web/agentPickerBilling.ts
// agent 切换弹层（AgentPickerControl）的「计费提示」判定。
// 抽成纯函数：组件只做渲染，计费口径可以单测。
// 来源层不在这里：它只是一个图标 badge（收藏★ / 我的 / 广场），按
// candidate.isFavorite / isOwned 直接选图标即可，没有值得单测的判定。
//
// 是否平台积分扣费有唯一真值，这里不另造规则：
// - 是否平台积分扣费 = ai/agent/agentBilling 的 resolveBillingSource。
//   归属不能用来推计费：自建 agent 也可能是 platform_credits（内置文件/图片助手）。
import type { Agent } from "app/types";
import { resolveBillingSource, type BillingSource } from "ai/agent/agentBilling";
import {
  formatModelCostPerMillion,
  resolveAgentTokenPriceBreakdown,
} from "ai/llm/getPricing";
import type { AgentPickerCandidate } from "../hooks/useAgentPickerCandidates";

export interface PickerBillingChip {
  /** resolveBillingSource 的原值，供测试与排查对账。 */
  billingSource: BillingSource;
  /** 是否显示平台积分标记：只有 billingSource === "platform_credits" 才为 true。 */
  isPlatformCredits: boolean;
  /** 出向单价（每 1M token 的积分，已格式化）；取不到价格时为 null。 */
  outputPriceText: string | null;
}

/**
 * 行内计费提示。agent 实体还没加载出来（undefined）时返回 null——
 * 不在数据到手前先猜一个来源再改。
 */
export function resolvePickerBillingChip(
  candidate: Pick<AgentPickerCandidate, "isOwned">,
  agent: Agent | undefined
): PickerBillingChip | null {
  if (!agent) return null;

  // isOwned 以 picker 聚合口径为准并显式覆盖：记录上的 isOwned 可能是分享/浏览态残留。
  const billingSource = resolveBillingSource({
    ...agent,
    isOwned: candidate.isOwned,
  });

  if (billingSource !== "platform_credits") {
    return { billingSource, isPlatformCredits: false, outputPriceText: null };
  }

  // 价格口径与 AgentCardMeta 一致：平台自营（apiSource=platform）只认目录价。
  const breakdown = resolveAgentTokenPriceBreakdown(
    agent,
    agent.apiSource === "platform"
  );
  const outputPrice = breakdown?.outputPrice;

  return {
    billingSource,
    isPlatformCredits: true,
    outputPriceText:
      typeof outputPrice === "number" &&
      Number.isFinite(outputPrice) &&
      outputPrice > 0
        ? formatModelCostPerMillion(outputPrice, "").trim()
        : null,
  };
}
