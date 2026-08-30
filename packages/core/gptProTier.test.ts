import {
  GPT_PRO_BLOCKED_MESSAGE,
  GPT_PRO_REQUIRED_RECHARGE_AMOUNT,
  isGptProModel,
  shouldBlockForGptPro,
} from "./gptProTier";

describe("isGptProModel", () => {
  it("returns true for OpenAI gpt-*-pro models", () => {
    expect(isGptProModel("openai", "gpt-5.5-pro")).toBe(true);
    expect(isGptProModel("openai", "gpt-5.6-sol-pro")).toBe(true);
    expect(isGptProModel("openai", "gpt-5.5-pro-32k")).toBe(true);
  });

  it("returns false for non-Pro OpenAI models", () => {
    expect(isGptProModel("openai", "gpt-4.1")).toBe(false);
  });

  it("returns true for deepinfra claude opus models", () => {
    expect(isGptProModel("deepinfra", "anthropic/claude-opus-5")).toBe(true);
  });

  it("returns true for deepinfra claude fable models (tier gap fix)", () => {
    expect(isGptProModel("deepinfra", "anthropic/claude-fable-5")).toBe(true);
  });

  it("returns false for deepinfra non-opus/fable claude models", () => {
    expect(isGptProModel("deepinfra", "anthropic/claude-sonnet-4")).toBe(false);
    expect(isGptProModel("deepinfra", "anthropic/claude-haiku")).toBe(false);
  });

  it("matches platform-hosted Kimi K3 exactly (nolo tier member)", () => {
    expect(isGptProModel("nolo", "kimi-k3")).toBe(true);
    expect(isGptProModel("nolo", "kimi-k3-32k")).toBe(false);
  });

  it("does not gate cheap nolo models", () => {
    expect(isGptProModel("nolo", "glm-5.3")).toBe(false);
    expect(isGptProModel("nolo", "glm-5-3-flash")).toBe(false);
    expect(isGptProModel("nolo", "kimi-k2.6")).toBe(false);
  });

  it("handles null/undefined/empty inputs gracefully", () => {
    expect(isGptProModel(null, null)).toBe(false);
    expect(isGptProModel(undefined, "kimi-k3")).toBe(false);
    expect(isGptProModel("nolo", undefined)).toBe(false);
    expect(isGptProModel("nolo", "")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isGptProModel("OpenAI", "GPT-5.5-PRO")).toBe(true);
    expect(isGptProModel("Nolo", "Kimi-K3")).toBe(true);
    expect(isGptProModel("deepinfra", "Anthropic/Claude-Opus-4-7")).toBe(true);
  });
});

describe("shouldBlockForGptPro", () => {
  it("returns blocked=false for null agent", () => {
    expect(shouldBlockForGptPro(null, undefined)).toEqual({ blocked: false });
  });

  it("returns blocked=false for CLI agents even when model matches", () => {
    expect(
      shouldBlockForGptPro(
        { provider: "nolo", model: "kimi-k3", apiSource: "cli" },
        undefined,
      ),
    ).toEqual({ blocked: false });
  });

  it("blocks nolo kimi-k3 without access", () => {
    const result = shouldBlockForGptPro(
      { provider: "nolo", model: "kimi-k3", apiSource: "platform" },
      undefined,
    );
    expect(result).toEqual({ blocked: true, message: GPT_PRO_BLOCKED_MESSAGE });
  });

  it("returns blocked=false for cheap nolo models", () => {
    expect(
      shouldBlockForGptPro(
        { provider: "nolo", model: "glm-5-3-flash", apiSource: "platform" },
        undefined,
      ),
    ).toEqual({ blocked: false });
  });

  it("returns blocked=false when gptProStatus is active", () => {
    expect(
      shouldBlockForGptPro(
        { provider: "nolo", model: "kimi-k3", apiSource: "platform" },
        "active",
      ),
    ).toEqual({ blocked: false });
  });

  it("blocked message contains the recharge threshold", () => {
    const result = shouldBlockForGptPro(
      { provider: "nolo", model: "kimi-k3", apiSource: "platform" },
      undefined,
    );
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.message).toContain(String(GPT_PRO_REQUIRED_RECHARGE_AMOUNT));
    }
  });
});
