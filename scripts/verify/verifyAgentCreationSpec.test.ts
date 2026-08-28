import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("verifyAgentCreationSpec source", () => {
  test("loads one spec file and delegates to the existing closed-loop runner", () => {
    const source = readFileSync("./scripts/verify/verifyAgentCreationSpec.ts", "utf8");

    expect(source).toContain("--spec-file");
    expect(source).toContain("buildClosedLoopArgsFromSpec");
    expect(source).toContain("verifyAgentCreationClosedLoop.ts");
    expect(source).toContain("--write-wiring");
    expect(source).toContain("--run-live");
    expect(source).toContain("redactClosedLoopArgs");
    expect(source).toContain("buildAgentCreationHumanSummary");
  });
});
