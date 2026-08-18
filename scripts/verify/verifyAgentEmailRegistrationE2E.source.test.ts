import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "verifyAgentEmailRegistrationE2E.ts"),
  "utf-8"
);

describe("verifyAgentEmailRegistrationE2E source contract", () => {
  it("reuses shared auth and owned-agent helpers instead of hand-rolled token lookup", () => {
    expect(source).toContain('resolveAgentWorkspaceContext');
    expect(source).toContain('listOwnedAgents');
    expect(source).toContain('runAgentEmailRegistrationE2E');
  });

  it("defaults to the alpha-test registration page namespace", () => {
    expect(source).toContain("/alpha-test/agent-email-registration-e2e");
    expect(source).not.toContain("/dev/agent-email-registration-e2e");
  });

  it("requires an explicit opt-in before running against localhost", () => {
    expect(source).toContain("--allow-local");
    expect(source).toContain("Real inbound email verification requires a public server origin");
  });
});
