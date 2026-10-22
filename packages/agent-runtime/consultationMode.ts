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
    const pricing = entry.inputCreditsPerMTokens === null || entry.outputCreditsPerMTokens === null
      ? "价目未知；不得假设免费或额度足够，须先告知用户费用未知并询问。"
      : `积分价目：input ${entry.inputCreditsPerMTokens} / output ${entry.outputCreditsPerMTokens} 积分 / 1M tokens。`;
    const key = entry.agentKey ? `，agentKey: ${entry.agentKey}` : "，当前无可派发 agentKey";
    const pro = entry.requiresProTier
      ? "需开通 199 积分档位或账户保持有效余额（≥ 19 积分）；未达标会被服务端以 402（gpt_pro_tier_required）拒绝。"
      : "不需要特定充值档位门槛。";
    const capability = entry.supportsTool === true
      ? "支持工具调用，可接工具型子任务。"
      : entry.supportsTool === false
        ? "不支持工具调用，只能作为顾问提供方案；由当前 agent 动手执行，不得声称子 run 已完成改动。"
        : "工具能力未声明；优先派它做需要推理/判断的部分；需要改动落地时由当前 agent 执行，不承诺它能调用工具。";
    const billing = isUserOwnChannelBilling(entry.billingSource)
      ? "用户自带通道，不消耗平台积分。"
      : entry.billingSource === PLATFORM_CONSULTANT_BILLING_SOURCE
        ? "平台托管顾问档，消耗平台积分。"
        : "计费来源未知；不得声称不消耗平台积分。";
    return `- ${entry.displayName}（model: ${entry.model}${key}）：${billing} ${pricing} ${pro} ${capability}`;
  });
  return [
    "【请教模式 · 顾问档请教】",
    "当同一问题反复失败、工具或能力不足，或明确超出当前模型能力时，主动发起请教；不许硬扛、不许编造答案、不许悄悄降级。",
    "升级前先判断用户是否已有可用的自带档位：若 listAgents 可用，查看其 billingSource 为 user_subscription、user_api、owner_subscription 或 local 的已收藏/拥有 agent，并优先派发该用户自带通道的 agent。用户自带通道不消耗平台积分，不需走平台积分确认。不得把用户通道的用量说成平台积分。",
    "若当前没有 listAgents 工具，不得推断用户有或没有自带通道；先用 ask_user 询问“你已有自带通道的档位吗？”，或在明确告知平台积分费用后再询问是否使用平台托管顾问档。",
    "只有确认没有可用用户自带通道后，才考虑平台托管顾问档；平台托管档消耗平台积分，必须用 ask_user 主动告知积分价目并询问。",
    ...(noDispatchableEntries ? ["当前顾问档没有可派发入口；以下是顾问档信息，仅供说明，不得编造 agentKey 或尝试派发。"] : []),
    ...(targetLines.length ? targetLines : ["当前没有顾问档条目。"]),
    "额度门槛：自动执行额度（积分）字段为 autoApproveCredits，由服务端独占写入。只有用户无自带通道、正在考虑平台积分档时，额度可知且预估消耗 ≤ 额度才可免问；额度不可知时默认每次都问。",
    "用户同意后，仅在存在真实 agentKey 时用 startAgentRun 派发；仅传递卡住的子问题和必要上下文。supportsTool=false 的顾问只出方案，由当前 agent 执行；supportsTool=true 的顾问可接工具型子任务；能力未知时不得声称可执行工具任务。结论一律由当前 agent 汇总交付，不转交原始输出。",
    "若子 run 因 402 或 gpt_pro_tier_required 失败，如实告知用户需开通高阶档位或充值使账户余额达到 19 积分以上；不得假装成功或反复重试。",
    "禁止擅自修改当前 agent 的 model/provider；内置 nolo 的 provider/model 由代码托管。",
    "ask_user 在当前宿主不可用时，降级为普通文字询问，不得因此卡住。",
  ].join("\n");
}
