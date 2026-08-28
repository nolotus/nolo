import { describe, expect, it } from "bun:test";

import type { ReferenceItem } from "app/types";

import { buildSkillDocMarkdown } from "./skillDocProtocol";
import { summarizeSkillReferences } from "./skillReferenceSummary";

describe("summarizeSkillReferences", () => {
  it("returns only references backed by skill documents", () => {
    const references: ReferenceItem[] = [
      { dbKey: "page-skill-web", title: "Web Skill", type: "instruction" },
      { dbKey: "page-plain-note", title: "Plain Note", type: "knowledge" },
    ];

    const contentByKey = new Map([
      [
        "page-skill-web",
        {
          dbKey: "page-skill-web",
          title: "Web Skill",
          content: buildSkillDocMarkdown({
            body: "Search first.",
            skillConfig: {
              version: "0.1",
              kind: "skill",
              id: "web-research",
              name: "Web Research",
              description: "Search before opening heavy pages.",
              toolNames: ["exa_search", "fetchWebpage"],
              requiredSkills: ["page-skill-browser"],
              recommendedSkills: ["page-skill-space"],
              promptPatch: "先搜索再打开网页。",
            },
          }),
        },
      ],
      [
        "page-plain-note",
        {
          dbKey: "page-plain-note",
          title: "Plain Note",
          content: "# not a skill",
        },
      ],
    ]);

    expect(summarizeSkillReferences(references, contentByKey as any)).toEqual([
      {
        dbKey: "page-skill-web",
        title: "Web Skill",
        referenceType: "instruction",
        skillId: "web-research",
        skillName: "Web Research",
        description: "Search before opening heavy pages.",
        toolNames: ["exa_search", "fetchWebpage"],
        requiredSkills: ["page-skill-browser"],
        recommendedSkills: ["page-skill-space"],
        promptPatch: "先搜索再打开网页。",
      },
    ]);
  });
});
