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
    const escapeHatchCss = readFileSync(
      new URL("./messagesStylexEscapeHatch.css", import.meta.url),
      "utf8",
    );
    const stylesSource = readFileSync(
      new URL("./messagesStyles.ts", import.meta.url),
      "utf8",
    );
    expect(escapeHatchCss).not.toContain("tool-running-pulse");
    expect(escapeHatchCss).not.toContain(".tr-icon::after");
    expect(stylesSource).not.toContain("tool-running-pulse");
  });

  test("status dots follow the Astryx filled-circle anatomy and completed rows show a duration", () => {
    // Terminal states render as filled colored dots with a white glyph.
    expect(toolMessageSharedSource).toContain("statusDot");
    expect(toolMessageSharedSource).toContain("formatToolDuration");
    expect(toolMessageSharedSource).toContain("finishedAt");
    // Header rows carry a monospace duration badge (web anchor: messages-esc-tr-duration).
    expect(toolMessageItemSource).toContain("messages-esc-tr-duration");
    expect(toolMessageItemSource).toContain("formatToolDuration");
    expect(toolMessageItemSource).toContain('statusStr === "success"');
  });

  test("group headers keep one count semantic and no group duration (P0.5)", () => {
    const groupSource = readFileSync(
      new URL("./ToolMessageGroup.tsx", import.meta.url),
      "utf8",
    );
    // Exactly one count: the i18n summary owns the call count — the wrench
    // count badge was a duplicate and is gone.
    expect(groupSource).toContain("messages-esc-tr-summary");
    expect(groupSource).not.toContain("messages-esc-tr-count-badge");
    expect(groupSource).not.toContain("tool-group__count-badge");
    expect(groupSource).not.toContain("LuWrench");
    // No last-settled group duration badge: rows own their real durations.
    expect(groupSource).not.toContain("messages-esc-tr-duration");
    expect(groupSource).not.toContain("const lastSettled");
    // All displayed group state derives from the single visible list.
    expect(groupSource).toContain("visibleMessages");
    expect(groupSource).toContain("for (const msg of visibleMessages)");
    // Group rows still share the Astryx StatusIcon surface.
    expect(groupSource).toContain("StatusIcon");
  });

  test("completed tool rows auto-collapse so only the active row stays open", () => {
    expect(toolMessageItemSource).toContain('statusStr === "success"');
    expect(toolMessageItemSource).toContain("userCollapsedOverrideRef");
    // the old wasStreaming guard left refreshed / history rows expanded
    expect(toolMessageItemSource).not.toContain("wasStreamingRef");
  });
});
