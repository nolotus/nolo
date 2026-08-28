import { describe, expect, it } from "bun:test";
import {
  SPECIALIST_SKILL_SLUGS,
  buildSpecialistSkillContentBySlug,
  buildSpecialistSkillId,
  buildSpecialistSkillPageKey,
  buildSpecialistSkillPageRecords,
  resolveSpecialistBuiltinSlug,
} from "./specialistSkills";

describe("specialistSkills", () => {
  it("exposes exactly the three specialist slugs", () => {
    expect(SPECIALIST_SKILL_SLUGS).toEqual([
      "feedback",
      "agent-creator",
      "app-builder",
    ]);
  });

  it("builds deterministic skill ids and page keys per slug", () => {
    const feedbackId = buildSpecialistSkillId("feedback");
    expect(feedbackId).toBe(buildSpecialistSkillId("feedback"));
    expect(buildSpecialistSkillPageKey("user-1", "feedback")).toBe(
      `page-user-1-${feedbackId}`,
    );
    // 不同 slug 的 id 不同
    expect(buildSpecialistSkillId("feedback")).not.toBe(
      buildSpecialistSkillId("app-builder"),
    );
  });

  it("resolves builtin slugs for all three specialists and null otherwise", () => {
    expect(resolveSpecialistBuiltinSlug("feedback")).toBe("feedback");
    expect(resolveSpecialistBuiltinSlug("agent-creator")).toBe("agent-creator");
    expect(resolveSpecialistBuiltinSlug("app-builder")).toBe("app-builder");
    expect(resolveSpecialistBuiltinSlug("coding")).toBeNull();
    expect(resolveSpecialistBuiltinSlug("unknown")).toBeNull();
    expect(resolveSpecialistBuiltinSlug("")).toBeNull();
  });

  it("builds markdown content by slug without a userId", () => {
    const content = buildSpecialistSkillContentBySlug("feedback");
    expect(content).toContain("feedback");
    expect(content).toContain("addTableRow");
    expect(content).toContain("反馈");
    expect(content).toContain("用户反馈");
  });

  it("exposes each specialist's tool grants in compiled page records", () => {
    const pages = buildSpecialistSkillPageRecords("user-1");
    expect(pages).toHaveLength(3);

    const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
    expect(bySlug.feedback.tools).toContain("addTableRow");
    expect(bySlug.feedback.tools).toContain("notifyUser");
    expect(bySlug["agent-creator"].tools).toContain("createAgent");
    expect(bySlug["agent-creator"].tools).toContain("prepareAgentDraft");
    // app-builder 工具由「app-builder」能力包注入，seed 不携带工具名单
    expect(bySlug["app-builder"].tools).toBeUndefined();
  });

  it("keeps skill page keys stable across page record builds", () => {
    const [first] = buildSpecialistSkillPageRecords("user-1");
    const dbKeys = buildSpecialistSkillPageRecords("user-1").map(
      (p) => p.dbKey,
    );
    expect(dbKeys).toContain(first.dbKey);
    expect(new Set(dbKeys).size).toBe(3);
  });
});
