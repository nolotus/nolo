import { describe, expect, it } from "bun:test";
import { updateTotalUsage } from "./updateTotalUsage";

describe("updateTotalUsage", () => {
  it("preserves billing metadata from a later usage-only event", () => {
    const usageWithTokens = updateTotalUsage(null, {
      prompt_tokens: 120,
      completion_tokens: 30,
    });

    const mergedUsage = updateTotalUsage(usageWithTokens, {
      billing_provider: "deepinfra",
      billing_model: "moonshotai/Kimi-K2.6",
    });

    expect(mergedUsage).toMatchObject({
      prompt_tokens: 120,
      completion_tokens: 30,
      billing_provider: "deepinfra",
      billing_model: "moonshotai/Kimi-K2.6",
    });
  });

  it("maps Responses API usage naming (input_tokens/output_tokens) to internal fields on first chunk", () => {
    const usage = updateTotalUsage(null, {
      input_tokens: 10,
      output_tokens: 5,
      total_tokens: 15,
      input_tokens_details: { cached_tokens: 2 },
      output_tokens_details: { reasoning_tokens: 3 },
    } as any);

    expect(usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
      input_tokens: 10,
      output_tokens: 5,
      input_tokens_details: { cached_tokens: 2 },
      output_tokens_details: { reasoning_tokens: 3 },
      prompt_tokens_details: { cached_tokens: 2 },
      completion_tokens_details: { reasoning_tokens: 3 },
    });
  });

  it("merges Responses details into existing usage without dropping prior values", () => {
    const first = updateTotalUsage(null, {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    } as any)!;
    const merged = updateTotalUsage(first, {
      input_tokens_details: { cached_tokens: 2 },
      output_tokens_details: { reasoning_tokens: 3 },
    } as any);

    expect(merged?.prompt_tokens).toBe(10);
    expect(merged?.completion_tokens).toBe(5);
    expect(merged?.total_tokens).toBe(15);
    expect(merged?.prompt_tokens_details).toEqual({ cached_tokens: 2 });
    expect(merged?.completion_tokens_details).toEqual({ reasoning_tokens: 3 });
  });

  it("keeps Chat Completions naming unchanged", () => {
    const usage = updateTotalUsage(null, {
      prompt_tokens: 7,
      completion_tokens: 3,
      total_tokens: 10,
      prompt_tokens_details: { cached_tokens: 1 },
      completion_tokens_details: { reasoning_tokens: 2 },
    });

    expect(usage?.prompt_tokens).toBe(7);
    expect(usage?.completion_tokens).toBe(3);
    expect(usage?.total_tokens).toBe(10);
    expect(usage?.prompt_tokens_details).toEqual({ cached_tokens: 1 });
    expect(usage?.completion_tokens_details).toEqual({ reasoning_tokens: 2 });
  });

  it("returns null when chunk is empty", () => {
    expect(updateTotalUsage(null, null as any)).toBeNull();
  });
});
