import { describe, expect, it } from "bun:test";
import { resolveRecordAuthority } from "./recordAuthority";

describe("resolveRecordAuthority", () => {
  it("prefers explicit authorityServer over serverOrigin provenance", () => {
    expect(
      resolveRecordAuthority({
        dbKey: "agent-user-1-01AGENT",
        record: {
          userId: "user-1",
          authorityServer: "https://self.example.com/",
          serverOrigin: "https://us.nolo.chat/",
        },
      })
    ).toEqual({
      ownerUserId: "user-1",
      authorityServer: "https://self.example.com",
      serverOrigin: "https://us.nolo.chat",
    });
  });

  it("uses current user's home server when the key belongs to the current user", () => {
    expect(
      resolveRecordAuthority({
        dbKey: "dialog-user-1-01DIALOG",
        currentUserId: "user-1",
        currentServer: "https://nolo.chat/",
      })
    ).toMatchObject({
      ownerUserId: "user-1",
      authorityServer: "https://nolo.chat",
    });
  });

  it("uses the owner authority registry before assuming the current server is home", () => {
    expect(
      resolveRecordAuthority({
        dbKey: "dialog-user-1-01DIALOG",
        currentUserId: "user-1",
        currentServer: "https://nolo.chat/",
        userAuthorityRegistry: {
          "user-1": "https://self.example.com/",
        },
      })
    ).toMatchObject({
      ownerUserId: "user-1",
      authorityServer: "https://self.example.com",
    });
  });

  it("falls back to serverOrigin as compatibility provenance only", () => {
    expect(
      resolveRecordAuthority({
        dbKey: "agent-user-1-01AGENT",
        record: { userId: "user-1", serverOrigin: "https://us.nolo.chat/" },
      })
    ).toEqual({
      ownerUserId: "user-1",
      authorityServer: "https://us.nolo.chat",
      serverOrigin: "https://us.nolo.chat",
    });
  });

  it("uses public record userId when the db key is a public projection", () => {
    expect(
      resolveRecordAuthority({
        dbKey: "agent-pub-01PUBLIC",
        record: {
          userId: "user-1",
          authorityServer: "https://self.example.com",
          serverOrigin: "https://us.nolo.chat",
        },
      })
    ).toMatchObject({
      ownerUserId: "user-1",
      authorityServer: "https://self.example.com",
      serverOrigin: "https://us.nolo.chat",
    });
  });
});
