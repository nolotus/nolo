import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("verifyAgentCreationClosedLoop source", () => {
  test("composes wiring before multi-turn eval and keeps live actions explicit", () => {
    const source = readFileSync("./scripts/verify/verifyAgentCreationClosedLoop.ts", "utf8");

    expect(source).toContain("verifyAgentDocWiring.ts");
    expect(source).toContain("verifyAgentMultiTurnEval.ts");
    expect(source).toContain("--write-wiring");
    expect(source).toContain("--run-live");
    expect(source).toContain("Skipped because agent-doc-wiring failed.");
  });
});
