import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "verifyAgentRunAdmission.ts"), "utf8");
const packageJson = JSON.parse(readFileSync(join(import.meta.dir, "../../package.json"), "utf8"));

describe("verifyAgentRunAdmission source contract", () => {
  it("is exposed as a package verify script", () => {
    expect(packageJson.scripts["verify:agent-run-admission"]).toBe(
      "bun ./scripts/verify/verifyAgentRunAdmission.ts",
    );
  });

  it("verifies real /api/agent/run admission through AgentThreadIndex", () => {
    expect(source).toContain("buildAgentThreadByAgentStatusIndexKey");
    expect(source).toContain("buildAgentThreadKey");
    expect(source).toContain("/api/agent/run");
    expect(source).toContain('admission: { maxConcurrent: 1 }');
    expect(source).toContain('apiSource: "custom"');
    expect(source).toContain('customProviderUrl: "https://example.invalid/v1"');
    expect(source).toContain("postAgentRun");
    expect(source).toContain("first.response.status !== 202");
    expect(source).toContain("response.status !== 429");
    expect(source).toContain('"max_concurrent_reached"');
  });

  it("cleans up probe records instead of leaving durable test state behind", () => {
    expect(source).toContain("deleteRecord");
    expect(source).toContain("finally");
    expect(source).toContain("writtenKeys.reverse()");
  });
});
