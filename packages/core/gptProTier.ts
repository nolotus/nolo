// GPT Pro tier 纯函数：模型判定 + 客户端拦截逻辑。
// 下沉到 core，使公开集消费方无需依赖 auth 包。
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

export const ADVANCED_FEATURE_MIN_BALANCE = 19;
export const GPT_PRO_REQUIRED_RECHARGE_AMOUNT = 199;

export type PremiumModelFamily =
  | "claude-opus"
  | "claude-fable"
  | "gpt-pro"
  | "gpt-sol"
  | "gpt-astra"
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

// GPT Astra 家族：必须为独立段（如 gpt-6-astra），支持 openai/。
// 与 Claude Fable 5.1 同价（80/400 积分每 1M），统一纳入 199 档位以保持计费口径一致。
const GPT_ASTRA_RE =
  /^(?:openai\/)?gpt-\d+(?:\.\d+)*-astra(?:-[a-z0-9]+(?:[.-][a-z0-9]+)*)?$/i;

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

  if (GPT_ASTRA_RE.test(normalizedModel)) {
    return "gpt-astra";
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

/** 199 档位门槛 402 响应里的稳定 reason（服务端与客户端共用一处常量）。 */
export const GPT_PRO_TIER_REQUIRED_REASON = "gpt_pro_tier_required";
/** 档位闸门本身不可用（资格查询失败）时的 details.reason。 */
export const GPT_PRO_TIER_CHECK_UNAVAILABLE_REASON = "tier_check_unavailable";

export interface GptProTierRequiredFields {
  reason: string;
  message: string;
  requiredRechargeAmount: number;
  details?: { reason: string };
}

/**
 * 199 档位 402 响应体字段的**唯一**拼装处（agentRun 与 chatCallPlan 共用，禁止各自拼）。
 * 状态码语义不变：402 / reason=gpt_pro_tier_required / message=GPT_PRO_BLOCKED_MESSAGE /
 * requiredRechargeAmount=199；details 仅在闸门不可用时附加。
 */
export function buildGptProTierRequiredFields(
  tierCheckUnavailable = false,
): GptProTierRequiredFields {
  return {
    reason: GPT_PRO_TIER_REQUIRED_REASON,
    message: GPT_PRO_BLOCKED_MESSAGE,
    requiredRechargeAmount: GPT_PRO_REQUIRED_RECHARGE_AMOUNT,
    ...(tierCheckUnavailable
      ? { details: { reason: GPT_PRO_TIER_CHECK_UNAVAILABLE_REASON } }
      : {}),
  };
}

/**
 * 纯决策：入参是**已算好的**布尔（是否高阶、是否平台垫付）+ 用户档位状态。
 * 「谁出钱」由 ai/agent/platformPaidCall 的 isPlatformPaidAgentCall 判定后传入；本函数
 * 不再嗅探 agent 记录里的 isOwned / isOAuth / billingSource 形状字段——自声明字段不构成
 * 通道归属证明（见 platformPaidCall.ts）。
 */
export function shouldBlockForGptPro(input: {
  premium: boolean;
  platformPaid: boolean;
  gptProStatus?: string | null;
}): { blocked: false } | { blocked: true; message: string } {
  if (input?.premium !== true || input?.platformPaid !== true) {
    return { blocked: false };
  }
  if (asTrimmedLowercaseString(input.gptProStatus) === "active") {
    return { blocked: false };
  }
  return { blocked: true, message: GPT_PRO_BLOCKED_MESSAGE };
}
