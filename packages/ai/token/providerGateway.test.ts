import { describe, expect, it, mock } from "bun:test";

import { buildProviderCallKey } from "./providerCall";
import { buildProviderDispatchIntentKey } from "./providerDispatchIntent";
import { dispatchProviderRequest, fetchWithConnectTimeout } from "./providerGateway";

function createMemoryStore() {
  const rows = new Map<string, unknown>();
  const writes: string[] = [];
  return {
    rows,
    writes,
    async get(key: string) {
      if (rows.has(key)) return rows.get(key);
      const error: any = new Error("not found");
      error.code = "LEVEL_NOT_FOUND";
      throw error;
    },
    async put(key: string, value: unknown) {
      rows.set(key, value);
      writes.push(key);
    },
  };
}

describe("dispatchProviderRequest", () => {
  it("writes pending and dispatch intent before sending the physical provider request", async () => {
    const store = createMemoryStore();
    const observedWritesBeforeFetch: string[][] = [];
    const fetchImpl = mock(async () => {
      observedWritesBeforeFetch.push([...store.writes]);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "x-request-id": "req_provider_1" },
      });
    });

    const result = await dispatchProviderRequest({
      store,
      fetchImpl,
      now: () => new Date("2026-05-26T12:00:00.000Z"),
      ids: {
        providerCallId: () => "call_01",
        pendingEventId: () => "evt_pending_01",
        dispatchIntentId: () => "intent_01",
        failedEventId: () => "evt_failed_01",
      },
      call: {
        userId: "user-1",
        dialogId: "dialog-1",
        agentId: "agent-1",
        provider: "deepinfra",
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        endpoint: "chat.completions",
        credential: {
          credentialId: "cred_deepinfra_alpha_1234",
          credentialFingerprint: "sha256:credentialhash",
          providerAccountKey: "provider-account-deepinfra-alpha-deepinfra-alpha-main",
          apiKeySource: "platform_env",
          providerAccountAlias: "deepinfra-alpha-main",
          environment: "alpha",
        },
        url: "https://api.deepinfra.com/v1/openai/chat/completions",
        init: {
          method: "POST",
          headers: { authorization: "Bearer test" },
          body: JSON.stringify({ messages: [{ role: "user", content: "secret prompt" }] }),
        },
      },
    });

    const pendingKey = buildProviderCallKey("call_01", "evt_pending_01");
    const intentKey = buildProviderDispatchIntentKey("call_01", "intent_01");
    expect(observedWritesBeforeFetch).toEqual([[pendingKey, intentKey]]);
    expect(result.providerCallId).toBe("call_01");
    expect(result.response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls as any[])[0][0]).toBe("https://api.deepinfra.com/v1/openai/chat/completions");
    expect(Object.fromEntries(new Headers((fetchImpl.mock.calls as any[])[0][1]!.headers).entries())).toEqual({
      authorization: "Bearer test",
      "x-client-request-id": "call_01",
    });

    expect(store.rows.get(pendingKey)).toEqual(
      expect.objectContaining({
        providerCallId: "call_01",
        eventId: "evt_pending_01",
        status: "pending",
        userId: "user-1",
        dialogId: "dialog-1",
        agentId: "agent-1",
        provider: "deepinfra",
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        endpoint: "chat.completions",
        credential: {
          credentialId: "cred_deepinfra_alpha_1234",
          credentialFingerprint: "sha256:credentialhash",
          providerAccountKey: "provider-account-deepinfra-alpha-deepinfra-alpha-main",
          apiKeySource: "platform_env",
          providerAccountAlias: "deepinfra-alpha-main",
          environment: "alpha",
        },
        startedAt: "2026-05-26T12:00:00.000Z",
      })
    );
    expect(store.rows.get(intentKey)).toEqual(
      expect.objectContaining({
        providerCallId: "call_01",
        intentId: "intent_01",
        status: "dispatching",
        credential: {
          credentialId: "cred_deepinfra_alpha_1234",
          credentialFingerprint: "sha256:credentialhash",
          providerAccountKey: "provider-account-deepinfra-alpha-deepinfra-alpha-main",
          apiKeySource: "platform_env",
          providerAccountAlias: "deepinfra-alpha-main",
          environment: "alpha",
        },
        request: expect.objectContaining({
          url: "https://api.deepinfra.com/v1/openai/chat/completions",
          method: "POST",
          bodyHash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
        }),
      })
    );
    expect(JSON.stringify(store.rows.get(intentKey))).not.toContain("secret prompt");
    expect(JSON.stringify(store.rows)).not.toContain("Bearer test");
  });

  it("records a failed terminal provider-call event when the physical request throws", async () => {
    const store = createMemoryStore();
    const fetchImpl = mock(async () => {
      throw new TypeError("network down");
    });

    await expect(
      dispatchProviderRequest({
        store,
        fetchImpl,
        now: () => new Date("2026-05-26T12:00:00.000Z"),
        ids: {
          providerCallId: () => "call_02",
          pendingEventId: () => "evt_pending_02",
          dispatchIntentId: () => "intent_02",
          failedEventId: () => "evt_failed_02",
        },
        call: {
          userId: "user-1",
          provider: "openai",
          model: "gpt-5.4",
          url: "https://api.openai.com/v1/chat/completions",
          init: { method: "POST" },
        },
      })
    ).rejects.toThrow("network down");

    expect(store.rows.get(buildProviderCallKey("call_02", "evt_failed_02"))).toEqual(
      expect.objectContaining({
        providerCallId: "call_02",
        eventId: "evt_failed_02",
        status: "failed",
        billingStatus: "failed",
        failedAt: "2026-05-26T12:00:00.000Z",
        error: {
          name: "TypeError",
          message: "network down",
        },
      })
    );
  });

  it("allows rotating credentials to dispatch and preserves physical request failures", async () => {
    const store = createMemoryStore();
    const fetchImpl = mock(async () => {
      throw new TypeError("network down");
    });
    const billingAnomalyWriter = mock(async ({ store, anomaly }: any) => {
      await store.put(`billing-anomaly-${anomaly.id}`, anomaly);
      return { key: `billing-anomaly-${anomaly.id}` };
    });

    await expect(
      dispatchProviderRequest({
        store,
        fetchImpl,
        now: () => new Date("2026-05-26T12:00:00.000Z"),
        ids: {
          providerCallId: () => "call_revoked_failed",
          pendingEventId: () => "evt_pending_revoked_failed",
          dispatchIntentId: () => "intent_revoked_failed",
          failedEventId: () => "evt_failed_revoked_failed",
        },
        writers: {
          billingAnomalyWriter,
        },
        call: {
          userId: "user-1",
          dialogId: "dialog-1",
          agentId: "agent-1",
          provider: "deepinfra",
          model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
          endpoint: "chat.completions",
          credential: {
            credentialId: "cred_deepinfra_platform_env_revoked",
            credentialFingerprint: "sha256:secret-fingerprint",
            providerAccountKey: "provider-account-deepinfra-alpha-main",
            providerAccountAlias: "deepinfra-alpha-main",
            officialBillingAccountId: "deepinfra-org-1",
            apiKeySource: "platform_env",
            environment: "alpha",
            registryStatus: "rotating",
            registryEffectiveFrom: "2026-05-01T00:00:00.000Z",
            registryEffectiveTo: "2026-05-25T00:00:00.000Z",
          },
          url: "https://api.deepinfra.com/v1/openai/chat/completions",
          init: { method: "POST" },
        },
      })
    ).rejects.toThrow("network down");

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(billingAnomalyWriter).not.toHaveBeenCalled();
    expect(
      store.rows.get(buildProviderDispatchIntentKey("call_revoked_failed", "intent_revoked_failed"))
    ).toEqual(
      expect.objectContaining({
        providerCallId: "call_revoked_failed",
        status: "dispatching",
      })
    );
    expect(
      store.rows.get(buildProviderCallKey("call_revoked_failed", "evt_failed_revoked_failed"))
    ).toEqual(
      expect.objectContaining({
        providerCallId: "call_revoked_failed",
        status: "failed",
        error: {
          name: "TypeError",
          message: "network down",
        },
      })
    );
    expect(JSON.stringify(store.rows)).not.toContain("secret-fingerprint");
  });

  it("blocks revoked credentials before writing dispatch intent or sending the request", async () => {
    const store = createMemoryStore();
    const fetchImpl = mock(async () => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const billingAnomalyWriter = mock(async ({ store, anomaly }: any) => {
      await store.put(`billing-anomaly-${anomaly.id}`, anomaly);
      return { key: `billing-anomaly-${anomaly.id}` };
    });

    await expect(
      dispatchProviderRequest({
        store,
        fetchImpl,
        now: () => new Date("2026-05-26T12:00:00.000Z"),
        ids: {
          providerCallId: () => "call_revoked_blocked",
          pendingEventId: () => "evt_pending_revoked_blocked",
          dispatchIntentId: () => "intent_revoked_blocked",
          failedEventId: () => "evt_failed_revoked_blocked",
        },
        writers: {
          billingAnomalyWriter,
        },
        call: {
          userId: "user-1",
          dialogId: "dialog-1",
          agentId: "agent-1",
          provider: "deepinfra",
          model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
          endpoint: "chat.completions",
          credential: {
            credentialId: "cred_deepinfra_platform_env_revoked",
            credentialFingerprint: "sha256:secret-fingerprint",
            providerAccountKey: "provider-account-deepinfra-alpha-main",
            providerAccountAlias: "deepinfra-alpha-main",
            officialBillingAccountId: "deepinfra-org-1",
            apiKeySource: "platform_env",
            environment: "alpha",
            registryStatus: "revoked",
            registryEffectiveFrom: "2026-05-01T00:00:00.000Z",
            registryEffectiveTo: "2026-05-25T00:00:00.000Z",
          },
          url: "https://api.deepinfra.com/v1/openai/chat/completions",
          init: { method: "POST" },
        },
      })
    ).rejects.toThrow("Provider credential is revoked");

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(
      store.rows.has(buildProviderDispatchIntentKey("call_revoked_blocked", "intent_revoked_blocked"))
    ).toBe(false);
    expect(
      store.rows.get(buildProviderCallKey("call_revoked_blocked", "evt_pending_revoked_blocked"))
    ).toEqual(
      expect.objectContaining({
        providerCallId: "call_revoked_blocked",
        status: "pending",
      })
    );
    expect(
      store.rows.get(buildProviderCallKey("call_revoked_blocked", "evt_failed_revoked_blocked"))
    ).toEqual(
      expect.objectContaining({
        providerCallId: "call_revoked_blocked",
        status: "failed",
        billingStatus: "failed",
        error: {
          name: "ProviderCredentialRevokedError",
          message: "Provider credential is revoked",
        },
      })
    );
    expect(
      store.rows.get("billing-anomaly-anom_provider_credential_revoked_blocked_call_revoked_blocked")
    ).toEqual(
      expect.objectContaining({
        id: "anom_provider_credential_revoked_blocked_call_revoked_blocked",
        kind: "provider_credential_revoked_blocked",
        severity: "critical",
        stage: "provider_call",
        providerCallId: "call_revoked_blocked",
        evidence: expect.objectContaining({
          credentialId: "cred_deepinfra_platform_env_revoked",
          registryStatus: "revoked",
          providerCallStatus: "failed",
          blockedBeforeDispatch: true,
        }),
      })
    );
    expect(JSON.stringify(store.rows)).not.toContain("secret-fingerprint");
  });
});

// Regression: the connect timeout must cover ONLY the connect / response-header
// phase. The previous implementation attached `AbortSignal.timeout(30s)` to the
// fetch, which aborts the whole exchange — every SSE turn whose body streamed
// past 30s was silently truncated mid-stream (no terminating event, no error),
// which downstream code then misread as "the model returned an empty response".
describe("fetchWithConnectTimeout", () => {
  const TINY_DEADLINE_MS = 30;

  /** A response whose body keeps streaming well past the connect deadline. */
  const streamingFetch = (chunks: string[], gapMs: number) =>
    async (_url: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;
      const body = new ReadableStream<Uint8Array>({
        async pull(ctrl) {
          const next = chunks.shift();
          if (next === undefined) {
            ctrl.close();
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, gapMs));
          // Mirror how a real fetch body reacts to its request being aborted.
          if (signal?.aborted) {
            ctrl.error(signal.reason);
            return;
          }
          ctrl.enqueue(new TextEncoder().encode(next));
        },
      });
      return new Response(body, { status: 200 });
    };

  it("lets a response body finish streaming past the connect deadline", async () => {
    // 4 chunks x 25ms = ~100ms of streaming against a 30ms connect deadline.
    // Under the old AbortSignal.timeout semantics the read aborts partway.
    const response = await fetchWithConnectTimeout(
      streamingFetch(["a", "b", "c", "d"], 25),
      "https://upstream.example/v1/chat/completions",
      { method: "POST" },
      TINY_DEADLINE_MS
    );
    expect(await response.text()).toBe("abcd");
  });

  it("disarms the timeout once response headers arrive", async () => {
    let seen: AbortSignal | undefined;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      seen = init?.signal as AbortSignal;
      return new Response("ok", { status: 200 });
    };

    await fetchWithConnectTimeout(
      fetchImpl,
      "https://upstream.example/ok",
      undefined,
      TINY_DEADLINE_MS
    );
    // Well past the deadline: the timer must already be cleared.
    await new Promise((resolve) => setTimeout(resolve, TINY_DEADLINE_MS * 4));
    expect(seen?.aborted).toBe(false);
  });

  it("aborts with a TimeoutError when the upstream never sends response headers", async () => {
    // Hangs until aborted. The already-aborted case is checked up front —
    // a listener added after the abort event fired never runs, and the
    // promise would hang forever instead of failing the test.
    const fetchImpl = (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal as AbortSignal;
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });

    await expect(
      fetchWithConnectTimeout(
        fetchImpl,
        "https://upstream.example/hang",
        undefined,
        TINY_DEADLINE_MS
      )
    ).rejects.toThrow("Upstream sent no response headers within 30ms");
  });

  it("still propagates the caller's own abort signal", async () => {
    const caller = new AbortController();
    let seen: AbortSignal | undefined;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      seen = init?.signal as AbortSignal;
      return new Response("ok");
    };

    await fetchWithConnectTimeout(
      fetchImpl,
      "https://upstream.example/ok",
      { signal: caller.signal },
      TINY_DEADLINE_MS
    );
    expect(seen?.aborted).toBe(false);
    caller.abort(new DOMException("late cancel", "AbortError"));
    expect(seen?.aborted).toBe(true);
  });
});
