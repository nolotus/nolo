import { describe, expect, it } from "bun:test";
import {
  CODING_COMPILED_EFFECTIVE_TOOLS,
  CODING_ROOT_SKILL_ID,
  CODING_ROOT_SKILL_REFERENCE,
  CODING_ROOT_SKILL_SLUG,
  CODING_SKILL_SEEDS,
  CODING_SKILL_SLUGS,
  buildCodingRootSkillReference,
  buildCodingSkillConfig,
  buildCodingSkillContentBySlug,
  buildCodingSkillId,
  buildCodingSkillPageKey,
  buildCodingSkillPageRecords,
  compileCodingEffectivePromptPatches,
  compileCodingEffectiveTools,
  resolveCodingEffectiveTools,
} from "./codingSkills";
import { resolvePageSkillMetadata } from "./skillDocProtocol";

const EXPECTED_COMPILED_TOOLS = [
  "readFile",
  "writeFile",
  "editFile",
  "applyEdit",
  "applyLineEdits",
  "codeSearch",
  "globFiles",
  "execShell",
  "launchProcess",
  "listProcesses",
  "startAgentRun",
  "controlAgentRun",
  "listAgents",
] as const;

describe("codingSkills seed graph", () => {
  it("defines one root and six review children with stable slugs", () => {
    expect([...CODING_SKILL_SLUGS]).toEqual([
      "coding",
      "coding-review",
      "coding-review-code-quality",
      "coding-review-architecture",
      "coding-review-security",
      "coding-review-frontend-ux",
      "coding-review-backend-data",
    ]);
    expect(CODING_ROOT_SKILL_SLUG).toBe("coding");
    expect(CODING_SKILL_SEEDS.map((seed) => seed.slug).sort()).toEqual(
      [...CODING_SKILL_SLUGS].sort(),
    );
  });

  it("declares code + review-dispatch tool surface on the root coding skill", () => {
    const config = buildCodingSkillConfig("coding");
    expect(config.toolNames).toEqual([...EXPECTED_COMPILED_TOOLS]);
    expect(config.requiredSkills).toEqual([buildCodingSkillId("coding-review")]);
    // review discipline is part of the coding skill prompt
    expect(config.promptPatch).toContain("Review 纪律");
    expect(config.promptPatch).toContain("startAgentRun");
    expect(config.promptPatch).toContain("code-quality");
    expect(config.promptPatch).toContain("architecture");
    expect(config.promptPatch).toContain("security");
  });

  it("wires all five review roles as children of coding-review", () => {
    const reviewConfig = buildCodingSkillConfig("coding-review");
    expect(reviewConfig.requiredSkills).toEqual([
      buildCodingSkillId("coding-review-code-quality"),
      buildCodingSkillId("coding-review-architecture"),
      buildCodingSkillId("coding-review-security"),
      buildCodingSkillId("coding-review-frontend-ux"),
      buildCodingSkillId("coding-review-backend-data"),
    ]);
    expect(reviewConfig.promptPatch).toContain("Verdict");
    expect(reviewConfig.promptPatch).toContain("假阳性");
  });

  it("marks code-quality as the mandatory role and architecture as separate dispatch", () => {
    const codeQuality = buildCodingSkillConfig("coding-review-code-quality");
    expect(codeQuality.promptPatch).toContain("必跑");
    expect(codeQuality.promptPatch).toContain("可读性");
    expect(codeQuality.promptPatch).toContain("可维护性");
    expect(codeQuality.promptPatch).toContain("可组合性");
    expect(codeQuality.promptPatch).toContain("重复性");
    expect(codeQuality.promptPatch).toContain("可删除性");

    const architecture = buildCodingSkillConfig("coding-review-architecture");
    expect(architecture.promptPatch).toContain("第二份真值");
    expect(architecture.promptPatch).toContain("循环依赖");
    expect(architecture.promptPatch).toContain("API 兼容性");
  });

  it("materializes page keys and requiredSkills without remote writes", () => {
    const userId = "user-platform-demo";
    const pages = buildCodingSkillPageRecords(userId);
    expect(pages).toHaveLength(7);

    const root = pages.find((page) => page.slug === "coding");
    expect(root?.dbKey).toBe(buildCodingSkillPageKey(userId, "coding"));
    expect(root?.meta.skillConfig.requiredSkills).toEqual([
      buildCodingSkillPageKey(userId, "coding-review"),
    ]);

    const meta = resolvePageSkillMetadata({
      content: root?.content,
      meta: root?.meta,
    });
    expect(meta?.kind).toBe("skill");
    expect(meta?.skillConfig?.id).toBe(CODING_ROOT_SKILL_ID);
  });

  it("compiles the effective 13-tool set synchronously", () => {
    const tools = compileCodingEffectiveTools();
    expect(tools).toEqual([...EXPECTED_COMPILED_TOOLS]);
    expect(CODING_COMPILED_EFFECTIVE_TOOLS).toEqual([...EXPECTED_COMPILED_TOOLS]);
    expect(tools).toHaveLength(13);
  });

  it("resolves the same effective tool contract from the required skill graph", async () => {
    const tools = await resolveCodingEffectiveTools("user-skill-graph");
    expect(new Set(tools)).toEqual(new Set(EXPECTED_COMPILED_TOOLS));
  });

  it("builds content by slug without a userId (CLI fallback path)", () => {
    const content = buildCodingSkillContentBySlug("coding");
    expect(content).toContain("Review 纪律");
    expect(content).toContain("startAgentRun");
    const reviewContent = buildCodingSkillContentBySlug("coding-review-security");
    expect(reviewContent).toContain("安全审计员");
    expect(reviewContent).toContain("XSS");
  });

  it("compiles review discipline into the effective prompt patches", () => {
    const patches = compileCodingEffectivePromptPatches();
    const joined = patches.join("\n");
    expect(joined).toContain("Review 纪律");
    expect(joined).toContain("Verdict");
    expect(joined).toContain("注意力隔离");
    expect(joined).toContain("code-quality");
  });

  it("exposes a root skill reference for Agent seed attachment", () => {
    expect(CODING_ROOT_SKILL_REFERENCE).toEqual({
      dbKey: CODING_ROOT_SKILL_ID,
      title: "coding",
      type: "instruction",
    });
    expect(buildCodingRootSkillReference("owner-1")).toEqual({
      dbKey: buildCodingSkillPageKey("owner-1", "coding"),
      title: "coding",
      type: "instruction",
    });
  });

  it("resolves system-builtin coding slugs for the shared fallback", async () => {
    const { resolveCodingBuiltinSlug } = await import("./codingSkills");
    expect(resolveCodingBuiltinSlug("coding")).toBe("coding");
    expect(resolveCodingBuiltinSlug("coding-review")).toBe("coding-review");
    expect(resolveCodingBuiltinSlug("coding-review-security")).toBe(
      "coding-review-security",
    );
    expect(resolveCodingBuiltinSlug("coding-review-nope")).toBeNull();
    expect(resolveCodingBuiltinSlug("nolo-review")).toBeNull();
  });
});
