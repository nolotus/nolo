import { describe, expect, it } from "bun:test";
import {
  buildAgentFormDataFromGuidedDraft,
  mergeGuidedAgentDraft,
  validateGuidedAgentDraft,
} from "./draft";
import type { GuidedAgentDraft } from "./types";

const completeDraft: GuidedAgentDraft = {
  name: "周报助手",
  introduction: "帮助团队整理周报和行动项。",
  prompt: "你是严谨的周报助手，先澄清时间范围，再输出摘要、进展、风险和行动项。",
  promptSummary: "整理周报、风险和行动项。",
  provider: "openrouter",
  model: "openai/gpt-5.1",
  isPublic: false,
  capabilityIds: ["docs", "tables"],
  toolIds: ["createDoc", "updateDoc", "read", "createTable"],
  references: [
    {
      dbKey: "PAGE-user-1-abc",
      title: "团队周报规范",
      type: "knowledge",
      selected: true,
      reason: "用户要求沿用团队格式。",
    },
    {
      dbKey: "PAGE-user-1-unused",
      title: "旧规范",
      type: "knowledge",
      selected: false,
    },
  ],
  tags: ["周报", "团队协作"],
  unresolved: [],
  assemblyNotes: ["Agent 是 prompt + knowledge + tools + skills/workflows + eval 的封装。"],
  suggestedSkillIdeas: ["把周报复盘步骤沉淀成 skill。"],
  suggestedWorkflowIdeas: ["收集输入 -> 归纳进展 -> 标注风险 -> 输出行动项。"],
  suggestedEvalCases: ["输入一份缺少风险的周报，应主动询问风险而不是编造。"],
};

describe("guided agent draft", () => {
  it("requires the fields needed before final create", () => {
    expect(validateGuidedAgentDraft(completeDraft)).toEqual({ ok: true });
    expect(
      validateGuidedAgentDraft({ ...completeDraft, name: "", prompt: "" })
    ).toEqual({ ok: false, missing: ["name", "prompt"] });
  });

  it("converts only selected references into AgentFormData", () => {
    const formData = buildAgentFormDataFromGuidedDraft(completeDraft);

    expect(formData.name).toBe("周报助手");
    expect(formData.provider).toBe("openrouter");
    expect(formData.model).toBe("openai/gpt-5.1");
    expect(formData.tools).toEqual(["createDoc", "updateDoc", "read", "createTable"]);
    expect(formData.references).toEqual([
      {
        dbKey: "PAGE-user-1-abc",
        title: "团队周报规范",
        type: "knowledge",
      },
    ]);
    expect(formData.tags).toBe("周报, 团队协作");
    expect(formData.isPublic).toBe(false);
    expect(formData).not.toHaveProperty("assemblyNotes");
    expect(formData).not.toHaveProperty("suggestedSkillIdeas");
    expect(formData).not.toHaveProperty("suggestedWorkflowIdeas");
    expect(formData).not.toHaveProperty("suggestedEvalCases");
  });

  it("adds a hosted shell runtime policy for shell-backed image processing", () => {
    const formData = buildAgentFormDataFromGuidedDraft({
      ...completeDraft,
      name: "图片压缩助手",
      capabilityIds: ["imageProcessing"],
      toolIds: ["execShell"],
    });

    expect(formData.tools).toEqual(["execShell"]);
    expect((formData as any).runtimeToolPolicy).toEqual({
      version: 1,
      runtimeTools: ["execShell"],
      workspace: { mode: "lease" },
    });
    expect(formData).not.toHaveProperty("AgentSpec");
    expect(formData).not.toHaveProperty("specPageKey");
  });

  it("treats string false and malformed values as safe false for isPublic and reference selected", () => {
    const draft: GuidedAgentDraft = {
      ...completeDraft,
      isPublic: "false" as any,
      references: [
        { ...completeDraft.references[0], selected: "false" as any },
        { ...completeDraft.references[0], selected: true },
      ],
    };
    const formData = buildAgentFormDataFromGuidedDraft(draft);
    expect(formData.isPublic).toBe(false);
    expect(formData.references).toEqual([
      {
        dbKey: "PAGE-user-1-abc",
        title: "团队周报规范",
        type: "knowledge",
      },
    ]);
  });

  it("merges assistant drafts without dropping existing arrays", () => {
    const merged = mergeGuidedAgentDraft(completeDraft, {
      name: "新的助手",
      promptSummary: "新的摘要",
    });

    expect(merged.name).toBe("新的助手");
    expect(merged.promptSummary).toBe("新的摘要");
    expect(merged.capabilityIds).toEqual(completeDraft.capabilityIds);
    expect(merged.references).toEqual(completeDraft.references);
    expect(merged.assemblyNotes).toEqual(completeDraft.assemblyNotes);
    expect(merged.suggestedSkillIdeas).toEqual(completeDraft.suggestedSkillIdeas);
    expect(merged.suggestedWorkflowIdeas).toEqual(completeDraft.suggestedWorkflowIdeas);
    expect(merged.suggestedEvalCases).toEqual(completeDraft.suggestedEvalCases);
  });
});
