import { describe, expect, test } from "bun:test";

import {
  buildSkillDocId,
  buildSkillPageKey,
  buildSkillPageRecord,
} from "./skillDocHelpers";

describe("skillDocHelpers", () => {
  test("buildSkillDocId is deterministic", () => {
    expect(buildSkillDocId("Demo Root Skill")).toBe(buildSkillDocId("Demo Root Skill"));
  });

  test("buildSkillPageKey uses user and skill ids", () => {
    expect(buildSkillPageKey("user-1", "01SKABC")).toBe("page-user-1-01SKABC");
  });

  test("buildSkillPageRecord embeds skill config markdown", () => {
    const record = buildSkillPageRecord({
      dbKey: "page-user-1-01SKABC",
      skillId: "01SKABC",
      title: "Demo Skill",
      spaceId: "space-1",
      body: "Body text",
      skillConfig: {
        version: "0.1",
        kind: "skill",
        id: "01SKABC",
        name: "Demo Skill",
        description: "Demo description",
        toolNames: ["exa_search"],
      },
    });

    expect(record.type).toBe("page");
    expect(record.content).toContain("Body text");
    expect(record.content).toContain("skill-config");
    expect(record.content).toContain("exa_search");
  });
});
