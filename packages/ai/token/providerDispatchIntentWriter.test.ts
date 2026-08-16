import { describe, expect, it, mock } from "bun:test";

import { createProviderDispatchIntent } from "./providerDispatchIntent";
import { writeProviderDispatchIntent } from "./providerDispatchIntentWriter";

const intent = createProviderDispatchIntent({
  providerCallId: "call_123",
  intentId: "intent_456",
  userId: "user-1",
  provider: "openai",
  model: "gpt-5.4",
  url: "https://api.openai.com/v1/chat/completions",
  method: "POST",
  bodyHash: "sha256:abc123",
  createdAt: "2026-05-26T10:00:00.000Z",
});

describe("writeProviderDispatchIntent", () => {
  it("writes append-only dispatch intents under deterministic keys", async () => {
    const written: Record<string, unknown> = {};
    const store = {
      get: mock(async () => {
        const error: any = new Error("not found");
        error.code = "LEVEL_NOT_FOUND";
        throw error;
      }),
      put: mock(async (key: string, value: unknown) => {
        written[key] = value;
      }),
    };

    const result = await writeProviderDispatchIntent({ store, intent });

    expect(result).toEqual({
      key: "provider-dispatch-intent-call_123-intent_456",
    });
    expect(written["provider-dispatch-intent-call_123-intent_456"]).toEqual(
      intent,
    );
  });

  it("refuses to overwrite an existing dispatch intent", async () => {
    const store = {
      get: mock(async () => ({ existing: true })),
      put: mock(async () => undefined),
    };

    await expect(
      writeProviderDispatchIntent({ store, intent }),
    ).rejects.toThrow(
      "provider dispatch intent already exists: provider-dispatch-intent-call_123-intent_456",
    );
    expect(store.put).not.toHaveBeenCalled();
  });
});
