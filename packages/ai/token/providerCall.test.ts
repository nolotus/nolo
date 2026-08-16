import { describe, expect, it } from "bun:test";
import {
  buildProviderCallKey,
  createProviderCallCompletedEvent,
  createProviderCallFailedEvent,
  createProviderCallPendingEvent,
} from "./providerCall";

describe("provider-call event contract", () => {
  it("builds stable append-only keys from provider call id and event id", () => {
    expect(buildProviderCallKey("call_123", "evt_456")).toBe(
      "provider-call-call_123-event-evt_456"
    );
  });

  it("records pending and completed events with explicit units", () => {
    const pending = createProviderCallPendingEvent({
      providerCallId: "call_123",
      eventId: "evt_pending",
      userId: "user_1",
      dialogId: "dialog_1",
      agentId: "agent_1",
      provider: "openai",
      model: "gpt-5.5-pro",
      endpoint: "responses",
      serviceTier: "flex",
      credential: {
        credentialId: "cred_openai_platform_env_abc",
        credentialFingerprint: "sha256:abc",
        providerAccountKey: "provider-account-openai-alpha-openai-main",
        apiKeySource: "platform_env",
        providerAccountAlias: "openai-main",
        environment: "alpha",
      },
      startedAt: "2026-05-25T00:00:00.000Z",
    });

    const completed = createProviderCallCompletedEvent({
      providerCallId: "call_123",
      eventId: "evt_completed",
      userId: "user_1",
      dialogId: "dialog_1",
      agentId: "agent_1",
      provider: "openai",
      model: "gpt-5.5-pro",
      endpoint: "responses",
      serviceTier: "flex",
      credential: {
        credentialId: "cred_openai_platform_env_abc",
        credentialFingerprint: "sha256:abc",
        providerAccountKey: "provider-account-openai-alpha-openai-main",
        apiKeySource: "platform_env",
        providerAccountAlias: "openai-main",
        environment: "alpha",
      },
      startedAt: "2026-05-25T00:00:00.000Z",
      completedAt: "2026-05-25T00:00:05.000Z",
      inputTokens: 113906,
      outputTokens: 5378,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      rawProviderCost: 4.38429,
      rawProviderCurrency: "USD",
      platformCredits: 35.07432,
      pricingVersion: "test-v1",
      billingStatus: "pending_ledger",
    });

    expect(pending.status).toBe("pending");
    expect(completed.status).toBe("completed");
    expect(completed.usage.inputTokens).toBe(113906);
    expect(completed.cost.rawProviderCurrency).toBe("USD");
    expect(completed.credential?.providerAccountKey).toBe(
      "provider-account-openai-alpha-openai-main"
    );
  });

  it("records failed physical provider attempts as terminal billing failures", () => {
    const failed = createProviderCallFailedEvent({
      providerCallId: "call_failed",
      eventId: "evt_failed",
      userId: "user_1",
      dialogId: "dialog_1",
      agentId: "agent_1",
      provider: "openai",
      model: "gpt-5.5-pro",
      endpoint: "chat.completions",
      serviceTier: "default",
      startedAt: "2026-05-25T00:00:00.000Z",
      failedAt: "2026-05-25T00:00:01.000Z",
      error: {
        name: "TypeError",
        message: "fetch failed",
      },
    });

    expect(failed.status).toBe("failed");
    expect(failed.billingStatus).toBe("failed");
    expect(failed.error.message).toBe("fetch failed");
  });
});
