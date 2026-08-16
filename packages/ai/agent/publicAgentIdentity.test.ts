import { describe, expect, it } from "bun:test";

import {
  getPublicAgentDbKey,
  getPublicAgentId,
  getPublicAgentIdentifiers,
  getPublicAgentPruneDbKey,
  matchesPublicAgentIdentifiers,
} from "./publicAgentIdentity";

describe("publicAgentIdentity", () => {
  it("reads the logical id from either bare id or public dbKey", () => {
    expect(getPublicAgentId({ id: "01ABC" })).toBe("01ABC");
    expect(getPublicAgentId({ dbKey: "agent-pub-01DEF" })).toBe("01DEF");
    expect(getPublicAgentId({ dbKey: "agent-pub-01GHI" })).toBe("01GHI");
  });

  it("resolves the public dbKey from explicit dbKey or type + id", () => {
    expect(getPublicAgentDbKey({ dbKey: "agent-pub-01ABC" })).toBe("agent-pub-01ABC");
    expect(getPublicAgentDbKey({ type: "agent", id: "01GHI" })).toBe("agent-pub-01GHI");
  });

  it("synthesizes agent-pub when type is agent or omitted", () => {
    expect(getPublicAgentDbKey({ id: "01NO-TYPE" })).toBe("agent-pub-01NO-TYPE");
    expect(getPublicAgentDbKey({ type: "assistant", id: "01BAD" } as any)).toBe(
      "agent-pub-01BAD"
    );
    expect(getPublicAgentPruneDbKey({ id: "01NO-TYPE" })).toBe("agent-pub-01NO-TYPE");
  });

  it("returns every stable identifier for matching across local, remote, and tombstones", () => {
    expect(
      getPublicAgentIdentifiers({
        type: "agent",
        id: "01ABC",
        dbKey: "agent-pub-01ABC",
      })
    ).toEqual(["agent-pub-01ABC", "01ABC"]);
  });

  it("matches excluded identifiers against either id or dbKey", () => {
    expect(
      matchesPublicAgentIdentifiers(
        { type: "agent", id: "01ABC", dbKey: "agent-pub-01ABC" },
        new Set(["agent-pub-01ABC"])
      )
    ).toBe(true);
    expect(
      matchesPublicAgentIdentifiers(
        { type: "agent", id: "01ABC", dbKey: "agent-pub-01ABC" },
        new Set(["01ABC"])
      )
    ).toBe(true);
  });

  it("prefers the dbKey when planning a prune remove call", () => {
    expect(
      getPublicAgentPruneDbKey({
        type: "agent",
        id: "01ABC",
        dbKey: "agent-pub-01ABC",
      })
    ).toBe("agent-pub-01ABC");
    expect(getPublicAgentPruneDbKey({ type: "agent", id: "01DEF" })).toBe(
      "agent-pub-01DEF"
    );
  });
});
