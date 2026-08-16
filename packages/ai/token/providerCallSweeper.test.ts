import { describe, expect, it, mock } from "bun:test";

import {
  createProviderCallCompletedEvent,
  createProviderCallFailedEvent,
  createProviderCallPendingEvent,
} from "./providerCall";
import { buildProviderCallKey } from "./providerCall";
import {
  buildProviderDispatchIntentKey,
  createProviderDispatchIntent,
} from "./providerDispatchIntent";
import {
  sweepStaleProviderCalls,
  STALE_PROVIDER_CALL_DEFAULT_TIMEOUT_MS,
} from "./providerCallSweeper";

function createMemoryStore(initial: Record<string, unknown>) {
  const rows = { ...initial };
  return {
    rows,
    get: mock(async (key: string) => {
      if (key in rows) return rows[key];
      const error: any = new Error("not found");
      error.code = "LEVEL_NOT_FOUND";
      throw error;
    }),
    put: mock(async (key: string, value: unknown) => {
      rows[key] = value;
    }),
    async *iterator(options: { gte?: string; lte?: string }) {
      for (const key of Object.keys(rows).sort()) {
        if (options.gte && key < options.gte) continue;
        if (options.lte && key > options.lte) continue;
        yield [key, rows[key]] as [string, unknown];
      }
    },
  };
}

describe("sweepStaleProviderCalls", () => {
  it("records a deterministic anomaly for pending provider calls past the SLA", async () => {
    const pending = createProviderCallPendingEvent({
      providerCallId: "call_01",
      eventId: "evt_pending",
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-1",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      endpoint: "chat.completions",
      startedAt: "2026-05-26T09:00:00.000Z",
    });
    const store = createMemoryStore({
      [buildProviderCallKey(pending.providerCallId, pending.eventId)]: pending,
    });

    const result = await sweepStaleProviderCalls({
      store,
      nowMs: Date.parse("2026-05-26T09:20:00.000Z"),
      timeoutMs: 10 * 60_000,
    });

    expect(result).toEqual({
      scannedProviderCalls: 1,
      stalePendingCalls: 1,
      anomaliesWritten: 1,
      anomaliesAlreadyExisted: 0,
    });
    expect(store.rows["billing-anomaly-anom_provider_call_pending_timeout_call_01"]).toEqual(
      expect.objectContaining({
        id: "anom_provider_call_pending_timeout_call_01",
        kind: "provider_call_pending_timeout",
        severity: "critical",
        stage: "reconciliation",
        userId: "user-1",
        dialogId: "dialog-1",
        agentId: "agent-1",
        provider: "deepinfra",
        model: "moonshotai/Kimi-K2.6",
        providerCallId: "call_01",
        message: "Provider call stayed pending past the billing SLA",
        evidence: expect.objectContaining({
          pendingEventId: "evt_pending",
          pendingAgeMs: 20 * 60_000,
          timeoutMs: 10 * 60_000,
        }),
      })
    );
  });

  it("does not flag provider calls that already have terminal evidence", async () => {
    const pending = createProviderCallPendingEvent({
      providerCallId: "call_02",
      eventId: "evt_pending",
      userId: "user-1",
      provider: "openai",
      model: "gpt-5.4",
      startedAt: "2026-05-26T09:00:00.000Z",
    });
    const completed = createProviderCallCompletedEvent({
      providerCallId: "call_02",
      eventId: "evt_completed",
      userId: "user-1",
      provider: "openai",
      model: "gpt-5.4",
      startedAt: "2026-05-26T09:00:00.000Z",
      completedAt: "2026-05-26T09:01:00.000Z",
      inputTokens: 1,
      outputTokens: 1,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      billingStatus: "pending_ledger",
    });
    const failed = createProviderCallFailedEvent({
      providerCallId: "call_03",
      eventId: "evt_failed",
      userId: "user-1",
      provider: "openai",
      model: "gpt-5.4",
      startedAt: "2026-05-26T08:00:00.000Z",
      failedAt: "2026-05-26T08:01:00.000Z",
      error: { message: "failed" },
    });
    const store = createMemoryStore({
      [buildProviderCallKey(pending.providerCallId, pending.eventId)]: pending,
      [buildProviderCallKey(completed.providerCallId, completed.eventId)]: completed,
      [buildProviderCallKey(failed.providerCallId, failed.eventId)]: failed,
    });

    const result = await sweepStaleProviderCalls({
      store,
      nowMs: Date.parse("2026-05-26T09:30:00.000Z"),
      timeoutMs: 10 * 60_000,
    });

    expect(result.stalePendingCalls).toBe(0);
    expect(Object.keys(store.rows).some((key) => key.startsWith("billing-anomaly-"))).toBe(false);
  });

  it("does not duplicate an existing pending-timeout anomaly", async () => {
    const pending = createProviderCallPendingEvent({
      providerCallId: "call_04",
      eventId: "evt_pending",
      userId: "user-1",
      provider: "openai",
      model: "gpt-5.4",
      startedAt: "2026-05-26T09:00:00.000Z",
    });
    const existingAnomaly = {
      id: "anom_provider_call_pending_timeout_call_04",
      kind: "provider_call_pending_timeout",
    };
    const store = createMemoryStore({
      [buildProviderCallKey(pending.providerCallId, pending.eventId)]: pending,
      "billing-anomaly-anom_provider_call_pending_timeout_call_04": existingAnomaly,
    });

    const result = await sweepStaleProviderCalls({
      store,
      nowMs: Date.parse("2026-05-26T09:20:00.000Z"),
      timeoutMs: STALE_PROVIDER_CALL_DEFAULT_TIMEOUT_MS,
    });

    expect(result).toEqual({
      scannedProviderCalls: 1,
      stalePendingCalls: 1,
      anomaliesWritten: 0,
      anomaliesAlreadyExisted: 1,
    });
    expect(store.put).not.toHaveBeenCalled();
  });

  it("classifies stale pending calls with dispatch intent as sent-unknown", async () => {
    const pending = createProviderCallPendingEvent({
      providerCallId: "call_05",
      eventId: "evt_pending",
      userId: "user-1",
      dialogId: "dialog-1",
      provider: "openai",
      model: "gpt-5.4",
      endpoint: "chat.completions",
      startedAt: "2026-05-26T09:00:00.000Z",
    });
    const intent = createProviderDispatchIntent({
      providerCallId: "call_05",
      intentId: "intent_01",
      userId: "user-1",
      dialogId: "dialog-1",
      provider: "openai",
      model: "gpt-5.4",
      endpoint: "chat.completions",
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      bodyHash: "sha256:abc",
      createdAt: "2026-05-26T09:00:01.000Z",
    });
    const store = createMemoryStore({
      [buildProviderCallKey(pending.providerCallId, pending.eventId)]: pending,
      [buildProviderDispatchIntentKey(intent.providerCallId, intent.intentId)]: intent,
    });

    const result = await sweepStaleProviderCalls({
      store,
      nowMs: Date.parse("2026-05-26T09:20:00.000Z"),
      timeoutMs: 10 * 60_000,
    });

    expect(result).toEqual({
      scannedProviderCalls: 1,
      stalePendingCalls: 1,
      anomaliesWritten: 1,
      anomaliesAlreadyExisted: 0,
    });
    expect(store.rows["billing-anomaly-anom_provider_call_sent_unknown_call_05"]).toEqual(
      expect.objectContaining({
        id: "anom_provider_call_sent_unknown_call_05",
        kind: "provider_call_sent_unknown",
        severity: "critical",
        stage: "reconciliation",
        providerCallId: "call_05",
        message: "Provider call was dispatched but no terminal billing evidence was recorded",
        evidence: expect.objectContaining({
          dispatchIntentId: "intent_01",
          request: expect.objectContaining({
            bodyHash: "sha256:abc",
          }),
        }),
      })
    );
  });
});
