import { describe, expect, test } from "bun:test";

import {
  buildClosedLoopArgsFromSpec,
  parseAgentCreationSpec,
  redactClosedLoopArgs,
  referenceToClosedLoopArg,
  validateAgentCreationSpec,
  type AgentCreationSpec,
} from "./agentCreationSpec";

const spec: AgentCreationSpec = {
  name: "倪海厦课程研读助手",
  server: "https://alpha-a.nolo.chat",
  owner: "0e95801d90",
  agent: "agent-0e95801d90-01NIHAISHATCMMVP000001",
  references: [
    { dbKey: "page-0e95801d90-01SK00000001DGUPMO", type: "instruction" },
    { dbKey: "page-0e95801d90-NIHAISHA-TCM-DOC-INDEX-001", type: "knowledge" },
  ],
  casesFile: "./scripts/verify/nihaishaAgentMultiTurnEval.cases.json",
  category: "nihaisha-agent-creation-spec",
  maxCases: 1,
};

describe("agentCreationSpec", () => {
  test("validates a minimal creation spec", () => {
    expect(validateAgentCreationSpec(spec)).toEqual([]);
    expect(parseAgentCreationSpec(spec)).toEqual(spec);
  });

  test("reports missing required fields and empty references", () => {
    expect(validateAgentCreationSpec({ references: [] })).toEqual([
      "agent must be a non-empty string.",
      "casesFile must be a non-empty string.",
      "references must contain at least one reference.",
    ]);
  });

  test("formats references for the existing closed-loop runner", () => {
    expect(referenceToClosedLoopArg({ dbKey: "page-a", type: "knowledge" })).toBe("page-a:knowledge");
    expect(referenceToClosedLoopArg({ dbKey: "page-b" })).toBe("page-b");
  });

  test("builds closed-loop args and keeps write/live explicit", () => {
    const args = buildClosedLoopArgsFromSpec(spec, {
      maxCases: 2,
      writeWiring: true,
      runLive: true,
      token: "secret",
    });

    expect(args).toContain("./scripts/verify/verifyAgentCreationClosedLoop.ts");
    expect(args).toContain("--write-wiring");
    expect(args).toContain("--run-live");
    expect(args).toContain("--max-cases");
    expect(args[args.indexOf("--max-cases") + 1]).toBe("2");
    expect(args[args.indexOf("--token") + 1]).toBe("secret");
  });

  test("rejects prompt patch inline and file at the same time", () => {
    expect(() =>
      buildClosedLoopArgsFromSpec({
        ...spec,
        promptPatch: "patch",
        promptPatchFile: "./patch.md",
      }),
    ).toThrow("promptPatch and promptPatchFile are mutually exclusive");
  });

  test("redacts token values from reported command args", () => {
    expect(redactClosedLoopArgs(["script.ts", "--token", "secret", "--agent", "agent-a"])).toEqual([
      "script.ts",
      "--token",
      "[redacted]",
      "--agent",
      "agent-a",
    ]);
  });

  test("validates public gate signal arrays", () => {
    expect(
      validateAgentCreationSpec({
        ...spec,
        publicGate: {
          server: "https://nolo.chat",
          minCases: 1,
          sourceGroundingSignals: ["参考资料"],
          safetySignals: ["可以自己试"],
        },
      }),
    ).toEqual([]);

    expect(
      validateAgentCreationSpec({
        ...spec,
        publicGate: {
          server: 1,
          sourceGroundingSignals: [1],
          safetySignals: "可以自己试",
        },
      }),
    ).toEqual([
      "publicGate.server must be a string when provided.",
      "publicGate.sourceGroundingSignals must be an array of strings when provided.",
      "publicGate.safetySignals must be an array of strings when provided.",
    ]);
  });
});
