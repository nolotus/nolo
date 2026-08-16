import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const billingCoreSource = readFileSync(
  fileURLToPath(new URL("./messageStreamEndBilling.ts", import.meta.url)),
  "utf8"
);
const messageSliceSource = readFileSync(
  fileURLToPath(new URL("./messageSlice.ts", import.meta.url)),
  "utf8"
);

describe("messageStreamEnd billing source contract", () => {
  it("counts generated image outputs in the billing core", () => {
    expect(billingCoreSource).toContain(
      "countImageGenerationOutputsInContent(finalVisibleContent)"
    );
  });

  it("adds image_generation_count only for OpenAI built-in image generation agents", () => {
    expect(billingCoreSource).toContain(
      "isOpenAIBuiltInImageGenerationAgent(agentConfig)"
    );
    expect(billingCoreSource).toContain(
      "withImageGenerationCount(totalUsage, imageGenerationCount)"
    );
    expect(billingCoreSource).toContain(
      "withImageGenerationCount(estimatedUsage, imageGenerationCount)"
    );
  });

  it("passes billed usage through updateTokens from messageSlice", () => {
    expect(messageSliceSource).toContain("resolveStreamEndBillingUsages");
    expect(messageSliceSource).toContain("billingUsageRecords?.length");
    expect(messageSliceSource).toContain("for (const usageRecord of usageRecords)");
    expect(messageSliceSource).toContain("await dispatch(");
    expect(messageSliceSource).toContain(").unwrap();");
    expect(messageSliceSource).toContain("usage: billedEstimatedUsage");
  });
});
