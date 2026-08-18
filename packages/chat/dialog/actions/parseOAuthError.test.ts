// packages/chat/dialog/actions/parseOAuthError.test.ts
import { describe, expect, it } from "bun:test";

import {
  parseSendError,
  buildSendErrorMessageMarkdown,
} from "./parseOAuthError";

const GOOGLE_403_DOUBLE_ESCAPED = `local Antigravity OAuth provider failed: HTTP 403 {"error":{"message":"{\\n  \\\"error\\\": {\\n    \\\"code\\\": 403,\\n    \\\"message\\\": \\\"Verify your account to continue.\\\",\\n    \\\"status\\\": \\\"PERMISSION_DENIED\\\",\\n    \\\"details\\\": [\\n      {\\n        \\\"@type\\\": \\\"type.googleapis.com/google.rpc.ErrorInfo\\\",\\n        \\\"reason\\\": \\\"VALIDATION_REQUIRED\\\",\\n        \\\"domain\\\": \\\"cloudcode-pa.googleapis.com\\\",\\n        \\\"metadata\\\": {\\n          \\\"validation_error_message\\\": \\\"Verify your account to continue.\\\",\\n          \\\"validation_url_link_text\\\": \\\"Verify your account\\\",\\n          \\\"validation_url\\\": \\\"https://accounts.google.com/signin/continue?sarp=1&scc=1&continue=https://developers.google.com/gemini-code-assist/auth/auth_success_gemini&flowName=GlifWebSignIn&authuser\\\",\\n          \\\"validation_learn_more_link_text\\\": \\\"Learn more\\\",\\n          \\\"validation_learn_more_url\\\": \\\"https://support.google.com/accounts?p=al_alert\\\"\\n        }\\n      }\\n    ]\\n  }\\n}\\n"}}`;

const GOOGLE_403_SINGLE_ESCAPED = `local Antigravity OAuth provider failed: HTTP 403 {"error":{"code":403,"message":"Verify your account to continue.","status":"PERMISSION_DENIED","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"VALIDATION_REQUIRED","domain":"cloudcode-pa.googleapis.com","metadata":{"validation_url_link_text":"Verify your account","validation_url":"https://accounts.google.com/signin/continue?sarp=1&scc=1&continue=https://developers.google.com/gemini-code-assist/auth/auth_success_gemini&flowName=GlifWebSignIn&authuser","validation_learn_more_url":"https://support.google.com/accounts?p=al_alert"}}]}}`;

const PLAIN_500 = `local Claude OAuth provider failed: HTTP 500 {"error":{"message":"internal error"}}`;

describe("parseSendError", () => {
  it("extracts validation link from double-escaped Google 403", () => {
    const parsed = parseSendError(GOOGLE_403_DOUBLE_ESCAPED);
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
    expect(parsed.validationUrl).toContain("accounts.google.com/signin/continue");
    expect(parsed.summary).toContain("Antigravity (Google) 连接失败");
    expect(parsed.summary).not.toContain("{");
  });

  it("does not dump raw JSON for plain provider errors", () => {
    const parsed = parseSendError(PLAIN_500);
    expect(parsed.summary).toContain("Claude 连接失败");
    expect(parsed.summary).toContain("HTTP 500");
    expect(parsed.validationUrl).toBeUndefined();
    expect(parsed.fallbackText).toBeDefined();
  });
});

describe("buildSendErrorMessageMarkdown", () => {
  it("renders readable markdown with a clickable validation link", () => {
    const parsed = parseSendError(GOOGLE_403_DOUBLE_ESCAPED);
    const md = buildSendErrorMessageMarkdown(parsed);
    expect(md).toContain("[发送失败]");
    expect(md).toContain("Antigravity (Google) 连接失败");
    expect(md).toContain("[Verify your account](https://accounts.google.com/signin/continue");
    // 不允许再出现原始双层转义 JSON
    expect(md).not.toContain('\\"error\\"');
    expect(md).not.toContain("\\n");
  });

  it("never emits the raw double-escaped JSON blob", () => {
    const md = buildSendErrorMessageMarkdown(parseSendError(GOOGLE_403_DOUBLE_ESCAPED));
    expect(md).not.toContain("{\"error\":{\"message\":\"{\\n");
  });
});
