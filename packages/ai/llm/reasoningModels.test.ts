import { describe, expect, test } from "bun:test";
import {
  clampReasoningEffort,
  isModelSupportReasoningEffort,
} from "./reasoningModels";
import {
  PROVIDER_REASONING_EFFORT_VALUES,
  getAvailableReasoningEfforts,
} from "../agent/createAgentSchema";

describe("clampReasoningEffort", () => {
  test("exact match passes through", () => {
    expect(clampReasoningEffort("max", "openai")).toBe("max");
    expect(clampReasoningEffort("high", "xai")).toBe("high");
    expect(clampReasoningEffort("low", "deepseek")).toBe("low");
  });

  test("kimi/moonshot preserve none so proxy can disable thinking", () => {
    expect(clampReasoningEffort("none", "kimi")).toBe("none");
    expect(clampReasoningEffort("none", "moonshot")).toBe("none");
    expect(clampReasoningEffort("off", "kimi")).toBe("none");
    expect(clampReasoningEffort("off", "moonshot")).toBe("none");
  });

  test("nearest with upward tie-break matches JSDoc examples", () => {
    // kimi supports none/low/high/max — medium is equidistant to low/high → high
    expect(clampReasoningEffort("medium", "kimi")).toBe("high");
    // deepseek supports low/high/max — xhigh equidistant to high/max → max
    expect(clampReasoningEffort("xhigh", "deepseek")).toBe("max");
    // xai max → high
    expect(clampReasoningEffort("max", "xai")).toBe("high");
    expect(clampReasoningEffort("xhigh", "xai")).toBe("high");
  });

  test("providers that cannot disable thinking clamp none upward to low", () => {
    expect(clampReasoningEffort("none", "deepseek")).toBe("low");
    expect(clampReasoningEffort("none", "xai")).toBe("low");
    expect(clampReasoningEffort("off", "deepseek")).toBe("low");
  });

  test("anthropic/google never emit reasoning_effort", () => {
    expect(clampReasoningEffort("high", "anthropic")).toBeUndefined();
    expect(clampReasoningEffort("medium", "google")).toBeUndefined();
    expect(clampReasoningEffort("none", "anthropic")).toBeUndefined();
  });

  test("unknown effort string returns undefined", () => {
    expect(clampReasoningEffort("banana", "openai")).toBeUndefined();
    expect(clampReasoningEffort("auto", "kimi")).toBeUndefined();
  });

  test("empty effort returns undefined", () => {
    expect(clampReasoningEffort(null, "openai")).toBeUndefined();
    expect(clampReasoningEffort(undefined, "openai")).toBeUndefined();
    expect(clampReasoningEffort("", "openai")).toBeUndefined();
  });

  test("unknown provider conservatively keeps low/medium/high", () => {
    expect(clampReasoningEffort("medium", "some-custom")).toBe("medium");
    expect(clampReasoningEffort("max", "some-custom")).toBe("high");
    expect(clampReasoningEffort("none", "some-custom")).toBe("low");
  });

  test("provider keys are case-insensitive", () => {
    expect(clampReasoningEffort("none", "Kimi")).toBe("none");
    expect(clampReasoningEffort("xhigh", "DeepSeek")).toBe("max");
  });
});

describe("kimi schema vs clamp contract", () => {
  test("kimi/moonshot UI options include none", () => {
    expect(PROVIDER_REASONING_EFFORT_VALUES.kimi).toContain("none");
    expect(PROVIDER_REASONING_EFFORT_VALUES.moonshot).toContain("none");
    expect(getAvailableReasoningEfforts("kimi")).toContain("none");
    expect(getAvailableReasoningEfforts("moonshot")).toContain("none");
  });
});

describe("isModelSupportReasoningEffort", () => {
  test("known reasoning models", () => {
    expect(isModelSupportReasoningEffort("deepseek-v4-flash")).toBe(true);
    expect(isModelSupportReasoningEffort("kimi-k3")).toBe(true);
    expect(isModelSupportReasoningEffort("totally-unknown-model")).toBe(false);
  });
});
