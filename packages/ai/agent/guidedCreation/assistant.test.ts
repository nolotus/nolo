import { describe, expect, it } from "bun:test";
import {
  GUIDED_AGENT_CREATION_ASSISTANT_SYSTEM_PROMPT,
  parseGuidedAgentAssistantDraft,
} from "./assistant";
import { buildAgentFormDataFromGuidedDraft } from "./draft";

describe("guided agent creation assistant", () => {
  it("keeps the assistant focused on draft creation instead of persistence", () => {
    expect(GUIDED_AGENT_CREATION_ASSISTANT_SYSTEM_PROMPT).toContain("只生成草稿");
    expect(GUIDED_AGENT_CREATION_ASSISTANT_SYSTEM_PROMPT).toContain("不要创建真实 Agent 记录");
    expect(GUIDED_AGENT_CREATION_ASSISTANT_SYSTEM_PROMPT).toContain("JSON");
    expect(GUIDED_AGENT_CREATION_ASSISTANT_SYSTEM_PROMPT).toContain(
      "Agent = prompt + knowledge + tools + skills/workflows + eval"
    );
    expect(GUIDED_AGENT_CREATION_ASSISTANT_SYSTEM_PROMPT).toContain(
      "拆到现有资产"
    );
    expect(GUIDED_AGENT_CREATION_ASSISTANT_SYSTEM_PROMPT).not.toContain("Agent Spec");
  });

  it("parses the last JSON draft block from assistant text", () => {
    const parsed = parseGuidedAgentAssistantDraft(`
我建议这样配置。

\`\`\`json
{
  "draft": {
    "name": "研究助手",
    "introduction": "帮你检索和整理资料。",
    "prompt": "你是研究助手。",
    "promptSummary": "检索并整理资料。",
    "provider": "openrouter",
    "model": "openai/gpt-5.1",
    "isPublic": false,
    "capabilityIds": ["webSearch"],
    "toolIds": ["exa_search"],
    "references": [],
    "tags": ["研究"],
    "unresolved": []
  }
}
\`\`\`
`);

    expect(parsed?.name).toBe("研究助手");
    expect(parsed?.capabilityIds).toEqual(["webSearch"]);
  });

  it("sanitizes malformed arrays and references, and treats non-literal true as false", () => {
    const parsed = parseGuidedAgentAssistantDraft(`
\`\`\`json
{
  "draft": {
    "name": "Test",
    "introduction": "Intro",
    "prompt": "Prompt",
    "promptSummary": "Summary",
    "provider": "openrouter",
    "model": "openai/gpt-5.1",
    "isPublic": "false",
    "capabilityIds": ["webSearch", 123, null],
    "toolIds": ["exa_search", true, {}],
    "references": [
      { "dbKey": "PAGE-1", "title": "T1", "type": "knowledge", "selected": "false" },
      { "dbKey": "PAGE-2", "title": "T2", "type": "instruction", "selected": true },
      { "dbKey": 456, "title": "T3", "type": "knowledge", "selected": true },
      "not-an-object"
    ],
    "tags": ["tag1", 123, null],
    "unresolved": ["question1", false, 456]
  }
}
\`\`\`
    `);

    expect(parsed).not.toBeNull();
    expect(parsed!.name).toBe("Test");
    expect(parsed!.isPublic).toBe(false);
    expect(parsed!.capabilityIds).toEqual(["webSearch"]);
    expect(parsed!.toolIds).toEqual(["exa_search"]);
    expect(parsed!.references).toEqual([
      {
        dbKey: "PAGE-1",
        title: "T1",
        type: "knowledge",
        selected: false,
      },
      {
        dbKey: "PAGE-2",
        title: "T2",
        type: "instruction",
        selected: true,
      },
    ]);
    expect(parsed!.tags).toEqual(["tag1"]);
    expect(parsed!.unresolved).toEqual(["question1"]);
  });

  it("preserves recommended-but-unselected references in parser output, and draft conversion filters them out", () => {
    const parsed = parseGuidedAgentAssistantDraft(`
\`\`\`json
{
  "draft": {
    "name": "Test",
    "introduction": "Intro",
    "prompt": "Prompt",
    "promptSummary": "Summary",
    "provider": "openrouter",
    "model": "openai/gpt-5.1",
    "isPublic": false,
    "capabilityIds": [],
    "toolIds": [],
    "references": [
      { "dbKey": "PAGE-1", "title": "T1", "type": "knowledge", "selected": false, "reason": "Recommended" },
      { "dbKey": "PAGE-2", "title": "T2", "type": "instruction", "selected": true, "reason": "Confirmed" }
    ],
    "tags": [],
    "unresolved": []
  }
}
\`\`\`
    `);

    expect(parsed).not.toBeNull();
    expect(parsed!.references).toEqual([
      { dbKey: "PAGE-1", title: "T1", type: "knowledge", selected: false, reason: "Recommended" },
      { dbKey: "PAGE-2", title: "T2", type: "instruction", selected: true, reason: "Confirmed" },
    ]);

    const formData = buildAgentFormDataFromGuidedDraft(parsed!);
    expect(formData.references).toEqual([
      { dbKey: "PAGE-2", title: "T2", type: "instruction" },
    ]);
  });

  it("parses non-persistent assembly suggestions for skills workflows and eval", () => {
    const parsed = parseGuidedAgentAssistantDraft(`
\`\`\`json
{
  "draft": {
    "name": "投研尽调助手",
    "introduction": "帮助投资人整理资料、跑尽调流程并输出风险清单。",
    "prompt": "你是投研尽调助手，先确认标的和资料来源，再按流程输出。",
    "promptSummary": "确认标的、读取资料、输出风险清单。",
    "provider": "openrouter",
    "model": "openai/gpt-5.1",
    "isPublic": false,
    "capabilityIds": ["docs", "webSearch"],
    "toolIds": ["readDoc", "exa_search"],
    "references": [
      { "dbKey": "page-dd-template", "title": "尽调模板", "type": "instruction", "selected": true }
    ],
    "tags": ["投研"],
    "unresolved": [],
    "assemblyNotes": ["把用户的尽调步骤沉淀为 workflow reference，而不是塞进 prompt"],
    "suggestedSkillIdeas": ["资料核验 skill：检查来源、时间和冲突"],
    "suggestedWorkflowIdeas": ["尽调工作流：确认标的 -> 读取资料 -> 风险分级 -> 输出问题清单"],
    "suggestedEvalCases": ["给一份缺少来源的公司材料，应指出证据不足而不是编造结论"]
  }
}
\`\`\`
    `);

    expect(parsed?.assemblyNotes).toEqual([
      "把用户的尽调步骤沉淀为 workflow reference，而不是塞进 prompt",
    ]);
    expect(parsed?.suggestedSkillIdeas).toEqual([
      "资料核验 skill：检查来源、时间和冲突",
    ]);
    expect(parsed?.suggestedWorkflowIdeas).toEqual([
      "尽调工作流：确认标的 -> 读取资料 -> 风险分级 -> 输出问题清单",
    ]);
    expect(parsed?.suggestedEvalCases).toEqual([
      "给一份缺少来源的公司材料，应指出证据不足而不是编造结论",
    ]);

    const formData = buildAgentFormDataFromGuidedDraft(parsed!);
    expect(formData).not.toHaveProperty("assemblyNotes");
    expect(formData).not.toHaveProperty("suggestedSkillIdeas");
    expect(formData).not.toHaveProperty("suggestedWorkflowIdeas");
    expect(formData).not.toHaveProperty("suggestedEvalCases");
  });
});
