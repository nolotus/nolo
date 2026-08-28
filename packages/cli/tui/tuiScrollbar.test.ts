import { describe, expect, test } from "bun:test";

import {
  autoScrollStepForTicks,
  consumeSgrMouseSequence,
  isSgrWheelEvent,
  parseScrollAction,
  renderScrollbarRow,
  WHEEL_SCROLL_LINES,
} from "./tuiScrollbar";

describe("autoScrollStepForTicks (边缘拖拽动态加速)", () => {
  test("初始 1 行，按住约 8 tick 后 3 行，16 tick 后 6 行封顶", () => {
    expect(autoScrollStepForTicks(1)).toBe(1);
    expect(autoScrollStepForTicks(7)).toBe(1);
    expect(autoScrollStepForTicks(8)).toBe(3);
    expect(autoScrollStepForTicks(9)).toBe(3);
    expect(autoScrollStepForTicks(15)).toBe(3);
    expect(autoScrollStepForTicks(16)).toBe(6);
    expect(autoScrollStepForTicks(100)).toBe(6);
  });

  test("连续自增 tick 的步长阶梯为 1→3→6 单调递增", () => {
    const steps: number[] = [];
    let ticks = 0;
    for (let i = 0; i < 20; i++) {
      steps.push(autoScrollStepForTicks(++ticks));
    }
    // steps[i] 对应 ticks = i+1。
    expect(steps[0]).toBe(1); // ticks=1
    expect(steps[6]).toBe(1); // ticks=7
    expect(steps[7]).toBe(3); // ticks=8
    expect(steps[15]).toBe(6); // ticks=16
    // 全程不递减。
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!).toBeGreaterThanOrEqual(steps[i - 1]!);
    }
  });
});

describe("WHEEL_SCROLL_LINES (滚轮基础步长)", () => {
  test("滚轮步长从 3 提升到 4~5 行区间", () => {
    expect(WHEEL_SCROLL_LINES).toBeGreaterThanOrEqual(4);
    expect(WHEEL_SCROLL_LINES).toBeLessThanOrEqual(5);
  });
});

describe("renderScrollbarRow", () => {
  test("renders a visible track and thumb when content overflows", () => {
    const rows = Array.from({ length: 5 }, (_, row) =>
      renderScrollbarRow(row, 5, 20, 0),
    );
    expect(rows.some((row) => row === "│")).toBe(true);
    expect(rows.some((row) => row === "█")).toBe(true);
  });

  test("renders a blank column when content fits", () => {
    expect(renderScrollbarRow(0, 5, 5, 0)).toBe(" ");
  });
});

describe("consumeSgrMouseSequence", () => {
  test("returns a complete wheel-up report", () => {
    // SGR wheel-up: button 64, col 10, row 5, M (press)
    const seq = "\x1b[<64;10;5M";
    expect(consumeSgrMouseSequence(seq)).toBe(seq);
  });

  test("returns a complete plain-click report (button 0)", () => {
    const seq = "\x1b[<0;1;1M";
    expect(consumeSgrMouseSequence(seq)).toBe(seq);
  });

  test("returns undefined for an incomplete report (waiting for terminator)", () => {
    // Missing the trailing M/m — the reader should keep buffering.
    expect(consumeSgrMouseSequence("\x1b[<0;1;1")).toBe(undefined);
  });

  test("returns null for a non-mouse CSI sequence", () => {
    // Arrow key CSI — not a mouse report; caller's own CSI logic handles it.
    expect(consumeSgrMouseSequence("\x1b[A")).toBe(null);
  });

  test("returns null for a non-CSI buffer", () => {
    expect(consumeSgrMouseSequence("abc")).toBe(null);
  });
});

describe("isSgrWheelEvent", () => {
  test("true for wheel-up (64) and wheel-down (65)", () => {
    expect(isSgrWheelEvent("\x1b[<64;1;1M")).toBe(true);
    expect(isSgrWheelEvent("\x1b[<65;1;1M")).toBe(true);
  });

  test("false for a plain click (button 0)", () => {
    expect(isSgrWheelEvent("\x1b[<0;1;1M")).toBe(false);
  });

  test("false for horizontal wheel (66)", () => {
    expect(isSgrWheelEvent("\x1b[<66;1;1M")).toBe(false);
  });

  test("false for non-mouse input", () => {
    expect(isSgrWheelEvent("\x1b[A")).toBe(false);
  });
});

describe("parseScrollAction + mouse round-trip", () => {
  test("wheel-up report parses as wheel-up", () => {
    expect(parseScrollAction("\x1b[<64;1;1M")).toBe("wheel-up");
  });

  test("plain click report is NOT a scroll action", () => {
    // A click must not be misread as a scroll/cancel — it should be swallowed
    // by the dialog loop so re-entering the terminal window doesn't reject
    // the prompt.
    expect(parseScrollAction("\x1b[<0;1;1M")).toBe(null);
  });
});