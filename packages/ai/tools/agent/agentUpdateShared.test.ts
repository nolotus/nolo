import { describe, expect, it } from "bun:test";
import { extractAgentId } from "./agentUpdateShared";

describe("agentUpdateShared extractAgentId", () => {
  it("extracts ulid from standard private key", () => {
    expect(extractAgentId("agent-user-01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );
  });

  it("preserves hyphenated handles", () => {
    expect(extractAgentId("agent-user-kimi-code")).toBe("kimi-code");
    expect(extractAgentId("agent-0e95801d90-kimi-code")).toBe("kimi-code");
  });

  it("extracts from public key", () => {
    expect(extractAgentId("agent-pub-01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );
  });

  it("returns raw value for non-key strings", () => {
    expect(extractAgentId("01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );
  });
});
