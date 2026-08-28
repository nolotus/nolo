import { describe, expect, it } from "bun:test";
import {
  getAgentRecordKey,
  getAgentRecordIdentifiers,
  getAgentRecordTimestamp,
  isAgentRecordOwned,
} from "./agentRecordIdentity";

describe("getAgentRecordKey", () => {
  it("prefers dbKey", () => {
    expect(getAgentRecordKey({ dbKey: "agent-1", id: "i1" })).toBe("agent-1");
  });

  it("falls back to id when no dbKey", () => {
    expect(getAgentRecordKey({ id: "i1" })).toBe("i1");
  });

  it("normalizes public agent id", () => {
    // dbKey 形如 agent-pub-xxx，直接返回；无 dbKey 时 id 走 getPublicAgentId 规范化
    expect(getAgentRecordKey({ dbKey: "agent-pub-abc" })).toBe("agent-pub-abc");
    expect(getAgentRecordKey({ id: "agent-pub-abc" })).toBe("abc");
  });

  it("returns null for empty/non-object", () => {
    expect(getAgentRecordKey(null)).toBeNull();
    expect(getAgentRecordKey(undefined)).toBeNull();
    expect(getAgentRecordKey({})).toBeNull();
    expect(getAgentRecordKey({ dbKey: 123 })).toBeNull();
  });
});

describe("getAgentRecordIdentifiers", () => {
  it("collects all string identifier fields", () => {
    expect(
      getAgentRecordIdentifiers({
        dbKey: "db",
        id: "id1",
        agentKey: "ak",
        cybotKey: "ck",
        publicKey: "pk",
        privateKey: "priv",
      })
    ).toEqual(["db", "id1", "ak", "ck", "pk", "priv"]);
  });

  it("skips non-string and empty fields", () => {
    expect(
      getAgentRecordIdentifiers({
        dbKey: "db",
        id: "",
        agentKey: 0,
        publicKey: null,
        privateKey: "priv",
      })
    ).toEqual(["db", "priv"]);
  });

  it("returns empty array for non-object", () => {
    expect(getAgentRecordIdentifiers(null)).toEqual([]);
    expect(getAgentRecordIdentifiers(undefined)).toEqual([]);
  });
});

describe("getAgentRecordTimestamp", () => {
  it("returns number updatedAt directly", () => {
    expect(getAgentRecordTimestamp({ updatedAt: 12345 })).toBe(12345);
  });

  it("falls back to createdAt then created", () => {
    expect(getAgentRecordTimestamp({ createdAt: 99 })).toBe(99);
    expect(getAgentRecordTimestamp({ created: 7 })).toBe(7);
  });

  it("parses string timestamps", () => {
    const ts = "2026-07-31T00:00:00Z";
    expect(getAgentRecordTimestamp({ updatedAt: ts })).toBe(Date.parse(ts));
  });

  it("returns 0 for invalid/missing", () => {
    expect(getAgentRecordTimestamp({})).toBe(0);
    expect(getAgentRecordTimestamp({ updatedAt: "not-a-date" })).toBe(0);
    expect(getAgentRecordTimestamp(null)).toBe(0);
  });
});

describe("isAgentRecordOwned", () => {
  it("returns true when source is owned regardless of userId", () => {
    expect(isAgentRecordOwned({ userId: "other" }, "owned", "u1")).toBe(true);
    expect(isAgentRecordOwned(null, "owned", "u1")).toBe(true);
  });

  it("matches userId for public source", () => {
    expect(isAgentRecordOwned({ userId: "u1" }, "public", "u1")).toBe(true);
    expect(isAgentRecordOwned({ userId: "u2" }, "public", "u1")).toBe(false);
  });

  it("returns false for null record in public source", () => {
    expect(isAgentRecordOwned(null, "public", "u1")).toBe(false);
  });

  it("returns false when no currentUserId", () => {
    expect(isAgentRecordOwned({ userId: "u1" }, "public", null)).toBe(false);
    expect(isAgentRecordOwned({ userId: "u1" }, "public", undefined)).toBe(false);
  });
});