import { extractUserId } from "core/prefix";
import { isBuiltinPlatformAgentKey } from "core/builtinAgents";
import { calculatePrice } from "./calculatePrice";
import {
  hasUsableCatalogPrice,
  isTrustedPlatformBillingIdentity,
} from "./platformBillingGate";
import { normalizeUsage } from "./normalizeUsage";
import { resolveBillingTarget } from "./resolveBillingTarget";
import type { EntryPath, RawUsage, TokenUsageData } from "./types";
import { isOAuthApiKeyRef } from "agent-runtime/serverProxyPolicy";
import { LOCAL_USER_ID } from "./usageConstants";

type SharingLevel = "default" | "split" | "full";

/**
 * 「计费目标查不到平台目录价 → 回落到 agent 自身身份」的告警去重表。
 * 同一组映射只告警一次（否则每次调用都会刷一条，掩盖真正的新映射）。
 */
const warnedBillingTargetFallbacks = new Set<string>();

function warnBillingTargetFallbackOnce(args: {
  billedProvider?: string;
  billedModel: string;
  fallbackProvider: string;
  fallbackModel: string;
}): void {
  const key = `${args.billedProvider ?? "?"}|${args.billedModel}->${args.fallbackProvider}|${args.fallbackModel}`;
  if (warnedBillingTargetFallbacks.has(key)) return;
  warnedBillingTargetFallbacks.add(key);
  console.warn(
    `[billing] billed target has no catalog price (provider=${args.billedProvider ?? "?"} model=${args.billedModel}); ` +
      `falling back to agent identity (provider=${args.fallbackProvider} model=${args.fallbackModel}). ` +
      "Fix the upstream billing alias — platform charges must never resolve to 0.",
  );
}

export interface BillingAgentConfig {
  model: string;
  provider?: string;
  apiSource?: string;
  apiKeyRef?: string | null;
  inputPrice?: number;
  outputPrice?: number;
  sharingLevel?: SharingLevel;
  id?: string;
  userId?: string;
}

export interface ResolvedTokenUsagePricing {
  usage: ReturnType<typeof normalizeUsage>;
  billedProvider?: string;
  billedModel: string;
  billedServiceTier?: string;
  cost: number;
  pay: Record<string, number>;
  /** true when the agent config carries explicit input/output prices. */
  hasExternalPrice: boolean;
}

/**
 * 唯一定价决策点（不含 billable 判定）：按 billing target（provider/model/
 * serviceTier）+ 外部价格换算 USD cost。记账（prepareTokenUsageData）与
 * 响应透传（chat proxy 注入 usage.cost 供 TUI 显示积分）共用同一实现，
 * 保证「展示值 == 记账值」，消除 dual-rate seam。
 */
export function resolveTokenUsagePricing(args: {
  rawUsage: RawUsage;
  agentConfig: BillingAgentConfig;
  /** Canonical agent key when it is available separately from the config. */
  agentId?: string;
  nowMs?: number;
}): ResolvedTokenUsagePricing {
  const { rawUsage, agentConfig, nowMs } = args;
  const usage = normalizeUsage(rawUsage);
  const billingTarget = resolveBillingTarget({
    usage,
    fallbackProvider: agentConfig.provider,
    fallbackModel: agentConfig.model,
    // 可信平台计费身份：apiSource=platform 或代码内置 agent 守卫（canonical key）。
    // 仅此二者允许平台别名规范化，避免把 BYOK / custom / OAuth 的旧 id 也改写。
    isPlatformBilled:
      agentConfig.apiSource === "platform" ||
      isBuiltinPlatformAgentKey(args.agentId?.trim()),
  });
  const billedProvider = billingTarget.provider;
  const billedModel = billingTarget.model;
  const billedServiceTier = billingTarget.serviceTier;

  // Only the call-site canonical key is trusted for this policy. A mutable
  // record id must never grant builtin pricing semantics when the canonical
  // identity is missing or points at another agent.
  const canonicalAgentId = args.agentId?.trim();
  const isCodeOwnedBuiltin = isBuiltinPlatformAgentKey(canonicalAgentId);

  // 身份制主判据：apiSource 挂在计费配置本体上，不依赖调用点是否记得传
  // canonical key（key 是可选参数，漏传即守卫静默失效）。platform = 平台自营，
  // 定价唯一来源是代码目录；记录价只属于创作者（apiSource=custom）。
  // 名单命中保留为兜底信号。
  const isPlatformBilled = agentConfig.apiSource === "platform";
  const hasPersistedPrices =
    (agentConfig.inputPrice !== undefined && agentConfig.inputPrice > 0) ||
    (agentConfig.outputPrice !== undefined && agentConfig.outputPrice > 0);
  if (isPlatformBilled && !isCodeOwnedBuiltin && hasPersistedPrices) {
    console.warn(
      `[billing] platform agent ignored persisted prices (input=${agentConfig.inputPrice}, output=${agentConfig.outputPrice}); canonical key missing or not in builtin set: "${canonicalAgentId || ""}"`,
    );
  } else if (!isPlatformBilled && isCodeOwnedBuiltin && hasPersistedPrices) {
    console.warn(
      `[billing] code-owned builtin identity ignored persisted prices (input=${agentConfig.inputPrice}, output=${agentConfig.outputPrice}); apiSource="${agentConfig.apiSource || ""}" key="${canonicalAgentId || ""}"`,
    );
  }

  // Builtin pricing follows the catalog entry of the upstream that actually
  // served the request. Persisted prices belong to creator-owned agents; on a
  // code-owned builtin they are only a stale snapshot after model rerouting.
  const hasExternalPrice =
    !isCodeOwnedBuiltin && !isPlatformBilled && hasPersistedPrices;

  const { cost, pay } = calculatePrice({
    provider: billedProvider,
    modelName: billedModel,
    billingServiceTier: billedServiceTier,
    usage,
    externalPrice: hasExternalPrice
      ? {
          input: agentConfig.inputPrice ?? 0,
          output: agentConfig.outputPrice ?? 0,
          creatorId: agentConfig.userId ?? (agentConfig.id ? extractUserId(agentConfig.id) : ""),
        }
      : undefined,
    sharingLevel: agentConfig.sharingLevel,
    nowMs,
  });

  /**
   * 平台计费目标查不到目录价时的兜底（2026-11-04 失效模式）。
   *
   * usage 里的 `billing_provider` / `billing_model` 是「实际上游」自报的身份，平台托管
   * 上游会给出不属于平台目录的别名——例如 Cloudflare Claude 路由对外宣称
   * `usageProvider: "cloudflare"` + `upstreamModelId: "anthropic/claude-sonnet-5.5"`。
   * 一旦这组别名进了计费目标，`calculatePrice` 在平台目录里查不到价 → cost 0 →
   * billable=false → **该调用永久免费**，而且没有任何告警。
   *
   * 两个闸门都必须精确：
   * - 身份：与 resolveBillingTarget 同一套「可信平台身份」（apiSource=platform **或**
   *   代码内置 agent 身份）。catalog 条目普遍不声明 apiSource，只看 apiSource 会让
   *   这批内置平台 agent 漏掉兜底（review HIGH-1）。
   * - 触发条件：只认「计费目标在目录里算不出钱」（缺条目，或条目价全是 0 的
   *   零价幽灵条目），不认「这次算出来恰好是 0」——那会把有意免费的模型改收费
   *   （review M-2）。而 agent 自身身份与计费目标一致时永不兜底，所以「平台有意
   *   免费且无别名」的模型不受影响。
   */
  const agentIdentityModel =
    typeof agentConfig.model === "string" ? agentConfig.model.trim() : "";
  const agentIdentityProvider =
    typeof agentConfig.provider === "string" && agentConfig.provider.trim()
      ? agentConfig.provider.trim()
      : undefined;
  const isTrustedPlatformIdentity = isTrustedPlatformBillingIdentity({
    provider: agentIdentityProvider,
    model: agentIdentityModel,
    apiSource: agentConfig.apiSource,
    agentId: canonicalAgentId,
  });
  const sameTarget =
    agentIdentityProvider === billedProvider && agentIdentityModel === billedModel;
  if (
    isTrustedPlatformIdentity &&
    !hasUsableCatalogPrice(billedProvider, billedModel) &&
    agentIdentityModel &&
    !sameTarget &&
    hasUsableCatalogPrice(agentIdentityProvider, agentIdentityModel)
  ) {
    const agentProvider = agentIdentityProvider;
    const agentModel = agentIdentityModel;
    const fallbackPrice = calculatePrice({
      provider: agentProvider,
      modelName: agentModel,
      billingServiceTier: billedServiceTier,
      usage,
      externalPrice: undefined,
      sharingLevel: agentConfig.sharingLevel,
      nowMs,
    });
    if (typeof fallbackPrice.cost === "number" && fallbackPrice.cost > 0) {
      warnBillingTargetFallbackOnce({
        billedProvider,
        billedModel,
        fallbackProvider: agentProvider ?? "",
        fallbackModel: agentModel,
      });
      return {
        usage,
        billedProvider: agentProvider,
        billedModel: agentModel,
        billedServiceTier,
        cost: fallbackPrice.cost,
        pay: fallbackPrice.pay,
        hasExternalPrice,
      };
    }
  }

  return {
    usage,
    billedProvider,
    billedModel,
    billedServiceTier,
    cost,
    pay,
    hasExternalPrice,
  };
}

interface PrepareTokenUsageDataParams {
  rawUsage: RawUsage;
  agentConfig: BillingAgentConfig;
  userId?: string;
  username?: string;
  /** Canonical agent identity (preferred). */
  agentId?: string;
  /** Deprecated legacy identity; used only when agentId is absent/blank. */
  cybotId?: string;
  dialogId: string;
  timestamp?: number;
  /** 本次请求所发送的稳定前缀指纹，来自 CompiledContext.cacheProfile.stablePrefixHash。 */
  stable_prefix_hash?: string;
  /** 稳定前缀的估算 token 数，来自 cacheProfile.stablePrefixEstimatedTokens。 */
  stable_prefix_estimated_tokens?: number;
  /** 请求入口路径，用于按调用面切片命中率。 */
  entry_path?: EntryPath;
}

export interface PreparedTokenUsageData {
  usage: ReturnType<typeof normalizeUsage>;
  billedProvider?: string;
  billedModel: string;
  billedServiceTier?: string;
  recordProvider: string;
  tokenData: TokenUsageData;
}

/**
 * 唯一计费决策点。按显式真值表算出 billable：
 *
 * billing_estimated === true 时的处理：
 *   - CLI 子进程 / OAuth 订阅 → false（用户自带订阅，估算值不计费）
 *   - 平台 agent / 平台代扣 → true（估算值仍可计费，避免漏收）
 * userId 为空或 "local" (未登录)        → false
 * apiSource === "cli"                   → false  (CLI 子进程是用户自带订阅)
 * apiKeyRef 是 OAuth 订阅 (chatgpt/claude/cursor/xai/antigravity) → false
 * apiSource === "platform" 且 cost > 0  → true   (平台 agent)
 * apiSource === "custom" 且有 price 且 cost > 0 → true (平台分润/代扣)
 * apiSource 缺失/null/"" 且 cost > 0    → true   (兜底：无 apiSource 按平台处理)
 * 其它 cost === 0                       → false
 *
 * 所有扣费入口只读返回的 billable，禁止再看 cost > 0。
 */
export function resolveBillable(input: {
  usage: { billing_estimated?: boolean };
  userId?: string;
  apiSource?: string;
  apiKeyRef?: string | null;
  cost: number;
  hasExternalPrice: boolean;
}): boolean {
  const uid = input.userId?.trim();
  if (!uid || uid === LOCAL_USER_ID) return false;
  const apiSource = input.apiSource;
  if (apiSource === "cli") return false;
  // OAuth 订阅 agent（chatgpt/claude/cursor/xai/antigravity）——用户自带订阅
  if (isOAuthApiKeyRef(input.apiKeyRef)) return false;
  if (input.cost <= 0) return false;

  // billing_estimated：CLI 和 OAuth 订阅已在上方 early return，
  // 此处只剩平台 agent / 平台代扣的估算值——仍计费（避免漏收）。

  // platform → 计费；custom 有 externalPrice → 平台代扣/分润 → 计费；
  // custom 无 externalPrice → 用户自带 key → 不计费
  // apiSource 缺失/null/"" → 兜底按平台处理（cost > 0）
  if (apiSource === "platform") return true;
  if (apiSource === "custom") return input.hasExternalPrice;
  if (apiSource == null || apiSource === "") return true;
  return false;
}

/**
 * resolveBillable 的 agent-config 便捷封装：从 BillingAgentConfig 组装
 * apiSource/apiKeyRef/hasExternalPrice 参数。记账（prepareTokenUsageData）
 * 与响应透传（resolveChatProxyUsageCost）共用，避免两处手抄五参组装。
 */
export function resolveBillableForAgent(input: {
  usage: { billing_estimated?: boolean };
  cost: number;
  userId?: string;
  agentConfig: BillingAgentConfig;
  hasExternalPrice?: boolean;
}): boolean {
  const { usage, cost, userId, agentConfig } = input;
  const hasExternalPrice =
    input.hasExternalPrice ??
    ((agentConfig.inputPrice !== undefined && agentConfig.inputPrice > 0) ||
      (agentConfig.outputPrice !== undefined && agentConfig.outputPrice > 0));
  return resolveBillable({
    usage,
    userId,
    apiSource: agentConfig.apiSource,
    apiKeyRef: agentConfig.apiKeyRef,
    cost,
    hasExternalPrice,
  });
}

export const prepareTokenUsageData = ({
  rawUsage,
  agentConfig,
  userId,
  username,
  agentId,
  cybotId,
  dialogId,
  timestamp = Date.now(),
  stable_prefix_hash,
  stable_prefix_estimated_tokens,
  entry_path,
}: PrepareTokenUsageDataParams): PreparedTokenUsageData => {
  // 空 agentId 是安全的：apiSource=platform 走目录价（守卫兜底），
  // custom 走记录价（创作者）。这里不再 throw——throw 会让客户端
  // 记录保存（desktop/cli-local）整批失败，属于静默漏记。
  const resolvedAgentId =
    (typeof agentId === "string" && agentId.trim()) ||
    (typeof cybotId === "string" && cybotId.trim()) ||
    "";
  const { usage, billedProvider, billedModel, billedServiceTier, cost, pay, hasExternalPrice } =
    resolveTokenUsagePricing({
      rawUsage,
      agentConfig,
      agentId: resolvedAgentId,
      nowMs: timestamp,
    });

  const recordProvider = billedProvider ?? agentConfig.provider ?? "unknown";

  const billable = resolveBillableForAgent({
    usage,
    cost,
    userId,
    agentConfig,
    hasExternalPrice,
  });

  return {
    usage,
    billedProvider,
    billedModel,
    billedServiceTier,
    recordProvider,
    tokenData: {
      ...usage,
      userId,
      username,
      agentId: resolvedAgentId,
      cybotId: resolvedAgentId,
      model: billedModel,
      provider: recordProvider,
      billing_service_tier: billedServiceTier,
      dialogId,
      cost,
      pay,
      timestamp,
      billable,
      ...(stable_prefix_hash !== undefined ? { stable_prefix_hash } : {}),
      ...(stable_prefix_estimated_tokens !== undefined
        ? { stable_prefix_estimated_tokens }
        : {}),
      ...(entry_path !== undefined ? { entry_path } : {}),
    },
  };
};
