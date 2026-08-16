import { describe, expect, it } from "bun:test";
import { createProviderCallPendingEvent } from "./providerCall";
import { writeProviderCallEvent } from "./providerCallWriter";

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

describe("writeProviderCallEvent", () => {
  it("writes append-only provider-call events under deterministic keys", async () => {
    const store = createMemoryStore();
    const event = createProviderCallPendingEvent({
      providerCallId: "call_123",
      eventId: "evt_pending",
      userId: "user_1",
      provider: "openai",
      model: "gpt-5.5-pro",
      startedAt: "2026-05-25T00:00:00.000Z",
    });

    const result = await writeProviderCallEvent({ store, event });

    expect(result.key).toBe("provider-call-call_123-event-evt_pending");
    expect(store.records.get(result.key)).toEqual(event);
  });

  it("refuses to overwrite an existing provider-call event", async () => {
    const store = createMemoryStore();
    const event = createProviderCallPendingEvent({
      providerCallId: "call_123",
      eventId: "evt_pending",
      userId: "user_1",
      provider: "openai",
      model: "gpt-5.5-pro",
      startedAt: "2026-05-25T00:00:00.000Z",
    });

    await writeProviderCallEvent({ store, event });

    await expect(writeProviderCallEvent({ store, event })).rejects.toThrow(
      "provider-call event already exists"
    );
  });
});
