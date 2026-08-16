import { describe, expect, it } from "bun:test";

import { toolDefinitionsByName } from "ai/tools";
import {
  collectDeleteConfirmIds,
  COMPOSER_DELETE_CONFIRM_TOOL_NAMES,
  buildConfirmActionGate,
  getDeleteConfirmConfig,
  isComposerDeleteConfirmToolName,
  parseDeleteConfirmPreview,
  resolveDeleteConfirmLabel,
  shouldShowToolMessageConfirmBanner,
} from "./toolConfirmPolicy";

describe("toolConfirmPolicy", () => {
  it("hides inline confirmation banners for composer-managed delete tools", () => {
    expect(isComposerDeleteConfirmToolName("deleteDialogs")).toBe(true);
    expect(isComposerDeleteConfirmToolName("deleteSpaces")).toBe(true);
    expect(
      shouldShowToolMessageConfirmBanner("deleteDialogs", {
        interaction: "confirm",
        status: "pending",
      })
    ).toBe(false);
    expect(
      shouldShowToolMessageConfirmBanner("deleteSpaces", {
        interaction: "confirm",
        status: "failed",
      })
    ).toBe(false);
  });

  it("does not show inline banners for non-confirm tools", () => {
    expect(isComposerDeleteConfirmToolName("readFile")).toBe(false);
    expect(
      shouldShowToolMessageConfirmBanner("readFile", {
        interaction: "data",
        status: "pending",
      })
    ).toBe(false);
    expect(
      shouldShowToolMessageConfirmBanner("readFile", {
        interaction: "confirm",
        status: "succeeded",
      })
    ).toBe(false);
  });

  it("adapts confirmed tool runs to shared action gates", () => {
    expect(
      buildConfirmActionGate("deleteSpaces", {
        id: "run-delete-space",
        interaction: "confirm",
        status: "pending",
        input: { query: "test" },
        outputSummary: "将删除 1 个 Space",
      })
    ).toEqual({
      id: "run-delete-space",
      kind: "confirm",
      title: "toolConfirm.confirmDelete",
      titleParams: { entity: "toolConfirm.entitySpace" },
      body: "将删除 1 个 Space",
      payload: {
        toolName: "deleteSpaces",
        input: { query: "test" },
      },
    });

    expect(
      buildConfirmActionGate("applyDiff", {
        id: "run-apply-diff",
        interaction: "confirm",
        status: "pending",
        input: { filePath: "a.ts" },
      })
    ).toEqual({
      id: "run-apply-diff",
      kind: "confirm",
      title: "toolConfirm.confirmExecGate",
      titleParams: { name: "applyDiff" },
      payload: {
        toolName: "applyDiff",
        input: { filePath: "a.ts" },
      },
    });
  });

  it("keeps every confirmed delete tool on the composer confirmation path", () => {
    const confirmedDeleteTools = Object.values(toolDefinitionsByName)
      .filter(
        (tool) =>
          tool.interaction === "confirm" &&
          typeof tool.schema?.name === "string" &&
          /^delete[A-Z]/.test(tool.schema.name)
      )
      .map((tool) => tool.schema.name)
      .sort();

    expect(confirmedDeleteTools).toEqual(
      [...COMPOSER_DELETE_CONFIRM_TOOL_NAMES].sort()
    );
  });

  it("resolves labels and ids from delete preview payloads", () => {
    const config = getDeleteConfirmConfig("deleteSpaces");
    const preview = parseDeleteConfirmPreview(
      JSON.stringify({
        deletable: [
          { spaceId: " space-a ", name: "测试空间" },
          { spaceId: "space-b", name: "第二空间" },
        ],
      })
    );

    expect(
      resolveDeleteConfirmLabel({
        config,
        preview,
        fallback: "匹配的空间",
        translateMultiple: ({ title, count, entity }) =>
          `${title} 等 ${count} 个${entity === "toolConfirm.entitySpace" ? "空间" : entity}`,
      })
    ).toBe("测试空间 等 2 个空间");
    expect(config ? collectDeleteConfirmIds({ config, preview }) : []).toEqual([
      "space-a",
      "space-b",
    ]);
  });
});
