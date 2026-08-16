// 文件: render/table/selectCellUtils.test.ts
import { describe, expect, test } from "bun:test";

import {
  resolveSelectOptions,
  selectBadgeColorIndex,
  SELECT_BADGE_PALETTE_SIZE,
} from "./selectCellUtils";

describe("resolveSelectOptions", () => {
  test("column 为 null 时返回空数组", () => {
    expect(resolveSelectOptions(null, [{ status: "待办" }])).toEqual([]);
  });

  test("options 优先保序，行值去重后追加", () => {
    const column = { name: "status", options: ["待办", "进行中", "已完成"] };
    const rows = [
      { status: "进行中" }, // 与 options 重复，应去重
      { status: "等待确认" }, // 行值兜底，追加到尾部
      { status: "待办" },
    ];
    expect(resolveSelectOptions(column, rows)).toEqual([
      "待办",
      "进行中",
      "已完成",
      "等待确认",
    ]);
  });

  test("行值 trim 后去重，空白值忽略", () => {
    const column = { name: "priority" };
    const rows = [
      { priority: "  高  " },
      { priority: "高" },
      { priority: "   " },
      { priority: "" },
      { priority: null },
      {},
    ];
    expect(resolveSelectOptions(column, rows)).toEqual(["高"]);
  });

  test("options 内部去重并 trim", () => {
    const column = { name: "status", options: [" 待办 ", "待办", "", "已完成"] };
    expect(resolveSelectOptions(column, [])).toEqual(["待办", "已完成"]);
  });

  test("无 options 且无行值时返回空数组", () => {
    expect(resolveSelectOptions({ name: "status" }, [{}, {}])).toEqual([]);
  });
});

describe("selectBadgeColorIndex", () => {
  test("同一值恒同色（确定性）", () => {
    expect(selectBadgeColorIndex("待办")).toBe(selectBadgeColorIndex("待办"));
    expect(selectBadgeColorIndex("进行中")).toBe(selectBadgeColorIndex("进行中"));
  });

  test("索引落在色板范围内", () => {
    for (const value of ["待办", "进行中", "已完成", "高", "中", "低", "x"]) {
      const index = selectBadgeColorIndex(value);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(SELECT_BADGE_PALETTE_SIZE);
      expect(Number.isInteger(index)).toBe(true);
    }
  });

  test("常见状态值不全落在同一颜色", () => {
    const indexes = new Set(
      ["待办", "进行中", "已完成", "高", "中", "低"].map(selectBadgeColorIndex)
    );
    expect(indexes.size).toBeGreaterThan(1);
  });
});
