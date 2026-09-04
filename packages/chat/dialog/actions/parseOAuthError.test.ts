// packages/chat/dialog/actions/parseOAuthError.test.ts
import { describe, expect, it } from "bun:test";

import {
  parseSendError,
  buildSendErrorMessageMarkdown,
  extractFullErrorText,
} from "./parseOAuthError";

const GOOGLE_403_DOUBLE_ESCAPED = `local Antigravity OAuth provider failed: HTTP 403 {"error":{"message":"{\\n  \\\"error\\\": {\\n    \\\"code\\\": 403,\\n    \\\"message\\\": \\\"Verify your account to continue.\\\",\\n    \\\"status\\\": \\\"PERMISSION_DENIED\\\",\\n    \\\"details\\\": [\\n      {\\n        \\\"@type\\\": \\\"type.googleapis.com/google.rpc.ErrorInfo\\\",\\n        \\\"reason\\\": \\\"VALIDATION_REQUIRED\\\",\\n        \\\"domain\\\": \\\"cloudcode-pa.googleapis.com\\\",\\n        \\\"metadata\\\": {\\n          \\\"validation_error_message\\\": \\\"Verify your account to continue.\\\",\\n          \\\"validation_url_link_text\\\": \\\"Verify your account\\\",\\n          \\\"validation_url\\\": \\\"https://accounts.google.com/signin/continue?sarp=1&scc=1&continue=https://developers.google.com/gemini-code-assist/auth/auth_success_gemini&flowName=GlifWebSignIn&authuser\\\",\\n          \\\"validation_learn_more_link_text\\\": \\\"Learn more\\\",\\n          \\\"validation_learn_more_url\\\": \\\"https://support.google.com/accounts?p=al_alert\\\"\\n        }\\n      }\\n    ]\\n  }\\n}\\n"}}`;

const GOOGLE_403_SINGLE_ESCAPED = `local Antigravity OAuth provider failed: HTTP 403 {"error":{"code":403,"message":"Verify your account to continue.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"VALIDATION_REQUIRED","domain":"cloudcode-pa.googleapis.com","metadata":{"validation_url_link_text":"Verify your account","validation_url":"https://accounts.google.com/signin/continue?sarp=1&scc=1&continue=https://developers.google.com/gemini-code-assist/auth/auth_success_gemini&flowName=GlifWebSignIn&authuser","validation_learn_more_url":"https://support.google.com/accounts?p=al_alert"}}]}}`;

const PLAIN_500 = `local Claude OAuth provider failed: HTTP 500 {"error":{"message":"internal error"}}`;

describe("parseSendError", () => {
  it("extracts validation link from double-escaped Google 403", () => {
    const parsed = parseSendError(GOOGLE_403_DOUBLE_ESCAPED);
    expect(parsed.kind).toBe("auth");
    expect(parsed.retryable).toBe(false);
    expect(parsed.stage).toBe("provider");
    expect(parsed.validationUrl).toBe(
      "https://accounts.google.com/signin/continue?sarp=1&scc=1&continue=https://developers.google.com/gemini-code-assist/auth/auth_success_gemini&flowName=GlifWebSignIn&authuser"
    );
    expect(parsed.summary).toContain("Antigravity (Google) 连接失败");
    expect(parsed.summary).toContain("HTTP 403");
    expect(parsed.summary).toContain("VALIDATION_REQUIRED");
    expect(parsed.extraLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts validation link from single-escaped Google 403", () => {
    const parsed = parseSendError(GOOGLE_403_SINGLE_ESCAPED);
    expect(parsed.kind).toBe("auth");
    expect(parsed.retryable).toBe(false);
    expect(parsed.stage).toBe("provider");
    expect(parsed.validationUrl).toContain("accounts.google.com/signin/continue");
    expect(parsed.summary).toContain("Antigravity (Google) 连接失败");
    expect(parsed.summary).not.toContain("{");
  });

  it("does not dump raw JSON for plain provider errors", () => {
    const parsed = parseSendError(PLAIN_500);
    expect(parsed.kind).toBe("server");
    expect(parsed.retryable).toBe(true);
    expect(parsed.stage).toBe("provider");
    expect(parsed.summary).toContain("Claude 连接失败");
    expect(parsed.summary).toContain("HTTP 500");
    expect(parsed.validationUrl).toBeUndefined();
    expect(parsed.fallbackText).toBeDefined();
  });

  it("uses neutral wording for generic transient network errors without asserting user network", () => {
    const fetchErr = parseSendError("TypeError: Failed to fetch");
    expect(fetchErr.kind).toBe("network");
    expect(fetchErr.retryable).toBe(true);
    expect(fetchErr.summary).toBe("连接中断");
    expect(fetchErr.actionHint).toContain("网络波动或服务端瞬时问题");
    expect(fetchErr.actionHint).not.toContain("请检查网络或代理设置");

    const socketHangUp = parseSendError("Error: socket hang up");
    expect(socketHangUp.kind).toBe("network");
    expect(socketHangUp.retryable).toBe(true);
    expect(socketHangUp.summary).toBe("连接中断");
    expect(socketHangUp.actionHint).toContain("网络波动或服务端瞬时问题");
  });

  it("identifies local daemon connection failure specifically", () => {
    const connRefused = parseSendError("fetch failed: connect ECONNREFUSED 127.0.0.1:3233");
    expect(connRefused.kind).toBe("network");
    expect(connRefused.retryable).toBe(true);
    expect(connRefused.stage).toBe("desktop_local_runtime");
    expect(connRefused.summary).toBe("本地服务连接失败");
    expect(connRefused.actionHint).toContain("桌面端后台服务");
  });

  it("identifies DNS lookup failure specifically", () => {
    const enotfound = parseSendError("getaddrinfo ENOTFOUND api.openai.com");
    expect(enotfound.kind).toBe("network");
    expect(enotfound.retryable).toBe(true);
    expect(enotfound.summary).toBe("域名解析失败");
    expect(enotfound.actionHint).toContain("DNS 或网络环境波动");
  });

  it("extracts cause chain from Error object into fallbackText", () => {
    const cause = new Error("connect ECONNRESET 104.18.2.1:443");
    const parentError = new TypeError("fetch failed", { cause });

    const parsed = parseSendError(parentError);
    expect(parsed.kind).toBe("network");
    expect(parsed.retryable).toBe(true);
    expect(parsed.fallbackText).toContain("fetch failed");
    expect(parsed.fallbackText).toContain("[cause]: connect ECONNRESET");
  });

  it("identifies server_proxy stage when error mentions proxy route", () => {
    const proxyErr = parseSendError("503 /api/ai/chat/proxy: upstream timeout");
    expect(proxyErr.kind).toBe("server");
    expect(proxyErr.stage).toBe("server_proxy");
    expect(proxyErr.retryable).toBe(true);
  });

  it("classifies timeout errors with neutral wording", () => {
    const timeoutErr = parseSendError("The operation was aborted due to timeout");
    expect(timeoutErr.kind).toBe("timeout");
    expect(timeoutErr.retryable).toBe(true);
    expect(timeoutErr.summary).toBe("请求超时");
    expect(timeoutErr.actionHint).toContain("服务响应超时");
    expect(timeoutErr.actionHint).toContain("重试通常可恢复");

    const etimedout = parseSendError("connect ETIMEDOUT 104.18.2.1:443");
    expect(etimedout.kind).toBe("timeout");
    expect(etimedout.retryable).toBe(true);
  });

  it("classifies 429 and rate limit errors with retryable=true", () => {
    const rateLimit429 = parseSendError("HTTP 429: Too Many Requests");
    expect(rateLimit429.kind).toBe("rate_limit");
    expect(rateLimit429.retryable).toBe(true);
    expect(rateLimit429.summary).toContain("请求过于频繁");
    expect(rateLimit429.actionHint).toContain("稍候片刻后重试");

    const quotaExceeded = parseSendError("Rate limit reached or quota exceeded");
    expect(quotaExceeded.kind).toBe("rate_limit");
    expect(quotaExceeded.retryable).toBe(true);
  });

  it("classifies 5xx server errors with neutral wording", () => {
    const server502 = parseSendError("HTTP 502 Bad Gateway");
    expect(server502.kind).toBe("server");
    expect(server502.retryable).toBe(true);
    expect(server502.summary).toContain("服务暂时不可用");
    expect(server502.actionHint).toContain("服务端发生瞬时异常");

    const server503 = parseSendError("HTTP 503 Service Unavailable");
    expect(server503.kind).toBe("server");
    expect(server503.retryable).toBe(true);
  });

  it("classifies unknown errors with retryable=true by default", () => {
    const custom = parseSendError("Something completely unexpected happened");
    expect(custom.kind).toBe("unknown");
    expect(custom.retryable).toBe(true);
    expect(custom.summary).toContain("Something completely unexpected happened");
    expect(custom.actionHint).toContain("重试");
  });

  it("[MEDIUM-2] does not misclassify unmapped HTTP 409/404/413/422 status as auth even when providerMatch hits", () => {
    const error409 = parseSendError(
      `local Antigravity OAuth provider failed: HTTP 409 {"error":{"message":"conflict occurred"}}`
    );
    expect(error409.kind).toBe("unknown");
    expect(error409.retryable).toBe(true);
    expect(error409.summary).toContain("Antigravity (Google) 连接失败 (HTTP 409)");

    const error404 = parseSendError(
      `local Claude OAuth provider failed: HTTP 404 {"error":{"message":"not found"}}`
    );
    expect(error404.kind).toBe("unknown");
    expect(error404.retryable).toBe(true);

    const error422 = parseSendError(
      `local ChatGPT OAuth provider failed: HTTP 422 {"error":{"message":"unprocessable entity"}}`
    );
    expect(error422.kind).toBe("unknown");
    expect(error422.retryable).toBe(true);
  });

  it("[LOW-1] discards unsafe URL schemes (e.g. javascript:) in validation and learnMore URLs", () => {
    const dangerousJson = `local Antigravity OAuth provider failed: HTTP 403 {"error":{"code":403,"message":"auth error","details":[{"metadata":{"validation_url":"javascript:alert(1)","validation_learn_more_url":"data:text/html,bad"}}]}}`;
    const parsed = parseSendError(dangerousJson);
    expect(parsed.validationUrl).toBeUndefined();
    expect(parsed.extraLinks).toHaveLength(0);
  });
});

describe("buildSendErrorMessageMarkdown", () => {
  it("renders readable markdown with a clickable validation link", () => {
    const parsed = parseSendError(GOOGLE_403_DOUBLE_ESCAPED);
    const md = buildSendErrorMessageMarkdown(parsed);
    expect(md).toContain("[发送失败]");
    expect(md).toContain("Antigravity (Google) 连接失败");
    expect(md).toContain("[Verify your account](https://accounts.google.com/signin/continue");
    expect(md).not.toContain('\\"error\\"');
    expect(md).not.toContain("\\n");
  });

  it("never emits the raw double-escaped JSON blob", () => {
    const md = buildSendErrorMessageMarkdown(parseSendError(GOOGLE_403_DOUBLE_ESCAPED));
    expect(md).not.toContain("{\"error\":{\"message\":\"{\\n");
  });

  it("renders actionHint in markdown when present without validationUrl", () => {
    const parsed = parseSendError("TypeError: Failed to fetch");
    const md = buildSendErrorMessageMarkdown(parsed);
    expect(md).toContain("[发送失败]");
    expect(md).toContain("连接中断");
    expect(md).toContain("建议：可能是网络波动或服务端瞬时问题，点击重试通常可恢复");
  });
});
