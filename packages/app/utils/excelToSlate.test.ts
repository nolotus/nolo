import { describe, expect, test } from "bun:test";

import { convertExcelToSlate } from "./excelToSlate";

const getCellText = (content: any, rowIndex: number, columnIndex: number) =>
  content[1].children[rowIndex].children[columnIndex].children[0].text;

describe("convertExcelToSlate percentage formatting", () => {
  test("formats ratio numbers as percentages for percentage-like headers when display text is missing", () => {
    const content = convertExcelToSlate(
      [{ 项目: "A", 完成率: 0.125, 占比: 0.5, "Margin %": 0.075 }],
      "usage.xlsx",
      { locale: "zh-CN" }
    );

    expect(getCellText(content, 1, 1)).toBe("12.5%");
    expect(getCellText(content, 1, 2)).toBe("50%");
    expect(getCellText(content, 1, 3)).toBe("7.5%");
  });

  test("keeps ordinary numeric cells as numbers", () => {
    const content = convertExcelToSlate(
      [{ 项目: "A", 数量: 0.5 }],
      "usage.xlsx",
      { locale: "zh-CN" }
    );

    expect(getCellText(content, 1, 1)).toBe("0.5");
  });

  test("preserves Excel display text when provided", () => {
    const content = convertExcelToSlate(
      [{ 项目: "A", 完成率: 0.125 }],
      "usage.xlsx",
      {
        locale: "zh-CN",
        displayData: [{ 项目: "A", 完成率: "12.50%" }],
      }
    );

    expect(getCellText(content, 1, 1)).toBe("12.50%");
  });
});
