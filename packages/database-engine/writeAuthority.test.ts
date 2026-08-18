import { describe, expect, it } from "bun:test";

import { resolveKeyOwnerId, resolveWriteAuthority, canWriteRecord } from "./writeAuthority";

describe("writeAuthority", () => {
  it("parses owners for user preference, settings, and space setting keys", () => {
    expect(resolveKeyOwnerId("user-pref-user1-space_default")).toBe("user1");
    expect(resolveKeyOwnerId("user1-settings")).toBe("user1");
    expect(resolveKeyOwnerId("space-setting-user1-space1")).toBe("user1");
    expect(resolveKeyOwnerId("email-user1-email1")).toBe("user1");
    expect(resolveKeyOwnerId("meta-user1-table1")).toBe("user1");
    expect(resolveKeyOwnerId("row-user1-table1-row1")).toBe("user1");
    expect(resolveKeyOwnerId("file-user1-file1")).toBe("user1");
    expect(resolveKeyOwnerId("agent-thread-user1-thread1")).toBe("user1");
    expect(resolveKeyOwnerId("agent-threadidx-user1-agent-agent-user1-a-status-running-thread1")).toBe("user1");
  });

  it("falls back to record ownership when the key shape has no direct owner segment", () => {
    expect(
      resolveWriteAuthority({
        dbKey: "space-space1",
        actionUserId: "user1",
        existingRecord: { ownerId: "user1" },
      }).isAllowed,
    ).toBe(true);
  });

  it("uses the actor and record owner candidates when parsing hyphenated user ids", () => {
    expect(
      resolveWriteAuthority({
        dbKey: "dialog-user-1-01DIALOG",
        actionUserId: "user-1",
        existingRecord: { userId: "user-1" },
      })
    ).toMatchObject({
      keyOwnerId: "user-1",
      recordOwnerId: "user-1",
      isAllowed: true,
    });
  });

  it("parses AgentThread store keys for hyphenated user ids", () => {
    expect(
      resolveWriteAuthority({
        dbKey: "agent-thread-user-1-thread-running-1",
        actionUserId: "user-1",
        existingRecord: { userId: "user-1" },
      })
    ).toMatchObject({
      keyOwnerId: "user-1",
      recordOwnerId: "user-1",
      isAllowed: true,
    });
    expect(
      resolveWriteAuthority({
        dbKey: "agent-threadidx-user-1-agent-agent-user-1-a-status-running-thread-running-1",
        actionUserId: "user-1",
        existingRecord: { userId: "user-1" },
      })
    ).toMatchObject({
      keyOwnerId: "user-1",
      recordOwnerId: "user-1",
      isAllowed: true,
    });
  });

  describe("system namespace admin write relief", () => {
    it("allows system admin to write agent-system- key (resolveWriteAuthority)", () => {
      const result = resolveWriteAuthority({
        dbKey: "agent-system-01NOLOAPPBLD000000019KCKT0",
        actionUserId: "0e95801d90",
      });
      expect(result.keyOwnerId).toBe("system");
      expect(result.isSystemAdminWriter).toBe(true);
      expect(result.isAllowed).toBe(true);
    });

    it("allows system admin to write agent-system- key (canWriteRecord, real entry)", () => {
      // canWriteRecord 是 write.ts 实际调用的入口
      const result = canWriteRecord({
        dbKey: "agent-system-01NOLOAPPBLD000000019KCKT0",
        actionUserId: "0e95801d90",
      });
      expect(result.isAllowed).toBe(true);
    });

    it("allows system admin to overwrite existing agent-system- record (with record)", () => {
      const result = canWriteRecord({
        dbKey: "agent-system-01NOLOAPPBLD000000019KCKT0",
        actionUserId: "0e95801d90",
        record: { userId: "system" },
      });
      expect(result.isAllowed).toBe(true);
    });

    it("rejects non-admin user writing agent-system- key", () => {
      const result = resolveWriteAuthority({
        dbKey: "agent-system-01NOLOAPPBLD000000019KCKT0",
        actionUserId: "random-user",
      });
      expect(result.keyOwnerId).toBe("system");
      expect(result.isSystemAdminWriter).toBe(false);
      expect(result.isAllowed).toBe(false);
    });

    it("admin relief limited to agent-system- prefix, not other system keys", () => {
      // meta-system- / doc-system- 等不应被 admin 放行（只放行 agent-system-）
      const metaResult = resolveWriteAuthority({
        dbKey: "meta-system-sometable",
        actionUserId: "0e95801d90",
      });
      expect(metaResult.keyOwnerId).toBe("system");
      expect(metaResult.isSystemAdminWriter).toBe(false);
      expect(metaResult.isAllowed).toBe(false);
    });

    it("admin cannot write other users' keys via admin relief", () => {
      const result = resolveWriteAuthority({
        dbKey: "agent-otheruser-01AGENTID",
        actionUserId: "0e95801d90",
      });
      expect(result.keyOwnerId).toBe("otheruser");
      expect(result.isSystemAdminWriter).toBe(false);
      expect(result.isAllowed).toBe(false);
    });

    it("agent-pub- keyOwner is null, admin relief not engaged", () => {
      const result = resolveWriteAuthority({
        dbKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        actionUserId: "0e95801d90",
      });
      expect(result.keyOwnerId).toBe(null);
      expect(result.isSystemAdminWriter).toBe(false);
    });
  });
});
