/**
 * 平台计费调用的 fail-closed 闸门（2026-11-04 事故后的契约收紧）。
 *
 * 原则：**拿不到用法就不允许用**。宁可调用被拒绝，也不能把「算不出钱的平台调用」
 * 送出去——先服务再想办法记账，等于用平台的成本替用户买单，而且客户端还会显示
 * 一个永远不会落账的积分（2026-11-04 实测：CF Claude 成功流没有 in-band usage，
 * 计费 flush 拿不到 → 用户看到积分、账本零记录）。
 *
 * 三个失效模式的共同点都是「计费身份算不出价 → cost 0 → billable=false」，
 * 因此这里把「这次调用能不能真的算出钱」变成一个**转发前**就能回答的问题：
 * - 身份：可信平台身份（apiSource=platform / 代码内置 agent 身份 / apiSource 缺失
 *   且 agent 身份属平台托管命名空间）。三种口径与 resolveBillable 一致，集中在本文件，
 *   避免三处字面量再次分叉（review M-A / L-3）。
 * - 价格：目录条目存在**且** input/output 至少一个 > 0。上游命名空间里存在零价
 *   幽灵条目（如 `anthropic/claude-sonnet-5-5` 的 price 为 `{input:0,output:0}`），
 *   只看「条目是否存在」同样会漏。
 *
 * BYOK / custom / OAuth 一律 `platformBilled: false`，不参与任何平台目录价校验，
 * 既不会被拦，也不会被平台价劫持。
 */
import { findModelConfig } from "ai/llm/providers";
import { isPlatformManagedProvider } from "ai/llm/kimi";
import { isBuiltinPlatformAgentKey } from "core/builtinAgents";
import { resolvePlatformHostedRouting } from "ai/llm/platformHostedRoutingTable";

export type PlatformBillingIdentityInput = {
  provider?: string | null;
  model?: string | null;
  apiSource?: string | null;
  /** Canonical agent key（如 agent-pub-...）；缺失时只按 apiSource 判定。 */
  agentId?: string | null;
};

export type PlatformBillingGate =
  | { platformBilled: false }
  | {
      platformBilled: true;
      /** false = 该调用算不出钱，调用方必须 fail closed（拒绝服务）。 */
      billable: true;
      provider?: string;
      model: string;
    }
  | {
      platformBilled: true;
      billable: false;
      reason: "unpriced_target";
      provider?: string;
      model: string;
    };

const trimOrUndefined = (value?: string | null): string | undefined => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
};

/**
 * 目录里这条调用能不能真的算出钱：条目存在且 input/output 至少一个 > 0。
 * 与 calculatePrice / getModelConfig 走同一个查找与归一化路径（含平台模型别名）。
 */
export function hasUsableCatalogPrice(
  provider: string | undefined,
  model: string,
): boolean {
  if (!provider || !model) return false;
  const price = findModelConfig(provider, model)?.price as
    | { input?: number; output?: number }
    | undefined;
  if (!price) return false;
  return (price.input ?? 0) > 0 || (price.output ?? 0) > 0;
}

/**
 * 是否属于「平台出钱」的计费身份。三种口径集中在这里：
 * 1. apiSource === "platform"；
 * 2. 代码内置 agent canonical key（catalog 条目普遍不声明 apiSource）；
 * 3. apiSource 缺失/null 且 agent 身份属于平台托管命名空间——与 resolveBillable
 *    「apiSource 缺失按平台处理」一致；**不能**只凭 apiSource 缺失就认，否则
 *    BYOK 记录（普遍不写 apiSource）会被平台目录价劫持。
 */
export function isTrustedPlatformBillingIdentity(
  input: PlatformBillingIdentityInput,
): boolean {
  if (trimOrUndefined(input.apiSource) === "platform") return true;
  if (isBuiltinPlatformAgentKey(trimOrUndefined(input.agentId))) return true;
  if (trimOrUndefined(input.apiSource) !== undefined) return false;
  return isPlatformManagedProvider(
    trimOrUndefined(input.provider) ?? "",
    trimOrUndefined(input.model) ?? "",
  );
}

export function resolvePlatformBillingGate(
  input: PlatformBillingIdentityInput,
): PlatformBillingGate {
  if (!isTrustedPlatformBillingIdentity(input)) return { platformBilled: false };
  const provider = trimOrUndefined(input.provider);
  const model = trimOrUndefined(input.model) ?? "";
  if (hasUsableCatalogPrice(provider, model)) {
    return { platformBilled: true, billable: true, provider, model };
  }
  return { platformBilled: true, billable: false, reason: "unpriced_target", provider, model };
}

/**
 * 平台路由键的**唯一派生点**：读侧（转发前闸门）与写侧（泄漏 trip / 成功复位）都必须调它。
 * 2026-11-04 review：两侧曾各写一份公式（读侧 keyName、写侧 provider=计费身份 nolo），
 * 算出永不相同的键，熔断形同虚设。任何新调用点一律走这里，禁止就地拼字符串。
 */
export function platformBillingRouteKeyForModel(model: string | undefined): string {
  const trimmed = typeof model === "string" ? model.trim() : "";
  let route: { keyName?: string; usageProvider?: string; wire?: string; upstreamModelId?: string } | undefined;
  try {
    route = resolvePlatformHostedRouting(trimmed || undefined) as any;
  } catch {
    route = undefined;
  }
  return [
    route?.keyName ?? route?.usageProvider ?? "unknown-provider",
    route?.wire ?? "unknown-wire",
    route?.upstreamModelId ?? (trimmed || "unknown-model"),
  ].join("|");
}
