import { describe, expect, it } from "bun:test";
import {
  CODING_ROOT_SKILL_ID,
  buildCodingSkillContentByKey,
  resolveCodingEffectiveTools,
} from "ai/skills/codingSkills";
import { resolveToolsFromKeys } from "ai/agent/referenceUtils";

// 完整闭环：agent 在对话中 loadSkill("coding") 后，coding skill 的 reference
// 被写进 dialog.extraReferences。后续 turn 的 resolveToolsFromKeys / 
// resolveCodingEffectiveTools 必须能把该 skill（含 requiredSkills 递归）扩展成
// 15 个 code 工具 + review 派发工具。
describe("coding skill -> tool-surface expansion (end-to-end)", () => {
  it("resolves the full code + review-dispatch tool surface via resolveCodingEffectiveTools", async () => {
    const tools = await resolveCodingEffectiveTools("user-e2e");
    const expected = [
      "readFile",
      "writeFile",
      "editFile",
      "applyEdit",
      "applyLineEdits",
      "codeSearch",
      "globFiles",
      "searchFiles",
      "listFiles",
      "execShell",
      "launchProcess",
      "listProcesses",
      "startAgentRun",
      "controlAgentRun",
      "listAgents",
    ];
    for (const tool of expected) {
      expect(tools).toContain(tool);
    }
    expect(tools).toHaveLength(15);
  });

  it("parses the coding skill page content into the declared tool surface via resolveToolsFromKeys (preloaded)", async () => {
    const userId = "user-e2e";
    const contentByKey = buildCodingSkillContentByKey(userId);
    const codingPage = contentByKey.get(CODING_ROOT_SKILL_ID);

    // preloaded 路径：直接把 coding skill 页内容喂给 resolveToolsFromKeys，
    // 模拟「extraReferences 已把 coding 页挂上」后的工具面解析。
    const resolved = await resolveToolsFromKeys(
      [CODING_ROOT_SKILL_ID],
      (() => {
        throw new Error("should not reach dispatch when preloaded");
      }) as any,
      new Map([[CODING_ROOT_SKILL_ID, codingPage]]),
    );

    for (const tool of [
      "readFile",
      "writeFile",
      "editFile",
      "execShell",
      "startAgentRun",
      "controlAgentRun",
      "listAgents",
    ]) {
      expect(resolved.tools).toContain(tool);
    }
    const patches = resolved.skillPromptPatches.join("\n");
    expect(patches).toContain("Review 纪律");
    expect(patches).toContain("Verdict");
    expect(patches).toContain("code-quality");
  });
});
