import { describe, expect, it } from "bun:test";
import {
  SEARCH_DIALOG_SKILL_SLUGS,
  buildSearchDialogSkillContentBySlug,
  buildSearchDialogSkillId,
  buildSearchDialogSkillPageKey,
  buildSearchDialogSkillPageRecords,
  resolveSearchDialogBuiltinSlug,
} from "./searchDialogSkill";

describe("searchDialogSkill", () => {
  it("exposes exactly the search-dialog-messages slug", () => {
    expect(SEARCH_DIALOG_SKILL_SLUGS).toEqual(["search-dialog-messages"]);
  });

  it("builds deterministic skill ids and page keys per slug", () => {
    const id = buildSearchDialogSkillId("search-dialog-messages");
    expect(id).toBe(buildSearchDialogSkillId("search-dialog-messages"));
    expect(buildSearchDialogSkillPageKey("user-1", "search-dialog-messages")).toBe(
      `page-user-1-${id}`,
    );
    expect(id.length).toBe(18);
  });

  it("resolves the builtin slug and null otherwise", () => {
    expect(resolveSearchDialogBuiltinSlug("search-dialog-messages")).toBe(
      "search-dialog-messages",
    );
    expect(resolveSearchDialogBuiltinSlug("coding")).toBeNull();
    expect(resolveSearchDialogBuiltinSlug("feedback")).toBeNull();
    expect(resolveSearchDialogBuiltinSlug("unknown")).toBeNull();
    expect(resolveSearchDialogBuiltinSlug("")).toBeNull();
  });

  it("config toolNames carries listDialogs, readDialog and searchDialogMessages", () => {
    const { buildSearchDialogSkillConfig } = require("./searchDialogSkill");
    const config = buildSearchDialogSkillConfig("search-dialog-messages");
    expect(config.kind).toBe("skill");
    expect(config.name).toBe("对话检索");
    expect(config.toolNames).toEqual([
      "listDialogs",
      "readDialog",
      "searchDialogMessages",
    ]);
    expect(config.description).toContain("对话检索");
    expect(config.description).toContain("listDialogs");
  });

  it("builds non-empty markdown content by slug without a userId", () => {
    const content = buildSearchDialogSkillContentBySlug(
      "search-dialog-messages",
    );
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("对话检索");
    expect(content).toContain("listDialogs");
    expect(content).toContain("readDialog");
    expect(content).toContain("searchDialogMessages");
    expect(content).toContain("dialogKey");
  });

  it("exposes the tool grant in compiled page records", () => {
    const pages = buildSearchDialogSkillPageRecords("user-1");
    expect(pages).toHaveLength(1);
    const [page] = pages;
    expect(page.slug).toBe("search-dialog-messages");
    expect(page.dbKey).toBe(
      `page-user-1-${buildSearchDialogSkillId("search-dialog-messages")}`,
    );
    expect(page.tools).toEqual([
      "listDialogs",
      "readDialog",
      "searchDialogMessages",
    ]);
    expect(page.content.length).toBeGreaterThan(0);
  });
});
