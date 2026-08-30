import { describe, expect, it } from "bun:test";

import { createCliLocalRuntimeAdapter } from "../localRuntimeAdapter";
import { shouldRetryPlatformProxyResponse } from "./platformProxyTransport";

describe("platform proxy response retry ownership", () => {
  it("does not retry a structured Bun application 502", async () => {
    const response = Response.json(
      { error: { code: "UPSTREAM_TRANSPORT_ERROR" } },
      { status: 502, headers: { server: "Caddy" } },
    );

    expect(await shouldRetryPlatformProxyResponse(response)).toBe(false);
  });

  it("does not replay an empty Caddy ingress 502", async () => {
    const response = new Response("", {
      status: 502,
      headers: { server: "Caddy" },
    });

    expect(await shouldRetryPlatformProxyResponse(response)).toBe(false);
  });

  it("retries only structured core-draining 503 responses", async () => {
    expect(
      await shouldRetryPlatformProxyResponse(
        Response.json(
          { reason: "core_draining", retryable: true },
          { status: 503 },
        ),
      ),
    ).toBe(true);
    expect(
      await shouldRetryPlatformProxyResponse(
        Response.json(
          { error: { code: "PLATFORM_LLM_BUSY" } },
          { status: 503 },
        ),
      ),
    ).toBe(false);
  });

  it("retries a 503 the busy path marked with top-level retryable:true", async () => {
    // New server contract: non-streaming busy 503 carries
    // { retryable: true, retryAfterMs: 1200 } at the body top level.
    expect(
      await shouldRetryPlatformProxyResponse(
        Response.json(
          {
            retryable: true,
            retryAfterMs: 1200,
            error: { message: "服务器紧张", code: "PLATFORM_LLM_BUSY" },
          },
          { status: 503 },
        ),
      ),
    ).toBe(true);
  });

  it("does not retry a plain 503 without a retry signal", async () => {
    expect(
      await shouldRetryPlatformProxyResponse(
        Response.json({ error: { message: "boom" } }, { status: 503 }),
      ),
    ).toBe(false);
  });

  it("does not retry non-503 statuses even when retryable is set", async () => {
    expect(
      await shouldRetryPlatformProxyResponse(
        Response.json(
          { retryable: true, retryAfterMs: 1200 },
          { status: 200 },
        ),
      ),
    ).toBe(false);
    expect(
      await shouldRetryPlatformProxyResponse(
        Response.json({ reason: "core_draining" }, { status: 400 }),
      ),
    ).toBe(false);
  });
});

describe("platform proxy stream-level busy retry (real pipeline)", () => {
  it("retries 200 + SSE busy error frame after 1200ms sleep and succeeds on second attempt", async () => {
    let fetchCalls = 0;
    const slept: number[] = [];
    const activities: (string | null)[] = [];

    const mockFetch = async (
      _url: string | URL | Request,
      _init?: RequestInit,
    ) => {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        // First attempt: 200 OK + SSE error frame matching formatSseError shape
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                'data: {"error":{"msg":"服务器紧张","code":"PLATFORM_LLM_BUSY"}}\n\n',
              ),
            );
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      // Second attempt: 200 OK + SSE completion
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"content":"ok from retry"}}]}\n\ndata: [DONE]\n\n',
            ),
          );
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    };

    const adapter = createCliLocalRuntimeAdapter({
      env: {
        NOLO_SERVER: "https://mock.nolo.chat",
        AUTH_TOKEN: "mock-token",
      },
      fetchImpl: mockFetch as any,
      sleep: async (ms) => {
        slept.push(ms);
      },
      activityReporter: (label) => {
        activities.push(label);
      },
    });

    const provider = await adapter.resolveProvider({
      key: "agent-kimi",
      provider: "nolo",
      model: "kimi-k2.6",
    });

    const deltas: string[] = [];
    const result = await provider.complete(
      [{ role: "user", content: "hello" }],
      {
        onTextDelta: (chunk) => deltas.push(chunk),
      },
    );

    expect(result.content).toBe("ok from retry");
    expect(fetchCalls).toBe(2);
    expect(slept).toEqual([1200]);
    expect(activities).toContain("服务器紧张 · 稍候自动重试");
  });

  it("does NOT retry non-busy stream interruption on platform proxy path (billing boundary)", async () => {
    let fetchCalls = 0;
    const slept: number[] = [];

    const mockFetch = async () => {
      fetchCalls += 1;
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"error":{"message":"upstream stream interrupted: gateway reset","code":"UPSTREAM_STREAM_INTERRUPTED"}}\n\n',
            ),
          );
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    };

    const adapter = createCliLocalRuntimeAdapter({
      env: {
        NOLO_SERVER: "https://mock.nolo.chat",
        AUTH_TOKEN: "mock-token",
      },
      fetchImpl: mockFetch as any,
      sleep: async (ms) => {
        slept.push(ms);
      },
    });

    const provider = await adapter.resolveProvider({
      key: "agent-kimi",
      provider: "nolo",
      model: "kimi-k2.6",
    });

    await expect(
      provider.complete([{ role: "user", content: "hello" }], {
        onTextDelta: () => {},
      }),
    ).rejects.toThrow("UPSTREAM_STREAM_INTERRUPTED");

    // Platform path must not retry non-busy stream errors:
    expect(fetchCalls).toBe(1);
    expect(slept).toEqual([]);
  });
});
