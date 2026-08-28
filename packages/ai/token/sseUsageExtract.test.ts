import { describe, expect, it } from "bun:test";
import {
  extractUsageFromSsePayload,
  hasUsageTokens,
} from "./sseUsageExtract";

describe("sseUsageExtract", () => {
  it("extracts top-level usage from chat.completions frames", () => {
    expect(extractUsageFromSsePayload({ usage: { prompt_tokens: 8, completion_tokens: 2 } })).toEqual({
      prompt_tokens: 8,
      completion_tokens: 2,
    });
  });

  it("extracts nested usage from Responses response.completed frames", () => {
    expect(
      extractUsageFromSsePayload({
        type: "response.completed",
        response: { usage: { input_tokens: 30, output_tokens: 5 } },
      }),
    ).toEqual({ input_tokens: 30, output_tokens: 5 });
  });

  it("ignores billing-only usage lookalikes (no token fields)", () => {
    expect(
      extractUsageFromSsePayload({ usage: { billing_provider: "deepseek", cost: 0.004 } }),
    ).toBeUndefined();
    expect(hasUsageTokens({ billing_provider: "deepseek" })).toBe(false);
  });

  it("accepts total_tokens-only and zero-token frames as real usage", () => {
    // total_tokens-only（部分 provider 只回总 token）与全零帧都是合法 usage，
    // 不能被误判为 billing 元数据（hasUsageTokens 用有限数门槛而非 > 0）。
    expect(
      extractUsageFromSsePayload({ usage: { total_tokens: 7 } }),
    ).toEqual({ total_tokens: 7 });
    expect(
      extractUsageFromSsePayload({ usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }),
    ).toEqual({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
    expect(hasUsageTokens({ prompt_tokens: 0, total_tokens: 0 })).toBe(true);
  });

  it("ignores non-usage frames", () => {
    expect(extractUsageFromSsePayload({ type: "response.output_text.delta", delta: "hi" })).toBeUndefined();
    expect(extractUsageFromSsePayload({ choices: [{ delta: { content: "hi" } }] })).toBeUndefined();
    expect(extractUsageFromSsePayload(null)).toBeUndefined();
    expect(extractUsageFromSsePayload(undefined)).toBeUndefined();
  });
});
