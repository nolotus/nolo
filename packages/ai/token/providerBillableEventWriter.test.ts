import { describe, expect, it } from "bun:test";
import { createProviderBillableEvent } from "./providerBillableEvent";
import { writeProviderBillableEvent } from "./providerBillableEventWriter";

const createMemoryStore = () => {
  const records = new Map<string, unknown>();
  return {
    records,
    async get(key: string) {
      return records.get(key);
    },
    async put(key: string, value: unknown) {
      records.set(key, value);
    },
  };
};

describe("writeProviderBillableEvent", () => {
  it("writes append-only provider billable events under deterministic keys", async () => {
    const store = createMemoryStore();
    const event = createProviderBillableEvent({
      eventId: "billable_123",
      operationId: "turn_1",
      sourceProviderCallIds: ["call_123"],
      userId: "user_1",
      provider: "openai",
      model: "gpt-5.4",
      endpoint: "chat.completions",
      kind: "llm_tokens",
      usage: {
        inputTokens: 100,
        outputTokens: 20,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    const result = await writeProviderBillableEvent({ store, event });

    expect(result.key).toBe("provider-billable-event-billable_123");
    expect(store.records.get(result.key)).toEqual(event);
  });

  it("refuses to overwrite an existing provider billable event", async () => {
    const store = createMemoryStore();
    const event = createProviderBillableEvent({
      eventId: "billable_123",
      operationId: "turn_1",
      sourceProviderCallIds: ["call_123"],
      userId: "user_1",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      kind: "llm_tokens",
      usage: {
        inputTokens: 100,
        outputTokens: 20,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    await writeProviderBillableEvent({ store, event });

    await expect(writeProviderBillableEvent({ store, event })).rejects.toThrow(
      "provider billable event already exists"
    );
  });

  it("treats LEVEL_NOT_FOUND from the store as an empty append slot", async () => {
    const records = new Map<string, unknown>();
    const store = {
      records,
      async get() {
        const error: any = new Error("not found");
        error.code = "LEVEL_NOT_FOUND";
        throw error;
      },
      async put(key: string, value: unknown) {
        records.set(key, value);
      },
    };
    const event = createProviderBillableEvent({
      eventId: "billable_456",
      operationId: "tool_1",
      sourceProviderCallIds: [],
      userId: "user_1",
      provider: "deepinfra",
      model: "deepseek-ai/DeepSeek-OCR",
      kind: "external_tool_tokens",
      toolId: "deepseek-ai/DeepSeek-OCR",
      usage: {
        inputTokens: 100,
        outputTokens: 20,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    const result = await writeProviderBillableEvent({ store, event });

    expect(result.key).toBe("provider-billable-event-billable_456");
    expect(records.get(result.key)).toEqual(event);
  });
});
