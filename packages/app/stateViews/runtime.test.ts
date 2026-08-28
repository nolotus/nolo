import { describe, expect, test } from "bun:test";
import {
  selectRuntimeCurrentServer,
  selectRuntimeRemoteServers,
  selectRuntimeSnapshot,
} from "./runtime";

const expectedLocalRuntimeOrigin =
  typeof window !== "undefined" &&
  typeof window.location?.origin === "string" &&
  /^https?:\/\//.test(window.location.origin)
    ? window.location.origin.replace(/\/+$/, "")
    : undefined;

describe("selectRuntimeSnapshot", () => {
  test("projects configured remote runtime fields in non-desktop environments", () => {
    const snapshot = selectRuntimeSnapshot({
      auth: {
        currentToken: "token-123",
        currentUser: { userId: "user-1" },
      },
      settings: {
        currentServer: "http://localhost",
        syncServers: ["https://nolo.chat", "https://us.nolo.chat"],
      },
    } as any);

    expect(snapshot).toEqual({
      currentToken: "token-123",
      currentUserId: "user-1",
      currentServer: "http://localhost",
      syncServers: ["https://nolo.chat", "https://us.nolo.chat"],
      localRuntimeOrigin: expectedLocalRuntimeOrigin,
    });
  });

  test("falls back to main server when runtime settings are missing", () => {
    const snapshot = selectRuntimeSnapshot({
      auth: {},
      settings: {
        syncServers: null,
      },
    } as any);

    expect(snapshot).toEqual({
      currentToken: undefined,
      currentUserId: undefined,
      currentServer: "https://nolo.chat",
      syncServers: [],
      localRuntimeOrigin: expectedLocalRuntimeOrigin,
    });
  });

  test("builds remote server lists with cluster expansion", () => {
    const state = {
      auth: {},
      settings: {
        currentServer: "https://nolo.chat",
        syncServers: [],
      },
    } as any;

    expect(selectRuntimeCurrentServer(state)).toBe("https://nolo.chat");
    expect(selectRuntimeRemoteServers(state)).toEqual(
      expectedLocalRuntimeOrigin
        ? ["https://nolo.chat", expectedLocalRuntimeOrigin, "https://us.nolo.chat"]
        : ["https://nolo.chat", "https://us.nolo.chat"]
    );
  });
});
