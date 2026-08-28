import { describe, expect, it } from "bun:test";
import { resolveImageGenerationStreamingState } from "./streamAgentChatTurnUtils";

describe("resolveImageGenerationStreamingState", () => {
  it("enables waiting state for explicit chatgpt web image tool agents", () => {
    const state = resolveImageGenerationStreamingState({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      tools: ["chatgptWebImageGenerate"],
    } as any);

    expect(state).toMatchObject({
      kind: "image_generation",
      stage: "submitted",
    });
    expect(state?.waitHint).toContain("网页生图");
  });

  it("keeps waiting state when imageConfig.enabled is true", () => {
    const state = resolveImageGenerationStreamingState({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      imageConfig: { enabled: true },
    } as any);
    expect(state?.kind).toBe("image_generation");
  });

  it("returns undefined for plain chat agents", () => {
    const state = resolveImageGenerationStreamingState({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      tools: ["queryTableRows"],
    } as any);
    expect(state).toBeUndefined();
  });
});
