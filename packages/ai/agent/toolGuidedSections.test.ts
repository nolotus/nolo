import { describe, expect, test } from "bun:test";
import { resolveToolGuidedSections } from "./toolGuidedSections";
import { AGENT_SELECTION_PRIORITY_INSTRUCTIONS } from "./agentSelectionPriority";

describe("toolGuidedSections", () => {
  test("injects agentOrchestration run discipline when start/control tools are present", () => {
    const sections = resolveToolGuidedSections(["startAgentRun", "controlAgentRun"]);
    expect(sections.agentOrchestration).toBeTruthy();
    // 盯梢/排错纪律保留在编排段。
    expect(sections.agentOrchestration).toContain("异步派发后立即收尾，等终态通知");
    expect(sections.agentOrchestration).toContain("tailLines:0");
    expect(sections.agentOrchestration).toContain("tailLines:30");
    // 选人优先级五档由「多 Agent 协作」段唯一承载，不再出现在编排段。
    expect(sections.agentOrchestration).not.toContain(AGENT_SELECTION_PRIORITY_INSTRUCTIONS);
    // 协作段承载选人优先级五档。
    expect(sections.agentCollaboration).toContain(AGENT_SELECTION_PRIORITY_INSTRUCTIONS);
    expect(sections.agentCollaboration).toContain("优先级契约（与列表排序真值严格一致）");
    expect(sections.agentCollaboration).toContain("1. 收藏的 OAuth / 自定义 Agent");
  });

  test("returns empty string when tool is not present", () => {
    const sections = resolveToolGuidedSections(["someUnrelatedTool"]);
    expect(sections.agentOrchestration).toBe("");
    expect(sections.agentCollaboration).toBe("");
  });

  test("requires explicit one-time consent before platform-agent calls", () => {
    const sections = resolveToolGuidedSections(["startAgentRun", "controlAgentRun"]);
    const prompt = sections.agentCollaboration;

    expect(prompt).toContain("平台 Agent / 平台积分扣费确认硬闸门");
    expect(prompt).toContain("仅告知用户“会消耗平台积分”不等于获得授权");
    expect(prompt).toContain("“继续”“按计划”“你处理”“可以”等");
    expect(prompt).toContain("禁止调用平台 Agent");
    expect(prompt).toContain("授权是一次性的");
    expect(prompt).toContain("派发前自检");
  });
});
