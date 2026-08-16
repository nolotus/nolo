import { describe, expect, it } from "bun:test";
import {
  buildProviderBillableEventKey,
  createProviderBillableEvent,
} from "./providerBillableEvent";

describe("provider billable event contract", () => {
  it("builds stable append-only keys", () => {
    expect(buildProviderBillableEventKey("billable_123")).toBe(
      "provider-billable-event-billable_123"
    );
  });

  it("records OpenAI text usage with source provider calls", () => {
    const event = createProviderBillableEvent({
      eventId: "billable_openai",
      operationId: "turn_1",
      sourceProviderCallIds: ["call_openai_1"],
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-1",
      provider: "openai",
      model: "gpt-5.4",
      endpoint: "chat.completions",
      kind: "llm_tokens",
      usage: {
        inputTokens: 300_000,
        outputTokens: 1_000_000,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    expect(event).toMatchObject({
      id: "billable_openai",
      kind: "llm_tokens",
      provider: "openai",
      model: "gpt-5.4",
      sourceProviderCallIds: ["call_openai_1"],
      usage: {
        inputTokens: 300_000,
        outputTokens: 1_000_000,
      },
      status: "unrated",
    });
  });

  it("records DeepInfra text usage with the actual fallback provider model", () => {
    const event = createProviderBillableEvent({
      eventId: "billable_deepinfra",
      operationId: "turn_2",
      sourceProviderCallIds: ["call_fireworks_1", "call_deepinfra_1"],
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-kimi",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      endpoint: "chat.completions",
      kind: "llm_tokens",
      usage: {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    expect(event.provider).toBe("deepinfra");
    expect(event.model).toBe("moonshotai/Kimi-K2.6");
    expect(event.sourceProviderCallIds).toEqual([
      "call_fireworks_1",
      "call_deepinfra_1",
    ]);
  });

  it("records DeepInfra OCR as a tool unit billable event", () => {
    const event = createProviderBillableEvent({
      eventId: "billable_ocr",
      operationId: "tool_ocr_1",
      sourceProviderCallIds: [],
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-ocr",
      provider: "deepinfra",
      model: "deepseek-ai/DeepSeek-OCR",
      endpoint: "external_tool",
      kind: "external_tool_tokens",
      toolId: "deepseek-ai/DeepSeek-OCR",
      usage: {
        inputTokens: 200_000,
        outputTokens: 40_000,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    expect(event.kind).toBe("external_tool_tokens");
    expect(event.toolId).toBe("deepseek-ai/DeepSeek-OCR");
    expect(event.provider).toBe("deepinfra");
  });

  it("marks estimated usage as needing reconciliation", () => {
    const event = createProviderBillableEvent({
      eventId: "billable_estimated",
      operationId: "turn_3",
      sourceProviderCallIds: ["call_missing_usage"],
      userId: "user-1",
      provider: "openai",
      model: "gpt-5.4-pro",
      endpoint: "responses",
      kind: "llm_tokens",
      usage: {
        inputTokens: 1,
        outputTokens: 5,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      estimated: true,
      estimateReason: "stream_final_usage_missing",
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    expect(event.needsReconciliation).toBe(true);
    expect(event.estimateReason).toBe("stream_final_usage_missing");
  });
});
