import { describe, expect, it } from "bun:test";
import {
  DEFAULT_CODE_PLANNER_EXECUTOR_CANDIDATE_KEYS,
} from "core/builtinAgents";
import {
  CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS,
  CODE_PLANNER_ROOT_SKILL_ID,
  CODE_PLANNER_ROOT_SKILL_REFERENCE,
  CODE_PLANNER_ROOT_SKILL_SLUG,
  CODE_PLANNER_SKILL_SEEDS,
  CODE_PLANNER_SKILL_SLUGS,
  buildCodePlannerCompiledAgentPrompt,
  buildCodePlannerRootSkillReference,
  buildCodePlannerSkillConfig,
  buildCodePlannerSkillId,
  buildCodePlannerSkillPageKey,
  buildCodePlannerSkillPageRecords,
  buildDispatchExecutorsPromptPatch,
  compileCodePlannerEffectivePromptPatches,
  compileCodePlannerEffectiveTools,
  resolveCodePlannerEffectiveTools,
} from "./codePlannerSkills";
import { resolvePageSkillMetadata } from "./skillDocProtocol";

/**
 * skill 自身授予的工具。联网工具刻意不在此列——它们是系统层能力包
 * （web-search / web-scrape），由宿主挂载，见 codePlannerWebCapability.test.ts。
 */
const EXPECTED_COMPILED_TOOLS = [
  "readFile",
  "globFiles",
  "editFile",
  "execShell",
  "startAgentRun",
] as const;

describe("codePlannerSkills seed graph", () => {
  it("defines one root and four children with stable slugs", () => {
    expect([...CODE_PLANNER_SKILL_SLUGS]).toEqual([
      "code-planning",
      "search-first",
      "workspace-code",
      "web-research-lite",
      "dispatch-executors",
    ]);
    expect(CODE_PLANNER_ROOT_SKILL_SLUG).toBe("code-planning");
    expect(CODE_PLANNER_SKILL_SEEDS.map((seed) => seed.slug).sort()).toEqual(
      [...CODE_PLANNER_SKILL_SLUGS].sort(),
    );
  });

  it("keeps search-first protocol-only (no tool grant)", () => {
    const config = buildCodePlannerSkillConfig("search-first");
    expect(config.toolNames ?? []).toEqual([]);
    expect(config.promptPatch).toContain("Adopt");
    expect(config.promptPatch).toContain("Extend");
    expect(config.promptPatch).toContain("Compose");
    expect(config.promptPatch).toContain("Build");
  });

  it("declares workspace and dispatch tool surfaces on children only", () => {
    expect(buildCodePlannerSkillConfig("workspace-code").toolNames).toEqual([
      "readFile",
      "globFiles",
      "editFile",
      "execShell",
    ]);
    // web-research-lite 是纯协议 skill：联网工具由系统能力包提供，
    // 这样用户在设置页的全局开关才管得住它们。
    expect(buildCodePlannerSkillConfig("web-research-lite").toolNames).toBeUndefined();
    expect(buildCodePlannerSkillConfig("dispatch-executors").toolNames).toEqual([
      "startAgentRun",
    ]);
    expect(buildCodePlannerSkillConfig("code-planning").toolNames ?? []).toEqual([]);
    expect(buildCodePlannerSkillConfig("code-planning").requiredSkills).toEqual([
      buildCodePlannerSkillId("search-first"),
      buildCodePlannerSkillId("workspace-code"),
      buildCodePlannerSkillId("web-research-lite"),
      buildCodePlannerSkillId("dispatch-executors"),
    ]);
  });

  it("materializes page keys and requiredSkills without remote writes", () => {
    const userId = "user-platform-demo";
    const pages = buildCodePlannerSkillPageRecords(userId);
    expect(pages).toHaveLength(5);

    const root = pages.find((page) => page.slug === "code-planning");
    expect(root?.dbKey).toBe(buildCodePlannerSkillPageKey(userId, "code-planning"));
    expect(root?.meta.skillConfig.requiredSkills).toEqual([
      buildCodePlannerSkillPageKey(userId, "search-first"),
      buildCodePlannerSkillPageKey(userId, "workspace-code"),
      buildCodePlannerSkillPageKey(userId, "web-research-lite"),
      buildCodePlannerSkillPageKey(userId, "dispatch-executors"),
    ]);

    const meta = resolvePageSkillMetadata({
      content: root?.content,
      meta: root?.meta,
    });
    expect(meta?.kind).toBe("skill");
    expect(meta?.skillConfig?.id).toBe(CODE_PLANNER_ROOT_SKILL_ID);
  });

  it("compiles the effective 5-tool set synchronously without web/listAgents/readAgent/writeFile", () => {
    const tools = compileCodePlannerEffectiveTools();
    expect(tools).toEqual([...EXPECTED_COMPILED_TOOLS]);
    expect(CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS).toEqual([...EXPECTED_COMPILED_TOOLS]);
    expect(tools).toHaveLength(5);
    expect(tools).not.toContain("listAgents");
    expect(tools).not.toContain("readAgent");
    expect(tools).not.toContain("writeFile");
    expect(tools).not.toContain("exa_search");
    expect(tools).not.toContain("firecrawl_scrape");
  });

  it("resolves the same effective tool contract from the required skill graph", async () => {
    const tools = await resolveCodePlannerEffectiveTools("user-skill-graph");
    expect(new Set(tools)).toEqual(new Set(EXPECTED_COMPILED_TOOLS));
    expect(tools).not.toContain("listAgents");
    expect(tools).not.toContain("readAgent");
    expect(tools).not.toContain("writeFile");
  });

  it("compiles dispatch patch from DEFAULT_CODE_PLANNER_EXECUTOR_CANDIDATE_KEYS", () => {
    const dispatchPatch = buildDispatchExecutorsPromptPatch(
      DEFAULT_CODE_PLANNER_EXECUTOR_CANDIDATE_KEYS,
    );
    for (const key of DEFAULT_CODE_PLANNER_EXECUTOR_CANDIDATE_KEYS) {
      expect(dispatchPatch).toContain(key);
    }
    expect(dispatchPatch).toContain("startAgentRun");
    // listAgents/readAgent 既不在工具面里，提示词也不该提——提了只会让模型
    // 以为存在「发现」这条路只是被禁用了。
    expect(compileCodePlannerEffectiveTools()).not.toContain("listAgents");
    expect(compileCodePlannerEffectiveTools()).not.toContain("readAgent");
    expect(dispatchPatch).not.toContain("listAgents");
    expect(dispatchPatch).not.toContain("readAgent");

    const patches = compileCodePlannerEffectivePromptPatches();
    const joined = patches.join("\n");
    for (const key of DEFAULT_CODE_PLANNER_EXECUTOR_CANDIDATE_KEYS) {
      expect(joined).toContain(key);
    }
    // Seed authoring uses the same builder so skill docs carry exact keys too.
    expect(buildCodePlannerSkillConfig("dispatch-executors").promptPatch).toBe(
      dispatchPatch,
    );
  });

  it("compiles workspace-first semantics and no-paste-unless-unavailable fallback", () => {
    const workspacePatch = buildCodePlannerSkillConfig("workspace-code").promptPatch ?? "";
    expect(workspacePatch).toContain("当前代码");
    expect(workspacePatch).toContain("当前改动");
    expect(workspacePatch).toContain("当前工作区");
    expect(workspacePatch).toContain("这个项目");
    expect(workspacePatch).toContain("仓库里");
    expect(workspacePatch).toContain("CLI 相关");
    expect(workspacePatch).toContain("git status -sb");
    expect(workspacePatch).toContain("不要要求用户粘贴");
    expect(workspacePatch).toContain("先披露失败");

    const compiledPrompt = buildCodePlannerCompiledAgentPrompt(
      "你是 Code Planner。\n能力边界：有效工具来自 code-planning skill 兼容快照。",
    );
    expect(compiledPrompt).toContain("当前工作区");
    expect(compiledPrompt).toContain("git status -sb");
    expect(compiledPrompt).toContain("不要要求用户粘贴");
    for (const key of DEFAULT_CODE_PLANNER_EXECUTOR_CANDIDATE_KEYS) {
      expect(compiledPrompt).toContain(key);
    }
  });

  it("exposes a root skill reference for Agent seed attachment", () => {
    expect(CODE_PLANNER_ROOT_SKILL_REFERENCE).toEqual({
      dbKey: CODE_PLANNER_ROOT_SKILL_ID,
      title: "code-planning",
      type: "instruction",
    });
    expect(buildCodePlannerRootSkillReference("owner-1")).toEqual({
      dbKey: buildCodePlannerSkillPageKey("owner-1", "code-planning"),
      title: "code-planning",
      type: "instruction",
    });
  });
});
