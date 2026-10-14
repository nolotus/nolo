// GPT Pro tier 纯函数：模型判定 + 客户端拦截逻辑。
// 从 auth/gptProTier.ts 下沉到 core，使公开集消费方无需依赖 auth 包。
// auth/gptProTier.ts 改为 re-export 本文件，私有侧 import 路径不变。
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

export const ADVANCED_FEATURE_MIN_BALANCE = 19;
export const GPT_PRO_REQUIRED_RECHARGE_AMOUNT = 199;

export function isGptProModel(provider: unknown, model: unknown): boolean {
  const normalizedProvider = asTrimmedLowercaseString(provider);
  const normalizedModel = asTrimmedLowercaseString(model);
  if (normalizedProvider === "openai") {
    // 字符类含 "-"：允许 pro 前有内部连字符段（如 gpt-5.6-sol-pro），
    // (?:-|$) 仍保证 -pro 后必须是段边界，prologue/proximity 类不会误伤。
    return /^gpt-[a-z0-9.-]+-pro(?:-|$)/.test(normalizedModel);
  }
  if (normalizedProvider === "deepinfra") {
    // fable 系列与 opus 同属 199 积分档位（补漏：claude-fable-5 此前被遗漏）。
    return (
      normalizedModel.includes("claude") &&
      (normalizedModel.includes("opus") || normalizedModel.includes("fable"))
    );
  }
  if (normalizedProvider === "nolo") {
    // 平台托管 Kimi K3 与 GPT Pro / Claude Opus 同门槛（199 积分档位）。
    // core 包不得反向依赖 ai 包，这里用字面量精确匹配，
    // 对应 ai 侧 PLATFORM_HOSTED_KIMI_K3_MODEL（"kimi-k3"）。
    // nolo 下 glm-5.3 / glm-5-3-flash / kimi-k2.6 等廉价模型不在档位内，必须精确等于，禁止前缀匹配。
    return normalizedModel === "kimi-k3";
  }
  return false;
}

export const GPT_PRO_BLOCKED_MESSAGE = `GPT Pro / Kimi K3 等高级模型需要先开通 ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} 积分档位。`;

/**
 * 客户端侧：判断当前 agent 是否因 GPT Pro 资格不足被拦截。
 * 只检查用户记录的 gptProAccess.status，不扫描交易历史。
 * 服务端有独立的 hasGptProTierAccess（会扫历史充值），不共用此函数。
 */
export function shouldBlockForGptPro(
  agent: { provider?: unknown; model?: unknown; apiSource?: unknown } | null | undefined,
  gptProStatus: string | undefined,
): { blocked: false } | { blocked: true; message: string } {
  if (!agent) return { blocked: false };
  if (agent.apiSource === "cli") return { blocked: false };
  if (!isGptProModel(agent.provider, agent.model)) return { blocked: false };
  if (gptProStatus === "active") return { blocked: false };
  return { blocked: true, message: GPT_PRO_BLOCKED_MESSAGE };
}