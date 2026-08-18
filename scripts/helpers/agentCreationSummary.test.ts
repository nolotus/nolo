import { describe, expect, test } from "bun:test";

import { buildAgentCreationHumanSummary } from "./agentCreationSummary";

describe("agentCreationSummary", () => {
  test("turns a closed-loop report into a human-readable summary", () => {
    const summary = buildAgentCreationHumanSummary({
      specFile: "./spec.json",
      writeWiring: false,
      runLive: false,
      spec: {
        name: "倪海厦课程研读助手",
        agent: "agent-0e95801d90-01NIHAISHATCMMVP000001",
        casesFile: "./cases.json",
        references: [
          { dbKey: "page-skill", title: "Skill Doc", type: "instruction" },
          { dbKey: "page-index", title: "Docs Index", type: "knowledge" },
        ],
      },
      closedLoop: {
        steps: [
          { name: "agent-doc-wiring", report: { ok: true, summary: { ok: 9, warn: 0, fail: 0 } } },
          { name: "agent-multiturn-eval", report: { ok: true, summary: { cases: 1, turns: 2 } } },
        ],
      },
    });

    expect(summary.title).toBe("倪海厦课程研读助手");
    expect(summary.markdown).toContain("资料入口：2 个");
    expect(summary.markdown).toContain("配置检查：通过");
    expect(summary.markdown).toContain("多轮验收：通过");
    expect(summary.markdown).toContain("只检查，不写入");
  });
});
