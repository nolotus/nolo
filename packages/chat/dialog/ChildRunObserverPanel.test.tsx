import { afterEach, describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderInDom } from "../../testing/domRender";

const fetchMock = mock(async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      data: {
        threads: [
          {
            threadId: "child-running",
            dialogId: "child-running",
            dialogKey: "dialog-user-child-running",
            title: "Research subtask",
            primaryAgentKey: "agent-researcher",
            status: "running",
            threadKind: "background",
            presentationIntent: "background_handoff",
            parentThreadId: "parent-1",
            rootThreadId: "parent-1",
            section: "running",
            createdAt: 1,
            updatedAt: 10,
            queued: 2,
            runtimeEvidence: {
              status: "running",
              lastToolNames: ["execShell"],
              lastAssistantText: "still working",
              hasRuntimeToolPolicySnapshot: false,
            },
          },
          {
            threadId: "child-failed",
            dialogId: "child-failed",
            primaryAgentKey: "agent-worker",
            status: "failed",
            threadKind: "background",
            parentThreadId: "parent-1",
            rootThreadId: "parent-1",
            section: "recent",
            createdAt: 2,
            updatedAt: 20,
            runtimeEvidence: {
              lastToolNames: [],
              errorMessage: "tool blew up",
              hasRuntimeToolPolicySnapshot: false,
            },
          },
          {
            threadId: "unrelated",
            primaryAgentKey: "agent-other",
            status: "done",
            threadKind: "background",
            parentThreadId: "other-parent",
            section: "recent",
            createdAt: 3,
            updatedAt: 30,
          },
        ],
        bySection: {
          running: ["child-running"],
          future: [],
          recent: ["child-failed", "unrelated"],
        },
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

/** Stable test copy (locale-independent); mirrors en childRunObserver keys. */
const TEST_COPY: Record<string, string> = {
  "childRunObserver.panelAriaLabel": "Child runs",
  "childRunObserver.title": "Child runs",
  "childRunObserver.subtitleLoading": "Loading child runs…",
  "childRunObserver.subtitleCount": "{{count}} background child runs",
  "childRunObserver.refreshAriaLabel": "Refresh child run list",
  "childRunObserver.refreshTitle": "Refresh",
  "childRunObserver.expandAriaLabel": "Expand child runs",
  "childRunObserver.expandTitle": "Expand",
  "childRunObserver.collapseAriaLabel": "Collapse child runs",
  "childRunObserver.collapseTitle": "Collapse",
  "childRunObserver.loading": "Loading child runs…",
  "childRunObserver.loadFailed": "Failed to load",
  "childRunObserver.retry": "Retry",
  "childRunObserver.empty":
    "This dialog has no background child runs yet. They appear here after startAgentRun (async dispatch).",
  "childRunObserver.statusPending": "Pending",
  "childRunObserver.statusRunning": "Running",
  "childRunObserver.statusDone": "Done",
  "childRunObserver.statusFailed": "Failed",
  "childRunObserver.statusCancelled": "Cancelled",
  "childRunObserver.statusUnknown": "Unknown",
  "childRunObserver.defaultTitle": "Child run",
  "childRunObserver.missingDialogId": "Missing child dialog ID",
  "childRunObserver.detailStatus": "Status",
  "childRunObserver.detailAgent": "Agent",
  "childRunObserver.detailThread": "Thread",
  "childRunObserver.detailLoading": "Loading child dialog…",
  "childRunObserver.detailLoadFailed": "Unable to load child dialog",
  "childRunObserver.detailEmpty": "No messages or evidence yet.",
  "childRunObserver.messagesAriaLabel": "Child dialog messages",
  "childRunObserver.emptyContent": "(empty)",
  "childRunObserver.appendInstructionTitle": "Append instruction",
  "childRunObserver.appendInstructionPlaceholder": "Append instruction to running task…",
  "childRunObserver.appendInstructionButton": "Send",
  "childRunObserver.appendInstructionSending": "Sending…",
  "childRunObserver.appendInstructionSuccess": "Enqueued; will be consumed in the next turn",
  "childRunObserver.appendInstructionFailed": "Failed to send instruction",
  "childRunObserver.continueTaskTitle": "Continue task",
  "childRunObserver.continueTaskPlaceholder": "Enter instruction to continue task…",
  "childRunObserver.continueTaskButton": "Continue",
  "childRunObserver.continueTaskSuccess": "Continue instruction sent",
  "childRunObserver.queuedCount": "{{count}} queued",
  "childRunObserver.queuedCountTitle": "Number of queued instructions",
};

function translateTestCopy(
  key: string,
  defaultOrOptions?: any,
  maybeOptions?: any,
): string {
  const options =
    typeof defaultOrOptions === "object" ? defaultOrOptions : maybeOptions;
  const template =
    TEST_COPY[key] ??
    (typeof defaultOrOptions === "string" ? defaultOrOptions : key);
  if (!options) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(options[name] ?? ""),
  );
}

type MockMode = "default" | "empty" | "fail";

let mockMode: MockMode = "default";
let mockToken: string | null = "test-token";
let mocksInstalled = false;

async function installMocks(args?: {
  token?: string | null;
  emptyThreads?: boolean;
  fail?: boolean;
}) {
  mockToken = args?.token === undefined ? "test-token" : args.token;
  mockMode = args?.fail ? "fail" : args?.emptyThreads ? "empty" : "default";

  if (!mocksInstalled) {
    mock.module("identity", () => ({
      useToken: () => mockToken,
    }));

    mock.module("app/store", () => ({
      useAppDispatch: () => () => undefined,
      useAppSelector: (selector: (state: unknown) => unknown) =>
        selector({
          auth: { currentToken: mockToken },
          settings: { currentServer: "http://127.0.0.1:38123" },
        }),
    }));

    mock.module("auth/authSlice", () => ({
      selectCurrentToken: (state: any) => state.auth.currentToken,
    }));

    mock.module("app/settings/settingSlice", () => ({
      selectCurrentServer: (state: any) => state.settings.currentServer,
    }));

    mock.module("react-i18next", () => ({
      useTranslation: () => ({
        t: translateTestCopy,
        i18n: { language: "en" },
      }),
    }));

    mock.module("render/web/ui/modal/Dialog", () => ({
      Dialog: ({
        isOpen,
        onClose,
        title,
        children,
      }: {
        isOpen: boolean;
        onClose: () => void;
        title?: React.ReactNode;
        children: React.ReactNode;
      }) =>
        isOpen ? (
          <div role="dialog" aria-label={String(title ?? "dialog")}>
            <button type="button" onClick={onClose}>
              close
            </button>
            <div>{title}</div>
            {children}
          </div>
        ) : null,
    }));

    mocksInstalled = true;
  }

  fetchMock.mockImplementation(async (...args: unknown[]) => {
    const url = String(args[0] ?? "");
    if (url.includes("/api/dialog-read")) {
      return new Response(
        JSON.stringify({
          ok: true,
          meta: { title: "Research subtask", status: "running" },
          msgs: [
            { id: "m1", role: "user", content: "do research" },
            { id: "m2", role: "assistant", content: "still working" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (mockMode === "fail") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: { code: "internal", message: "Query failed" },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (mockMode === "empty") {
      return new Response(
        JSON.stringify({
          ok: true,
          data: { threads: [], bySection: { running: [], future: [], recent: [] } },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          threads: [
            {
              threadId: "child-running",
              dialogId: "child-running",
              dialogKey: "dialog-user-child-running",
              title: "Research subtask",
              primaryAgentKey: "agent-researcher",
              status: "running",
              threadKind: "background",
              presentationIntent: "background_handoff",
              parentThreadId: "parent-1",
              rootThreadId: "parent-1",
              section: "running",
              createdAt: 1,
              updatedAt: 10,
              queued: 2,
              runtimeEvidence: {
                status: "running",
                lastToolNames: ["execShell"],
                lastAssistantText: "still working",
                hasRuntimeToolPolicySnapshot: false,
              },
            },
            {
              threadId: "child-failed",
              dialogId: "child-failed",
              primaryAgentKey: "agent-worker",
              status: "failed",
              threadKind: "background",
              parentThreadId: "parent-1",
              rootThreadId: "parent-1",
              section: "recent",
              createdAt: 2,
              updatedAt: 20,
              runtimeEvidence: {
                lastToolNames: [],
                errorMessage: "tool blew up",
                hasRuntimeToolPolicySnapshot: false,
              },
            },
            {
              threadId: "unrelated",
              primaryAgentKey: "agent-other",
              status: "done",
              threadKind: "background",
              parentThreadId: "other-parent",
              section: "recent",
              createdAt: 3,
              updatedAt: 30,
            },
          ],
          bySection: {
            running: ["child-running"],
            future: [],
            recent: ["child-failed", "unrelated"],
          },
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  // @ts-expect-error test mock
  globalThis.fetch = fetchMock;
}

let moduleVersion = 0;

async function loadPanel() {
  const mod = await import(
    `./ChildRunObserverPanel.tsx?test=${moduleVersion++}`
  );
  return mod.ChildRunObserverPanel;
}

const waitFor = async (
  assertFn: () => void,
  timeoutMs = 1500,
): Promise<void> => {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    try {
      assertFn();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("waitFor timed out");
};

describe("ChildRunObserverPanel", () => {
  afterEach(() => {
    fetchMock.mockClear();
  });

  const expandPanel = async (
    container: HTMLElement,
    click: (el: Element) => Promise<void> | void,
  ) => {
    await waitFor(() => {
      expect(
        container.querySelector("button.ChildRunObserverPanel__collapsedRail"),
      ).toBeTruthy();
    });
    const rail = container.querySelector(
      "button.ChildRunObserverPanel__collapsedRail",
    ) as HTMLButtonElement;
    await click(rail);
  };

  it("loads parent-filtered children and covers running/failed rows", async () => {
    await installMocks();
    const Panel = await loadPanel();
    const { container, cleanup, click } = await renderInDom(
      <Panel parentThreadId="parent-1" />,
    );

    try {
      await expandPanel(container, click);
      await waitFor(() => {
        expect(container.textContent).toContain("Research subtask");
        // Status labels come from i18n mock (TEST_COPY), not hardcoded UI copy.
        expect(container.textContent).toContain(
          TEST_COPY["childRunObserver.statusRunning"],
        );
        expect(container.textContent).toContain(
          TEST_COPY["childRunObserver.statusFailed"],
        );
        expect(container.textContent).toContain("tool blew up");
        expect(container.textContent).toContain("2 queued");
        expect(container.textContent).not.toContain("unrelated");
      });

      const threadFetchUrl = fetchMock.mock.calls
        .map((call) => String((call as unknown[])[0] ?? ""))
        .find((url) => url.includes("/api/agent/threads?parentThreadId=parent-1"));
      expect(threadFetchUrl).toBeTruthy();
      expect(threadFetchUrl).not.toContain("agentKey=");
    } finally {
      await cleanup();
    }
  });

  it("hides chrome when parent has no children (no default expand)", async () => {
    await installMocks({ emptyThreads: true });
    const Panel = await loadPanel();
    const { container, cleanup } = await renderInDom(
      <Panel parentThreadId="parent-1" />,
    );

    try {
      await waitFor(() => {
        const urls = fetchMock.mock.calls.map((call) =>
          String((call as unknown[])[0] ?? ""),
        );
        expect(
          urls.some((url) =>
            url.includes("/api/agent/threads?parentThreadId=parent-1"),
          ),
        ).toBe(true);
      });
      expect(container.querySelector(".ChildRunObserverPanel")).toBeNull();
      expect(
        container.querySelector(".ChildRunObserverPanel__collapsedRail"),
      ).toBeNull();
      expect(container.textContent).not.toContain("startAgentRun (async dispatch)");
    } finally {
      await cleanup();
    }
  });

  it("starts collapsed when there are children and can expand then collapse", async () => {
    await installMocks();
    const Panel = await loadPanel();
    const { container, cleanup, click } = await renderInDom(
      <Panel parentThreadId="parent-1" />,
    );

    try {
      await waitFor(() => {
        expect(
          container.querySelector("button.ChildRunObserverPanel__collapsedRail"),
        ).toBeTruthy();
      });
      expect(container.querySelector(".ChildRunObserverPanel")).toBeNull();
      expect(container.textContent).not.toContain("Research subtask");

      await expandPanel(container, click);
      await waitFor(() => {
        expect(container.textContent).toContain("Research subtask");
      });

      const collapse = Array.from(
        container.querySelectorAll("button.ChildRunObserverPanel__iconButton"),
      ).find((btn) =>
        (btn.getAttribute("aria-label") || "").includes("Collapse"),
      ) as HTMLButtonElement | undefined;
      expect(collapse).toBeTruthy();
      await click(collapse!);

      await waitFor(() => {
        expect(
          container.querySelector("button.ChildRunObserverPanel__collapsedRail"),
        ).toBeTruthy();
      });
      expect(container.querySelector(".ChildRunObserverPanel")).toBeNull();
    } finally {
      await cleanup();
    }
  });

  it("shows error state with retry after expand", async () => {
    await installMocks({ fail: true });
    const Panel = await loadPanel();
    const { container, cleanup, click } = await renderInDom(
      <Panel parentThreadId="parent-1" />,
    );

    try {
      await expandPanel(container, click);
      await waitFor(() => {
        expect(container.textContent).toContain("Query failed");
        expect(container.textContent).toContain(
          TEST_COPY["childRunObserver.retry"],
        );
      });
    } finally {
      await cleanup();
    }
  });

  it("opens child detail modal from parentThreadId-filtered list", async () => {
    await installMocks();
    const Panel = await loadPanel();
    const { container, cleanup, click } = await renderInDom(
      <Panel parentThreadId="parent-1" />,
    );

    try {
      await expandPanel(container, click);
      await waitFor(() => {
        expect(container.textContent).toContain("Research subtask");
      });

      const buttons = Array.from(
        container.querySelectorAll("button.ChildRunObserverPanel__item"),
      ) as HTMLButtonElement[];
      expect(buttons.length).toBeGreaterThan(0);
      await click(buttons[0]!);

      await waitFor(() => {
        expect(container.textContent).toContain("still working");
        expect(container.textContent).toContain("do research");
        expect(
          container.querySelector(".AppendInstructionControl[data-mode='enqueue']"),
        ).not.toBeNull();
      });
    } finally {
      await cleanup();
    }
  });
});
