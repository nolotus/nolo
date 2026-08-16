import { describe, expect, test } from "bun:test";

import { buildSkillSummaryMarker, isSkillSummaryMarker } from "./skillSummaryMarker";

describe("skillSummaryMarker", () => {
  test("returns null for non-skill metadata", () => {
    expect(buildSkillSummaryMarker({})).toBeNull();
  });

  test("builds lightweight summary from skill metadata", () => {
    const summary = buildSkillSummaryMarker({
      kind: "skill",
      skillConfig: {
        version: "0.1",
        kind: "skill",
        id: "demo-skill",
        name: "Demo Skill",
        description: "Demo description",
        toolNames: ["exa_search"],
        triggerMode: "explicit",
      },
    });

    expect(summary).toEqual({
      isSkill: true,
      skillId: "demo-skill",
      name: "Demo Skill",
      description: "Demo description",
      toolNames: ["exa_search"],
      triggerMode: "explicit",
    });
    expect(isSkillSummaryMarker(summary)).toBe(true);
  });
});
