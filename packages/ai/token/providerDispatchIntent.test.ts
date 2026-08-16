import { describe, expect, it } from "bun:test";

import {
  buildProviderDispatchIntentKey,
  createProviderDispatchIntent,
} from "./providerDispatchIntent";

describe("provider dispatch intent contract", () => {
  it("builds stable append-only keys from provider call id and intent id", () => {
    expect(buildProviderDispatchIntentKey("call_123", "intent_456")).toBe(
      "provider-dispatch-intent-call_123-intent_456",
    );
  });

  it("records dispatch evidence without storing request headers or body", () => {
    const intent = createProviderDispatchIntent({
      providerCallId: "call_123",
      intentId: "intent_456",
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-1",
      provider: "openai",
      model: "gpt-5.4",
      endpoint: "chat.completions",
      serviceTier: "default",
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      bodyHash: "sha256:abc123",
      createdAt: "2026-05-26T10:00:00.000Z",
    });

    expect(intent).toEqual({
      providerCallId: "call_123",
      intentId: "intent_456",
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-1",
      provider: "openai",
      model: "gpt-5.4",
      endpoint: "chat.completions",
      serviceTier: "default",
      request: {
        url: "https://api.openai.com/v1/chat/completions",
        method: "POST",
        bodyHash: "sha256:abc123",
      },
      status: "dispatching",
      createdAt: "2026-05-26T10:00:00.000Z",
    });
    expect(JSON.stringify(intent)).not.toContain("Authorization");
    expect(JSON.stringify(intent)).not.toContain("messages");
  });
});
