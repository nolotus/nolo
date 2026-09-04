import { describe, expect, it } from "bun:test";
import React from "react";
import { renderInDom } from "../../../testing/domRender";
import ContextualStatusRow from "./ContextualStatusRow";

// 新格式（buildWakeMessage 产出）。
const NEW_FORMAT = [
  '<background_run_completion count="1">',
  '<run runId="run-abc1234567890" agent="Worker" status="done" childDialogId="child-1" duration="2m" />',
  '需要完整输出时: controlAgentRun(action: "status", runId, tailLines: 30)',
  "</background_run_completion>",
].join("\n");

const NEW_FORMAT_FAILED = [
  '<background_run_completion count="1">',
  '<run runId="run-xyz" agent="Worker" status="failed" exitCode="1" duration="5m" childDialogId="child-2">',
  "error: boom",
  "</run>",
  "</background_run_completion>",
].join("\n");

const TUI_LEGACY = [
  "【后台 run 终态通知】你派出的 1 条后台 run 已到达终态：",
  "",
  "runId: run-legacy",
  "agent: Worker",
  "status: done",
].join("\n");

describe("ContextualStatusRow", () => {
  it("fragment 消息渲染为紧凑状态行，全文默认不上屏", async () => {
    const view = await renderInDom(
      <ContextualStatusRow text={NEW_FORMAT} kind="background_run_completion" />
    );
    try {
      const html = view.container.innerHTML;
      expect(html).toContain('data-testid="contextual-fragment-row"');
      expect(html).toContain('data-fragment-kind="background_run_completion"');
      // 状态行含 ✓ 与 runId 前 12 位
      expect(html).toContain("✓");
      expect(html).toContain("run-abc12345…");
      // 全文默认折叠，不出现 tag 与控制台提示行
      expect(html).not.toContain("controlAgentRun");
      expect(html).not.toContain('data-testid="contextual-fragment-full"');
    } finally {
      await view.cleanup();
    }
  });

  it("点击展开后可看全文", async () => {
    const view = await renderInDom(
      <ContextualStatusRow text={NEW_FORMAT} kind="background_run_completion" />
    );
    try {
      const row = view.container.querySelector(
        '[data-testid="contextual-fragment-row"]'
      );
      expect(row).not.toBeNull();
      await view.click(row!);
      expect(
        view.container.querySelector('[data-testid="contextual-fragment-full"]')
      ).not.toBeNull();
      // 展开后全文可见（含原本折叠的提示行）
      expect(view.container.innerHTML).toContain("controlAgentRun");
    } finally {
      await view.cleanup();
    }
  });

  it("失败态渲染 ✗ 与警示语义", async () => {
    const view = await renderInDom(
      <ContextualStatusRow text={NEW_FORMAT_FAILED} kind="background_run_completion" />
    );
    try {
      const html = view.container.innerHTML;
      expect(html).toContain('data-fragment-failed="true"');
      expect(html).toContain("✗");
      expect(html).toContain("failed");
    } finally {
      await view.cleanup();
    }
  });

  it("TUI legacy 格式同样折叠为状态行（存量数据兜底）", async () => {
    const view = await renderInDom(
      <ContextualStatusRow text={TUI_LEGACY} kind="tui_legacy_wake" />
    );
    try {
      const html = view.container.innerHTML;
      expect(html).toContain('data-fragment-kind="tui_legacy_wake"');
      expect(html).toContain("run-legacy");
      expect(html).toContain("done");
      // legacy 全文不上屏
      expect(html).not.toContain("你派出的");
    } finally {
      await view.cleanup();
    }
  });
});
