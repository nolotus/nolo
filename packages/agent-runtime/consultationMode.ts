import {
  PLATFORM_CONSULTANT_BILLING_SOURCE,
  isUserOwnChannelBilling,
  resolveConsultantTier,
  resolveDispatchableConsultantTier,
} from "core/consultantTier";

export function buildConsultationModeBlock(): string {
  const dispatchable = resolveDispatchableConsultantTier();
  const noDispatchableEntries = dispatchable.length === 0;
  const targets = noDispatchableEntries ? resolveConsultantTier() : dispatchable;
  const targetLines = targets.map((entry) => {
    const billing = isUserOwnChannelBilling(entry.billingSource)
      ? "用户自带通道"
      : entry.billingSource === PLATFORM_CONSULTANT_BILLING_SOURCE
        ? "平台托管(消耗平台积分)"
        : "计费未知(不得声称免费)";
    const pricing = entry.inputCreditsPerMTokens === null || entry.outputCreditsPerMTokens === null
      ? "价目未知(不得假设免费或额度足够，须先告知费用未知并询问)"
      : `input ${entry.inputCreditsPerMTokens} / output ${entry.outputCreditsPerMTokens} 积分/1M tokens`;
    const key = entry.agentKey ? `agentKey: ${entry.agentKey}` : "无可派发 agentKey";
    const pro = entry.requiresProTier ? "需 199 档或余额≥19 积分" : "无门槛";
    const capability = entry.supportsTool === true
      ? "支持工具调用"
      : entry.supportsTool === false
        ? "不支持工具调用(仅方案顾问，当前 agent 执行)"
        : "工具能力未声明(推理优先，当前 agent 执行)";
    return `- ${entry.displayName}; model: ${entry.model}; ${key}; ${billing}; ${pricing}; ${pro}; ${capability}`;
  });
  return [
    "【请教模式 · 顾问档请教】",
    "当同一问题反复失败、工具或能力不足，或明确超出当前模型能力时，主动发起请教；不许硬扛、不许编造答案、不许悄悄降级。",
    "同一任务内同一工具、同一输入连续失败 ≥2 次且没有新证据可改（参数错误、凭据配置、可换接口应先自行修正，不算卡住），或工具明确返回 unsupported/not_supported（该能力不存在），即视为卡住：必须先按本节请教一次再继续，不得第三次盲目重试。",
    "升级前先用 listAgents 找 billingSource 为 user_subscription/user_api/owner_subscription/local 的收藏或自有 agent，有则优先派它——自带通道不消耗平台积分，也不需平台积分确认；没有才考虑下面的平台托管档，其扣费授权门见 agentCollaboration。",
    "无 listAgents 工具时不得推断用户有无自带通道，先用 ask_user 询问；不得把用户自带通道的用量说成平台积分。只有用户无自带通道、正在考虑平台积分档时，额度门槛（autoApproveCredits，服务端独占写入）才适用：可知且预估消耗 ≤ 额度可免问，不可知则默认每次问。",
    ...(noDispatchableEntries ? ["当前顾问档没有可派发入口；以下是顾问档信息，仅供说明，不得编造 agentKey 或尝试派发。"] : []),
    ...(targetLines.length ? targetLines : ["当前没有顾问档条目。"]),
    "用户同意后，仅在存在真实 agentKey 时用 startAgentRun 派发；仅传递卡住的子问题和必要上下文。supportsTool=false 的顾问只出方案，由当前 agent 执行；supportsTool=true 的顾问可接工具型子任务；能力未知时不得声称可执行工具任务。结论一律由当前 agent 汇总交付，不转交原始输出。",
    "若子 run 因 402 或 gpt_pro_tier_required 失败，如实告知用户需开通高阶档位或充值使账户余额达到 19 积分以上；不得假装成功或反复重试。",
    "禁止擅自修改当前 agent 的 model/provider；内置 nolo 的 provider/model 由代码托管。",
    "ask_user 在当前宿主不可用时，降级为普通文字询问，不得因此卡住。",
  ].join("\n");
}
