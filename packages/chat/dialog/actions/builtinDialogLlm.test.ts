import { describe, expect, it } from "bun:test";

import {
  buildBuiltinSummaryContent,
  BUILTIN_SUMMARY_LLM_CONFIG,
  BUILTIN_TITLE_LLM_CONFIG,
} from "./builtinDialogLlm";

describe("builtin dialog llm config", () => {
  it("pins title generation to the builtin GLM 5.3 Flash model", () => {
    expect(BUILTIN_TITLE_LLM_CONFIG.provider).toBe("nolo");
    expect(BUILTIN_TITLE_LLM_CONFIG.model).toBe("nemotron-3-5-lightning-30b");
    expect(BUILTIN_TITLE_LLM_CONFIG.apiSource).toBe("platform");
    expect(BUILTIN_TITLE_LLM_CONFIG.useServerProxy).toBe(true);
    expect(BUILTIN_TITLE_LLM_CONFIG.prompt).toContain("title generator");
    expect(BUILTIN_TITLE_LLM_CONFIG.prompt).toContain("忽略 tool JSON");
    expect(BUILTIN_TITLE_LLM_CONFIG.prompt).toContain("对象 + 动作/判断");
    expect(BUILTIN_TITLE_LLM_CONFIG.prompt).toContain("Output only the title text");
  });

  it("pins summary generation to the builtin GLM 5.3 Flash model", () => {
    expect(BUILTIN_SUMMARY_LLM_CONFIG.provider).toBe("nolo");
    expect(BUILTIN_SUMMARY_LLM_CONFIG.model).toBe("glm-5-3-flash");
    expect(BUILTIN_SUMMARY_LLM_CONFIG.apiSource).toBe("platform");
    expect(BUILTIN_SUMMARY_LLM_CONFIG.useServerProxy).toBe(true);
    expect(BUILTIN_SUMMARY_LLM_CONFIG.prompt).toContain("对话记忆助理");
    expect(BUILTIN_SUMMARY_LLM_CONFIG.prompt).toContain("关键事实档案");
    expect(BUILTIN_SUMMARY_LLM_CONFIG.prompt).toContain("对话剧情摘要");
  });

  it("builds summary content from previous summary and new messages", () => {
    const content = buildBuiltinSummaryContent(
      "已有摘要",
      "user: hi\nassistant: hello"
    );

    expect(content).toContain("【现有记忆】：\n已有摘要");
    expect(content).toContain("【新增对话】：\nuser: hi\nassistant: hello");
  });

  it("uses the empty placeholder when no previous summary exists", () => {
    const content = buildBuiltinSummaryContent("", "user: hi");
    expect(content).toContain("【现有记忆】：\n(无)");
  });
});
