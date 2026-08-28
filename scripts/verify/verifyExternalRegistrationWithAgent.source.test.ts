import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const scriptPath = join(import.meta.dir, "verifyExternalRegistrationWithAgent.ts");

function readSource() {
  expect(existsSync(scriptPath)).toBe(true);
  return readFileSync(scriptPath, "utf-8");
}

describe("verifyExternalRegistrationWithAgent source contract", () => {
  it("requires an explicit target signup URL and token-first workspace context", () => {
    const source = readSource();
    expect(source).toContain("--target-url");
    expect(source).toContain("resolveAgentWorkspaceContext");
    expect(source).toContain("target signup URL");
  });

  it("launches the existing alpha registration agent through the standard agent run flow", () => {
    const source = readSource();
    expect(source).toContain("alpha-agent-email-registration-test-agent-v1");
    expect(source).toContain("deterministicId");
    expect(source).toContain("buildAgentKeys");
    expect(source).toContain('background: true');
    expect(source).toContain("/api/agent/run");
  });

  it("uses staged workflow instructions and requires browser closeout", () => {
    const source = readSource();
    expect(source).toContain(
      "discover -> assess supportability -> prepare inbox -> register -> verify -> closeout"
    );
    expect(source).toContain(
      "During prepare inbox, keep reusing the same provisioned alias until its readinessStatus is ready before starting registration."
    );
    expect(source).toContain(
      "Do not treat missing verification mail as target-side evidence until the alias is already ingress-ready."
    );
    expect(source).toContain(
      "If verified is false for any reason, both failedStage and blockingReason are mandatory."
    );
    expect(source).toContain("browser_closeSession");
    expect(source).toContain("close any browser sessions you opened");
    // New probe-first guidance
    expect(source).toContain("browser_probePage");
    expect(source).toContain("During discover, probe the page before typing anything.");
    expect(source).toContain("probe");
  });

  it("reads the resulting dialog and validates the expected JSON contract", () => {
    const source = readSource();
    expect(source).toContain("buildServerCandidates");
    expect(source).toContain("tryHttpDialogCandidates");
    expect(source).toContain("lastAssistantMessage");
    expect(source).toContain("parseJsonObject");
    expect(source).not.toContain('if (parsedResult && status === "unknown")');
    expect(source).toContain("validateAgentResult");
    expect(source).toContain("expectedTargetUrl");
    expect(source).toContain("Agent returned targetUrl");

    for (const field of [
      "targetUrl",
      "resolvedSignupUrl",
      "emailAddress",
      "registrationId",
      "verified",
      "failedStage",
      "blockingReason",
    ]) {
      expect(source).toContain(field);
    }
  });

  it("selects the final assistant reply from newest-first dialog messages", () => {
    const source = readSource();
    expect(source).toMatch(
      /const newestFirstMsgs = Array\.isArray\(msgs\) \? msgs : \[];/
    );
    expect(source).toMatch(/newestFirstMsgs\.find\(/);
  });

  it("guards CLI execution so runtime helpers can be imported in tests", () => {
    const source = readSource();
    expect(source).toContain("if (import.meta.main)");
  });

  it("supports either an explicit target URL or the repo-native target pool", () => {
    const source = readSource();
    expect(source).toContain("resolveExternalRegistrationTargets");
    expect(source).toContain("explicitTargetUrl");
    expect(source).toContain("--target-url");
  });

  it("defines verifier-side failure classes for classification", () => {
    const source = readSource();
    expect(source).toContain("unsupported-captcha");
    expect(source).toContain("unsupported-oauth");
    expect(source).toContain("unsupported-phone");
    expect(source).toContain("unsupported-other");
    expect(source).toContain("likely-anti-bot");
    expect(source).toContain("mail-not-received");
  });

  it("exports classifyExternalRegistrationFailure for classifying agent failures", () => {
    const source = readSource();
    expect(source).toContain("export function classifyExternalRegistrationFailure");
    expect(source).toContain("blockingReason");
  });

  it("exports runTargetAttempts for multi-target rotation", () => {
    const source = readSource();
    expect(source).toContain("export async function runTargetAttempts");
    expect(source).toContain("targets");
    expect(source).toContain("classification");
  });

  it("updates usage text to advertise explicit target plus candidate-pool fallback mode", () => {
    const source = readSource();
    expect(source).toContain("--target-url");
    expect(source).toMatch(/target-url.*optional|optional.*target-url/i);
  });
});
