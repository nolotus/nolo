import { describe, expect, it } from "bun:test";

import { prepareStreamEndPersistInputs } from "./messageStreamEndPersistPrep";

describe("prepareStreamEndPersistInputs", () => {
  it("builds finalUsageData when completion_tokens is a non-null number", () => {
    const { finalUsageData } = prepareStreamEndPersistInputs({
      totalUsage: { completion_tokens: 42, prompt_tokens: 7 },
    });
    expect(finalUsageData).toEqual({ completion_tokens: 42 });
  });

  // Desktop local runtime reports output_tokens (agent-runtime mergeTurnUsage
  // normalizes to input_tokens/output_tokens). Reading completion_tokens only
  // made every desktop turn persist usage: null.
  it("builds finalUsageData from output_tokens (desktop local runtime shape)", () => {
    const { finalUsageData } = prepareStreamEndPersistInputs({
      totalUsage: { input_tokens: 1200, output_tokens: 350 },
    });
    expect(finalUsageData).toEqual({ completion_tokens: 350 });
  });

  it("prefers completion_tokens over output_tokens when both are present", () => {
    const { finalUsageData } = prepareStreamEndPersistInputs({
      totalUsage: { completion_tokens: 42, output_tokens: 350 },
    });
    expect(finalUsageData).toEqual({ completion_tokens: 42 });
  });

  it("falls back to output_tokens when completion_tokens is null", () => {
    const { finalUsageData } = prepareStreamEndPersistInputs({
      totalUsage: { completion_tokens: null, output_tokens: 350 },
    });
    expect(finalUsageData).toEqual({ completion_tokens: 350 });
  });

  it("returns undefined finalUsageData when completion_tokens is null", () => {
    const { finalUsageData } = prepareStreamEndPersistInputs({
      totalUsage: { completion_tokens: null },
    });
    expect(finalUsageData).toBeUndefined();
  });

  it("returns undefined finalUsageData when totalUsage is undefined", () => {
    const { finalUsageData } = prepareStreamEndPersistInputs({});
    expect(finalUsageData).toBeUndefined();
  });

  it("returns undefined finalUsageData when totalUsage is null", () => {
    const { finalUsageData } = prepareStreamEndPersistInputs({
      totalUsage: null,
    });
    expect(finalUsageData).toBeUndefined();
  });

  it("strips the transient imageGenerationState from messageMetadata", () => {
    const { otherPersistedMessageMetadata } = prepareStreamEndPersistInputs({
      messageMetadata: {
        imageGenerationState: "generating",
        keepMe: true,
      },
    });
    expect(otherPersistedMessageMetadata).not.toHaveProperty(
      "imageGenerationState",
    );
    expect(otherPersistedMessageMetadata).toHaveProperty("keepMe", true);
  });

  it("handles undefined messageMetadata without throwing", () => {
    const { otherPersistedMessageMetadata, persistedMetadata } =
      prepareStreamEndPersistInputs({});
    expect(otherPersistedMessageMetadata).toEqual({});
    expect(persistedMetadata).toBeUndefined();
  });

  it("splits the inner metadata key into persistedMetadata, leaving the rest as other fields", () => {
    const { persistedMetadata, otherPersistedMessageMetadata } =
      prepareStreamEndPersistInputs({
        messageMetadata: {
          metadata: { activity: "completed" },
          agentKey: "edge",
        },
      });
    expect(persistedMetadata).toEqual({ activity: "completed" });
    expect(otherPersistedMessageMetadata).toEqual({ agentKey: "edge" });
  });

  it("returns undefined persistedMetadata when the metadata key is absent", () => {
    const { persistedMetadata } = prepareStreamEndPersistInputs({
      messageMetadata: { onlyOther: 1 },
    });
    expect(persistedMetadata).toBeUndefined();
  });

  it("trims agentName from agentConfig.name", () => {
    const { agentName } = prepareStreamEndPersistInputs({
      agentConfig: { name: "  Agent A  " },
    });
    expect(agentName).toBe("Agent A");
  });

  it("returns undefined agentName when agentConfig.name is empty/whitespace", () => {
    const { agentName } = prepareStreamEndPersistInputs({
      agentConfig: { name: "   " },
    });
    expect(agentName).toBeUndefined();
  });

  it("returns undefined agentName when agentConfig.name is missing", () => {
    const { agentName } = prepareStreamEndPersistInputs({
      agentConfig: { name: undefined as unknown as string },
    });
    expect(agentName).toBeUndefined();
  });

  it("returns undefined agentName when agentConfig is null", () => {
    const { agentName } = prepareStreamEndPersistInputs({
      agentConfig: null,
    });
    expect(agentName).toBeUndefined();
  });
});