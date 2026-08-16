import { describe, expect, it } from "bun:test";

import { resolveSendPermissionState } from "./sendPermissionResolver";

describe("resolveSendPermissionState", () => {
  it("keeps loading while the current dialog config is still resolving", () => {
    const result = resolveSendPermissionState({
      currentDialogKey: "dialog-user-1-abc",
      hasDialogConfig: false,
      agentKey: null,
      agentConfig: null,
      agentLoadState: "idle",
      currentUserId: "user-1",
      userBalance: 0,
      serverPrices: null,
    });

    expect(result.isLoading).toBe(true);
    expect(result.sendPermission.reason).toBeUndefined();
  });

  it("reports agent load failure separately from missing config", () => {
    const result = resolveSendPermissionState({
      currentDialogKey: "dialog-user-1-abc",
      hasDialogConfig: true,
      agentKey: "agent-1",
      agentConfig: null,
      agentLoadState: "error",
      currentUserId: "user-1",
      userBalance: 0,
      serverPrices: null,
    });

    expect(result.isLoading).toBe(false);
    expect(result.sendPermission).toEqual({
      allowed: false,
      reason: "AGENT_LOAD_FAILED",
    });
  });

  it("treats agent.userId === local as device owner when logged out", () => {
    const result = resolveSendPermissionState({
      currentDialogKey: "dialog-local-01DIALOG",
      hasDialogConfig: true,
      agentKey: "agent-local-01AGENT",
      agentConfig: {
        dbKey: "agent-local-01AGENT",
        userId: "local",
        apiSource: "custom",
        model: "gpt-local",
      } as any,
      agentLoadState: "ready",
      currentUserId: null,
      userBalance: 0,
      serverPrices: null,
    });

    expect(result.isLoading).toBe(false);
    expect(result.sendPermission.allowed).toBe(true);
    expect(result.sendPermission.pricing?.pricePerMessage).toBe(0);
  });

  it("allows logged-out local cli agents without balance", () => {
    const result = resolveSendPermissionState({
      currentDialogKey: "dialog-local-01DIALOG",
      hasDialogConfig: true,
      agentKey: "agent-local-01CLI",
      agentConfig: {
        dbKey: "agent-local-01CLI",
        userId: "local",
        apiSource: "cli",
        model: "copilot-cli",
      } as any,
      agentLoadState: "ready",
      currentUserId: null,
      userBalance: 0,
      serverPrices: null,
    });

    expect(result.sendPermission.allowed).toBe(true);
  });

  it("blocks send permission when agent config is missing, on every platform", () => {
    const result = resolveSendPermissionState({
      currentDialogKey: "dialog-cross-node",
      hasDialogConfig: true,
      agentKey: "agent-missing-123",
      agentConfig: null,
      agentLoadState: "ready",
      currentUserId: "user-1",
      userBalance: 0,
      serverPrices: null,
    });

    expect(result.sendPermission.allowed).toBe(false);
    expect(result.sendPermission.reason).toBe("NO_CONFIG");
  });
});
