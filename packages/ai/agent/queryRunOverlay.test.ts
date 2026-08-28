import { describe, expect, test, mock } from "bun:test";
import type { RootState } from "app/store";
import { queryRunOverlay } from "./queryRunOverlay";
import { buildOverlayPresentation } from "core/chat/runOverlayPresentation";

// Minimal RootState shape — queryRunOverlay only reads settings.currentServer
// and auth.currentToken via the real selectors.
function makeState(token: string | null): RootState {
  return {
    settings: { currentServer: "https://nolo.test" },
    auth: { currentToken: token },
  } as unknown as RootState;
}

function threadsResponse(threads: unknown[]) {
  return new Response(
    JSON.stringify({ ok: true, data: { threads, bySection: { running: [], future: [], recent: [] } } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("queryRunOverlay", () => {
  test("returns null when dialogKey has no resolvable id", async () => {
    const fetchMock = mock(() => Promise.resolve(threadsResponse([])));
    // "ab" → extractKeyPart(key,2) = "" (parts=["ab"], slice(2) empty)
    const res = await queryRunOverlay(makeState("tok"), "ab", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(res).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns null without a token (unauthenticated)", async () => {
    const fetchMock = mock(() => Promise.resolve(threadsResponse([])));
    // dialog-user-1-abc → extractCustomId = "abc"
    const res = await queryRunOverlay(makeState(null), "dialog-user-1-abc", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(res).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("reduces direct children into a RunOverlayState", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        threadsResponse([
          {
            threadId: "run-1",
            parentThreadId: "abc",
            title: "评审文件A",
            status: "running",
            primaryAgentKey: "agent-x",
            section: "running",
            createdAt: 1,
            updatedAt: 100,
          },
          {
            threadId: "run-2",
            parentThreadId: "abc",
            title: "API 变更",
            summary: "需确认",
            status: "done",
            primaryAgentKey: "agent-y",
            section: "recent",
            createdAt: 2,
            updatedAt: 200,
          },
          // unrelated child of another parent — must be filtered out
          {
            threadId: "run-3",
            parentThreadId: "other",
            title: "not mine",
            status: "running",
            section: "running",
            createdAt: 3,
            updatedAt: 300,
          },
        ]),
      ),
    );
    const res = await queryRunOverlay(makeState("tok"), "dialog-user-1-abc", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(res).not.toBeNull();
    expect(res!.runs.size).toBe(2);
    expect(res!.runs.get("run-1")!.name).toBe("评审文件A");
    expect(res!.runs.get("run-1")!.status).toBe("running");
    expect(res!.runs.get("run-2")!.status).toBe("done");
    expect(res!.runs.get("run-2")!.summary).toBe("需确认");
    // presentation builds without throwing
    const text = buildOverlayPresentation(res!);
    expect(text).toContain("评审文件A");
    expect(text).toContain("1 个正在运行");
  });

  test("maps pending → running", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        threadsResponse([
          {
            threadId: "run-p",
            parentThreadId: "abc",
            title: "queued",
            status: "pending",
            section: "running",
            createdAt: 1,
            updatedAt: 1,
          },
        ]),
      ),
    );
    const res = await queryRunOverlay(makeState("tok"), "dialog-user-1-abc", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(res!.runs.get("run-p")!.status).toBe("running");
  });

  test("returns null when no direct children match", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        threadsResponse([
          {
            threadId: "run-9",
            parentThreadId: "other",
            status: "done",
            section: "recent",
            createdAt: 1,
            updatedAt: 1,
          },
        ]),
      ),
    );
    const res = await queryRunOverlay(makeState("tok"), "dialog-user-1-abc", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(res).toBeNull();
  });

  test("returns null on fetch failure (never throws)", async () => {
    const fetchMock = mock(() => Promise.reject(new Error("network down")));
    const res = await queryRunOverlay(makeState("tok"), "dialog-user-1-abc", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(res).toBeNull();
  });

  test("returns null on non-ok response", async () => {
    const fetchMock = mock(() => Promise.resolve(new Response("nope", { status: 500 })));
    const res = await queryRunOverlay(makeState("tok"), "dialog-user-1-abc", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(res).toBeNull();
  });
});