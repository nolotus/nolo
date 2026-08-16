import { describe, expect, test } from "bun:test";

import {
  canReadRecordViaPublicAgentGrant,
  hasExplicitAgentReferenceGrant,
} from "./agentReferenceGrants";

const storeWithAgent = (agent: any = { isPublic: true }) => ({
  get: async (key: string) => {
    if (key === "agent-pub-01COURSE") return agent;
    throw Object.assign(new Error("not found"), { code: "LEVEL_NOT_FOUND" });
  },
});

describe("agent reference grants", () => {
  test("recognizes explicit agent grant shapes", () => {
    expect(
      hasExplicitAgentReferenceGrant(
        { grantedAgentKeys: ["agent-pub-01COURSE"] },
        "agent-pub-01COURSE",
      ),
    ).toBe(true);
    expect(
      hasExplicitAgentReferenceGrant(
        { agentGrants: { "agent-pub-01COURSE": { read: true } } },
        "agent-pub-01COURSE",
      ),
    ).toBe(true);
    expect(
      hasExplicitAgentReferenceGrant(
        { referenceGrants: { agents: { "agent-pub-01COURSE": true } } },
        "agent-pub-01COURSE",
      ),
    ).toBe(true);
  });

  test("allows a public agent with an explicit page grant", async () => {
    await expect(
      canReadRecordViaPublicAgentGrant({
        store: storeWithAgent(),
        dbKey: "page-owner-doc",
        record: {
          type: "page",
          grantedAgentKeys: ["agent-pub-01COURSE"],
        },
        agentKey: "agent-pub-01COURSE",
      }),
    ).resolves.toEqual({ allowed: true, reason: "explicit_agent_grant" });
  });

  test("denies missing grants and non-public agents", async () => {
    await expect(
      canReadRecordViaPublicAgentGrant({
        store: storeWithAgent(),
        dbKey: "page-owner-doc",
        record: { type: "page" },
        agentKey: "agent-pub-01COURSE",
      }),
    ).resolves.toEqual({ allowed: false, reason: "denied" });

    await expect(
      canReadRecordViaPublicAgentGrant({
        store: storeWithAgent({ isPublic: false }),
        dbKey: "page-owner-doc",
        record: {
          type: "page",
          grantedAgentKeys: ["agent-pub-01COURSE"],
        },
        agentKey: "agent-pub-01COURSE",
      }),
    ).resolves.toEqual({ allowed: false, reason: "non_public_agent" });
  });
});
