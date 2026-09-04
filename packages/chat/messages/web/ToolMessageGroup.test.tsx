import { afterEach, beforeAll, describe, expect, it, mock } from "bun:test";
import React, { act } from "react";
import { renderInDom } from "../../../testing/domRender";

// bun 的 mock.module 不会自动提升：必须先注册 mock、再动态 import 被测组件，
// 否则静态 import 先解析，ToolMessageContent 里的 ExecShellViewer 会在
// 无 redux Provider 的 jsdom 中炸掉（这正是本文件此前 13 个用例全挂的根因，
// 表层症状是 act 聚合的 "Cannot call a class constructor without |new|"）。
mock.module("./ToolMessageContent", () => ({
  default: () => null,
}));

let ToolMessageGroup: any;
beforeAll(async () => {
  ({ default: ToolMessageGroup } = await import("./ToolMessageGroup"));
});

describe("ToolMessageGroup", () => {
  // 统一走 packages/testing/domRender：自造 JSDOM mount 会触发
  // "Cannot call a class constructor without |new|"（bun + react act 聚合），
  // renderInDom 保存/恢复全局对象且所有现存 DOM 测试都验证过。
  let view: Awaited<ReturnType<typeof renderInDom>> | null = null;

  afterEach(async () => {
    if (view) {
      await view.cleanup();
    }
    view = null;
  });

  async function mount(node: React.ReactElement) {
    view = await renderInDom(node);
    return view.container;
  }

  async function rerender(node: React.ReactElement) {
    await view?.rerender(node);
  }

  it("never shows 已完成 count or generic 执行工具步骤 phase chrome", async () => {
    const toolMessage = {
      id: "tool-1",
      role: "tool",
      toolName: "execShell",
      isStreaming: true,
      toolPayload: { input: { cmd: "git status -sb" } },
      content: JSON.stringify({ command: "git status -sb", stdout: "ok", exitCode: 0 }),
    };

    const container = await mount(
      <ToolMessageGroup messages={[toolMessage, { ...toolMessage, id: "tool-2" }]} />
    );

    expect(container.textContent).not.toContain("已完成");
    expect(container.textContent).not.toContain("执行工具步骤");
  });

  it("hides activity details after auto-collapse (summary only)", async () => {
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
    const container = await mount(
      <ToolMessageGroup messages={messages} canCollapse={false} />
    );
    expect(container.querySelector(".tool-msg-row")?.className).not.toContain(
      "is-collapsed"
    );

    await rerender(<ToolMessageGroup messages={messages} canCollapse />);

    // Turn finished → auto-collapse; only the header summary stays visible.
    const card = container.querySelector(".tool-msg-row");
    expect(card?.className).toContain("is-collapsed");
    expect(card?.className).toContain("success");
    expect(container.querySelector(".tr-body")).toBeNull();
    expect(container.textContent).not.toContain("globFiles");
    expect(container.textContent).not.toContain("命令行");
    expect(container.textContent).not.toContain("codeSearch");
    // Compact header: total-calls summary (real duration keeps its own badge).
    expect(container.textContent).toContain("3 个调用");
    // Toggle affordance and aria semantics remain on the header button.
    const header = container.querySelector(".tr-header") as HTMLButtonElement | null;
    expect(header).toBeTruthy();
    expect(header?.getAttribute("aria-expanded")).toBe("false");
    expect(header?.getAttribute("type")).toBe("button");
  });

  it("stays expanded while canCollapse is false", async () => {
    const messages = [
      {
        id: "tool-1",
        role: "tool",
        toolName: "codeSearch",
        toolPayload: { input: { query: "ToolMessageGroup" } },
        content: "{\"ok\":true}",
      },
    ];

    const container = await mount(
      <ToolMessageGroup messages={messages} canCollapse={false} />
    );
    const card = container.querySelector(".tool-msg-row");
    expect(card?.className).not.toContain("is-collapsed");
    // Row renders the zh action verb (搜索) with its query target.
    expect(container.textContent).toMatch(/搜索|在代码里找线索/);
    expect(container.textContent).not.toContain("codeSearch");
    // Running/open card is expanded by default.
    const header = container.querySelector(".tr-header") as HTMLButtonElement | null;
    expect(header?.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps the body scroller pinned to the newest step while tools stream", async () => {
    const makeTool = (id: string, cmd: string) => ({
      id,
      role: "tool",
      toolName: "execShell",
      isStreaming: true,
      toolPayload: { input: { cmd } },
      content: JSON.stringify({ command: cmd, stdout: "ok", exitCode: 0 }),
    });

    const first = [makeTool("t1", "git status -sb")];
    const container = await mount(
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
    await rerender(
      <ToolMessageGroup messages={more} canCollapse={false} />
    );

    const bodyAfter = container.querySelector(".tool-group__body") as HTMLElement | null;
    expect(bodyAfter).toBeTruthy();
    if (!bodyAfter) return;
    // Follow-latest: pin reached the bottom (jsdom does not clamp scrollTop
    // the way a real layout engine does, so assert "at or past maxTop").
    expect(bodyAfter.scrollTop).toBeGreaterThanOrEqual(
      bodyAfter.scrollHeight - bodyAfter.clientHeight
    );
  });

  it("does not detach stick-to-bottom when programmatic pin fires scroll", async () => {
    const makeTool = (id: string, cmd: string, streaming = true) => ({
      id,
      role: "tool",
      toolName: "execShell",
      isStreaming: streaming,
      toolPayload: { input: { cmd } },
      content: JSON.stringify({ command: cmd, stdout: "ok", exitCode: 0 }),
    });

    const first = [makeTool("t1", "git status -sb")];
    const container = await mount(
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
    await rerender(
      <ToolMessageGroup
        messages={[
          makeTool("t1", "git status -sb", false),
          makeTool("t2", "git diff --stat"),
          makeTool("t3", "git log -5"),
        ]}
        canCollapse={false}
      />
    );

    // Synthetic scroll from pin must not permanently detach follow.
    await act(async () => {
      body.dispatchEvent(new (globalThis.window as any).Event("scroll"));
    });

    scrollHeight = 700;
    await rerender(
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

    // Still pinned after growth (jsdom stores raw scrollTop; "at bottom" means >= maxTop).
    expect(body.scrollTop).toBeGreaterThanOrEqual(scrollHeight - body.clientHeight);
  });

  it("wraps trajectory content so ResizeObserver can track height growth", async () => {
    const container = await mount(
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

  it("shows a readable activity trajectory with named phases only (no 已完成 header)", async () => {
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

    const container = await mount(
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

  it("supports Nolo user-story trajectories with business-language phases", async () => {
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

      const container = await mount(
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

  it("shows action count only when a named phase has multiple actions", async () => {
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

    const container = await mount(<ToolMessageGroup messages={messages} />);

    expect(container.textContent).toContain("2 个动作");
    expect(container.textContent).not.toContain("1 个动作");
    expect(container.textContent).not.toMatch(/已完成\s*\d+\s*\/\s*\d+/);
  });

  it("expands activity phases independently instead of opening every phase", async () => {
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
    const container = await mount(<ToolMessageGroup messages={messages} />);

    expect(container.textContent).toContain("确认版本");
    // Compact header no longer lists action titles; they live in phase bodies.

    const phaseButtons = Array.from(
      container.querySelectorAll(".tr-phase-row")
    ) as HTMLButtonElement[];
    expect(phaseButtons).toHaveLength(4);

    await act(async () => {
      phaseButtons[0]?.click();
    });
    // Action titles surface inside the expanded phase body, not the header.
    expect(container.textContent).toContain("确认当前发布版本");
    // Only first phase body expands; others stay collapsed.
    const phases = Array.from(container.querySelectorAll(".tr-phase"));
    expect(phases[0]?.className).toContain("tr-phase--expanded");
    expect(phases[1]?.className).not.toContain("tr-phase--expanded");
  });

  it("stays expanded while canCollapse is false even after tools settle, then collapses at turn end", async () => {
    const settledMessage = {
      id: "tool-settled",
      role: "tool",
      toolName: "execShell",
      isStreaming: false,
      toolPayload: { input: { cmd: "git status -sb" } },
      content: JSON.stringify({ command: "git status -sb", stdout: "ok", exitCode: 0 }),
    };

    const container = await mount(
      <ToolMessageGroup messages={[settledMessage]} canCollapse={false} />
    );
    // Tools done but turn still active → stay open.
    const card = container.querySelector(".tool-msg-row");
    expect(card?.className).not.toContain("is-collapsed");
    // Header status follows tools, not "awaiting final reply" — no fake spin.
    expect(card?.className).toContain("success");
    expect(card?.className).not.toContain("running");

    await rerender(<ToolMessageGroup messages={[settledMessage]} canCollapse />);
    // Final reply ready (canCollapse) → auto-collapse.
    expect(container.querySelector(".tool-msg-row")?.className).toContain(
      "is-collapsed"
    );
  });

  it("auto-opens a running named phase action and hides details after turn ends", async () => {
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

    const container = await mount(
      <ToolMessageGroup messages={[runningMessage]} canCollapse={false} />
    );
    expect(container.textContent).toContain("通知执行代理");

    await rerender(
      <ToolMessageGroup
        messages={[{ ...runningMessage, isStreaming: false }]}
        canCollapse
      />
    );
    // canCollapse true → collapse; details (action trail / body) stay hidden.
    expect(container.querySelector(".tool-msg-row")?.className).toContain(
      "is-collapsed"
    );
    expect(container.querySelector(".tr-collapsed-preview")).toBeNull();
    expect(container.querySelector(".tr-body")).toBeNull();
    expect(container.textContent).not.toMatch(/已完成\s*\d+\s*\/\s*\d+/);
  });

  it("keeps a mixed-failure settled card neutral while preserving failed action status", async () => {
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

    const container = await mount(
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
    await act(async () => {
      header?.click();
    });
    const failedAction = container.querySelector(".tool-call-row--failed");
    expect(failedAction).toBeTruthy();
    const successAction = container.querySelector(".tool-call-row--success");
    expect(successAction).toBeTruthy();
  });

  it("renders ordinary groups as flat expandable rows with a compact header", async () => {
    const messages = [
      {
        id: "call-1",
        role: "tool",
        toolName: "readFile",
        toolPayload: { input: { path: "README.md" }, startedAt: 1000, finishedAt: 1450 },
        content: "{\"ok\":true}",
      },
      {
        id: "call-2",
        role: "tool",
        toolName: "execShell",
        isStreaming: true,
        toolPayload: { input: { cmd: "bun test" } },
        content: "{\"ok\":true}",
      },
    ];

    const container = await mount(
      <ToolMessageGroup messages={messages} canCollapse={false} />
    );

    // Compact header: total + running counts (duration badge stays real-only).
    expect(container.textContent).toContain("2 个调用");
    expect(container.textContent).toContain("1 个运行中");
    // Ordinary calls render as flat rows, one per call.
    const rows = container.querySelectorAll('[data-hook="messages-esc-tool-call-row"]');
    expect(rows.length).toBe(2);
    const headers = Array.from(
      container.querySelectorAll(".tool-call-row__header")
    ) as HTMLButtonElement[];
    // Native buttons keep keyboard/ARIA semantics; settled row folded, running row open.
    expect(
      headers.every(
        (button) =>
          button.tagName === "BUTTON" && button.getAttribute("type") === "button"
      )
    ).toBe(true);
    expect(headers[0]?.getAttribute("aria-expanded")).toBe("false");
    expect(headers[1]?.getAttribute("aria-expanded")).toBe("true");
    // Per-row real duration from payload timestamps; args detail, no raw API names.
    expect(container.textContent).toContain("450ms");
    expect(container.textContent).toContain("README.md");
    expect(container.textContent).not.toContain("readFile");
  });

  it("keeps artifact tool cards reachable instead of disabled flat rows", async () => {
    // Neither message carries an activity signal → plain fallback body.
    const messages = [
      {
        id: "todo-1",
        role: "tool",
        toolName: "setTodoList",
        toolPayload: { input: { todos: [{ id: "t1", content: "调研", status: "in_progress" }] } },
        content: JSON.stringify({ todos: [{ id: "t1", content: "调研", status: "in_progress" }] }),
      },
      {
        id: "agents-1",
        role: "tool",
        toolName: "listAgents",
        content: "[]",
      },
    ];

    const container = await mount(
      <ToolMessageGroup messages={messages} canCollapse={false} />
    );

    // Ordinary tool renders as an expandable row…
    const row = container.querySelector('[data-hook="messages-esc-tool-call-row"]');
    expect(row).toBeTruthy();
    expect(row?.className).toContain("tool-call-row--success");
    // …while the artifact tool keeps its dedicated card slot, always mounted
    // (never behind a disabled toggle that would hide TodoCard after settle).
    expect(container.querySelector(".tool-group__item")).toBeTruthy();
    expect(container.querySelector(".tool-call-row__header[disabled]")).toBeNull();
    expect(container.textContent).not.toContain("setTodoList");
  });

  it("keeps artifact signals on dedicated cards inside the flat trajectory", async () => {
    const messages = [
      {
        id: "diff-1",
        role: "tool",
        toolName: "applyDiff",
        metadata: { activity: { action: { title: "应用补丁" } } },
        toolPayload: { input: { path: "a.ts" } },
        content: JSON.stringify({ diff: "--- a.ts\n+++ b.ts" }),
      },
      {
        id: "read-1",
        role: "tool",
        toolName: "readFile",
        isStreaming: true,
        toolPayload: { input: { path: "README.md" } },
        content: "{\"ok\":true}",
      },
    ];

    const container = await mount(
      <ToolMessageGroup messages={messages} canCollapse={false} />
    );

    // applyDiff (artifact) → dedicated card slot; readFile (row) → flat row.
    expect(container.querySelectorAll(".tool-group__item")).toHaveLength(1);
    expect(container.querySelectorAll('[data-hook="messages-esc-tool-call-row"]')).toHaveLength(1);
    expect(container.querySelector('[data-hook="messages-esc-tool-call-row"]')?.className).toContain(
      "tool-call-row--running"
    );
    // No disabled flat rows anywhere — artifact bodies stay reachable.
    expect(container.querySelector(".tool-call-row__header[disabled]")).toBeNull();
    // Card inner content is ToolMessageContent's job (mocked to null in this
    // file); the always-mounted .tool-group__item slot above is the reachability
    // contract this test pins.
  });

  it("never lets a hidden setTodoList drive the header duration badge", async () => {
    const hiddenTodo = {
      id: "todo-hidden",
      role: "tool",
      toolName: "setTodoList",
      toolPayload: { startedAt: 1000, finishedAt: 9000 },
      content: "{\"todos\":[]}",
    };
    const agents = { id: "agents-h", role: "tool", toolName: "listAgents", content: "[]" };

    // Conversation todo disabled → setTodoList is invisible everywhere,
    // including the trailing duration badge.
    const hidden = await mount(
      <ToolMessageGroup
        messages={[hiddenTodo, agents]}
        canCollapse={false}
        conversationTodoEnabled={false}
      />
    );
    expect(hidden.querySelector(".tool-group__item")).toBeNull();
    expect(hidden.querySelector('[data-hook="messages-esc-tr-duration"]')).toBeNull();

    // Visible again → the real settled span shows up on the badge.
    const visible = await mount(
      <ToolMessageGroup messages={[hiddenTodo, agents]} canCollapse={false} />
    );
    expect(visible.querySelector('[data-hook="messages-esc-tr-duration"]')?.textContent).toBe(
      "8.0s"
    );
  });

  it("keeps the card failed when the last settled action fails", async () => {
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

    const container = await mount(
      <ToolMessageGroup messages={successThenFailed} canCollapse />
    );
    const card = container.querySelector(".tool-msg-row");
    expect(card?.className).toContain("failed");
    expect(card?.className).not.toContain(" success");
  });
});
