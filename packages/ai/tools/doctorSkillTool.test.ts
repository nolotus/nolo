import { afterEach, describe, expect, it, mock } from "bun:test";
import { buildSkillDocMarkdown } from "ai/skills/skillDocProtocol";

let moduleVersion = 0;

async function loadDoctorSkillTool() {
  mock.module("database/actions/read", () => ({
    readAction: async () => {
      throw new Error("readAction should not be called in inline-content test");
    },
  }));
  const mod = await import(`./doctorSkillTool`);
  mock.restore();
  return mod;
}

describe("doctorSkillTool", () => {
  afterEach(() => {
    mock.restore();
  });

  it("detects outdated opencli flags and missing eval config", async () => {
    const { doctorSkillFunc } = await loadDoctorSkillTool();
    const result = await doctorSkillFunc(
      {
        content: buildSkillDocMarkdown({
          body: "Use `opencli twitter thread --tweet_id 123` to inspect posts.",
          skillConfig: {
            version: "0.1",
            kind: "skill",
            id: "x-reader",
            name: "x-reader",
            description: "Read X posts.",
            toolNames: ["fetch-webpage"],
          },
        }),
      },
      {}
    );

    const raw = result.rawData as any;
    expect(raw.ok).toBe(true);
    expect(raw.canonicalToolNames).toEqual(["fetchWebpage"]);
    expect(raw.warnings.join("\n")).toContain("--tweet-id");
    expect(raw.warnings.join("\n")).toContain("eval-config");
  });
});
