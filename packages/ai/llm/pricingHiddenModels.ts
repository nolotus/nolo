// packages/ai/llm/pricingHiddenModels.ts
//
// 价格页不展示的模型：产品层已被更新一代替代，但 catalog 条目**必须保留**。
//
// 为什么删不得：packages/core/builtinAgentCatalog.ts 里 kimi-k2.6 / gpt-5.6-terra
// 等是 lifecycle:"retired" 的 internal 兼容条目，注释写明「保留仅为存量 Agent 记录的
// 运行时兼容」。删掉条目会让历史 agent 记录解析不到模型、存量对话直接报错。
//
// 所以「下线」在这里的含义是**展示层下线**：价格页、模型对比不再列出，运行与计费
// 路径照旧。新增下线模型只改这张集合，不要去删 catalog。
export const PRICING_HIDDEN_MODELS: ReadonlySet<string> = new Set([
  // 已被 Kimi K3 替代；旧 id 仅用于存量 agent 运行时兼容。
  "kimi-k2.6",
  // 已被 GPT-6 系列替代；旧 id 仅用于存量 agent 运行时兼容。
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  // 已被 Gemini 4 Argon / 3.8 Flash 取代。
  "gemini-2.5-pro",
  // 已被 Claude Haiku 5.5 取代（5.5 已上架）；条目保留供存量记录解析。
  "anthropic/claude-haiku-4-5",
]);

/** 某模型是否应在价格页隐藏。未知/空值一律 false（不误杀）。 */
export const isHiddenFromPricing = (
  provider?: string | null,
  model?: string | null
): boolean => {
  if (typeof model !== "string") return false;
  const trimmed = model.trim();
  if (!trimmed) return false;
  // provider 目前不参与判定（这些 id 在 catalog 里唯一），保留参数是为了与
  // shouldHideKimiAliasFromPricing 的调用形状一致，后续要按 provider 细分时不必改签名。
  void provider;
  return PRICING_HIDDEN_MODELS.has(trimmed);
};
