import { afterEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

mock.module("./ToolMessageContent", () => ({
  default: () => null,
}));

import ToolMessageGroup from "./ToolMessageGroup";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("ToolMessageGroup", () => {
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

  function mount(node: React.ReactElement) {
    dom = new JSDOM("<!doctype html><div id='root'></div>");
    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).Element = dom.window.Element;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;
    (globalThis as any).SVGElement = dom.window.SVGElement;

    const container = dom.window.document.getElementById("root");
    if (!container) throw new Error("missing root");
    root = createRoot(container);
    act(() => {
      root?.render(node);
    });
    return container;
  }

  it("never shows 已完成 count or generic 执行工具步骤 phase chrome", () => {
    const toolMessage = {
      id: "tool-1",
      role: "tool",
      toolName: "execShell",
      isStreaming: true,
      toolPayload: { input: { cmd: "git status -sb" } },
      content: JSON.stringify({ command: "git status -sb", stdout: "ok", exitCode: 0 }),
    };

    const container = mount(
      <ToolMessageGroup messages={[toolMessage, { ...toolMessage, id: "tool-2" }]} />
    );

    expect(container.textContent).not.toContain("已完成");
    expect(container.textContent).not.toContain("执行工具步骤");
  });

  it("hides activity details after auto-collapse (summary only)", () => {
    const messages = [
      {
        id: "lf-1",
        role: "tool",
        toolName: "globFiles",
        toolPayload: { input: { path: "packages" } },
        content: "{\"ok\":true}",
      },
      {
        id: "rf-1",
        role: "tool",
        toolName: "readFile",
        toolPayload: { input: { path: "README.md" } },
        content: "{\"ok\":true}",
      },
      {
        id: "sh-1",
        role: "tool",
        toolName: "execShell",
        toolPayload: { input: { cmd: "git status -sb" } },
        content: "{\"ok\":true}",
      },
    ];

    // Mount as canCollapse=false so it expands, then set canCollapse true to auto-collapse.
    const container = mount(
      <ToolMessageGroup messages={messages} canCollapse={false} />
    );
    expect(container.querySelector(".tool-msg-row")?.className).not.toContain(
      "is-collapsed"
    );

    act(() => {
      root?.render(
        <ToolMessageGroup
          messages={messages}
          canCollapse
        />
      );
    });

    // Turn finished → auto-collapse; only the header summary stays visible.
    const card = container.querySelector(".tool-msg-row");
    expect(card?.className).toContain("is-collapsed");
    expect(card?.className).toContain("success");
    expect(container.querySelector(".tr-body")).toBeNull();
    expect(container.textContent).not.toContain("globFiles");
    expect(container.textContent).not.toContain("命令行");
    expect(container.textContent).not.toContain("codeSearch");
    // Header summary uses human activity titles (not raw API names).
    expect(container.textContent).toMatch(/浏览目录|查看相关文件|检查改动/);
    // Toggle affordance and aria semantics remain on the header button.
    const header = container.querySelector(".tr-header") as HTMLButtonElement | null;
    expect(header).toBeTruthy();
    expect(header?.getAttribute("aria-expanded")).toBe("false");
    expect(header?.getAttribute("type")).toBe("button");
  });

  it("stays expanded while canCollapse is false", () => {
    const messages = [
      {
        id: "tool-1",
        role: "tool",
        toolName: "codeSearch",
        toolPayload: { input: { query: "ToolMessageGroup" } },
        content: "{\"ok\":true}",
      },
    ];

    const container = mount(
      <ToolMessageGroup messages={messages} canCollapse={false} />
    );
    const card = container.querySelector(".tool-msg-row");
    expect(card?.className).not.toContain("is-collapsed");
    // Human activity title (not raw API name).
    expect(container.textContent).toMatch(/搜索代码|在代码里找线索/);
    expect(container.textContent).not.toContain("codeSearch");
    // Running/open card is expanded by default.
    const header = container.querySelector(".tr-header") as HTMLButtonElement | null;
    expect(header?.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps the body scroller pinned to the newest step while tools stream", () => {
    const makeTool = (id: string, cmd: string) => ({
      id,
      role: "tool",
      toolName: "execShell",
      isStreaming: true,
      toolPayload: { input: { cmd } },
      content: JSON.stringify({ command: cmd, stdout: "ok", exitCode: 0 }),
    });

    const first = [makeTool("t1", "git status -sb")];
    const container = mount(
      <ToolMessageGroup messages={first} canCollapse={false} />
    );
    const body = container.querySelector(".tool-group__body") as HTMLElement | null;
    expect(body).toBeTruthy();
    if (!body) return;

    // Simulate a compact overflow viewport so scrollHeight > clientHeight.
    Object.defineProperty(body, "clientHeight", { configurable: true, value: 80 });
    Object.defineProperty(body, "scrollHeight", { configurable: true, value: 400 });
    body.scrollTop = 0;

    const more = [
      ...first,
      makeTool("t2", "git diff --stat"),
      makeTool("t3", "bun test packages/chat/messages/web/ToolMessageGroup.test.ts"),
    ];
    act(() => {
      root?.render(
        <ToolMessageGroup messages={more} canCollapse={false} />
      );
    });

    const bodyAfter = container.querySelector(".tool-group__body") as HTMLElement | null;
    expect(bodyAfter).toBeTruthy();
    if (!bodyAfter) return;
    // Follow-latest: pin to max scrollTop (scrollHeight - clientHeight), not raw scrollHeight.
    expect(bodyAfter.scrollTop).toBe(
      bodyAfter.scrollHeight - bodyAfter.clientHeight
    );
  });

  it("does not detach stick-to-bottom when programmatic pin fires scroll", () => {
    const makeTool = (id: string, cmd: string, streaming = true) => ({
      id,
      role: "tool",
      toolName: "execShell",
      isStreaming: streaming,
      toolPayload: { input: { cmd } },
      content: JSON.stringify({ command: cmd, stdout: "ok", exitCode: 0 }),
    });

    const first = [makeTool("t1", "git status -sb")];
    const container = mount(
      <ToolMessageGroup messages={first} canCollapse={false} />
    );
    const body = container.querySelector(".tool-group__body") as HTMLElement | null;
    expect(body).toBeTruthy();
    if (!body) return;

    Object.defineProperty(body, "clientHeight", { configurable: true, value: 80 });
    let scrollHeight = 200;
    Object.defineProperty(body, "scrollHeight", {
      configurable: true,
      get: () => scrollHeight,
    });
    body.scrollTop = 0;

    // Grow content + re-render (new tools). Pin should run and not leave stick off.
    scrollHeight = 500;
    act(() => {
      root?.render(
        <ToolMessageGroup
          messages={[
            makeTool("t1", "git status -sb", false),
            makeTool("t2", "git diff --stat"),
            makeTool("t3", "git log -5"),
          ]}
          canCollapse={false}
        />
      );
    });

    // Synthetic scroll from pin must not permanently detach follow.
    act(() => {
      body.dispatchEvent(new (dom!.window as any).Event("scroll"));
    });

    scrollHeight = 700;
    act(() => {
      root?.render(
        <ToolMessageGroup
          messages={[
            makeTool("t1", "git status -sb", false),
            makeTool("t2", "git diff --stat", false),
            makeTool("t3", "git log -5", false),
            makeTool("t4", "git --no-pager diff packages/chat"),
          ]}
          canCollapse={false}
        />
      );
    });

    // Still pinned after growth (maxTop = 700 - 80).
    expect(body.scrollTop).toBe(scrollHeight - body.clientHeight);
  });

  it("wraps trajectory content so ResizeObserver can track height growth", () => {
    const container = mount(
      <ToolMessageGroup
        messages={[
          {
            id: "t1",
            role: "tool",
            toolName: "execShell",
            isStreaming: true,
            toolPayload: { input: { cmd: "git status -sb" } },
            content: JSON.stringify({
              command: "git status -sb",
              stdout: "ok",
              exitCode: 0,
            }),
          },
        ]}
        canCollapse={false}
      />
    );
    expect(container.querySelector(".tr-body-content")).toBeTruthy();
    expect(
      container.querySelector(".tool-group__body > .tr-body-content")
    ).toBeTruthy();
  });

  it("shows a readable activity trajectory with named phases only (no 已完成 header)", () => {
    const toolMessage = {
      id: "tool-analyze",
      role: "tool",
      toolName: "execShell",
      isStreaming: true,
      metadata: {
        activity: {
          plan: {
            phases: [
              { id: "lookup", title: "查找资料" },
              { id: "analyze", title: "分析数据" },
              { id: "report", title: "汇报结果" },
            ],
          },
          phase: { id: "analyze", title: "分析数据" },
          action: { title: "计算增长率", detail: "growth ranking" },
        },
      },
      content: "{\"ok\":true}",
    };
    const finalAssistant = {
      id: "assistant-final",
      role: "assistant",
      content: "已完成分析。",
      metadata: {
        activity: {
          phase: { id: "report", title: "汇报结果", status: "success" },
        },
      },
    };

    const container = mount(
      <ToolMessageGroup
        messages={[toolMessage]}
        activityMessages={[toolMessage, finalAssistant]}
      />
    );

    expect(container.textContent).not.toMatch(/已完成\s*\d+\s*\/\s*\d+/);
    expect(container.textContent).not.toContain("执行工具步骤");
    expect(container.textContent).toContain("查找资料");
    expect(container.textContent).toContain("分析数据");
    expect(container.textContent).toContain("汇报结果");
    expect(container.textContent).not.toContain("执行轨迹");
    expect(container.textContent).not.toContain("execShell");
  });

  it("supports Nolo user-story trajectories with business-language phases", () => {
    const stories = [
      ["代码修复", ["定位问题", "修改实现", "验证结果", "汇报结果"]],
      ["资料研究", ["查找来源", "获取数据", "分析结论", "汇报结果"]],
    ];

    for (const [storyName, phases] of stories) {
      const toolMessage = {
        id: `tool-${storyName}`,
        role: "tool",
        toolName: "execShell",
        isStreaming: true,
        metadata: {
          activity: {
            plan: {
              phases: (phases as string[]).map((title, index) => ({
                id: `phase-${index}`,
                title,
              })),
            },
            phase: { id: "phase-0", title: (phases as string[])[0] },
            action: { title: `${storyName}关键动作` },
          },
        },
        content: "{\"ok\":true}",
      };
      const finalAssistant = {
        id: `assistant-${storyName}`,
        role: "assistant",
        content: `${storyName}完成。`,
        metadata: {
          activity: {
            phase: {
              id: `phase-${(phases as string[]).length - 1}`,
              title: (phases as string[]).at(-1),
              status: "success",
            },
          },
        },
      };

      const container = mount(
        <ToolMessageGroup
          messages={[toolMessage]}
          activityMessages={[toolMessage, finalAssistant]}
        />
      );

      expect(container.textContent).not.toContain("执行轨迹");
      expect(container.textContent).not.toMatch(/已完成\s*\d+\s*\/\s*\d+/);
      for (const phase of phases as string[]) {
        expect(container.textContent).toContain(phase);
      }
      expect(container.textContent).not.toContain("execShell");
    }
  });

  it("shows action count only when a named phase has multiple actions", () => {
    const messages = [
      {
        id: "tool-1",
        role: "tool",
        toolName: "execShell",
        isStreaming: true,
        metadata: {
          activity: {
            plan: { phases: [{ id: "read", title: "读取材料" }] },
            phase: { id: "read", title: "读取材料" },
            action: { title: "读取原始文件" },
          },
        },
        content: "{\"ok\":true}",
      },
      {
        id: "tool-2",
        role: "tool",
        toolName: "execShell",
        isStreaming: true,
        metadata: {
          activity: {
            phase: { id: "read", title: "读取材料" },
            action: { title: "识别正文区域" },
          },
        },
        content: "{\"ok\":true}",
      },
    ];

    const container = mount(<ToolMessageGroup messages={messages} />);

    expect(container.textContent).toContain("2 个动作");
    expect(container.textContent).not.toContain("1 个动作");
    expect(container.textContent).not.toMatch(/已完成\s*\d+\s*\/\s*\d+/);
  });

  it("expands activity phases independently instead of opening every phase", () => {
    const plan = {
      phases: [
        { id: "version", title: "确认版本" },
        { id: "health", title: "检查健康" },
        { id: "api", title: "验证接口" },
        { id: "report", title: "汇总风险" },
      ],
    };
    // Keep tools finished so phases stay collapsed until user opens them;
    // group is force-expanded via a single streaming dummy is unnecessary —
    // click header if collapsed.
    const messages = [
      {
        id: "tool-version",
        role: "tool",
        toolName: "execShell",
        metadata: {
          activity: {
            plan,
            phase: { id: "version", title: "确认版本" },
            action: { title: "确认当前发布版本", detail: "release-2026-06-09" },
          },
        },
        content: "{\"ok\":true}",
      },
      {
        id: "tool-health",
        role: "tool",
        toolName: "execShell",
        metadata: {
          activity: {
            phase: { id: "health", title: "检查健康" },
            action: { title: "检查服务健康", detail: "/health" },
          },
        },
        content: "{\"ok\":true}",
      },
      {
        id: "tool-api",
        role: "tool",
        toolName: "execShell",
        metadata: {
          activity: {
            phase: { id: "api", title: "验证接口" },
            action: { title: "验证 agent 运行 API", detail: "/api/agent/run" },
          },
        },
        content: "{\"ok\":true}",
      },
    ];

    // Finished group without a prior open-turn cycle stays expanded so users
    // can still inspect the trail; do not click header (that would collapse it).
    const container = mount(<ToolMessageGroup messages={messages} />);

    expect(container.textContent).toContain("确认版本");
    // Header summary keeps human action titles for control (not hidden API names).
    expect(container.textContent).toContain("确认当前发布版本");

    const phaseButtons = Array.from(
      container.querySelectorAll(".tr-phase-row")
    ) as HTMLButtonElement[];
    expect(phaseButtons).toHaveLength(4);

    act(() => {
      phaseButtons[0]?.click();
    });
    // Only first phase body expands; others stay collapsed.
    const phases = Array.from(container.querySelectorAll(".tr-phase"));
    expect(phases[0]?.className).toContain("tr-phase--expanded");
    expect(phases[1]?.className).not.toContain("tr-phase--expanded");
  });

  it("stays expanded while canCollapse is false even after tools settle, then collapses at turn end", () => {
    const settledMessage = {
      id: "tool-settled",
      role: "tool",
      toolName: "execShell",
      isStreaming: false,
      toolPayload: { input: { cmd: "git status -sb" } },
      content: JSON.stringify({ command: "git status -sb", stdout: "ok", exitCode: 0 }),
    };

    const container = mount(
      <ToolMessageGroup messages={[settledMessage]} canCollapse={false} />
    );
    // Tools done but turn still active → stay open.
    const card = container.querySelector(".tool-msg-row");
    expect(card?.className).not.toContain("is-collapsed");
    // Header status follows tools, not "awaiting final reply" — no fake spin.
    expect(card?.className).toContain("success");
    expect(card?.className).not.toContain("running");

    act(() => {
      root?.render(
        <ToolMessageGroup messages={[settledMessage]} canCollapse />
      );
    });
    // Final reply ready (canCollapse) → auto-collapse.
    expect(container.querySelector(".tool-msg-row")?.className).toContain(
      "is-collapsed"
    );
  });

  it("auto-opens a running named phase action and hides details after turn ends", () => {
    const plan = {
      phases: [
        { id: "dispatch", title: "分派执行" },
        { id: "review", title: "回收结果" },
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
          phase: { id: "dispatch", title: "分派执行" },
          action: { title: "通知执行代理" },
        },
      },
      content: "{\"ok\":true}",
    };

    const container = mount(
      <ToolMessageGroup messages={[runningMessage]} canCollapse={false} />
    );
    expect(container.textContent).toContain("通知执行代理");

    act(() => {
      root?.render(
        <ToolMessageGroup
          messages={[{ ...runningMessage, isStreaming: false }]}
          canCollapse
        />
      );
    });
    // canCollapse true → collapse; details (action trail / body) stay hidden.
    expect(container.querySelector(".tool-msg-row")?.className).toContain(
      "is-collapsed"
    );
    expect(container.querySelector(".tr-collapsed-preview")).toBeNull();
    expect(container.querySelector(".tr-body")).toBeNull();
    expect(container.textContent).not.toMatch(/已完成\s*\d+\s*\/\s*\d+/);
  });

  it("keeps a mixed-failure settled card neutral while preserving failed action status", () => {
    const failedThenRecovered = [
      {
        id: "tool-fail",
        role: "tool",
        toolName: "execShell",
        isStreaming: false,
        toolPayload: { input: { cmd: "git bad-cmd" }, status: "failed" },
        content: JSON.stringify({ error: "command not found" }),
      },
      {
        id: "tool-ok",
        role: "tool",
        toolName: "execShell",
        isStreaming: false,
        toolPayload: { input: { cmd: "git status -sb" } },
        content: JSON.stringify({ command: "git status -sb", stdout: "ok", exitCode: 0 }),
      },
    ];

    const container = mount(
      <ToolMessageGroup messages={failedThenRecovered} canCollapse />
    );
    const card = container.querySelector(".tool-msg-row");
    // Overall card is neutral because the turn eventually succeeded.
    expect(card?.className).toContain("success");
    expect(card?.className).not.toContain(" failed");
    // Collapsed historical card stays folded.
    expect(card?.className).toContain("is-collapsed");
    // Expand to inspect the mixed trail.
    const header = container.querySelector(".tr-header") as HTMLButtonElement | null;
    act(() => {
      header?.click();
    });
    const failedAction = container.querySelector(".tr-action--failed");
    expect(failedAction).toBeTruthy();
    const successAction = container.querySelector(".tr-action--success");
    expect(successAction).toBeTruthy();
  });

  it("keeps the card failed when the last settled action fails", () => {
    const successThenFailed = [
      {
        id: "tool-ok-first",
        role: "tool",
        toolName: "execShell",
        isStreaming: false,
        content: JSON.stringify({ stdout: "ok", exitCode: 0 }),
      },
      {
        id: "tool-fail-last",
        role: "tool",
        toolName: "execShell",
        isStreaming: false,
        toolPayload: { status: "failed" },
        content: JSON.stringify({ error: "command failed" }),
      },
    ];

    const container = mount(
      <ToolMessageGroup messages={successThenFailed} canCollapse />
    );
    const card = container.querySelector(".tool-msg-row");
    expect(card?.className).toContain("failed");
    expect(card?.className).not.toContain(" success");
  });
});
