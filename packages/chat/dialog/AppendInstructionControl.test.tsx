import { afterEach, describe, expect, it, mock } from "bun:test";
import React, { act } from "react";
import { renderInDom, flushDomUpdates } from "../../testing/domRender";
import { AppendInstructionControl } from "./AppendInstructionControl";

const fetchMock = mock(async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      data: {
        action: "append",
        dialogKey: "dialog-child-1",
        mode: "enqueue",
        queued: 1,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

let mockToken: string | null = "test-token";
let mocksInstalled = false;

function installMocks() {
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

    mock.module("app/settings/settingSlice", () => ({
      selectCurrentServer: (state: any) => state.settings.currentServer,
    }));

    mock.module("react-i18next", () => ({
      useTranslation: () => ({
        t: (key: string, defaultOrOptions?: any, maybeOptions?: any) => {
          const options = typeof defaultOrOptions === "object" ? defaultOrOptions : maybeOptions;
          const fallback = typeof defaultOrOptions === "string" ? defaultOrOptions : key;
          if (!options) return fallback;
          return fallback.replace(/\{\{(\w+)\}\}/g, (_: string, name: string) =>
            String(options[name] ?? ""),
          );
        },
        i18n: { language: "zh" },
      }),
    }));

    mocksInstalled = true;
  }
}

async function typeInInput(input: HTMLInputElement, value: string) {
  const win = input.ownerDocument.defaultView as any;
  await act(async () => {
    const tracker = (input as any)._valueTracker;
    if (tracker) {
      tracker.setValue("___force_diff___");
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      win.HTMLInputElement.prototype,
      "value",
    );
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new win.Event("input", { bubbles: true, cancelable: true }));
  });
}

async function submitForm(form: HTMLFormElement) {
  const win = form.ownerDocument.defaultView as any;
  await act(async () => {
    form.dispatchEvent(
      new win.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}

describe("AppendInstructionControl", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    fetchMock.mockClear();
    globalThis.fetch = originalFetch;
    mockToken = "test-token";
  });

  it("renders enqueue mode for running tasks", async () => {
    installMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container, cleanup } = await renderInDom(
      <AppendInstructionControl
        dialogKey="dialog-running"
        status="running"
        queued={0}
      />,
    );

    try {
      const form = container.querySelector(".AppendInstructionControl");
      expect(form).not.toBeNull();
      expect(form?.getAttribute("data-mode")).toBe("enqueue");

      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.placeholder).toBe("追加指令给运行中的任务…");

      const submitBtn = container.querySelector('button[type="submit"]');
      expect(submitBtn?.textContent).toContain("追加");
    } finally {
      await cleanup();
    }
  });

  it("shows queued count badge when queued > 0", async () => {
    installMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container, cleanup } = await renderInDom(
      <AppendInstructionControl
        dialogKey="dialog-running"
        status="running"
        queued={3}
      />,
    );

    try {
      const badge = container.querySelector(".AppendInstructionControl__queuedBadge");
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toContain("3 条排队中");
    } finally {
      await cleanup();
    }
  });

  it("renders continue mode for done tasks", async () => {
    installMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container, cleanup } = await renderInDom(
      <AppendInstructionControl
        dialogKey="dialog-done"
        status="done"
      />,
    );

    try {
      const form = container.querySelector(".AppendInstructionControl");
      expect(form).not.toBeNull();
      expect(form?.getAttribute("data-mode")).toBe("continue");

      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.placeholder).toBe("输入指令继续任务…");

      const submitBtn = container.querySelector('button[type="submit"]');
      expect(submitBtn?.textContent).toContain("继续任务");
    } finally {
      await cleanup();
    }
  });

  it("renders continue mode for failed tasks", async () => {
    installMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container, cleanup } = await renderInDom(
      <AppendInstructionControl
        dialogKey="dialog-failed"
        status="failed"
      />,
    );

    try {
      const form = container.querySelector(".AppendInstructionControl");
      expect(form).not.toBeNull();
      expect(form?.getAttribute("data-mode")).toBe("continue");
    } finally {
      await cleanup();
    }
  });

  it("hides input for cancelled tasks", async () => {
    installMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container, cleanup } = await renderInDom(
      <AppendInstructionControl
        dialogKey="dialog-cancelled"
        status="cancelled"
      />,
    );

    try {
      const form = container.querySelector(".AppendInstructionControl");
      expect(form).toBeNull();
    } finally {
      await cleanup();
    }
  });

  it("handles successful enqueue submit and updates queued feedback", async () => {
    installMocks();
    let sentBody: any = null;
    fetchMock.mockImplementation(async (_url, init) => {
      sentBody = JSON.parse(String(init?.body ?? "{}"));
      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            action: "append",
            dialogKey: "dialog-running",
            mode: "enqueue",
            queued: 1,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    let successResult: any = null;
    const view = await renderInDom(
      <AppendInstructionControl
        dialogKey="dialog-running"
        status="running"
        queued={0}
        onSuccess={(r) => {
          successResult = r;
        }}
      />,
    );

    try {
      const input = view.container.querySelector("input") as HTMLInputElement;
      await typeInInput(input, "New instruction for running task");
      await flushDomUpdates(2);

      const form = view.container.querySelector("form") as HTMLFormElement;
      await submitForm(form);
      await flushDomUpdates(5);

      expect(sentBody).toEqual({
        action: "append",
        dialogKey: "dialog-running",
        userInput: "New instruction for running task",
        mode: "enqueue",
      });

      expect(successResult).toEqual({
        mode: "enqueue",
        queued: 1,
        status: undefined,
      });

      const successEl = view.container.querySelector(".AppendInstructionControl__success");
      expect(successEl?.textContent).toContain("已加入队列，将在下一轮消费");

      const badge = view.container.querySelector(".AppendInstructionControl__queuedBadge");
      expect(badge?.textContent).toContain("1 条排队中");
    } finally {
      await view.cleanup();
    }
  });

  it("handles continue task submit and fires callback", async () => {
    installMocks();
    let sentBody: any = null;
    fetchMock.mockImplementation(async (_url, init) => {
      sentBody = JSON.parse(String(init?.body ?? "{}"));
      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            action: "append",
            dialogKey: "dialog-done",
            mode: "continue",
            status: "running",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    let successResult: any = null;
    const view = await renderInDom(
      <AppendInstructionControl
        dialogKey="dialog-done"
        status="done"
        onSuccess={(r) => {
          successResult = r;
        }}
      />,
    );

    try {
      const input = view.container.querySelector("input") as HTMLInputElement;
      await typeInInput(input, "Continue with Phase 2");
      await flushDomUpdates(2);

      const form = view.container.querySelector("form") as HTMLFormElement;
      await submitForm(form);
      await flushDomUpdates(5);

      expect(sentBody).toEqual({
        action: "append",
        dialogKey: "dialog-done",
        userInput: "Continue with Phase 2",
        mode: "continue",
      });

      expect(successResult).toEqual({
        mode: "continue",
        queued: undefined,
        status: "running",
      });

      const successEl = view.container.querySelector(".AppendInstructionControl__success");
      expect(successEl?.textContent).toContain("已提交继续指令");
    } finally {
      await view.cleanup();
    }
  });

  it("displays server error inline and preserves input without swallowing", async () => {
    installMocks();
    fetchMock.mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "queue_not_empty",
            message: "Cannot continue task while queue is not empty",
          },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const view = await renderInDom(
      <AppendInstructionControl
        dialogKey="dialog-failed"
        status="failed"
      />,
    );

    try {
      const input = view.container.querySelector("input") as HTMLInputElement;
      await typeInInput(input, "retry please");
      await flushDomUpdates(2);

      const form = view.container.querySelector("form") as HTMLFormElement;
      await submitForm(form);
      await flushDomUpdates(5);

      const errorEl = view.container.querySelector(".AppendInstructionControl__error");
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toBe("Cannot continue task while queue is not empty");
      expect(input.value).toBe("retry please");
    } finally {
      await view.cleanup();
    }
  });
});
