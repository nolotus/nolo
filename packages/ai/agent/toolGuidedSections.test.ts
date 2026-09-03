import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveToolGuidedSections,
  TOOL_GUIDED_SECTION_ORDER,
} from "./toolGuidedSections";
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

  // 工具轮次经济学：一次 tool 往返 = 一次完整模型请求，同轮多调用几乎不额外
  // 花钱、分多轮则成倍。loop 早就支持一轮多工具，这段是去把它用起来。
  test("有任何工具就注入轮次经济学纪律", () => {
    const sections = resolveToolGuidedSections(["readFile"]);
    expect(sections.toolRoundEconomy).toContain("一次 tool 往返 = 一次完整的模型请求");
    expect(sections.toolRoundEconomy).toContain("在同一轮里一次发完");
    // 等待类工具的预算纪律与 taskWait 的默认值改动是同一件事的两半。
    expect(sections.toolRoundEconomy).toContain("按预计耗时一次给足预算");
  });

  test("没有任何工具的 agent 不注入（纯对话 agent 不需要这条）", () => {
    expect(resolveToolGuidedSections([]).toolRoundEconomy).toBe("");
  });

  // 这个文件自己的注释警告过「历史上顺序 drift 过」：注入顺序表和
  // buildSystemPrompt 的显式 layer 列表是两份手写清单，加 section 必须同时改
  // 两处，漏一处的后果是该段在其中一条装配线上静默消失（localLoop 有、
  // buildSystemPrompt 没有，或反过来）。这里把两份清单钉在一起。
  test("注入顺序表里的每一段都被 buildSystemPrompt 显式装配", () => {
    const source = readFileSync(join(import.meta.dir, "buildSystemPrompt.ts"), "utf8");
    for (const id of TOOL_GUIDED_SECTION_ORDER) {
      expect(source).toContain(`toolSections.${id}`);
    }
  });
});