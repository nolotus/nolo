import { describe, expect, test } from "bun:test";

import { buildAgentDocWiringReport } from "./agentDocWiring";

const baseInput = {
  server: "https://nolo.chat",
  ownerUserId: "0e95801d90",
  agentKey: "agent-0e95801d90-demo",
  write: false,
  references: [
    { dbKey: "page-0e95801d90-skill", type: "instruction" },
    { dbKey: "page-0e95801d90-index", type: "knowledge" },
  ],
  docsByKey: {
    "page-0e95801d90-skill": { title: "Skill", content: "Use docs first." },
    "page-0e95801d90-index": { title: "Index", slateData: [{ type: "paragraph" }] },
  },
};

describe("agentDocWiring", () => {
  test("passes when agent already has requested refs and read tools", () => {
    const report = buildAgentDocWiringReport({
      ...baseInput,
      agent: {
        tools: ["readDoc", "readSkillDoc"],
        references: [
          { dbKey: "page-0e95801d90-skill", type: "instruction" },
          { dbKey: "page-0e95801d90-index", type: "knowledge" },
        ],
      },
    });

    expect(report.ok).toBe(true);
    expect(report.summary.fail).toBe(0);
    expect(report.patch).toBeUndefined();
  });

  test("builds a patch when references and read tools are missing", () => {
    const report = buildAgentDocWiringReport({
      ...baseInput,
      promptPatch: "Read the index before answering.",
      agent: {
        prompt: "Base prompt",
        tools: [],
        references: [{ dbKey: "page-existing", type: "knowledge" }],
        meta: { keep: true },
      },
    });

    expect(report.ok).toBe(false);
    expect(report.patch).toMatchObject({
      tools: ["readDoc", "readSkillDoc"],
      references: [
        { dbKey: "page-existing", type: "knowledge" },
        { dbKey: "page-0e95801d90-skill", type: "instruction" },
        { dbKey: "page-0e95801d90-index", type: "knowledge" },
      ],
      meta: {
        keep: true,
        agentDocWiring: {
          referenceKeys: ["page-0e95801d90-skill", "page-0e95801d90-index"],
          previousReferenceKeys: ["page-existing"],
        },
      },
    });
    expect(String(report.patch?.prompt)).toContain("Base prompt");
    expect(String(report.patch?.prompt)).toContain("Read the index before answering.");
  });

  test("does not append prompt patch twice", () => {
    const report = buildAgentDocWiringReport({
      ...baseInput,
      promptPatch: "Read the index before answering.",
      agent: {
        prompt: "Base prompt\n\nRead the index before answering.",
        tools: ["readDoc", "readSkillDoc"],
        references: [],
      },
    });

    expect(String(report.patch?.prompt).match(/Read the index before answering/g)?.length).toBe(1);
  });

  test("fails when the agent is missing", () => {
    const report = buildAgentDocWiringReport({
      ...baseInput,
      agent: null,
    });

    expect(report.ok).toBe(false);
    expect(report.checks.find((check) => check.id === "agent.exists")?.severity).toBe("fail");
    expect(report.patch).toBeUndefined();
  });

  test("fails when a referenced doc is missing", () => {
    const report = buildAgentDocWiringReport({
      ...baseInput,
      agent: { tools: [], references: [] },
      docsByKey: {
        "page-0e95801d90-skill": { title: "Skill", content: "ok" },
        "page-0e95801d90-index": null,
      },
    });

    expect(report.ok).toBe(false);
    expect(report.checks.find((check) => check.id === "doc.exists.page-0e95801d90-index")?.severity).toBe("fail");
    expect(report.patch).toBeUndefined();
  });

  test("deduplicates repeated refs and keeps upload/eval out of scope", () => {
    const report = buildAgentDocWiringReport({
      ...baseInput,
      references: [
        { dbKey: "page-0e95801d90-skill", type: "instruction" },
        { dbKey: "page-0e95801d90-skill", type: "instruction" },
      ],
      agent: { tools: ["readDoc"], references: [] },
    });

    expect(report.expected.referenceKeys).toEqual(["page-0e95801d90-skill"]);
    const checkIds = report.checks.map((check) => check.id);
    expect(checkIds.some((id) => id.includes("upload"))).toBe(false);
    expect(checkIds.some((id) => id.includes("eval"))).toBe(false);
  });
});
