// packages/ai/llm/geminiNeonPricing.ts
//
// Gemini 4 Neon 价目的单一声明式真值（Google 官方 Gemini API，核对日期 2026-11-19）。
//
// 为什么单独一份：同一个上游模型同时出现在两条生产目录里——
// 1. packages/integrations/google/models.ts —— provider=google，用户自带 key 直连；
// 2. packages/ai/llm/platformHosted.ts        —— provider=nolo，平台托管计费身份。
// 两处报的是同一份上游价：数字只在这里定义，两条目录各自保留自己的路由条目、
// provider 与计费身份（托管收益仍归平台账户）。调价时改一处即可，不会出现
// 同一档位的用量因走 Google 直连或 nolo 托管而报价不同。
//
// 本模块是叶子模块：只 import 模型 id 真值（路由表的单一声明处），
// **不** import platformHosted / providers / 任一目录文件，避免形成循环依赖。
//
// Neon 仅隐式缓存（官方明示 explicit caching 不支持），无单独缓存写入价，
// cachingWrite 与 cachingRead 同为缓存价。
//
// 服务档位：官方同步线路（OpenAI 兼容端点的 service_tier）只有 Standard / Flex / Priority。
// 平台**没有** Batch 线路——Batch API 是独立的异步 batchGenerateContent，本仓库不接，
// 所以这里不登记 batch 倍率：登记它只会让走同步线路的请求在计费侧拿到不存在的半价。

import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { PLATFORM_HOSTED_GEMINI_4_NEON_MODEL } from "./platformHostedRoutingTable";

export const GEMINI_NEON_MODEL = PLATFORM_HOSTED_GEMINI_4_NEON_MODEL;

/** Gemini 4 Neon 官方 Standard 档单价（美元 / 1M tokens）。 */
export const GEMINI_NEON_STANDARD_PRICE_USD = {
  input: 3.0,
  output: 15.0,
  cache: 0.15,
} as const;

/**
 * 不含 batch：见文件头说明（平台无 Batch 线路，不虚构 Batch 支持）。
 */
export const GEMINI_NEON_SERVICE_TIER_MULTIPLIERS = {
  flex: { inputOutput: 0.5, cache: 0.5 },
  priority: { inputOutput: 1.8, cache: 1.8 },
} as const;

/** 是否 Gemini 4 Neon（大小写/空白归一后精确匹配，不做前缀匹配）。 */
export const isGeminiNeonModel = (model?: string | null): boolean =>
  asTrimmedLowercaseString(model) === GEMINI_NEON_MODEL;

/**
 * 托管 Google 同步线路是否**只能按 Standard 计费**（当前只有 Gemini 4 Neon
 * 声明了 Flex/Priority 倍率，所以这条判据等价于「托管 Neon」）。
 *
 * 为什么要这个判据：Flex（0.5×）/ Priority（1.8×）是**上游实际执行**的服务档位，
 * 而平台在这条线路上拿不到可信的「实际执行档位」回传——
 * 1. 客户端 `body.service_tier` 只是请求意图；
 * 2. Google 的同步响应里平台没有解析过 `service_tier`；
 * 3. 重试层回传的 `serviceTier` 同样来自「这次请求打算用哪个档位」的配置。
 * 把请求意图当实际服务证据，会让响应的 `billing_service_tier` 被客户端按
 * 0.5×/1.8× 结算，而服务端账本与 `usage.cost` 仍按 Standard 扣费：账本、下发
 * cost、展示档位三者割裂（Priority 还会让平台实付 1.8× 却只收 1×）。
 *
 * 因此本轮的处理是：托管 Neon 的 `service_tier` 既不在上游请求里下发（否则实际
 * 服务档位与计费档位仍可能不同），也不作为账本/下发 cost/响应档位的证据——三者
 * 统一按 Standard。价目表里的 Flex/Priority 倍率保留，供将来接通可信档位回传后
 * 再启用；在那之前 **Flex / Priority 端到端尚未支持**。
 *
 * 调用方需传**别名解析后的实际模型名**（见 resolvePlatformEffectiveModel）。
 */
export const isHostedGeminiNeonStandardOnlyWire = (
  provider?: string | null,
  model?: string | null,
): boolean =>
  asTrimmedLowercaseString(provider) === "nolo" && isGeminiNeonModel(model);
