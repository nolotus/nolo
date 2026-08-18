import { describe, expect, it } from "bun:test";
import {
  SEARCH_SPACE_SKILL_SLUGS,
  buildSearchSpaceSkillContentBySlug,
  buildSearchSpaceSkillId,
  buildSearchSpaceSkillPageKey,
  buildSearchSpaceSkillPageRecords,
  resolveSearchSpaceBuiltinSlug,
} from "./searchSpaceSkill";

describe("searchSpaceSkill", () => {
  it("exposes exactly the search-all-spaces slug", () => {
    expect(SEARCH_SPACE_SKILL_SLUGS).toEqual(["search-all-spaces"]);
  });

  it("builds deterministic skill ids and page keys per slug", () => {
    const id = buildSearchSpaceSkillId("search-all-spaces");
    expect(id).toBe(buildSearchSpaceSkillId("search-all-spaces"));
    expect(buildSearchSpaceSkillPageKey("user-1", "search-all-spaces")).toBe(
      `page-user-1-${id}`,
    );
    expect(id.length).toBe(18);
  });

  it("resolves the builtin slug and null otherwise", () => {
    expect(resolveSearchSpaceBuiltinSlug("search-all-spaces")).toBe(
      "search-all-spaces",
    );
    expect(resolveSearchSpaceBuiltinSlug("coding")).toBeNull();
    expect(resolveSearchSpaceBuiltinSlug("search-dialog-messages")).toBeNull();
    expect(resolveSearchSpaceBuiltinSlug("unknown")).toBeNull();
    expect(resolveSearchSpaceBuiltinSlug("")).toBeNull();
  });

  it("config toolNames carries search_all_spaces (the skill's tool grant)", () => {
    const { buildSearchSpaceSkillConfig } = require("./searchSpaceSkill");
    const config = buildSearchSpaceSkillConfig("search-all-spaces");
    expect(config.kind).toBe("skill");
    expect(config.name).toBe("全空间搜索");
    expect(config.toolNames).toEqual(["search_all_spaces"]);
    expect(config.description).toContain("全空间搜索");
    expect(config.description).toContain("search_all_spaces");
  });

  it("builds non-empty markdown content by slug without a userId", () => {
    const content = buildSearchSpaceSkillContentBySlug("search-all-spaces");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("全空间搜索");
    expect(content).toContain("search_all_spaces");
    expect(content).toContain("query");
  });

  it("exposes the tool grant in compiled page records", () => {
    const pages = buildSearchSpaceSkillPageRecords("user-1");
    expect(pages).toHaveLength(1);
    const [page] = pages;
    expect(page.slug).toBe("search-all-spaces");
    expect(page.dbKey).toBe(
      `page-user-1-${buildSearchSpaceSkillId("search-all-spaces")}`,
    );
    expect(page.tools).toEqual(["search_all_spaces"]);
    expect(page.content.length).toBeGreaterThan(0);
  });
});
