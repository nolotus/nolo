import { describe, expect, test } from "bun:test";

import {
  agentRuntimeConfigFromDesktopSnapshot,
  assertDesktopAgentRuntimeTurnBodyHasNoRawSecrets,
  buildDesktopAgentRuntimeAgentConfigSnapshot,
  buildDesktopAgentRuntimeDialogHistorySnapshot,
  DESKTOP_AGENT_CONFIG_SNAPSHOT_FORBIDDEN_KEYS,
  DESKTOP_AGENT_CONFIG_SNAPSHOT_STRING_FIELDS,
  DESKTOP_TOOL_CALL_ARGUMENTS_MAX_CHARS,
  parseDesktopAgentRuntimeAgentConfigSnapshot,
  parseDesktopAgentRuntimeDialogHistorySnapshot,
  sanitizeToolCallArguments,
} from "./desktopRequestSnapshot";

describe("desktopRequestSnapshot", () => {
  test("builds an allowlisted agent config snapshot and strips raw secrets", () => {
    const snapshot = buildDesktopAgentRuntimeAgentConfigSnapshot(
      {
        dbKey: "agent-local-1",
        name: "Local Agent",
        prompt: "You help locally",
        provider: "custom",
        model: "local-model",
        apiSource: "custom",
        customProviderUrl: "http://127.0.0.1:11434/v1",
        credentialRef: "api-key:agent-local-1",
        apiKeyRef: "api-key:agent-local-1",
        apiKeyHeader: "Authorization",
        useServerProxy: false,
        tools: ["readFile", "listFiles"],
        temperature: 0.2,
        apiKey: "sk-should-never-leave-webview",
        apiKeyFromAgentKey: "sk-legacy-raw-key",
        token: "secret-token",
        unknownSecret: "x",
        password: "nope",
      },
      "agent-local-1",
    );

    expect(snapshot).toEqual({
      dbKey: "agent-local-1",
      name: "Local Agent",
      prompt: "You help locally",
      provider: "custom",
      model: "local-model",
      apiSource: "custom",
      customProviderUrl: "http://127.0.0.1:11434/v1",
      credentialRef: "api-key:agent-local-1",
      apiKeyRef: "api-key:agent-local-1",
      apiKeyHeader: "Authorization",
      useServerProxy: false,
      tools: ["readFile", "listFiles"],
      temperature: 0.2,
    });
    expect(snapshot).not.toHaveProperty("apiKey");
    expect(snapshot).not.toHaveProperty("apiKeyFromAgentKey");
    expect(snapshot).not.toHaveProperty("token");
    expect(snapshot).not.toHaveProperty("password");
    expect(snapshot).not.toHaveProperty("unknownSecret");
    expect(DESKTOP_AGENT_CONFIG_SNAPSHOT_STRING_FIELDS).not.toContain(
      "apiKeyFromAgentKey",
    );
    expect(DESKTOP_AGENT_CONFIG_SNAPSHOT_FORBIDDEN_KEYS).toContain(
      "apiKeyFromAgentKey",
    );
  });

  test("rejects build when claimed dbKey does not match agentRef", () => {
    expect(
      buildDesktopAgentRuntimeAgentConfigSnapshot(
        { dbKey: "agent-a", prompt: "x" },
        "agent-b",
      ),
    ).toBeNull();
  });

  test("parse rejects ref mismatch and illegal shapes", () => {
    expect(
      parseDesktopAgentRuntimeAgentConfigSnapshot(
        { dbKey: "agent-a", prompt: "hi" },
        "agent-b",
      ),
    ).toEqual({
      ok: false,
      error: "agentConfigSnapshot.dbKey must match agentRef (got agent-a, expected agent-b)",
    });

    expect(
      parseDesktopAgentRuntimeAgentConfigSnapshot("not-an-object", "agent-a"),
    ).toMatchObject({ ok: false });

    const ok = parseDesktopAgentRuntimeAgentConfigSnapshot(
      {
        dbKey: "agent-local-1",
        prompt: "p",
        apiKey: "sk-leaked",
        model: "m",
        credentialRef: "api-key:agent-local-1",
      },
      "agent-local-1",
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.snapshot).not.toHaveProperty("apiKey");
      expect(ok.snapshot.credentialRef).toBe("api-key:agent-local-1");
      expect(ok.snapshot.model).toBe("m");
    }
  });

  test("converts snapshot to AgentRuntimeAgentConfig without raw apiKey", () => {
    const config = agentRuntimeConfigFromDesktopSnapshot({
      dbKey: "agent-local-1",
      prompt: "Be helpful",
      model: "qwen",
      provider: "custom",
      apiSource: "custom",
      customProviderUrl: "http://127.0.0.1:11434/v1",
      credentialRef: "api-key:agent-local-1",
      tools: ["readFile"],
      temperature: 0.1,
    });

    expect(config).toMatchObject({
      key: "agent-local-1",
      prompt: "Be helpful",
      model: "qwen",
      provider: "custom",
      apiSource: "custom",
      customProviderUrl: "http://127.0.0.1:11434/v1",
      credentialRef: "api-key:agent-local-1",
      toolNames: ["readFile"],
      temperature: 0.1,
    });
    expect(config.apiKey).toBeUndefined();
  });

  test("builds dialog history snapshot without attachment blobs and drops current user turn", () => {
    const snapshot = buildDesktopAgentRuntimeDialogHistorySnapshot({
      dialogId: "dialog-1",
      currentInput: "new question",
      messages: [
        { role: "user", content: "old question" },
        { role: "assistant", content: "old answer" },
        {
          role: "user",
          content: [
            { type: "text", text: "new question" },
            {
              type: "image_url",
              image_url: { url: "data:image/png;base64,AAAA" },
            },
          ],
        },
      ],
    });

    expect(snapshot).toEqual({
      dialogId: "dialog-1",
      messages: [
        { role: "user", content: "old question" },
        { role: "assistant", content: "old answer" },
      ],
    });
  });

  test("parse dialog history rejects dialogId mismatch", () => {
    expect(
      parseDesktopAgentRuntimeDialogHistorySnapshot(
        {
          dialogId: "dialog-a",
          messages: [{ role: "user", content: "hi" }],
        },
        "dialog-b",
      ),
    ).toMatchObject({ ok: false });
  });

  test("assertDesktopAgentRuntimeTurnBodyHasNoRawSecrets throws on apiKey", () => {
    expect(() =>
      assertDesktopAgentRuntimeTurnBodyHasNoRawSecrets({
        agentRef: "a",
        agentConfigSnapshot: { dbKey: "a", apiKey: "sk" },
      }),
    ).toThrow(/Forbidden secret field/);
  });

  test("omits apiKeyFromAgentKey from wire snapshot even when present on source", () => {
    const snapshot = buildDesktopAgentRuntimeAgentConfigSnapshot(
      {
        dbKey: "agent-local-1",
        model: "m",
        apiKeyFromAgentKey: "sk-must-not-enter-wire",
      },
      "agent-local-1",
    );
    expect(snapshot).toEqual({ dbKey: "agent-local-1", model: "m" });
    expect(JSON.stringify(snapshot)).not.toContain("sk-must-not-enter-wire");
    expect(JSON.stringify(snapshot)).not.toContain("apiKeyFromAgentKey");

    const parsed = parseDesktopAgentRuntimeAgentConfigSnapshot(
      {
        dbKey: "agent-local-1",
        model: "m",
        apiKeyFromAgentKey: "sk-must-not-enter-wire",
      },
      "agent-local-1",
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.snapshot).not.toHaveProperty("apiKeyFromAgentKey");
      expect(JSON.stringify(parsed.snapshot)).not.toContain(
        "sk-must-not-enter-wire",
      );
    }
  });

  test("redacts nested secret-like keys in tool_calls arguments JSON", () => {
    const snapshot = buildDesktopAgentRuntimeDialogHistorySnapshot({
      dialogId: "dialog-1",
      messages: [
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call-1",
              type: "function",
              function: {
                name: "configure",
                arguments: JSON.stringify({
                  endpoint: "https://api.example",
                  nested: {
                    apiKey: "sk-nested-secret",
                    apiKeyFromAgentKey: "sk-legacy",
                    token: "tok",
                    safe: "ok",
                  },
                }),
              },
            },
          ],
        },
      ],
    });

    expect(snapshot).toBeTruthy();
    const args = snapshot!.messages[0]?.tool_calls?.[0]?.function.arguments;
    expect(typeof args).toBe("string");
    const parsed = JSON.parse(args!);
    expect(parsed.endpoint).toBe("https://api.example");
    expect(parsed.nested.safe).toBe("ok");
    expect(parsed.nested.apiKey).toBe("[redacted]");
    expect(parsed.nested.apiKeyFromAgentKey).toBe("[redacted]");
    expect(parsed.nested.token).toBe("[redacted]");
    expect(args).not.toContain("sk-nested-secret");
    expect(args).not.toContain("sk-legacy");
  });

  test("bounds oversized non-JSON tool arguments without regex-mutating prose", () => {
    const longProse = `please use key sk-literal-in-prose ${"x".repeat(10_000)}`;
    const sanitized = sanitizeToolCallArguments(longProse, 200);
    expect(sanitized.length).toBe(200);
    // Truncation only — do not invent secret scrubbing of free text.
    expect(sanitized.startsWith("please use key sk-literal-in-prose")).toBe(
      true,
    );
    expect(sanitized.length).toBeLessThanOrEqual(
      DESKTOP_TOOL_CALL_ARGUMENTS_MAX_CHARS,
    );
  });

  test("bounds oversized JSON tool arguments after redaction", () => {
    const huge = {
      note: "y".repeat(DESKTOP_TOOL_CALL_ARGUMENTS_MAX_CHARS + 500),
      apiKey: "sk-huge",
    };
    const sanitized = sanitizeToolCallArguments(JSON.stringify(huge));
    expect(sanitized.length).toBeLessThanOrEqual(
      DESKTOP_TOOL_CALL_ARGUMENTS_MAX_CHARS,
    );
    expect(sanitized).not.toContain("sk-huge");
  });
});
