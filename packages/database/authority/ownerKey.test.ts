import { describe, expect, it } from "bun:test";
import {
  parseOwnerUserIdFromDbKey,
  resolveCandidateOwnerFromKeyRemainder,
} from "./ownerKey";

describe("parseOwnerUserIdFromDbKey", () => {
  it("extracts owners from user-owned record keys", () => {
    expect(parseOwnerUserIdFromDbKey("agent-user1-01AGENT")).toBe("user1");
    expect(parseOwnerUserIdFromDbKey("dialog-user1-01DIALOG")).toBe("user1");
    expect(parseOwnerUserIdFromDbKey("page-user1-01PAGE")).toBe("user1");
    expect(parseOwnerUserIdFromDbKey("doc-user1-01PAGE")).toBe("user1");
    expect(parseOwnerUserIdFromDbKey("notification-user1-01NOTE")).toBe("user1");
    expect(parseOwnerUserIdFromDbKey("email-user1-01EMAIL")).toBe("user1");
    expect(parseOwnerUserIdFromDbKey("meta-user1-01KWSK4Q4TESXQ06SW39JN2TTJ")).toBe("user1");
    expect(parseOwnerUserIdFromDbKey("row-user1-table-1-row-1")).toBe("user1");
    expect(parseOwnerUserIdFromDbKey("view-user1-table-1-view-1")).toBe("user1");
    expect(parseOwnerUserIdFromDbKey("file-user1-01FILE")).toBe("user1");
    expect(parseOwnerUserIdFromDbKey("job-user1-01JOB")).toBe("user1");
  });

  it("uses candidate user IDs to disambiguate owners that contain hyphens", () => {
    expect(parseOwnerUserIdFromDbKey("file-user-1-01FILE", {
      candidateOwnerUserIds: ["user-1"],
    })).toBe("user-1");
    expect(parseOwnerUserIdFromDbKey("row-user-1-table-1-row-1", {
      candidateOwnerUserIds: ["user", "user-1"],
    })).toBe("user-1");
  });

  it("matches the longest candidate owner from a remaining key suffix", () => {
    expect(
      resolveCandidateOwnerFromKeyRemainder("user-1-space_default", [
        "user",
        "user-1",
      ])
    ).toBe("user-1");
  });

  it("does not treat public or content-addressed keys as user-owned authority keys", () => {
    expect(parseOwnerUserIdFromDbKey("agent-pub-01PUBLIC")).toBeNull();
    expect(parseOwnerUserIdFromDbKey("agent-pub-01PUBLIC")).toBeNull();
    expect(parseOwnerUserIdFromDbKey("share-token-1")).toBeNull();
    expect(parseOwnerUserIdFromDbKey("blob-sha256abcdef")).toBeNull();
    expect(parseOwnerUserIdFromDbKey("file-id-01FILE")).toBeNull();
  });

  it("does not treat dialogId as owner for dialog message keys", () => {
    // dialog-{dialogId}-msg-{messageId}: dialogId is not the owner.
    // Align with server writeAuthority.resolveKeyOwnerId.
    expect(
      parseOwnerUserIdFromDbKey("dialog-01KXXXXXXXXXXXXXXXXXXXXXXX-msg-01MYYYYYYYYYYYYYYYYYYYYYYY")
    ).toBeNull();
    expect(
      parseOwnerUserIdFromDbKey("dialog-01KXXXXXXXXXXXXXXXXXXXXXXX-msg-01MYYYYYYYYYYYYYYYYYYYYYYY", {
        candidateOwnerUserIds: ["01KXXXXXXXXXXXXXXXXXXXXXXX", "local", "user1"],
      })
    ).toBeNull();
    // Dialog record keys (not messages) still parse owner from second segment.
    expect(parseOwnerUserIdFromDbKey("dialog-local-01DIALOG")).toBe("local");
    expect(parseOwnerUserIdFromDbKey("dialog-user1-01DIALOG")).toBe("user1");
  });
});
