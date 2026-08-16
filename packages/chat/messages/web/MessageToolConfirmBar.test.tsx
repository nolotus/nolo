import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

let dispatchCalls: unknown[] = [];
let mockState: any;
let container: HTMLDivElement;
let root: Root;
let dom: JSDOM;
let previousWindow: typeof globalThis.window | undefined;
let previousDocument: typeof globalThis.document | undefined;
let previousElement: typeof globalThis.Element | undefined;
let previousHTMLElement: typeof globalThis.HTMLElement | undefined;
let previousActEnvironment: boolean | undefined;
let MessageToolConfirmBar: React.ComponentType<{
  messageId?: string;
  isRobot: boolean;
}>;

const ZH_TOOL_CONFIRM: Record<string, string> = {
  "toolConfirm.executing": "正在执行…",
  "toolConfirm.patchApplied": "补丁已应用",
  "toolConfirm.executed": "已执行 {{name}}",
  "toolConfirm.retryApplyPatch": "重试应用补丁",
  "toolConfirm.retryExec": "重试执行 {{name}}",
  "toolConfirm.confirmDeleteSpaces": "确认删除这些 Space",
  "toolConfirm.applyPatchDanger": "应用这个补丁（危险操作）",
  "toolConfirm.confirmExec": "执行 {{name}}（需要确认）",
  "toolConfirm.successPatch": "✅ 已成功将补丁应用到 {{path}}。",
  "toolConfirm.successExec": "✅ 已成功执行 {{name}}。",
  "toolConfirm.failure": "❌ 执行失败：{{error}}",
  "toolConfirm.unknownError": "未知错误",
  "toolConfirm.confirmDelete": "确认删除{{entity}}",
  "toolConfirm.confirmExecGate": "确认执行 {{name}}",
  "toolConfirm.entitySpace": "空间",
  "toolConfirm.entityDialog": "对话",
};

const translateZh = (key: string, options?: Record<string, unknown>) => {
  const template = ZH_TOOL_CONFIRM[key] ?? key;
  if (!options) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(options[name] ?? "")
  );
};

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const loadMessageToolConfirmBar = async () => {
  const actualStore = await import("app/store");
  const actualToolRunStore = await import("ai/tools/toolRunStore");
  const actualReactI18Next = await import("react-i18next");

  mock.module("app/store", () => ({
    ...actualStore,
    useAppDispatch: () => (action: unknown) => {
      dispatchCalls.push(action);
      return action;
    },
    useAppSelector: (selector: (state: any) => unknown) => selector(mockState),
  }));

  mock.module("ai/tools/toolRunStore", () => ({
    ...actualToolRunStore,
    executeToolRun: (payload: unknown) => ({
      type: "toolRuns/executeToolRun",
      payload,
    }),
    useToolRunsByMessageId: (messageId: string) =>
      (mockState as any).toolRunsByMessageId?.[messageId] ?? [],
  }));

  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: translateZh,
    }),
  }));

  const mod = await import(`./MessageToolConfirmBar.tsx?test=${Date.now()}`);
  MessageToolConfirmBar = mod.MessageToolConfirmBar;
};

describe("MessageToolConfirmBar", () => {
  beforeEach(async () => {
    dispatchCalls = [];
    mockState = { toolRunsByMessageId: {} };
    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>");
    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousElement = globalThis.Element;
    previousHTMLElement = globalThis.HTMLElement;
    previousActEnvironment = (globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }).IS_REACT_ACT_ENVIRONMENT;
    (globalThis as any).window = dom.window as any;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).Element = dom.window.Element;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
    await loadMessageToolConfirmBar();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await flush();
    });
    mock.restore();
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      Element: previousElement,
      HTMLElement: previousHTMLElement,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    dom.window.close();
  });

  it("does not render the old message-card confirm button for composer-managed delete tools", async () => {
    for (const toolName of ["deleteDialogs", "deleteSpaces"]) {
      mockState.toolRunsByMessageId = {
        "assistant-1": [
          {
            id: `run-${toolName}`,
            toolName,
            interaction: "confirm",
            status: "pending",
          },
        ],
      };

      await act(async () => {
        root.render(
          <MessageToolConfirmBar messageId="assistant-1" isRobot={true} />
        );
        await flush();
      });

      expect(container.querySelector(".tool-confirm-row")).toBeNull();
      expect(container.textContent).not.toContain("确认删除这些 Space");
      expect(container.textContent).not.toContain("确认删除");
    }
  });

  it("does not render the old confirm button for non-confirm interaction tools", async () => {
    mockState.toolRunsByMessageId = {
      "assistant-1": [
        {
          id: "run-read-file",
          toolName: "readFile",
          interaction: "data",
          status: "pending",
        },
      ],
    };

    await act(async () => {
      root.render(<MessageToolConfirmBar messageId="assistant-1" isRobot={true} />);
      await flush();
    });

    expect(container.querySelector(".tool-confirm-row")).toBeNull();
    expect(container.textContent).not.toContain("确认执行");
    expect(dispatchCalls).toEqual([]);
  });

  it("renders i18n confirm labels for pending applyDiff runs", async () => {
    mockState.toolRunsByMessageId = {
      "assistant-1": [
        {
          id: "run-apply-diff",
          toolName: "applyDiff",
          interaction: "confirm",
          status: "pending",
          input: { filePath: "a.ts" },
        },
      ],
    };

    await act(async () => {
      root.render(<MessageToolConfirmBar messageId="assistant-1" isRobot={true} />);
      await flush();
    });

    expect(container.querySelector(".tool-confirm-row")).not.toBeNull();
    expect(container.textContent).toContain("应用这个补丁（危险操作）");
  });

  it("renders i18n running and failed labels", async () => {
    mockState.toolRunsByMessageId = {
      "assistant-1": [
        {
          id: "run-apply-diff",
          toolName: "applyDiff",
          interaction: "confirm",
          status: "running",
          input: { filePath: "a.ts" },
        },
      ],
    };

    await act(async () => {
      root.render(<MessageToolConfirmBar messageId="assistant-1" isRobot={true} />);
      await flush();
    });
    expect(container.textContent).toContain("正在执行…");

    mockState.toolRunsByMessageId = {
      "assistant-1": [
        {
          id: "run-apply-diff",
          toolName: "applyDiff",
          interaction: "confirm",
          status: "failed",
          input: { filePath: "a.ts" },
          error: "boom",
        },
      ],
    };

    await act(async () => {
      root.render(<MessageToolConfirmBar messageId="assistant-1" isRobot={true} />);
      await flush();
    });
    expect(container.textContent).toContain("重试应用补丁");
    expect(container.textContent).toContain("❌ 执行失败：boom");
  });
});
