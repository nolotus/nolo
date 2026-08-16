import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "verifyMachineAgentRunE2E.ts"), "utf8");

describe("verifyMachineAgentRunE2E source contract", () => {
  it("performs a real bound-machine agent run instead of a local-only smoke", () => {
    expect(source).toContain("/api/machines");
    expect(source).toContain("/api/agent/run");
    expect(source).toContain("runtimeBinding");
    expect(source).toContain("machineId");
    expect(source).toContain("capabilities");
    expect(source).toContain("dialogId");
  });

  it("keeps cliProvider separate from the optional CLI model", () => {
    expect(source).toContain("cliProvider: provider");
    expect(source).not.toContain("model: provider");
  });

  it("supports Qoder as a bound-machine CLI provider", () => {
    expect(source).toContain('qoder: "qoder-cli"');
  });

  it("supports OpenCode as a bound-machine CLI provider", () => {
    expect(source).toContain('opencode: "opencode-cli"');
  });

  it("supports Grok as a bound-machine CLI provider", () => {
    expect(source).toContain('grok: "grok-cli"');
  });

  it("persists the binding owner so cross-user machine routing stays stable", () => {
    expect(source).toContain("ownerUserId: userId");
  });
});
