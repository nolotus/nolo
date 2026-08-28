/**
 * Visibility suite lives at packages/ai/agent/agentSyncActionVisibility.test.ts
 * (platform-neutral). Re-export path still resolves the same pure function.
 */
import { describe, expect, it } from "bun:test";

import { resolveAgentSyncActionVisibility } from "./agentSyncActionVisibility";

describe("resolveAgentSyncActionVisibility (web re-export)", () => {
  it("re-exports the platform-neutral visibility authority", () => {
    expect(
      resolveAgentSyncActionVisibility({
        agentKey: "agent-local-01AGENTKEY",
        accountUserId: "userA",
        isLoggedIn: true,
        mappedToActiveAccount: false,
      })
    ).toEqual({ kind: "sync" });
  });
});
