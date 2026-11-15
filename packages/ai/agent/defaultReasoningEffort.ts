import type { ReasoningEffort } from "./createAgentSchema";
import { resolveModelReasoningCapability } from "./modelReasoningCapability";

// API quality, cost and latency comparisons, 2026-11-15: https://artificialanalysis.ai/models
// These are deliberately explicit IDs: model-name effort suffixes are not parameters.
const defaults: Record<string, "medium" | "high"> = {
  "gpt-6.1-sol": "medium", "gpt-6.1-terra": "medium",
  "gpt-6-luna": "medium", "gpt-6-astra": "high",
  "claude-opus-5-5": "medium", "claude-sonnet-5-5": "high",
  "deepseek-flash": "high", "deepseek-v4-flash": "high", "deepseek-v4.1-flash": "high",
};
const deepseekChannels = new Set(["opendesign", "ollama-cloud", "lithosai"]);
const providers = new Set(["nolo", "openai", "openrouter", "anthropic", "deepseek", "commandcode", "opencode-go", "stepfun"]);

export function resolveDefaultReasoningEffort<T extends ReasoningEffort>(input: {
  provider?: string | null; model?: string | null; fallback: T;
}): T | "medium" | "high" {
  const provider = (input.provider ?? "").toLowerCase();
  const model = (input.model ?? "").toLowerCase().split("/").pop() ?? "";
  const isDeepseekFlash = ["deepseek-flash", "deepseek-v4-flash", "deepseek-v4.1-flash"].includes(model);
  const effort = providers.has(provider) || (deepseekChannels.has(provider) && isDeepseekFlash) ? defaults[model] : undefined;
  if (!effort) return input.fallback;
  // Native and hosted Claude adapters send output_config.effort.
  if (provider === "nolo" && model.startsWith("claude-") && input.model?.startsWith("anthropic/")) return effort;
  // Native Claude adaptive thinking sends output_config.effort.
  if (provider === "anthropic" && model.startsWith("claude-")) return effort;
  return resolveModelReasoningCapability(provider, input.model).efforts.includes(effort)
    ? effort : input.fallback;
}
