import { describe, expect, test } from "bun:test";
import { installConnectionPeerFixture } from "../testHelpers/connectionPeerFixture";

import { handleDesktopAgentRuntimeTurnPost } from "./desktopAgentRuntimeTurnHandler";

async function readDesktopRuntimeTurnEvents(response: Response) {
  const text = await response.text();
  return text
    .split("\n\n")
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map((frame) => JSON.parse(frame.replace(/^data:\s*/, "")));
}

function trustedTurnRequest(
  body: unknown,
  headers: Record<string, string> = {},
  url = "http://localhost/api/desktop/agent-runtime/turn",
) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "same-origin",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("desktop agent runtime turn handler", () => {
  installConnectionPeerFixture();
  test("rejects non-desktop requests", async () => {
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({ agentRef: "frontend", input: "fix ui" }),
      { env: { NOLO_DESKTOP: "0" } }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Desktop runtime only" });
  });

  test("rejects bare curl (no browser provenance) with sanitized 403", async () => {
    const response = await handleDesktopAgentRuntimeTurnPost(
      new Request("http://localhost/api/desktop/agent-runtime/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentRef: "agent-local-1",
          input: "hello",
          agentConfigSnapshot: {
            dbKey: "agent-local-1",
            credentialRef: "api-key:agent-local-1",
          },
        }),
      }),
      {
        env: { NOLO_DESKTOP: "1" },
        store: { read: async () => null },
        runTurn: async () => {
          throw new Error("should not run");
        },
      },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      error: "Forbidden: trusted desktop same-origin required",
    });
    expect(JSON.stringify(body)).not.toContain("api-key:");
    expect(JSON.stringify(body)).not.toContain("agent-local-1");
  });

  test("rejects cross-origin Origin with sanitized 403", async () => {
    const response = await handleDesktopAgentRuntimeTurnPost(
      new Request("http://localhost/api/desktop/agent-runtime/turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.example",
        },
        body: JSON.stringify({
          agentRef: "agent-local-1",
          input: "hello",
          agentConfigSnapshot: {
            dbKey: "agent-local-1",
            credentialRef: "api-key:must-not-leak",
          },
        }),
      }),
      {
        env: { NOLO_DESKTOP: "1" },
        store: { read: async () => null },
        runTurn: async () => {
          throw new Error("should not run");
        },
      },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("same-origin");
    expect(JSON.stringify(body)).not.toContain("api-key:must-not-leak");
  });

  test("accepts trusted same-origin desktop requests", async () => {
    const calls: unknown[] = [];
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "frontend",
        input: "hello trusted",
      }),
      {
        env: { NOLO_DESKTOP: "1", NOLO_USER_ID: "user-1" },
        store: { read: async () => null },
        runTurn: async (input) => {
          calls.push(input);
          return {
            dialogId: "dialog-trusted",
            content: "done",
            model: "qwen-coder",
          };
        },
      },
    );

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  test("rejects invalid turn requests", async () => {
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({ input: "fix ui" }),
      { env: { NOLO_DESKTOP: "1" } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "agentRef and input are required",
    });
  });

  test("runs a desktop text-only agent turn from the request body", async () => {
    const calls: unknown[] = [];
    const store = { read: async () => null };
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "frontend",
        input: "polish the notification panel",
        runtimeContext: {
          subjectRefs: [{ kind: "table-row", id: "row-user-board-task", role: "task" }],
        },
        continueDialogId: "dialog-existing",
        cwd: "/workspace/project",
      }),
      {
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
        },
        store,
        runTurn: async (input) => {
          calls.push(input);
          return {
            dialogId: "dialog-existing",
            content: "done",
            model: "qwen-coder",
          };
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(readDesktopRuntimeTurnEvents(response)).resolves.toEqual([
      {
        type: "done",
        result: {
          dialogId: "dialog-existing",
          content: "done",
          model: "qwen-coder",
        },
      },
    ]);
    expect(calls).toEqual([expect.objectContaining({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
      },
      store,
      agentRef: "frontend",
      input: "polish the notification panel",
      runtimeContext: {
        subjectRefs: [{ kind: "table-row", id: "row-user-board-task", role: "task" }],
      },
      continueDialogId: "dialog-existing",
      cwd: "/workspace/project",
      fetchImpl: undefined,
    })]);
  });

  test("SSE done payload carries finish_reason from the runtime result", async () => {
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "frontend",
        input: "long answer",
      }),
      {
        env: { NOLO_DESKTOP: "1", NOLO_USER_ID: "user-1" },
        store: { read: async () => null },
        runTurn: async () => ({
          dialogId: "dialog-existing",
          content: "truncated mid-sentence",
          model: "qwen-coder",
          finish_reason: "length",
        }),
      }
    );

    expect(response.status).toBe(200);
    const events = await readDesktopRuntimeTurnEvents(response);
    const doneEvent = events.find((e: any) => e.type === "done");
    expect(doneEvent).toBeDefined();
    // finish_reason 必须原样出现在 done payload 的 result 里。
    expect(doneEvent.result.finish_reason).toBe("length");
  });

  test("streams tool and delta events from the desktop runtime", async () => {
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "frontend",
        input: "list files",
      }),
      {
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
        },
        store: { read: async () => null },
        runTurn: async (input) => {
          input.onToolEvent?.({
            type: "tool-call",
            round: 0,
            toolCallId: "call-1",
            toolName: "globFiles",
          });
          input.onTextDelta?.("do");
          input.onTextDelta?.("ne");
          return {
            dialogId: "dialog-existing",
            content: "done",
            model: "qwen-coder",
          };
        },
      }
    );

    expect(response.status).toBe(200);
    await expect(readDesktopRuntimeTurnEvents(response)).resolves.toEqual([
      {
        type: "tool",
        event: {
          type: "tool-call",
          round: 0,
          toolCallId: "call-1",
          toolName: "globFiles",
        },
      },
      { type: "delta", text: "do" },
      { type: "delta", text: "ne" },
      {
        type: "done",
        result: {
          dialogId: "dialog-existing",
          content: "done",
          model: "qwen-coder",
        },
      },
    ]);
  });

  test("rejects agentConfigSnapshot when dbKey does not match agentRef", async () => {
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "agent-local-1",
        input: "hello",
        agentConfigSnapshot: {
          dbKey: "agent-other",
          prompt: "x",
          model: "m",
        },
      }),
      {
        env: { NOLO_DESKTOP: "1" },
        store: { read: async () => null },
        runTurn: async () => {
          throw new Error("should not run");
        },
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("must match agentRef"),
    });
  });

  test("forwards sanitized agentConfigSnapshot and dialogHistorySnapshot to runTurn", async () => {
    const calls: unknown[] = [];
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "agent-local-1",
        input: "hello",
        continueDialogId: "dialog-1",
        agentConfigSnapshot: {
          dbKey: "agent-local-1",
          prompt: "local helper",
          model: "local-model",
          provider: "custom",
          apiSource: "custom",
          customProviderUrl: "http://127.0.0.1:11434/v1",
          credentialRef: "api-key:agent-local-1",
          apiKey: "sk-should-be-stripped-by-parser",
        },
        dialogHistorySnapshot: {
          dialogId: "dialog-1",
          messages: [
            { role: "user", content: "prev" },
            { role: "assistant", content: "ok" },
          ],
        },
      }),
      {
        env: { NOLO_DESKTOP: "1", NOLO_USER_ID: "local" },
        store: { read: async () => null },
        runTurn: async (input) => {
          calls.push(input);
          return {
            dialogId: "dialog-1",
            content: "done",
            model: "local-model",
          };
        },
      },
    );

    expect(response.status).toBe(200);
    expect(calls).toEqual([
      expect.objectContaining({
        agentRef: "agent-local-1",
        input: "hello",
        continueDialogId: "dialog-1",
        agentConfigSnapshot: expect.objectContaining({
          dbKey: "agent-local-1",
          prompt: "local helper",
          model: "local-model",
          credentialRef: "api-key:agent-local-1",
        }),
        dialogHistorySnapshot: {
          dialogId: "dialog-1",
          messages: [
            { role: "user", content: "prev" },
            { role: "assistant", content: "ok" },
          ],
        },
      }),
    ]);
    const snapshot = (calls[0] as any).agentConfigSnapshot;
    expect(snapshot).not.toHaveProperty("apiKey");
  });

  test("injects authorization header auth into the desktop runtime env", async () => {
    const calls: unknown[] = [];
    const authToken = `${Buffer.from(JSON.stringify({ userId: "user-auth-1" })).toString("base64")}.sig`;

    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest(
        {
          agentRef: "frontend",
          input: "hello",
        },
        {
          Authorization: `Bearer ${authToken}`,
        },
      ),
      {
        env: {
          NOLO_DESKTOP: "1",
        },
        store: { read: async () => null },
        runTurn: async (input) => {
          calls.push(input);
          return {
            dialogId: "dialog-auth",
            content: "done",
            model: "qwen-coder",
          };
        },
      }
    );

    expect(response.status).toBe(200);
    expect(calls).toEqual([expect.objectContaining({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-auth-1",
        AUTH_TOKEN: authToken,
        AUTH: authToken,
      },
    })]);
  });

  test("injects desktop auth cookie into the desktop runtime env", async () => {
    const calls: unknown[] = [];
    const authToken = `${Buffer.from(JSON.stringify({ userId: "user-cookie-1" })).toString("base64")}.sig`;

    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest(
        {
          agentRef: "frontend",
          input: "hello",
        },
        {
          Cookie: `nolo_auth_token=${encodeURIComponent(authToken)}`,
        },
      ),
      {
        env: {
          NOLO_DESKTOP: "1",
        },
        store: { read: async () => null },
        runTurn: async (input) => {
          calls.push(input);
          return {
            dialogId: "dialog-cookie",
            content: "done",
            model: "qwen-coder",
          };
        },
      }
    );

    expect(response.status).toBe(200);
    expect(calls).toEqual([expect.objectContaining({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-cookie-1",
        AUTH_TOKEN: authToken,
        AUTH: authToken,
      },
    })]);
  });

  test("streams a stable error when the desktop turn throws", async () => {
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "nolo",
        input: "inspect my Desktop",
      }),
      {
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
        },
        store: { read: async () => null },
        runTurn: async () => {
          throw new Error("Local agent config not found: nolo");
        },
      }
    );

    expect(response.status).toBe(200);
    await expect(readDesktopRuntimeTurnEvents(response)).resolves.toEqual([
      {
        type: "error",
        error: "Local agent config not found: nolo",
      },
    ]);
  });

  test("passes workspaceToolsHint from the request body to the turn service", async () => {
    const calls: unknown[] = [];
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        input: "分析下 src/index.ts",
        workspaceToolsHint: true,
      }),
      {
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
        },
        store: { read: async () => null },
        runTurn: async (input) => {
          calls.push(input);
          return {
            dialogId: "dialog-hint",
            content: "done",
            model: "deepseek-v4-flash",
          };
        },
      }
    );

    expect(response.status).toBe(200);
    expect(calls).toEqual([
      expect.objectContaining({
        agentRef: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        workspaceToolsHint: true,
      }),
    ]);
  });

  test("omits workspaceToolsHint when the request body does not include it", async () => {
    const calls: unknown[] = [];
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "frontend",
        input: "hello",
      }),
      {
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
        },
        store: { read: async () => null },
        runTurn: async (input) => {
          calls.push(input);
          return {
            dialogId: "dialog-no-hint",
            content: "done",
            model: "qwen-coder",
          };
        },
      }
    );

    expect(response.status).toBe(200);
    const call = calls[0] as { workspaceToolsHint?: boolean };
    expect(call.workspaceToolsHint).toBeUndefined();
  });

  test("streams thinking SSE events from onReasoningDelta", async () => {
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "frontend",
        input: "reason about this",
      }),
      {
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
        },
        store: { read: async () => null },
        runTurn: async (input) => {
          input.onReasoningDelta?.("thinking ");
          input.onReasoningDelta?.("step 1");
          input.onTextDelta?.("answer");
          return {
            dialogId: "dialog-existing",
            content: "answer",
            model: "qwen-coder",
          };
        },
      }
    );

    expect(response.status).toBe(200);
    await expect(readDesktopRuntimeTurnEvents(response)).resolves.toEqual([
      { type: "thinking", content: "thinking " },
      { type: "thinking", content: "step 1" },
      { type: "delta", text: "answer" },
      {
        type: "done",
        result: {
          dialogId: "dialog-existing",
          content: "answer",
          model: "qwen-coder",
        },
      },
    ]);
  });

  test("forwards onReasoningDelta through to runTurn", async () => {
    const calls: unknown[] = [];
    const response = await handleDesktopAgentRuntimeTurnPost(
      trustedTurnRequest({
        agentRef: "frontend",
        input: "hello",
      }),
      {
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
        },
        store: { read: async () => null },
        runTurn: async (input) => {
          calls.push(input);
          return {
            dialogId: "dialog-existing",
            content: "done",
            model: "qwen-coder",
          };
        },
      }
    );
    expect(response.status).toBe(200);
    const call = calls[0] as { onReasoningDelta?: (chunk: string) => void };
    expect(typeof call.onReasoningDelta).toBe("function");
  });
});
