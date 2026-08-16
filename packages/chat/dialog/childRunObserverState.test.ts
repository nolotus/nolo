import { describe, expect, it } from "bun:test";

import type { ClientAgentThread } from "ai/agent/web/agentDisplayUtils";
import {
  buildChildThreadsQueryUrl,
  filterDirectChildRuns,
  formatChildRunEvidenceLine,
  formatChildRunStatusLabel,
  hasActiveChildRuns,
  mapDialogReadMessages,
  parseChildThreadsResponse,
  parseDialogReadResponse,
  resolveChildDialogId,
  resolveChildRunLoadState,
  resolveChildRunTitle,
  shouldPollChildRuns,
  sortChildRunsByUpdatedAtDesc,
} from "./childRunObserverState";

const parentId = "parent-dialog-1";

const makeThread = (
  overrides: Partial<ClientAgentThread> & Pick<ClientAgentThread, "threadId">,
): ClientAgentThread => ({
  primaryAgentKey: "agent-child",
  status: "running",
  threadKind: "background",
  section: "running",
  createdAt: 1_000,
  updatedAt: 2_000,
  parentThreadId: parentId,
  rootThreadId: parentId,
  ...overrides,
});

describe("childRunObserverState filtering", () => {
  it("keeps only direct children by parentThreadId", () => {
    const threads = [
      makeThread({ threadId: "child-1", parentThreadId: parentId }),
      makeThread({
        threadId: "other",
        parentThreadId: "other-parent",
        status: "done",
        section: "recent",
      }),
      makeThread({
        threadId: "orphan",
        parentThreadId: undefined,
        status: "failed",
        section: "recent",
      }),
    ];

    const filtered = filterDirectChildRuns(threads, parentId);
    expect(filtered.map((t) => t.threadId)).toEqual(["child-1"]);
  });

  it("never matches by agent key or title", () => {
    const threads = [
      makeThread({
        threadId: "same-agent",
        primaryAgentKey: "agent-parent",
        title: "Parent title twin",
        parentThreadId: "unrelated",
      }),
    ];
    expect(filterDirectChildRuns(threads, parentId)).toEqual([]);
  });

  it("sorts by updatedAt descending", () => {
    const sorted = sortChildRunsByUpdatedAtDesc([
      makeThread({ threadId: "a", updatedAt: 10 }),
      makeThread({ threadId: "b", updatedAt: 30 }),
      makeThread({ threadId: "c", updatedAt: 20 }),
    ]);
    expect(sorted.map((t) => t.threadId)).toEqual(["b", "c", "a"]);
  });
});

describe("childRunObserverState response parsing", () => {
  it("parses ok payload and re-filters by parent", () => {
    const result = parseChildThreadsResponse(
      {
        ok: true,
        data: {
          threads: [
            makeThread({ threadId: "child-1", updatedAt: 5 }),
            makeThread({
              threadId: "noise",
              parentThreadId: "other",
              updatedAt: 9,
            }),
            makeThread({
              threadId: "child-2",
              status: "failed",
              section: "recent",
              updatedAt: 8,
              runtimeEvidence: {
                lastToolNames: [],
                errorMessage: "boom",
                hasRuntimeToolPolicySnapshot: false,
              },
            }),
          ],
          bySection: { running: ["child-1"], future: [], recent: ["child-2"] },
        },
      },
      parentId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.threads.map((t) => t.threadId)).toEqual(["child-2", "child-1"]);
  });

  it("surfaces error payloads", () => {
    const result = parseChildThreadsResponse(
      { ok: false, error: { code: "unauthorized", message: "Authentication required" } },
      parentId,
    );
    expect(result).toEqual({
      ok: false,
      error: "Authentication required",
    });
  });
});

describe("childRunObserverState load + poll states", () => {
  it("covers loading empty error ready", () => {
    expect(
      resolveChildRunLoadState({
        isLoading: true,
        errorMessage: null,
        threads: [],
        hasLoadedOnce: false,
      }),
    ).toBe("loading");

    expect(
      resolveChildRunLoadState({
        isLoading: false,
        errorMessage: "network",
        threads: [],
        hasLoadedOnce: true,
      }),
    ).toBe("error");

    expect(
      resolveChildRunLoadState({
        isLoading: false,
        errorMessage: null,
        threads: [],
        hasLoadedOnce: true,
      }),
    ).toBe("empty");

    expect(
      resolveChildRunLoadState({
        isLoading: false,
        errorMessage: null,
        threads: [makeThread({ threadId: "c1" })],
        hasLoadedOnce: true,
      }),
    ).toBe("ready");
  });

  it("polls only while running/pending children exist", () => {
    expect(
      shouldPollChildRuns([
        makeThread({ threadId: "done", status: "done", section: "recent" }),
      ]),
    ).toBe(false);
    expect(
      hasActiveChildRuns([
        makeThread({ threadId: "run", status: "running" }),
      ]),
    ).toBe(true);
    expect(
      shouldPollChildRuns([
        makeThread({ threadId: "pending", status: "pending" }),
      ]),
    ).toBe(true);
  });
});

describe("childRunObserverState presentation", () => {
  it("formats status labels with stable English defaults", () => {
    expect(formatChildRunStatusLabel("pending")).toBe("Pending");
    expect(formatChildRunStatusLabel("running")).toBe("Running");
    expect(formatChildRunStatusLabel("done")).toBe("Done");
    expect(formatChildRunStatusLabel("failed")).toBe("Failed");
    expect(formatChildRunStatusLabel("cancelled")).toBe("Cancelled");
    expect(formatChildRunStatusLabel(undefined)).toBe("Unknown");
  });

  it("accepts injected status labels without hardcoding locale", () => {
    const zhLabels = {
      pending: "排队中",
      running: "运行中",
      done: "已完成",
      failed: "失败",
      cancelled: "已取消",
      unknown: "未知",
    };
    expect(formatChildRunStatusLabel("running", zhLabels)).toBe("运行中");
    expect(formatChildRunStatusLabel("failed", zhLabels)).toBe("失败");
    expect(formatChildRunStatusLabel(null, zhLabels)).toBe("未知");
  });

  it("builds compact evidence lines without repeating the same total twice", () => {
    expect(
      formatChildRunEvidenceLine(
        {
          status: "running",
          lastToolNames: ["startAgentRun", "execShell"],
          lastAssistantText: "checkpoint text",
          hasRuntimeToolPolicySnapshot: true,
        },
        "running",
      ),
    ).toBe("Running · startAgentRun, execShell · checkpoint text");

    expect(
      formatChildRunEvidenceLine(
        {
          lastToolNames: [],
          errorMessage: "child failed",
          hasRuntimeToolPolicySnapshot: false,
        },
        "failed",
        { failed: "失败" },
      ),
    ).toBe("失败 · child failed");
  });

  it("resolves title and dialog id from relationship fields", () => {
    expect(
      resolveChildRunTitle({
        title: "Research subtask",
        primaryAgentKey: "agent-x",
        threadId: "t1",
      }),
    ).toBe("Research subtask");
    expect(
      resolveChildRunTitle(
        { title: undefined, primaryAgentKey: undefined, threadId: "t1" },
        "子任务",
      ),
    ).toBe("子任务");
    expect(
      resolveChildDialogId({ dialogId: "d1", threadId: "t1" }),
    ).toBe("d1");
    expect(resolveChildDialogId({ threadId: "t1" })).toBe("t1");
  });

  it("builds child threads URL with parentThreadId only", () => {
    expect(
      buildChildThreadsQueryUrl({
        serverOrigin: "http://127.0.0.1:38123/",
        parentThreadId: parentId,
      }),
    ).toBe(
      `http://127.0.0.1:38123/api/agent/threads?parentThreadId=${encodeURIComponent(parentId)}`,
    );
  });
});

describe("childRunObserverState dialog-read mapping", () => {
  it("maps and chronologically orders messages", () => {
    const messages = mapDialogReadMessages([
      { id: "m2", role: "assistant", content: "second", createdAt: 2 },
      { id: "m1", role: "user", content: "first", createdAt: 1 },
    ]);
    expect(messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("parses dialog-read ok and error", () => {
    const ok = parseDialogReadResponse({
      ok: true,
      meta: { title: "Child", status: "done" },
      msgs: [{ id: "m1", role: "assistant", content: "hello" }],
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.title).toBe("Child");
    expect(ok.messages).toHaveLength(1);

    const err = parseDialogReadResponse({ ok: false, error: "not found" });
    expect(err).toEqual({ ok: false, error: "not found" });
  });
});
