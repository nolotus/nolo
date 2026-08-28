import { describe, expect, it } from "bun:test";

import { resolveAgentCardDialogKey } from "./resolveAgentCardDialogKey";

describe("resolveAgentCardDialogKey", () => {
  it("prefers the persisted dbKey when present", () => {
    expect(
      resolveAgentCardDialogKey({
        dbKey: "agent-user-1-agent-1",
        id: "agent-1",
        userId: "user-1",
        type: "agent",
      })
    ).toBe("agent-user-1-agent-1");
  });

  it("rejects legacy cybot dbKeys and type", () => {
    expect(
      resolveAgentCardDialogKey({
        dbKey: "cybot-user-1-legacy-agent",
        id: "legacy-agent",
        userId: "user-1",
        type: "cybot",
      })
    ).toBe("");

    expect(
      resolveAgentCardDialogKey({
        id: "legacy-agent",
        userId: "user-1",
        type: "cybot",
      })
    ).toBe("");
  });

  it("reconstructs public keys for public agents when dbKey is absent", () => {
    expect(
      resolveAgentCardDialogKey({
        id: "public-agent",
        isPublic: true,
        userId: "user-1",
        type: "agent",
      })
    ).toBe("agent-pub-public-agent");
  });
});
