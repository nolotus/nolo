import { describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { createAgentGrantKey } from "database/keys";
import {
  isAgentGrantActive,
  listAgentGrants,
  readActiveAgentGrant,
  revokeAgentGrant,
  upsertAgentGrant,
  type AgentGrantRecord,
} from "./agentGrant";

describe("isAgentGrantActive", () => {
  const validRecord: AgentGrantRecord = {
    type: "agent-grant",
    ownerUserId: "owner-1",
    agentId: "agent-1",
    agentKey: "agent-owner-1-agent-1",
    granteeUserId: "grantee-1",
    createdAt: 1000,
  };

  it("returns true for a valid active grant", () => {
    expect(isAgentGrantActive(validRecord)).toBe(true);
  });

  it("returns false for a revoked grant", () => {
    expect(isAgentGrantActive({ ...validRecord, revokedAt: 1001 })).toBe(false);
  });
});

describe("upsert/list/revoke AgentGrant", () => {
  it("creates, lists, revokes, and re-activates a grant", async () => {
    const db = new MemoryDB();
    const created = await upsertAgentGrant(db, {
      ownerUserId: "user-A",
      agentId: "agent-1",
      agentKey: "agent-user-A-agent-1",
      granteeUserId: "user-B",
      now: 1000,
    });
    expect(created.createdAt).toBe(1000);
    expect(await readActiveAgentGrant(db, {
      ownerUserId: "user-A",
      agentId: "agent-1",
      granteeUserId: "user-B",
    })).toEqual(created);

    const listed = await listAgentGrants(db, {
      ownerUserId: "user-A",
      agentId: "agent-1",
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.granteeUserId).toBe("user-B");

    const revoked = await revokeAgentGrant(db, {
      ownerUserId: "user-A",
      agentId: "agent-1",
      granteeUserId: "user-B",
      now: 2000,
    });
    expect(revoked?.revokedAt).toBe(2000);
    expect(
      await readActiveAgentGrant(db, {
        ownerUserId: "user-A",
        agentId: "agent-1",
        granteeUserId: "user-B",
      }),
    ).toBeNull();

    const reactivated = await upsertAgentGrant(db, {
      ownerUserId: "user-A",
      agentId: "agent-1",
      agentKey: "agent-user-A-agent-1",
      granteeUserId: "user-B",
      now: 3000,
    });
    expect(reactivated.createdAt).toBe(1000);
    expect(reactivated.revokedAt).toBeUndefined();
    expect(
      createAgentGrantKey.single("user-A", "agent-1", "user-B"),
    ).toContain("grant-agent-user-A-agent-1-user-B");
  });

  it("rejects granting to the owner", async () => {
    const db = new MemoryDB();
    await expect(
      upsertAgentGrant(db, {
        ownerUserId: "user-A",
        agentId: "agent-1",
        agentKey: "agent-user-A-agent-1",
        granteeUserId: "user-A",
      }),
    ).rejects.toThrow(/owner/i);
  });
});
