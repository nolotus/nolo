import { describe, expect, test } from "bun:test";

import {
  DEFAULT_TEST_DIALOG_CATEGORY_ID,
  inferTestDialogCategoryId,
  resolveTestDialogCategory,
} from "./testDialogCategories";

describe("inferTestDialogCategoryId", () => {
  test("keeps explicit categories authoritative", () => {
    expect(
      inferTestDialogCategoryId({
        explicitCategory: "manual-category",
        userInput: "查一下 Gemini 用量",
      }),
    ).toBe("manual-category");
  });

  test("does not assign categories to continued dialogs or disabled test roots", () => {
    expect(
      inferTestDialogCategoryId({
        continueDialogId: "01ABC",
        userInput: "查一下 Gemini 用量",
      }),
    ).toBeUndefined();
    expect(
      inferTestDialogCategoryId({
        disableDefaultTestRoot: true,
        userInput: "查一下 Gemini 用量",
      }),
    ).toBeUndefined();
  });

  test("classifies usage, image, table, web, and coding test prompts", () => {
    expect(
      inferTestDialogCategoryId({
        agentName: "用量管理",
        userInput: "查一下今天 Gemini/Google API 用量",
      }),
    ).toBe("usage-management-tests");
    expect(
      inferTestDialogCategoryId({
        userInput: "请生成白底证件照",
      }),
    ).toBe("image-generation-tests");
    expect(
      inferTestDialogCategoryId({
        userInput: "调用 shareTable 分享这个表格",
      }),
    ).toBe("table-sharing-tests");
    expect(
      inferTestDialogCategoryId({
        userInput: "请抓取 https://example.com",
      }),
    ).toBe("web-fetch-tests");
    expect(
      inferTestDialogCategoryId({
        userInput: "读取 package.json 并编辑代码",
      }),
    ).toBe("coding-tool-tests");
  });

  test("falls back to the generic test dialog category", () => {
    expect(
      inferTestDialogCategoryId({
        userInput: "请只回复 ok",
      }),
    ).toBe(DEFAULT_TEST_DIALOG_CATEGORY_ID);
  });

  test("prefers agent defaults before inference", () => {
    expect(
      resolveTestDialogCategory({
        agentDefaultCategoryId: "agent-owned-tests",
        agentDefaultCategoryName: "Agent owned tests",
        userInput: "查一下 Gemini 用量",
      }),
    ).toEqual({
      categoryId: "agent-owned-tests",
      categoryName: "Agent owned tests",
      source: "agent-default",
      confidence: 0.98,
    });
  });

  test("matches existing space categories without hardcoded keywords", () => {
    expect(
      resolveTestDialogCategory({
        existingCategories: [
          { id: "invoice-reconciliation-tests", name: "发票对账测试" },
        ],
        userInput: "帮我跑一条发票对账流程",
      }),
    ).toEqual({
      categoryId: "invoice-reconciliation-tests",
      categoryName: "发票对账测试",
      source: "existing-match",
      confidence: 0.78,
    });
  });
});
