import { describe, expect, it } from "bun:test";

import { getRuntimeServerContext } from "./runtimeServerContext";

describe("runtimeServerContext", () => {
  it("builds remote servers from the runtime snapshot", () => {
    const state = {
      auth: {
        currentToken: "token-1",
        currentUser: {
          userId: "user-1",
        },
      },
      settings: {
        currentServer: "http://127.0.0.1:38123",
        syncServers: ["http://127.0.0.1:38124"],
      },
    } as any;

    expect(getRuntimeServerContext(state)).toEqual({
      currentToken: "token-1",
      currentUserId: "local",
      currentServer: "http://127.0.0.1:38123",
      syncServers: ["http://127.0.0.1:38124"],
      userAuthorityRegistry: undefined,
      remoteServers: [
        "http://127.0.0.1:38123",
        "http://127.0.0.1:38124",
        "https://nolo.chat",
        "https://us.nolo.chat",
      ],
    });
  });

  it("puts preferred server first without duplicating it", () => {
    const state = {
      auth: {
        currentToken: "token-1",
        currentUser: {
          userId: "user-1",
        },
      },
      settings: {
        currentServer: "https://nolo.chat",
        syncServers: ["https://us.nolo.chat"],
      },
    } as any;

    expect(
      getRuntimeServerContext(state, "https://us.nolo.chat").remoteServers
    ).toEqual(["https://us.nolo.chat", "https://nolo.chat"]);
  });

  it("exposes user authority registry metadata without adding it to server lists", () => {
    const state = {
      auth: {
        currentToken: "token-1",
        currentUser: {
          userId: "user1",
        },
      },
      settings: {
        currentServer: "https://nolo.chat",
        syncServers: ["https://us.nolo.chat"],
        userAuthorityRegistry: {
          user1: "https://self.example.com",
        },
      },
    } as any;

    const context = getRuntimeServerContext(state);

    expect(context.userAuthorityRegistry).toEqual({
      user1: "https://self.example.com",
    });
    expect(context.remoteServers).toEqual([
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });
});
