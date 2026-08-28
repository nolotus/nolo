import { describe, expect, it } from "bun:test";

import { resolveAgentSyncActionVisibility } from "./agentSyncActionVisibility";

describe("resolveAgentSyncActionVisibility", () => {
  const localAgent = "agent-local-01AGENTKEY";
  const accountAgent = "agent-userA-01ACCOUNTAGENT";

  it("hides the action when logged out", () => {
    expect(
      resolveAgentSyncActionVisibility({
        agentKey: localAgent,
        accountUserId: null,
        isLoggedIn: false,
        mappedToActiveAccount: false,
      })
    ).toEqual({ kind: "hidden" });
  });

  it("hides the action for the device-local sentinel account", () => {
    expect(
      resolveAgentSyncActionVisibility({
        agentKey: localAgent,
        accountUserId: "local",
        isLoggedIn: true,
        mappedToActiveAccount: false,
      })
    ).toEqual({ kind: "hidden" });
  });

  it("hides the action for account-owned Agents", () => {
    expect(
      resolveAgentSyncActionVisibility({
        agentKey: accountAgent,
        accountUserId: "userA",
        isLoggedIn: true,
        mappedToActiveAccount: false,
      })
    ).toEqual({ kind: "hidden" });
  });

  it("offers sync for device-local Agents when a non-local account is active", () => {
    expect(
      resolveAgentSyncActionVisibility({
        agentKey: localAgent,
        accountUserId: "userA",
        isLoggedIn: true,
        mappedToActiveAccount: false,
      })
    ).toEqual({ kind: "sync" });
  });

  it("shows synced status when already mapped to the active account", () => {
    expect(
      resolveAgentSyncActionVisibility({
        agentKey: localAgent,
        accountUserId: "userA",
        isLoggedIn: true,
        mappedToActiveAccount: true,
      })
    ).toEqual({ kind: "synced" });
  });

  it("offers sync for account B independently of a mapping for account A", () => {
    // mappedToActiveAccount is for the *current* account only (caller supplies it).
    expect(
      resolveAgentSyncActionVisibility({
        agentKey: localAgent,
        accountUserId: "userB",
        isLoggedIn: true,
        mappedToActiveAccount: false,
      })
    ).toEqual({ kind: "sync" });
  });
});
