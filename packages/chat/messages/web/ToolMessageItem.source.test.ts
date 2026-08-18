import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const toolMessageItemSource = readFileSync(
  new URL("./ToolMessageItem.tsx", import.meta.url),
  "utf8",
);
const toolMessageSharedSource = readFileSync(
  new URL("./toolMessageShared.tsx", import.meta.url),
  "utf8",
);
const askChoicePanelWebSource = readFileSync(
  new URL("./AskChoicePanelWeb.tsx", import.meta.url),
  "utf8",
);

describe("ToolMessageItem source contract", () => {
  test("ask_user delegates to AskChoicePanelWeb which falls back to toolPayload input when rawData is incomplete", () => {
    // ToolMessageItem 把 ask_user 渲染委托给 AskChoicePanelWeb
    expect(toolMessageItemSource).toContain("AskChoicePanelWeb");
    expect(toolMessageItemSource).toContain("ask_user");
    // AskChoicePanelWeb 合并 rawData + toolPayload.input.questions 作为 fallback
    expect(askChoicePanelWebSource).toContain("toolPayload?.input?.questions");
  });

  test("PREFLIGHT_FAILED with repairPlan renders as repairing instead of failed", () => {
    expect(toolMessageItemSource).toContain("PREFLIGHT_FAILED");
    expect(toolMessageItemSource).toContain("isRepairableFailure");
    expect(toolMessageItemSource).toContain('"repairing"');
    expect(toolMessageItemSource).toContain("tool.preflightRepairing");
    expect(toolMessageItemSource).toContain("rawData?.issues");
  });

  test("StatusIcon supports repairing state with static warning icon (no spinner animation)", () => {
    expect(toolMessageSharedSource).toContain('status === "repairing"');
    expect(toolMessageSharedSource).toContain("icon-warning");
    // User preference: tool rows must not show spinning loaders.
    expect(toolMessageSharedSource).not.toContain("u-spin");
  });

  test("tool row header has no running pulse-dot animation", () => {
    const css = readFileSync(
      new URL("./messages.css", import.meta.url),
      "utf8",
    );
    expect(css).not.toContain("tool-running-pulse");
    expect(css).not.toContain(".tr-icon::after");
  });

  test("completed tool rows auto-collapse so only the active row stays open", () => {
    expect(toolMessageItemSource).toContain('statusStr === "success"');
    expect(toolMessageItemSource).toContain("userCollapsedOverrideRef");
    // the old wasStreaming guard left refreshed / history rows expanded
    expect(toolMessageItemSource).not.toContain("wasStreamingRef");
  });
});
