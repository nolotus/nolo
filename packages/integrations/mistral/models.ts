import type { Model } from "ai/llm/types";

/**
 * Mistral 官方订阅（Vibe / Studio / API 共用一个订阅池）可选模型清单。
 *
 * 来源：
 * - 套餐与额度：https://mistral.ai/pricing
 *   included monthly usage 跨 Studio / API / Vibe Code 共享，超出后按 pay-as-you-go 设置决定停机或按量计费。
 * - 订阅文档：https://docs.mistral.ai/admin/billing-usage/subscriptions
 * - Vibe CLI（开源，浏览器登录最终兑换为普通 API Key）：https://github.com/mistralai/mistral-vibe
 * 接入方式：OpenAI 兼容模式
 *   Base URL: https://api.mistral.ai/v1
 *
 * 说明：
 * - 模型随订阅的 included monthly usage 抵扣，因此按订阅模板口径统一记 price 0
 *   （同 commandcode / opencode-go 的写法），不在此处编造按量单价；
 * - contextWindow 与 hasVision 取自 GET /v1/models 的 max_context_length /
 *   capabilities.vision（2026-10-07 实测：两者分别为 262144 与 true）；
 * - 模型 ID 为同次实测在案的稳定值；同一把 Key 也直接有效于标准 api.mistral.ai。
 */
export const mistralModels: Model[] = [
  // ── Vibe 编码档（订阅主打，Vibe CLI 默认用最新档）──
  {
    name: "mistral-vibe-cli-latest",
    displayName: "Mistral Vibe CLI",
    hasVision: true,
    contextWindow: 262_144,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "mistral",
    description:
      "Mistral Vibe 默认编码模型（订阅池内），面向 agentic coding。",
  },
  {
    name: "mistral-vibe-cli-fast",
    displayName: "Mistral Vibe CLI Fast",
    hasVision: true,
    contextWindow: 262_144,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "mistral",
    description: "Vibe 编码档的快档（订阅池内），与 latest 同为 262k 上下文的编码档。",
  },
  // ── 通用档 ──
  {
    name: "mistral-medium-3.5",
    displayName: "Mistral Medium 3.5",
    hasVision: true,
    contextWindow: 262_144,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "mistral",
    description: "Mistral 中档通用模型（订阅池内），多模态，适合日常问答与轻量编码。",
  },
  {
    name: "mistral-large-latest",
    displayName: "Mistral Large (latest)",
    hasVision: true,
    contextWindow: 262_144,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "mistral",
    description: "Mistral 旗舰档（订阅池内），订阅额度消耗最快，适合难题兜底。",
  },
];
