import { afterEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import ActivityProgressPanel from "./ActivityProgressPanel";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("ActivityProgressPanel", () => {
  let root: Root | null = null;
  let dom: JSDOM | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    root = null;
    dom?.window.close();
    dom = null;
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).SVGElement;
  });

  it("includes assistant phase completion signals in current task progress", () => {
    dom = new JSDOM("<!doctype html><div id='root'></div>");
    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).Element = dom.window.Element;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;
    (globalThis as any).SVGElement = dom.window.SVGElement;

    const container = dom.window.document.getElementById("root");
    if (!container) throw new Error("missing root");
    root = createRoot(container);

    const plan = {
      phases: [
        { id: "inspect", title: "查找 API 文档" },
        { id: "fetch", title: "获取数据" },
        { id: "report", title: "汇报结果" },
      ],
    };

    act(() => {
      root?.render(
        <ActivityProgressPanel
          isActive={true}
          messages={[
            { id: "user-1", role: "user", content: "请分析数据" },
            {
              id: "tool-1",
              role: "tool",
              toolName: "fetchWebpage",
              metadata: {
                activity: {
                  plan,
                  phase: { id: "inspect", title: "查找 API 文档" },
                  action: { title: "查找入口" },
                },
              },
            },
            {
              id: "tool-2",
              role: "tool",
              toolName: "execShell",
              metadata: {
                activity: {
                  phase: { id: "fetch", title: "获取数据" },
                  action: { title: "运行脚本" },
                },
              },
            },
            {
              id: "assistant-final",
              role: "assistant",
              content: "已经汇报最终结果。",
              metadata: {
                activity: {
                  phase: { id: "report", title: "汇报结果", status: "success" },
                },
              },
            },
          ]}
        />
      );
    });

    expect(container.textContent).toContain("已完成 3 / 3");

    const header = container.querySelector(".activity-progress-panel__head") as HTMLButtonElement | null;
    expect(header).toBeTruthy();
    act(() => {
      header?.click();
    });

    expect(container.textContent).toContain("汇报结果");
  });

  it("can minimize the progress panel and expand phases independently", () => {
    dom = new JSDOM("<!doctype html><div id='root'></div>");
    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).Element = dom.window.Element;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;
    (globalThis as any).SVGElement = dom.window.SVGElement;

    const container = dom.window.document.getElementById("root");
    if (!container) throw new Error("missing root");
    root = createRoot(container);

    const plan = {
      phases: [
        { id: "read", title: "读取材料" },
        { id: "organize", title: "整理结构" },
        { id: "check", title: "检查交付" },
      ],
    };

    act(() => {
      root?.render(
        <ActivityProgressPanel
          isActive={true}
          messages={[
            { id: "user-1", role: "user", content: "整理文档" },
            {
              id: "tool-1",
              role: "tool",
              toolName: "execShell",
              metadata: {
                activity: {
                  plan,
                  phase: { id: "read", title: "读取材料" },
                  action: { title: "读取原始页面内容", detail: "source.html" },
                },
              },
            },
            {
              id: "tool-2",
              role: "tool",
              toolName: "execShell",
              metadata: {
                activity: {
                  phase: { id: "organize", title: "整理结构" },
                  action: { title: "清理导航和重复内容" },
                },
              },
            },
          ]}
        />
      );
    });

    expect(container.textContent).not.toContain("读取材料");
    expect(container.textContent).not.toContain("读取原始页面内容");

    const header = container.querySelector(".activity-progress-panel__head") as HTMLButtonElement | null;
    expect(header).toBeTruthy();
    act(() => {
      header?.click();
    });
    expect(container.textContent).toContain("任务进度");
    expect(container.textContent).toContain("已完成 2 / 3");
    expect(container.textContent).toContain("读取材料");

    const phaseButtons = Array.from(
      container.querySelectorAll(".activity-progress-panel__phase-row")
    ) as HTMLButtonElement[];
    expect(phaseButtons).toHaveLength(3);

    act(() => {
      phaseButtons[0]?.click();
    });
    expect(container.textContent).toContain("读取原始页面内容");
    expect(container.textContent).not.toContain("清理导航和重复内容");

    act(() => {
      phaseButtons[1]?.click();
    });
    expect(container.textContent).toContain("读取原始页面内容");
    expect(container.textContent).toContain("清理导航和重复内容");

    act(() => {
      phaseButtons[0]?.click();
    });
    expect(container.textContent).not.toContain("读取原始页面内容");
    expect(container.textContent).toContain("清理导航和重复内容");
  });

  it("shows running phase details after expanding and hides after completion", () => {
    dom = new JSDOM("<!doctype html><div id='root'></div>");
    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).Element = dom.window.Element;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;
    (globalThis as any).SVGElement = dom.window.SVGElement;

    const container = dom.window.document.getElementById("root");
    if (!container) throw new Error("missing root");
    root = createRoot(container);

    const plan = {
      phases: [
        { id: "collect", title: "收集上下文" },
        { id: "verify", title: "验证结果" },
      ],
    };
    const runningMessage = {
      id: "tool-running",
      role: "tool",
      toolName: "execShell",
      isStreaming: true,
      metadata: {
        activity: {
          plan,
          phase: { id: "collect", title: "收集上下文" },
          action: { title: "读取项目状态" },
        },
      },
    };

    act(() => {
      root?.render(<ActivityProgressPanel isActive={true} messages={[{ id: "user-1", role: "user" }, runningMessage]} />);
    });

    const header = container.querySelector(".activity-progress-panel__head") as HTMLButtonElement | null;
    expect(header).toBeTruthy();
    act(() => {
      header?.click();
    });

    expect(container.textContent).toContain("读取项目状态");

    act(() => {
      root?.render(
        <ActivityProgressPanel
          messages={[
            { id: "user-1", role: "user" },
            { ...runningMessage, isStreaming: false },
          ]}
        />
      );
    });
    expect(container.textContent).not.toContain("读取项目状态");
  });
});
