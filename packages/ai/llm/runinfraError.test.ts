import { describe, expect, it } from "bun:test";
import {
  classifyRuninfraError,
  parseRuninfraRetryAfterMs,
} from "./runinfraError";

describe("runinfraError classifier", () => {
  it("402 insufficient_credits balance/topup_url never appear in userFacingMessage", () => {
    const errorBody = JSON.stringify({
      error: {
        message: "You have run out of credits. Balance: $0.00. Top up at https://runinfra.ai/billing/topup",
        type: "permission_error",
        code: "insufficient_credits",
        param: null,
        balance: 0.0,
        required: 0.05,
        topup_url: "https://runinfra.ai/billing/topup",
      },
      request_id: "req_insufficient_123",
    });

    const result = classifyRuninfraError(402, undefined, errorBody);

    expect(result.action).toBe("fatal");
    expect(result.type).toBe("permission_error");
    expect(result.code).toBe("insufficient_credits");
    expect(result.requestId).toBe("req_insufficient_123");
    expect(result.balance).toBe(0.0);
    expect(result.topupUrl).toBe("https://runinfra.ai/billing/topup");

    // Critical security assertion: userFacingMessage MUST NOT leak sensitive balance/url
    expect(result.userFacingMessage).not.toContain("0.00");
    expect(result.userFacingMessage).not.toContain("https://");
    expect(result.userFacingMessage).not.toContain("topup");
    expect(result.userFacingMessage).not.toContain("runinfra");
    expect(result.userFacingMessage).toBe("服务暂时不可用，请稍后重试");

    // Internal message preserves the original message for server logging
    expect(result.internalMessage).toContain("https://runinfra.ai/billing/topup");
  });

  it("429 prioritizes Retry-After-Ms over Retry-After header", () => {
    const headers = new Headers({
      "Retry-After": "5",
      "Retry-After-Ms": "1500",
    });

    const delayMs = parseRuninfraRetryAfterMs(headers);
    expect(delayMs).toBe(1500);

    const result = classifyRuninfraError(
      429,
      headers,
      JSON.stringify({
        error: {
          message: "Rate limit exceeded",
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
        },
      }),
    );

    expect(result.action).toBe("retry-after");
    expect(result.retryAfterMs).toBe(1500);
  });

  it("429 falls back to Retry-After seconds when Retry-After-Ms is missing", () => {
    const headers = new Headers({
      "Retry-After": "3",
    });

    const delayMs = parseRuninfraRetryAfterMs(headers);
    expect(delayMs).toBe(3000);

    const result = classifyRuninfraError(
      429,
      headers,
      JSON.stringify({
        error: {
          message: "Rate limit exceeded",
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
        },
      }),
    );

    expect(result.action).toBe("retry-after");
    expect(result.retryAfterMs).toBe(3000);
  });

  it("hosted_model_paused brings paused_until and has action circuit-open without inline retry", () => {
    const headers = new Headers({
      "Retry-After": "60",
      "Retry-After-Ms": "60000",
    });
    const errorBody = JSON.stringify({
      error: {
        message: "Model glm-5-3-flash is paused for scheduled maintenance until 2026-09-02T13:00:00Z",
        type: "rate_limit_error",
        code: "hosted_model_paused",
        paused_until: "2026-09-02T13:00:00Z",
      },
      request_id: "req_paused_456",
    });

    const result = classifyRuninfraError(429, headers, errorBody);

    expect(result.action).toBe("circuit-open");
    expect(result.code).toBe("hosted_model_paused");
    expect(result.pausedUntil).toBe("2026-09-02T13:00:00Z");
    expect(result.retryAfterMs).toBe(60000);
    expect(result.requestId).toBe("req_paused_456");
    expect(result.userFacingMessage).toBe("当前模型暂时暂停服务，请稍后重试");
  });

  it("400 hosted_parameter_not_supported is classified as fix-request", () => {
    const errorBody = JSON.stringify({
      error: {
        message: "Parameter response_format requires reasoning_effort: 'none'",
        type: "invalid_request_error",
        code: "hosted_parameter_not_supported",
        param: "response_format",
      },
      request_id: "req_param_789",
    });

    const result = classifyRuninfraError(400, undefined, errorBody);

    expect(result.action).toBe("fix-request");
    expect(result.code).toBe("hosted_parameter_not_supported");
    expect(result.param).toBe("response_format");
    expect(result.retryAfterMs).toBeNull();
    expect(result.userFacingMessage).toBe("请求参数不受当前模型支持，请调整参数后重试");
  });

  it("413 and bare text FUNCTION_PAYLOAD_TOO_LARGE are classified as request too large without leaking raw text", () => {
    // Bare text case (non-JSON edge error)
    const bareResult = classifyRuninfraError(
      200,
      undefined,
      "FUNCTION_PAYLOAD_TOO_LARGE",
    );
    expect(bareResult.action).toBe("fix-request");
    expect(bareResult.userFacingMessage).toBe(
      "请求体积过大（长对话上下文或大图片）。请新开对话、精简内容，或压缩/裁剪图片后重试",
    );
    expect(bareResult.userFacingMessage).not.toContain("FUNCTION_PAYLOAD_TOO_LARGE");
    expect(bareResult.internalMessage).toBe("FUNCTION_PAYLOAD_TOO_LARGE");

    // HTTP 413 with HTML / raw text
    const html413Result = classifyRuninfraError(
      413,
      undefined,
      "<html><body>413 Request Entity Too Large</body></html>",
    );
    expect(html413Result.action).toBe("fix-request");
    expect(html413Result.userFacingMessage).toBe(
      "请求体积过大（长对话上下文或大图片）。请新开对话、精简内容，或压缩/裁剪图片后重试",
    );
    expect(html413Result.userFacingMessage).not.toContain("html");
    expect(html413Result.userFacingMessage).not.toContain("413");
  });

  it("safely degrades on invalid JSON or unknown type/code without throwing", () => {
    // 1. Completely invalid JSON string on 503
    expect(() => {
      const res503 = classifyRuninfraError(503, undefined, "<html>503 Service Unavailable</html>");
      expect(res503.action).toBe("retry-after");
      expect(res503.type).toBe("api_error");
      expect(res503.userFacingMessage).toBe("上游服务暂时繁忙，请稍后重试");
    }).not.toThrow();

    // 2. Unknown type and code on 400
    expect(() => {
      const res400 = classifyRuninfraError(
        400,
        undefined,
        JSON.stringify({
          error: {
            message: "Some completely unexpected error shape",
            type: "weird_custom_type",
            code: "weird_custom_code",
          },
        }),
      );
      expect(res400.action).toBe("fix-request");
      expect(res400.type).toBe("weird_custom_type");
      expect(res400.code).toBe("weird_custom_code");
      expect(res400.userFacingMessage).toBe("请求参数有误，请修改后重试");
    }).not.toThrow();

    // 3. Null/undefined inputs
    expect(() => {
      const resNull = classifyRuninfraError(500, null, null);
      expect(resNull.action).toBe("retry-after");
      expect(resNull.type).toBe("api_error");
      expect(resNull.userFacingMessage).toBe("上游服务暂时繁忙，请稍后重试");
    }).not.toThrow();

    // 4. Unknown 4xx status (e.g. 418)
    expect(() => {
      const res418 = classifyRuninfraError(418, undefined, "I'm a teapot");
      expect(res418.action).toBe("fatal");
      expect(res418.userFacingMessage).toBe("上游服务异常，请稍后重试");
    }).not.toThrow();
  });

  it("409 idempotency_conflict is classified as retry-after with default 1s wait", () => {
    const result = classifyRuninfraError(
      409,
      undefined,
      JSON.stringify({
        error: {
          message: "Original request in progress",
          type: "invalid_request_error",
          code: "idempotency_conflict",
        },
      }),
    );
    expect(result.action).toBe("retry-after");
    expect(result.retryAfterMs).toBe(1000);
    expect(result.userFacingMessage).toBe("请求正在处理中，请稍候");
  });

  it("422 idempotency_replay_unavailable is classified as fatal without retry", () => {
    const result = classifyRuninfraError(
      422,
      undefined,
      JSON.stringify({
        error: {
          message: "Replay unavailable",
          type: "invalid_request_error",
          code: "idempotency_replay_unavailable",
        },
        request_id: "req_replay_failed",
      }),
    );
    expect(result.action).toBe("fatal");
    expect(result.code).toBe("idempotency_replay_unavailable");
    expect(result.requestId).toBe("req_replay_failed");
    expect(result.userFacingMessage).toBe("上游请求不可重放，请重新发起对话");
  });
});
