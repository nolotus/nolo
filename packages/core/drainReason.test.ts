import { describe, expect, it } from "bun:test";
import {
  CORE_DRAIN_REASON,
  SERVER_DRAIN_REASON,
  DRAIN_EXHAUSTED_USER_MESSAGE,
  createDrainExhaustedResponse,
  isDrainExhaustedResponse,
} from "./drainReason";

describe("drainReason shared wire constant", () => {
  it("defines the exact wire reason string", () => {
    expect(CORE_DRAIN_REASON).toBe("core_draining");
  });

  it("keeps server and client aliases identical", () => {
    expect(SERVER_DRAIN_REASON).toBe(CORE_DRAIN_REASON);
  });
});

/**
 * isDrainExhaustedResponse 是协议判定：区分「共享层生成的耗尽响应」与
 * 「普通应用 503」。判定依据必须绑定 createDrainExhaustedResponse 的实际
 * 产物形态（503 + text/plain + 完整友好文案），只认 body 文案会把恰好含
 * 同样文案的普通 JSON 503 误判为耗尽。
 */
describe("isDrainExhaustedResponse protocol gate", () => {
  it("accepts text/plain + the friendly copy (including the real factory product)", async () => {
    // 共享层真实产物：createDrainExhaustedResponse 恒定 503 + text/plain; charset=utf-8
    const product = createDrainExhaustedResponse(
      new Response('{"error":"Server draining"}', { status: 503 }),
    );
    expect(await isDrainExhaustedResponse(product)).toBe(true);

    // 等价手造形态（charset 之外的参数也应被忽略）
    const manual = new Response(DRAIN_EXHAUSTED_USER_MESSAGE, {
      status: 503,
      headers: { "Content-Type": "TEXT/PLAIN; charset=utf-8" },
    });
    expect(await isDrainExhaustedResponse(manual)).toBe(true);
  });

  it("rejects the same copy delivered as application/json", async () => {
    const res = new Response(DRAIN_EXHAUSTED_USER_MESSAGE, {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
    expect(await isDrainExhaustedResponse(res)).toBe(false);
  });

  it("rejects an ordinary application 503 body", async () => {
    const rawDrainJson = new Response(
      JSON.stringify({ error: "Server draining", reason: "core_draining", retryable: true }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
    expect(await isDrainExhaustedResponse(rawDrainJson)).toBe(false);

    // text/plain 但文案不符：同样不是共享层产物
    const plain = new Response("service unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
    expect(await isDrainExhaustedResponse(plain)).toBe(false);
  });

  it("does not consume the caller's response body", async () => {
    const res = new Response(DRAIN_EXHAUSTED_USER_MESSAGE, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

    expect(await isDrainExhaustedResponse(res)).toBe(true);
    // clone 读体：谓词调用后原 response 仍未被消费，调用方随时可再读。
    expect(res.bodyUsed).toBe(false);
    expect(await res.text()).toBe(DRAIN_EXHAUSTED_USER_MESSAGE);
  });
});
