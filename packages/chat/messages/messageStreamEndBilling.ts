// Wave17 — pure billing usage shaping for messageStreamEnd (Redux-free).

import { estimateMissingUsage } from "ai/token/missingUsageEstimate";
import type { MessageContentPart } from "./types";
import {
  countImageGenerationOutputsInContent,
  isOpenAIBuiltInImageGenerationAgent,
  withImageGenerationCount,
} from "ai/token/openaiImageGenerationUsage";
import { serializeMessageContent } from "./messageContent";

export type StreamEndBillingUsages = {
  imageGenerationCount: number;
  billedUsage: unknown;
  billedEstimatedUsage: unknown;
  hasReportedUsage: boolean;
  /** Non-empty text/image placeholder content suitable for updateDialogTitle. */
  titleEligible: boolean;
};

/**
 * Shape provider usage (or an estimate) for updateTokens, applying image
 * generation count only for OpenAI built-in image agents.
 */
export function resolveStreamEndBillingUsages(input: {
  agentConfig: any;
  totalUsage: any;
  /**
   * 就是 Message.content：字符串或 OpenAI 风格的多模态数组。以前写的是 unknown，
   * 比调用方实际传的更宽，导致往下传给 countImageGenerationOutputsInContent
   * （其签名是 string | any[] | null | undefined）时类型对不上。
   */
  finalVisibleContent: string | MessageContentPart[];
}): StreamEndBillingUsages {
  const { agentConfig, totalUsage, finalVisibleContent } = input;
  const imageGenerationCount =
    countImageGenerationOutputsInContent(finalVisibleContent);
  const billedUsage = isOpenAIBuiltInImageGenerationAgent(agentConfig)
    ? withImageGenerationCount(totalUsage, imageGenerationCount)
    : totalUsage;
  const rawEstimatedUsage = estimateMissingUsage({
    content: finalVisibleContent,
  });
  const providerCallId =
    typeof totalUsage === "object" && totalUsage !== null
      ? (totalUsage as { provider_call_id?: string }).provider_call_id
      : undefined;
  const estimatedUsage = providerCallId
    ? { ...rawEstimatedUsage, provider_call_id: providerCallId }
    : rawEstimatedUsage;
  const billedEstimatedUsage = isOpenAIBuiltInImageGenerationAgent(agentConfig)
    ? withImageGenerationCount(estimatedUsage, imageGenerationCount)
    : estimatedUsage;
  const titleEligibleContent =
    serializeMessageContent(finalVisibleContent, "[图片]") ?? "";

  // Presence of an explicit provider usage field is authoritative, including
  // an explicit zero. Only a metadata-only snapshot (for example
  // `{provider_call_id}`) may use the estimated fallback.
  const hasReportedTokens = Boolean(
    totalUsage &&
      typeof totalUsage === "object" &&
      ([
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "input_tokens",
        "output_tokens",
      ].some((field) => Object.prototype.hasOwnProperty.call(totalUsage, field)) ||
        (Object.prototype.hasOwnProperty.call(totalUsage, "cost") &&
          typeof totalUsage.cost === "number")),
  );

  return {
    imageGenerationCount,
    billedUsage,
    billedEstimatedUsage,
    hasReportedUsage: hasReportedTokens,
    titleEligible: titleEligibleContent.trim() !== "",
  };
}
