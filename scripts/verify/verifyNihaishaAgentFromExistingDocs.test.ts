import { describe, expect, test } from "bun:test";

import { buildNihaishaVerifyReport } from "./verifyNihaishaAgentFromExistingDocs";

const baseInput = {
  server: "https://nolo.chat",
  ownerUserId: "0e95801d90",
  agentKey: "agent-0e95801d90-01NIHAISHATCMMVP000001",
  skillKey: "page-0e95801d90-01SK00000001DGUPMO",
  indexKey: "page-0e95801d90-NIHAISHA-TCM-DOC-INDEX-001",
  write: false,
};

describe("verifyNihaishaAgentFromExistingDocs", () => {
  test("passes the narrow P0 shape for existing docs agent creation", () => {
    const report = buildNihaishaVerifyReport({
      ...baseInput,
      agent: {
        model: "deepseek-v4-pro",
        provider: "deepseek",
        tools: ["readDoc"],
        references: [
          { dbKey: baseInput.skillKey, type: "instruction" },
          { dbKey: baseInput.indexKey, type: "knowledge" },
        ],
      },
      skillDoc: {
        title: "Skill",
        content: "安全边界：不要建议用户自行试药。医疗问题建议咨询专业医生。",
        meta: { skillConfig: { name: "skill" } },
      },
      indexDoc: {
        title: "Index",
        content: `## Core Reference Docs\n- skill: ${baseInput.skillKey}\n## All Markdown Docs\n- shanghanlun`,
      },
    });

    expect(report.ok).toBe(true);
    expect(report.summary.fail).toBe(0);
    expect(report.patch).toBeUndefined();
  });

  test("builds an agent patch when model/provider/references are wrong", () => {
    const report = buildNihaishaVerifyReport({
      ...baseInput,
      agent: {
        prompt: "base prompt",
        model: "other",
        provider: "custom",
        tools: [],
        references: [{ dbKey: "page-extra", type: "knowledge" }],
      },
      skillDoc: {
        title: "Skill",
        content: "安全边界：不要自行试药。",
        meta: { skillConfig: { name: "skill" } },
      },
      indexDoc: {
        title: "Index",
        content: `## Core Reference Docs\n- skill: ${baseInput.skillKey}`,
      },
    });

    expect(report.ok).toBe(false);
    expect(report.summary.fail).toBeGreaterThan(0);
    expect(report.patch).toMatchObject({
      model: "deepseek-v4-pro",
      provider: "deepseek",
      references: [
        { dbKey: baseInput.skillKey, type: "instruction" },
        { dbKey: baseInput.indexKey, type: "knowledge" },
      ],
    });
    expect((report.patch?.tools as string[])).toContain("readDoc");
    expect((report.patch?.tools as string[])).toContain("readSkillDoc");
  });

  test("keeps eval/upload concerns out of the P0 verifier", () => {
    const report = buildNihaishaVerifyReport({
      ...baseInput,
      agent: null,
      skillDoc: null,
      indexDoc: null,
    });

    const checkIds = report.checks.map((check) => check.id);
    expect(checkIds.some((id) => id.includes("upload"))).toBe(false);
    expect(checkIds.some((id) => id.includes("eval"))).toBe(false);
  });
});
