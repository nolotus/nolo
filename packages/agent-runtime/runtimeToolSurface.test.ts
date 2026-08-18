import { describe, expect, test } from "bun:test";
import { isSystemBuiltinTrustedAgentKey } from "core/builtinAgents";
import {
  DEFAULT_PRIVATE_NOLO_WORKSPACE_TOOLS,
  redactAgentRecordForWorkspaceTool,
  resolveRuntimeToolSurfaceForAgent,
  resolveRuntimeToolSurface,
} from "./runtimeToolSurface";

describe("resolveRuntimeToolSurface", () => {
  test("injects read-only workspace defaults for private owner runs", () => {
    const result = resolveRuntimeToolSurface({
      explicitToolNames: ["searchDialogMessages", "readFile"],
      currentUserId: "u1",
      agentOwnerId: "u1",
      invocationVisibility: "private",
      runtimeHost: "web",
    });

    expect(result.finalToolNames).toContain("searchDialogMessages");
    expect(result.finalToolNames).toContain("readFile");
    expect(result.finalToolNames).toContain("listDialogs");
    expect(result.finalToolNames).toContain("readDialog");
    expect(result.finalToolNames).toContain("queryDialogsBySubjectRef");
    expect(result.injectedToolNames).toEqual([...DEFAULT_PRIVATE_NOLO_WORKSPACE_TOOLS]);
    expect(result.auditReason).toBe("private-authenticated-defaults");
  });

  test("does not inject write or shell tools by default", () => {
    const result = resolveRuntimeToolSurface({
      explicitToolNames: [],
      currentUserId: "u1",
      agentOwnerId: "u1",
      invocationVisibility: "private",
      runtimeHost: "cli",
    });

    expect(result.finalToolNames).not.toContain("execShell");
    expect(result.finalToolNames).not.toContain("writeFile");
    expect(result.finalToolNames).not.toContain("applyEdit");
  });

  test("keeps public external runs explicit-only", () => {
    const result = resolveRuntimeToolSurface({
      explicitToolNames: ["fetchWebpage"],
      currentUserId: "u2",
      agentOwnerId: "u1",
      invocationVisibility: "public",
      runtimeHost: "web",
    });

    expect(result.finalToolNames).toEqual(["fetchWebpage"]);
    expect(result.injectedToolNames).toEqual([]);
    expect(result.auditReason).toBe("explicit-only-public");
  });

  test("defaults to explicit-only when identity is missing", () => {
    const result = resolveRuntimeToolSurface({
      explicitToolNames: ["queryTableRows"],
      currentUserId: null,
      agentOwnerId: "u1",
      invocationVisibility: "private",
      runtimeHost: "web",
    });

    expect(result.finalToolNames).toEqual(["queryTableRows"]);
    expect(result.injectedToolNames).toEqual([]);
    expect(result.auditReason).toBe("explicit-only-missing-identity");
  });

  test("dedupes explicit and injected tools while preserving explicit order first", () => {
    const result = resolveRuntimeToolSurface({
      explicitToolNames: ["readDialog", "fetchWebpage", "readDialog"],
      currentUserId: "u1",
      agentOwnerId: "u1",
      invocationVisibility: "private",
      runtimeHost: "desktop",
    });

    expect(result.finalToolNames.slice(0, 2)).toEqual([
      "readDialog",
      "fetchWebpage",
    ]);
    expect(
      result.finalToolNames.filter((name) => name === "readDialog")
    ).toHaveLength(1);
  });

  test("keeps shared authenticated runs explicit-only in phase one", () => {
    const result = resolveRuntimeToolSurface({
      explicitToolNames: ["readSpace"],
      currentUserId: "u2",
      agentOwnerId: "u1",
      invocationVisibility: "shared",
      runtimeHost: "web",
    });

    expect(result.finalToolNames).toEqual(["readSpace"]);
    expect(result.injectedToolNames).toEqual([]);
    expect(result.auditReason).toBe("explicit-only-shared");
  });

  test("keeps owner-mismatched private runs explicit-only by default", () => {
    const result = resolveRuntimeToolSurface({
      explicitToolNames: ["searchDialogMessages"],
      currentUserId: "human-user",
      agentOwnerId: "platform-demo",
      invocationVisibility: "private",
      runtimeHost: "web",
    });

    expect(result.finalToolNames).toEqual(["searchDialogMessages"]);
    expect(result.injectedToolNames).toEqual([]);
    expect(result.auditReason).toBe("explicit-only-owner-mismatch");
  });

  test("injects defaults for authenticated trusted private platform runs", () => {
    const result = resolveRuntimeToolSurface({
      explicitToolNames: ["searchDialogMessages"],
      currentUserId: "human-user",
      agentOwnerId: "platform-demo",
      invocationVisibility: "private",
      runtimeHost: "web",
      trustedPrivateInvocation: true,
    });

    expect(result.finalToolNames).toContain("searchDialogMessages");
    expect(result.finalToolNames).toContain("listDialogs");
    expect(result.finalToolNames).toContain("readDialog");
    expect(result.auditReason).toBe("private-authenticated-defaults");
  });

  test("classifies public agent refs as explicit-only", () => {
    for (const agentKey of ["agent-pub-abc", "agent-pub-abc"]) {
      const result = resolveRuntimeToolSurfaceForAgent({
        agentKey,
        explicitToolNames: ["fetchWebpage"],
        currentUserId: "u2",
        agentOwnerId: "u1",
        runtimeHost: "cli",
      });

      expect(result.finalToolNames).toEqual(["fetchWebpage"]);
      expect(result.auditReason).toBe("explicit-only-public");
    }
  });

  test("infers owner from private agent keys before injecting defaults", () => {
    const result = resolveRuntimeToolSurfaceForAgent({
      agentKey: "agent-u1-helper",
      explicitToolNames: [],
      currentUserId: "u1",
      runtimeHost: "web",
    });

    expect(result.finalToolNames).toContain("listDialogs");
    expect(result.auditReason).toBe("private-authenticated-defaults");
  });

  test("infers dashed local user ids from private agent keys", () => {
    const result = resolveRuntimeToolSurfaceForAgent({
      agentKey: "agent-user-1-frontend",
      explicitToolNames: ["execShell"],
      currentUserId: "user-1",
      runtimeHost: "cli",
    });

    expect(result.finalToolNames).toContain("execShell");
    expect(result.finalToolNames).toContain("listDialogs");
    expect(result.auditReason).toBe("private-authenticated-defaults");
  });

  test("allows trusted built-in private invocation to override public key shape", () => {
    const result = resolveRuntimeToolSurfaceForAgent({
      agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      explicitToolNames: ["fetchWebpage"],
      currentUserId: "user-1",
      runtimeHost: "cli",
      trustedPrivateInvocation: true,
    });

    expect(result.finalToolNames).toContain("fetchWebpage");
    expect(result.finalToolNames).toContain("readDialog");
    expect(result.auditReason).toBe("private-authenticated-defaults");
  });

  test("grants system builtin platform agents (flash/pro) read-only workspace tools", () => {
    for (const agentKey of [
      "agent-pub-01DSV4FLASHPB00000000JFPFD",
      "agent-pub-01DSV4PRONPB00000001VIR3EK",
    ]) {
      const result = resolveRuntimeToolSurfaceForAgent({
        agentKey,
        explicitToolNames: [],
        currentUserId: "user-1",
        runtimeHost: "cli",
        trustedPrivateInvocation: isSystemBuiltinTrustedAgentKey(agentKey),
      });

      expect(result.finalToolNames).toContain("listDialogs");
      expect(result.finalToolNames).toContain("readAgent");
      expect(result.finalToolNames).not.toContain("execShell");
      expect(result.injectedToolNames).toEqual([
        ...DEFAULT_PRIVATE_NOLO_WORKSPACE_TOOLS,
      ]);
      expect(result.auditReason).toBe("private-authenticated-defaults");
    }
  });

  test("keeps system builtin platform agents explicit-only without trusted flag", () => {
    const result = resolveRuntimeToolSurfaceForAgent({
      agentKey: "agent-pub-01DSV4PRONPB00000001VIR3EK",
      explicitToolNames: [],
      currentUserId: "user-1",
      runtimeHost: "web",
    });

    expect(result.finalToolNames).toEqual([]);
    expect(result.injectedToolNames).toEqual([]);
    expect(result.auditReason).toMatch(/^explicit-only-/);
  });

  test("redacts secret-bearing agent fields before exposing readAgent output", () => {
    expect(redactAgentRecordForWorkspaceTool({
      name: "Agent",
      apiKey: "sk-secret",
      apiKeyFromAgentKey: "agent-secret",
      nested: { authToken: "token", customProviderUrl: "https://example.com" },
    })).toEqual({
      name: "Agent",
      apiKey: "[redacted]",
      apiKeyFromAgentKey: "[redacted]",
      nested: { authToken: "[redacted]", customProviderUrl: "https://example.com" },
    });
  });
});
