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
