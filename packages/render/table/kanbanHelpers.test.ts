import { describe, it, expect } from "bun:test";
import {
  getKanbanStatusHeaderInfo,
  getKanbanFieldIcon,
  formatKanbanRelativeAge,
} from "./kanbanHelpers";

describe("kanbanHelpers pure functions", () => {
  it("getKanbanStatusHeaderInfo returns correct icon & theme color mapping", () => {
    expect(getKanbanStatusHeaderInfo("待办").color).toBe("#d97706");
    expect(getKanbanStatusHeaderInfo("In progress").color).toBe("#2563eb");
    expect(getKanbanStatusHeaderInfo("阻塞").color).toBe("#dc2626");
    expect(getKanbanStatusHeaderInfo("等待确认").color).toBe("#7c3aed");
    expect(getKanbanStatusHeaderInfo("已完成").color).toBe("#059669");
    expect(getKanbanStatusHeaderInfo("未知分类").color).toBe("#64748b");
  });

  it("getKanbanFieldIcon returns React element for field names", () => {
    expect(getKanbanFieldIcon("负责人")).toBeTruthy();
    expect(getKanbanFieldIcon("优先级")).toBeTruthy();
    expect(getKanbanFieldIcon("创建时间")).toBeTruthy();
    expect(getKanbanFieldIcon("标签")).toBeTruthy();
  });

  it("formatKanbanRelativeAge formats past timestamps to relative age badges", () => {
    const now = Date.now();
    const tenMinsAgo = new Date(now - 10 * 60 * 1000).toISOString();
    const fiveHoursAgo = new Date(now - 5 * 3600 * 1000).toISOString();
    const twoDaysAgo = new Date(now - 48 * 3600 * 1000).toISOString();

    expect(formatKanbanRelativeAge({ updatedAt: tenMinsAgo })).toBe("10m");
    expect(formatKanbanRelativeAge({ updatedAt: fiveHoursAgo })).toBe("5h");
    expect(formatKanbanRelativeAge({ updatedAt: twoDaysAgo })).toBe("2d");
    expect(formatKanbanRelativeAge({})).toBe("");
  });
});
