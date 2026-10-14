import { asTrimmedString } from "core/trimmedString";
import { isPlatformManagedProvider } from "ai/llm/kimi";
import { resolvePlatformEffectiveModel } from "ai/llm/platformHostedRoutingTable";
import type { NormalizedUsage, RawUsage } from "./types";

type BillingUsage = Pick<
  RawUsage | NormalizedUsage,
  "billing_provider" | "billing_model" | "billing_service_tier"
>;

const normalizeString = (value?: string) => {
  const trimmed = asTrimmedString(value);
  return trimmed || undefined;
};

const resolveBillingModel = (
  usageModel?: string,
  fallbackModel?: string
) => {
  const model = normalizeString(usageModel) ?? normalizeString(fallbackModel);
  if (!model) {
    throw new Error("Billing model is required");
  }
  return model;
};

export const resolveBillingTarget = ({
  usage,
  fallbackProvider,
  fallbackModel,
  isPlatformBilled,
}: {
  usage?: BillingUsage | null;
  fallbackProvider?: string;
  fallbackModel: string;
  /**
   * 调用方提供的**可信平台计费身份**（如 apiSource === "platform"，或代码内置
   * agent 守卫）。只有它为 true 时才允许平台别名规范化：provider 名恰好是平台
   * 托管名、但记录属于 BYOK / custom / OAuth 的调用一律不重映射。
   */
  isPlatformBilled?: boolean;
}) => {
  const provider =
    normalizeString(usage?.billing_provider) ?? normalizeString(fallbackProvider);
  const model = resolveBillingModel(usage?.billing_model, fallbackModel);
  const serviceTier = normalizeString(usage?.billing_service_tier);
  // 平台托管请求的兼容别名（owner 2026-10-13 授权）：执行与计费落到实际模型，旧 id
  // 的新调用按 6.1 目录价计费。判据是**可信的平台计费身份 + 平台托管 provider**
  // 两者同时成立；BYOK / custom / OAuth（apiSource 非 platform / 非代码内置）
  // 原样返回、不重映射。billing_model / 传入的请求 id 一律不重写。
  const billedModel =
    isPlatformBilled === true && isPlatformManagedProvider(provider, model)
      ? (resolvePlatformEffectiveModel(model) ?? model)
      : model;

  return {
    provider,
    model: billedModel,
    serviceTier,
  };
};
