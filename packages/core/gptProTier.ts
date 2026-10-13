// GPT Pro tier 纯函数：模型判定 + 客户端拦截逻辑。
// 从 auth/gptProTier.ts 下沉到 core，使公开集消费方无需依赖 auth 包。
// auth/gptProTier.ts 改为 re-export 本文件，私有侧 import 路径不变。
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

export const ADVANCED_FEATURE_MIN_BALANCE = 19;
export const GPT_PRO_REQUIRED_RECHARGE_AMOUNT = 199;

export type PremiumModelFamily =
  | "claude-opus"
  | "claude-fable"
  | "gpt-pro"
  | "gpt-sol"
  | "kimi-k3";

/**
 * 平台付费通道白名单：仅对平台垫付/托管的 provider 实施 199 充值档位门槛。
 * 用户自有凭证/BYOK 通道（如 anthropic / google 等）不由此门槛限制。
 */
export const SUPPORTED_TIER_PROVIDERS: ReadonlySet<string> = new Set([
  "nolo",
  "openai",
  "deepinfra",
]);

// Claude 高阶家族（Opus / Fable）：必须为完整段，支持合法命名空间 anthropic/
const CLAUDE_PREMIUM_RE =
  /^(?:anthropic\/)?claude-(opus|fable)(?:-\d+(?:[.-]\d+)*(?:-[a-z0-9]+)*)?$/i;

// GPT Pro 家族：必须为包含 -pro 的独立段（如 gpt-5.5-pro, gpt-5.6-sol-pro, gpt-5.5-pro-32k），支持 openai/
const GPT_PRO_RE =
  /^(?:openai\/)?gpt-[a-z0-9.-]+-pro(?:-[a-z0-9]+(?:[.-][a-z0-9]+)*)?$/i;

// GPT Sol 家族：必须为独立段（如 gpt-5.6-sol, gpt-6.1-sol），支持 openai/
const GPT_SOL_RE =
  /^(?:openai\/)?gpt-\d+(?:\.\d+)*-sol(?:-[a-z0-9]+(?:[.-][a-z0-9]+)*)?$/i;

// Kimi K3 家族：精确匹配，支持上游 moonshotai/ 前缀
const KIMI_K3_MODELS: ReadonlySet<string> = new Set([
  "kimi-k3",
  "moonshotai/kimi-k3",
]);

/**
 * 统一高阶模型身份判定：不依赖 provider 分支，精确识别模型家族。
 */
export function classifyPremiumModel(
  model: unknown,
): PremiumModelFamily | undefined {
  const normalizedModel = asTrimmedLowercaseString(model);
  if (!normalizedModel) return undefined;

  const claudeMatch = CLAUDE_PREMIUM_RE.exec(normalizedModel);
  if (claudeMatch) {
    return claudeMatch[1].toLowerCase() === "opus"
      ? "claude-opus"
      : "claude-fable";
  }

  if (GPT_PRO_RE.test(normalizedModel)) {
    return "gpt-pro";
  }

  if (GPT_SOL_RE.test(normalizedModel)) {
    return "gpt-sol";
  }

  if (KIMI_K3_MODELS.has(normalizedModel)) {
    return "kimi-k3";
  }

  return undefined;
}

export function isGptProModel(provider: unknown, model: unknown): boolean {
  const normalizedProvider = asTrimmedLowercaseString(provider);
  if (!SUPPORTED_TIER_PROVIDERS.has(normalizedProvider)) {
    return false;
  }
  return classifyPremiumModel(model) !== undefined;
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
