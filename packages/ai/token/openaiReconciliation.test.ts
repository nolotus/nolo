import { describe, expect, it } from "bun:test";

import { normalizeOpenAICompletionsUsageResponse } from "./openaiReconciliation";

describe("normalizeOpenAICompletionsUsageResponse", () => {
  it("converts OpenAI completions usage buckets into official reconciliation buckets", () => {
    const buckets = normalizeOpenAICompletionsUsageResponse({
      data: [
        {
          start_time: 1779321600,
          end_time: 1779408000,
          results: [
            {
              model: "gpt-5.4-pro-2026-03-05",
              num_model_requests: 15,
              input_tokens: 1_000,
              output_tokens: 50,
              input_cached_tokens: 100,
            },
          ],
        },
      ],
    });

    expect(buckets).toEqual([
      {
        provider: "openai",
        model: "gpt-5.4-pro-2026-03-05",
        bucketStart: "2026-05-21T00:00:00.000Z",
        bucketEnd: "2026-05-22T00:00:00.000Z",
        official: {
          requestCount: 15,
          inputTokens: 1_000,
          outputTokens: 50,
          rawProviderCostUsd: 0,
        },
        evidence: {
          inputCachedTokens: 100,
          source: "openai_completions_usage",
        },
      },
    ]);
  });
});
