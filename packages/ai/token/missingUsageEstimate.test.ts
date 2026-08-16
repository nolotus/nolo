import { describe, expect, it } from "bun:test";

import { estimateMissingUsage } from "./missingUsageEstimate";

describe("estimateMissingUsage", () => {
  it("creates a conservative billable usage estimate from assistant text", () => {
    expect(
      estimateMissingUsage({
        content: "hello world".repeat(100),
        minimumOutputTokens: 16,
      })
    ).toEqual({
      input_tokens: 0,
      output_tokens: 275,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      billing_estimated: true,
    });
  });

  it("still returns a minimum usage record for empty non-custom paid responses", () => {
    expect(estimateMissingUsage({ content: "" })).toEqual({
      input_tokens: 0,
      output_tokens: 1,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      billing_estimated: true,
    });
  });
});
