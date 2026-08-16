import { describe, expect, it } from "bun:test";

import { fetchWithTransientReadRetry } from "./retryFetch";

const response = (status: number, body = "") =>
  new Response(body, {
    status,
  });

describe("fetchWithTransientReadRetry", () => {
  it("retries transient 5xx responses for GET requests", async () => {
    const statuses: number[] = [];
    const calls: string[] = [];
    const fetchImpl = async () => {
      calls.push("fetch");
      return response(calls.length === 1 ? 502 : 200, "ok");
    };

    const result = await fetchWithTransientReadRetry("https://nolo.test/api", undefined, {
      delaysMs: [1],
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: async (ms) => {
        statuses.push(ms);
      },
    });

    expect(result.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(statuses).toEqual([1]);
  });

  it("does not retry non-transient responses", async () => {
    let calls = 0;
    const result = await fetchWithTransientReadRetry("https://nolo.test/api", undefined, {
      delaysMs: [1, 1],
      fetchImpl: (async () => {
        calls += 1;
        return response(404);
      }) as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    expect(result.status).toBe(404);
    expect(calls).toBe(1);
  });

  it("does not retry writes", async () => {
    let calls = 0;
    const result = await fetchWithTransientReadRetry(
      "https://nolo.test/api",
      { method: "POST" },
      {
        delaysMs: [1, 1],
        fetchImpl: (async () => {
          calls += 1;
          return response(502);
        }) as unknown as typeof fetch,
        sleep: async () => undefined,
      }
    );

    expect(result.status).toBe(502);
    expect(calls).toBe(1);
  });

  it("retries network failures for idempotent reads", async () => {
    let calls = 0;
    const result = await fetchWithTransientReadRetry("https://nolo.test/api", undefined, {
      delaysMs: [1],
      fetchImpl: (async () => {
        calls += 1;
        if (calls === 1) {
          throw new TypeError("fetch failed");
        }
        return response(200);
      }) as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    expect(result.status).toBe(200);
    expect(calls).toBe(2);
  });
});
