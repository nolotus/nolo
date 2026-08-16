import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

import { normalizeUsage } from "./normalizeUsage";

const normalizeUsageSource = readFileSync(new URL("./normalizeUsage.ts", import.meta.url), "utf8");
const tokenTypesSource = readFileSync(new URL("./types.ts", import.meta.url), "utf8");

describe("normalizeUsage source contract", () => {
  it("normalizes OpenAI cached input tokens from input token details", () => {
    expect(
      normalizeUsage({
        input_tokens: 1_000,
        output_tokens: 50,
        input_tokens_details: {
          cached_tokens: 800,
        },
      } as any)
    ).toMatchObject({
      input_tokens: 1_000,
      output_tokens: 50,
      cache_read_input_tokens: 800,
      cache_creation_input_tokens: 0,
    });
  });

  it("normalizes prompt token details cached tokens without losing total input", () => {
    expect(
      normalizeUsage({
        prompt_tokens: 2_000,
        completion_tokens: 75,
        total_tokens: 2_075,
        prompt_tokens_details: {
          cached_tokens: 1_500,
        },
      } as any)
    ).toMatchObject({
      input_tokens: 2_000,
      output_tokens: 75,
      cache_read_input_tokens: 1_500,
    });
  });

  it("writes image_generation_count into normalized usage only once", () => {
    const returnBlock = normalizeUsageSource.match(/return \{[\s\S]*?\n  \};/)?.[0];
    expect(returnBlock).toBeDefined();
    const occurrences =
      returnBlock?.match(/\?\s*\{\s*image_generation_count:\s*imageGenerationCount\s*\}\s*:\s*\{\}/g) ??
      [];
    expect(occurrences.length).toBe(1);
  });

  it("declares image_generation_count once on TokenRecord", () => {
    const tokenRecordBlock = tokenTypesSource.match(
      /export interface TokenRecord \{[\s\S]*?\n\}/
    )?.[0];

    expect(tokenRecordBlock).toBeDefined();
    const occurrences = tokenRecordBlock?.match(/image_generation_count\?: number;/g) ?? [];
    expect(occurrences.length).toBe(1);
  });
});
