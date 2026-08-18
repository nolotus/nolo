import { describe, expect, test } from "bun:test";

import {
  buildDesktopAgentRuntimeTurnBody,
  DESKTOP_AGENT_CONFIG_SNAPSHOT_BUILD_FAILED,
  runDesktopAgentRuntimeTurn,
  runDesktopAgentRuntimeTurnStream,
} from "./desktopAgentRuntimeTurnClient";

const mockFetch = (fn: any): typeof fetch => fn as unknown as typeof fetch;

describe("desktop agent runtime turn client", () => {
  test("posts a text turn to the desktop agent runtime endpoint", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const result = await runDesktopAgentRuntimeTurn({
      agentRef: "frontend",
      input: "fix the notification UI",
      runtimeContext: {
        subjectRefs: [{ kind: "table-row", id: "row-user-board-task", role: "task" }],
      },
      continueDialogId: "dialog-existing",
      cwd: "/workspace/project",
      fetchImpl: mockFetch(async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ url: String(input), init });
        return new Response(JSON.stringify({
          ok: true,
          result: {
            dialogId: "dialog-existing",
            content: "done",
            model: "qwen-coder",
          },
        }));
      }),
    });

    expect(result).toEqual({
      ok: true,
      result: {
        dialogId: "dialog-existing",
        content: "done",
        model: "qwen-coder",
      },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("/api/desktop/agent-runtime/turn");
    expect(requests[0]?.init?.method).toBe("POST");
    expect(requests[0]?.init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
      agentRef: "frontend",
      input: "fix the notification UI",
      runtimeContext: {
        subjectRefs: [{ kind: "table-row", id: "row-user-board-task", role: "task" }],
      },
      continueDialogId: "dialog-existing",
      cwd: "/workspace/project",
    });
  });

  test("sanitizes agentConfigSnapshot and never posts raw apiKey or apiKeyFromAgentKey", async () => {
    const requests: Array<{ init?: RequestInit }> = [];
    await runDesktopAgentRuntimeTurn({
      agentRef: "agent-local-1",
      input: "hello",
      agentConfigSnapshot: {
        dbKey: "agent-local-1",
        prompt: "local helper",
        model: "local-model",
        provider: "custom",
        apiSource: "custom",
        customProviderUrl: "http://127.0.0.1:11434/v1",
        credentialRef: "api-key:agent-local-1",
        apiKey: "sk-must-not-be-sent",
        apiKeyFromAgentKey: "sk-legacy-must-not-be-sent",
        token: "secret",
      } as any,
      fetchImpl: mockFetch(async (_input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ init });
        return new Response(JSON.stringify({
          ok: true,
          result: { dialogId: "d1", content: "ok", model: "local-model" },
        }));
      }),
    });

    const body = JSON.parse(String(requests[0]?.init?.body));
    expect(body.agentConfigSnapshot).toEqual({
      dbKey: "agent-local-1",
      prompt: "local helper",
      model: "local-model",
      provider: "custom",
      apiSource: "custom",
      customProviderUrl: "http://127.0.0.1:11434/v1",
      credentialRef: "api-key:agent-local-1",
    });
    expect(body.agentConfigSnapshot).not.toHaveProperty("apiKey");
    expect(body.agentConfigSnapshot).not.toHaveProperty("apiKeyFromAgentKey");
    expect(JSON.stringify(body)).not.toContain("sk-must-not-be-sent");
    expect(JSON.stringify(body)).not.toContain("sk-legacy-must-not-be-sent");
  });

  test("fail-closed: throws when agent config is given but snapshot build fails", () => {
    expect(() =>
      buildDesktopAgentRuntimeTurnBody({
        agentRef: "agent-local-1",
        input: "hello",
        agentConfigSnapshot: {
          dbKey: "agent-other-mismatch",
          prompt: "x",
          model: "m",
        },
      }),
    ).toThrow(DESKTOP_AGENT_CONFIG_SNAPSHOT_BUILD_FAILED);
  });

  test("fail-closed stream path surfaces stable error before fetch", async () => {
    let fetchCalled = false;
    const events = [];
    for await (const event of runDesktopAgentRuntimeTurnStream({
      agentRef: "agent-local-1",
      input: "hello",
      agentConfigSnapshot: {
        dbKey: "agent-mismatch",
        prompt: "x",
      },
      fetchImpl: mockFetch(async () => {
        fetchCalled = true;
        return new Response("should not run");
      }),
    })) {
      events.push(event);
    }

    expect(fetchCalled).toBe(false);
    expect(events).toEqual([
      { type: "error", error: DESKTOP_AGENT_CONFIG_SNAPSHOT_BUILD_FAILED },
    ]);
  });

  test("buildDesktopAgentRuntimeTurnBody includes sanitized dialog history", () => {
    const body = buildDesktopAgentRuntimeTurnBody({
      agentRef: "agent-local-1",
      input: "new question",
      continueDialogId: "dialog-1",
      dialogMessages: [
        { role: "user", content: "old" },
        { role: "assistant", content: "answer" },
        { role: "user", content: "new question" },
      ],
      agentConfigSnapshot: {
        dbKey: "agent-local-1",
        prompt: "p",
        model: "m",
      },
    });

    expect(body.dialogHistorySnapshot).toEqual({
      dialogId: "dialog-1",
      messages: [
        { role: "user", content: "old" },
        { role: "assistant", content: "answer" },
      ],
    });
    expect(body.agentConfigSnapshot).toMatchObject({
      dbKey: "agent-local-1",
      prompt: "p",
      model: "m",
    });
  });

  test("returns a stable error shape when the desktop runtime rejects the turn", async () => {
    const result = await runDesktopAgentRuntimeTurn({
      agentRef: "frontend",
      input: "fix",
      fetchImpl: mockFetch(async () => new Response(JSON.stringify({
        error: "Desktop runtime only",
      }), { status: 404 })),
    });

    expect(result).toEqual({
      ok: false,
      error: "Desktop runtime only",
    });
  });

  test("parses streamed desktop runtime events", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"delta","text":"he"}\n'));
        controller.enqueue(encoder.encode('data: {"type":"delta","text":"llo"}'));
        controller.close();
      },
    });

    const events = [];
    for await (const event of runDesktopAgentRuntimeTurnStream({
      agentRef: "frontend",
      input: "fix",
      fetchImpl: mockFetch(async () => new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      })),
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "delta", text: "he" },
      { type: "delta", text: "llo" },
    ]);
  });

  test("trims continueDialogId before posting the desktop turn", async () => {
    const requests: Array<{ init?: RequestInit }> = [];
    await runDesktopAgentRuntimeTurn({
      agentRef: "frontend",
      input: "fix the notification UI",
      continueDialogId: "  dialog-existing  ",
      fetchImpl: mockFetch(async (_input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ init });
        return new Response(JSON.stringify({
          ok: true,
          result: { dialogId: "dialog-existing", content: "done", model: "qwen-coder" },
        }));
      }),
    });

    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
      agentRef: "frontend",
      input: "fix the notification UI",
      continueDialogId: "dialog-existing",
    });
  });

  test("omits blank continueDialogId from the desktop turn body", async () => {
    const requests: Array<{ init?: RequestInit }> = [];
    await runDesktopAgentRuntimeTurn({
      agentRef: "frontend",
      input: "fix the notification UI",
      continueDialogId: "   ",
      fetchImpl: mockFetch(async (_input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ init });
        return new Response(JSON.stringify({
          ok: true,
          result: { dialogId: "dialog-new", content: "done", model: "qwen-coder" },
        }));
      }),
    });

    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
      agentRef: "frontend",
      input: "fix the notification UI",
    });
  });
});
