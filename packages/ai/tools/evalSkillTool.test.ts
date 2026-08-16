import { afterEach, describe, expect, it, mock } from "bun:test";
import { buildSkillDocMarkdown } from "ai/skills/skillDocProtocol";

let moduleVersion = 0;

async function loadEvalSkillTool(records: Record<string, any>) {
  mock.module("database/actions/read", () => ({
    readAction: async ({ dbKey }: { dbKey: string }) => {
      if (!(dbKey in records)) throw new Error(`missing ${dbKey}`);
      return records[dbKey];
    },
  }));
  const mod = await import(`./evalSkillTool`);
  mock.restore();
  return mod;
}

describe("evalSkillTool", () => {
  afterEach(() => {
    mock.restore();
  });

  it("evaluates effective tools including required skill dependencies", async () => {
    const requiredSkill = {
      dbKey: "page-skill-required",
      content: buildSkillDocMarkdown({
        body: "Search first.",
        skillConfig: {
          version: "0.1",
          kind: "skill",
          id: "web-core",
          name: "web-core",
          description: "Web core skill.",
          toolNames: ["exa_search"],
        },
      }),
      meta: { kind: "skill" },
    };

    const rootSkill = {
      dbKey: "page-skill-root",
      content: buildSkillDocMarkdown({
        body: "Read after search.",
        skillConfig: {
          version: "0.1",
          kind: "skill",
          id: "web-research",
          name: "web-research",
          description: "Research current web topics.",
          toolNames: ["fetchWebpage"],
          requiredSkills: ["page-skill-required"],
        },
        evalConfig: {
          version: "0.1",
          cases: [
            {
              input: "查最新公告",
              expectedTools: ["exa_search", "fetchWebpage"],
            },
          ],
        },
      }),
      meta: { kind: "skill" },
    };

    const { evalSkillFunc } = await loadEvalSkillTool({
      "page-skill-root": rootSkill,
      "page-skill-required": requiredSkill,
    });

    const result = await evalSkillFunc(
      {
        id: "page-skill-root",
      },
      {}
    );

    const raw = result.rawData as any;
    expect(raw.ok).toBe(true);
    expect(raw.effectiveTools).toEqual(
      expect.arrayContaining(["exa_search", "fetchWebpage"])
    );
    expect(raw.cases[0]?.passed).toBe(true);
  });
});
