import { describe, expect, it } from "bun:test";

import { prepareAgentDraftToolFunc } from "./prepareAgentDraftTool";

describe("prepareAgentDraftTool", () => {
  it("returns a draft payload without creating an agent record", async () => {
    const dispatchCalls: unknown[] = [];
    const result = await prepareAgentDraftToolFunc(
      {
        name: "销售跟进助手",
        introduction: "帮助销售团队整理客户状态和下一步跟进建议。",
        prompt: "你是销售跟进助手，先理解客户背景，再给出清晰下一步。",
        promptSummary: "整理客户状态并生成跟进建议。",
        provider: "openai",
        model: "gpt-5.4-mini",
        isPublic: false,
        capabilityIds: ["tables", "docs"],
        unresolved: ["公开状态"],
      },
      {
        dispatch: (value: unknown) => {
          dispatchCalls.push(value);
          return { unwrap: async () => value };
        },
      }
    );

    expect(dispatchCalls).toEqual([]);
    expect(result.rawData.draft.name).toBe("销售跟进助手");
    expect(result.rawData.draft.toolIds).toEqual(expect.arrayContaining([
      "createTable",
      "read",
    ]));
    expect(result.rawData.createUrl).toBe("/create/agent");
    expect(result.displayData).toContain("Agent 草稿");
    expect(result.displayData).toContain("销售跟进助手");
  });

  it("keeps shell-backed image compression as an assembled capability", async () => {
    const result = await prepareAgentDraftToolFunc({
      name: "图片压缩助手",
      introduction: "上传图片后自动压缩并返回结果。",
      promptSummary: "压缩图片，尽量保持清晰。",
      capabilityIds: ["imageProcessing"],
      assemblyNotes: ["这个 Agent 会用可执行脚本处理图片压缩。"],
      suggestedEvalCases: [
        "上传一张大图，应返回更小且可打开的图片。",
      ],
    });

    expect(result.rawData.draft.capabilityIds).toEqual(["imageProcessing"]);
    expect(result.rawData.draft.toolIds).toEqual(["execShell"]);
    expect(result.rawData.draft.assemblyNotes).toContain(
      "这个 Agent 会用可执行脚本处理图片压缩。"
    );
    expect(result.rawData.draft.suggestedEvalCases).toContain(
      "上传一张大图，应返回更小且可打开的图片。"
    );
    expect(result.displayData).toContain("图片压缩助手");
  });
});
