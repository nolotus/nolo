import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "verifyWebHostedExecRuntime.ts"), "utf8");

describe("verifyWebHostedExecRuntime source contract", () => {
  it("creates a private execShell probe agent with hosted workspace policy", () => {
    expect(source).toContain('tools: ["execShell"]');
    expect(source).toContain('runtimeTools: ["execShell"]');
    expect(source).toContain('workspace: { mode: "lease" }');
    expect(source).toContain("isPublic: false");
  });

  it("reads the probe agent back and verifies the persisted hosted exec authorization", () => {
    expect(source).toContain("readAgentRecord");
    expect(source).toContain("verifyPersistedHostedExecPolicy");
    expect(source).toContain("persistedAgent.runtimeToolPolicy");
    expect(source).toContain("Expected persisted agent runtimeToolPolicy.runtimeTools to include execShell");
    expect(source).toContain("Expected persisted agent runtimeToolPolicy.workspace.mode=lease");
  });

  it("asserts the tool result and persisted lease both use web-hosted execution", () => {
    expect(source).toContain('workspaceLease?.source !== "web-hosted"');
    expect(source).toContain('toolContent?.source !== "web-hosted"');
    expect(source).toContain("runtimeCheckpoint?.runtimeBinding");
    expect(source).toContain("hosted runtime ok");
  });

  it("keeps the dialog as durable evidence while cleaning the temporary agent by default", () => {
    expect(source).toContain("--keep-agent");
    expect(source).toContain("deleteRecord(baseUrl, userId, authToken, agentKey)");
    expect(source).not.toContain("deleteRecord(baseUrl, userId, authToken, `dialog-");
  });

  it("can verify the AgentPage evidence loop without exposing raw shell output", () => {
    expect(source).toContain("--verify-agent-page");
    expect(source).toContain("captureAgentPageEvidence");
    expect(source).toContain("run.serverBase ?? baseUrl");
    expect(source).toContain("evidenceBaseUrl");
    expect(source).toContain("托管执行授权");
    expect(source).toContain("托管临时工作区");
    expect(source).toContain("execShell");
    expect(source).toContain("查看完整对话证据");
    expect(source).toContain("screenshotPath");
    expect(source).not.toContain("contentPreview: toolOutput");
  });
});
