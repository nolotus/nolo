import { describe, expect, test } from "bun:test";

import { resolveStreamEndBillingUsages } from "./messageStreamEndBilling";

describe("resolveStreamEndBillingUsages", () => {
  test("passes through reported usage for non-image agents", () => {
    const totalUsage = { prompt_tokens: 1, completion_tokens: 2 };
    const result = resolveStreamEndBillingUsages({
      agentConfig: { provider: "openai", model: "gpt-4.1" },
      totalUsage,
      finalVisibleContent: "hello",
    });
    expect(result.hasReportedUsage).toBe(true);
    expect(result.billedUsage).toEqual(totalUsage);
    expect(result.titleEligible).toBe(true);
  });

  test("treats provider_call_id-only metadata usage as not hasReportedUsage and preserves provider_call_id in estimated billing", () => {
    const totalUsage = { provider_call_id: "pcall-meta-only-123" };
    const result = resolveStreamEndBillingUsages({
      agentConfig: { provider: "deepseek", model: "deepseek-v4-flash" },
      totalUsage,
      finalVisibleContent: "Here is the response text.",
    });
    expect(result.hasReportedUsage).toBe(false);
    expect((result.billedEstimatedUsage as any)?.provider_call_id).toBe(
      "pcall-meta-only-123",
    );
    expect((result.billedEstimatedUsage as any)?.billing_estimated).toBe(true);
    expect((result.billedEstimatedUsage as any)?.output_tokens).toBeGreaterThan(
      0,
    );
  });

  test("treats explicit zero usage as reported rather than estimated", () => {
    const result = resolveStreamEndBillingUsages({
      agentConfig: { provider: "deepseek", model: "deepseek-v4-flash" },
      totalUsage: {
        provider_call_id: "pcall-zero-123",
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
      finalVisibleContent: "response",
    });
    expect(result.hasReportedUsage).toBe(true);
  });

  test("marks title ineligible for empty content", () => {
    const result = resolveStreamEndBillingUsages({
      agentConfig: { provider: "openai", model: "gpt-4.1" },
      totalUsage: null,
      finalVisibleContent: "   ",
    });
    expect(result.hasReportedUsage).toBe(false);
    expect(result.titleEligible).toBe(false);
  });
});
