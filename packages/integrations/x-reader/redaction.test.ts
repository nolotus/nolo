import { describe, expect, test } from "bun:test";
import { redactXReaderValue } from "./redaction";

describe("redactXReaderValue", () => {
  test("redacts credential-like headers and nested values", () => {
    const input = {
      headers: {
        cookie: "auth_token=secret; ct0=csrf",
        authorization: "Bearer abc123",
        "x-csrf-token": "csrf-secret",
        accept: "application/json",
      },
      nested: {
        token: "secret-token",
        normal: "visible",
      },
    };

    expect(redactXReaderValue(input)).toEqual({
      headers: {
        cookie: "[REDACTED]",
        authorization: "[REDACTED]",
        "x-csrf-token": "[REDACTED]",
        accept: "application/json",
      },
      nested: {
        token: "[REDACTED]",
        normal: "visible",
      },
    });
  });

  test("redacts bearer strings inside arrays", () => {
    expect(redactXReaderValue(["Bearer abc123", "safe"])).toEqual([
      "[REDACTED]",
      "safe",
    ]);
  });
});
