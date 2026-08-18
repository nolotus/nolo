import { describe, expect, it } from "bun:test";
import { getMemorySourceKind } from "./source";
import type { MemoryItem } from "./types";

const baseItem = (overrides: Partial<MemoryItem>): MemoryItem => ({
  id: "m1",
  ownerType: "user",
  ownerId: "user1",
  visibility: "private",
  subjectType: "user",
  subjectId: "user1",
  kind: "episodic",
  content: "记忆内容",
  createdAt: "2026-06-06T00:00:00.000Z",
  lastActivatedAt: "2026-06-06T00:00:00.000Z",
  activationCount: 0,
  importance: 0.9,
  confidence: 0.9,
  ...overrides,
});

describe("memory source kind", () => {
  it("classifies explicit user directives", () => {
    expect(
      getMemorySourceKind(baseItem({ patternKey: "explicit-remember" }))
    ).toBe("explicit-user-directive");
  });

  it("classifies agent tool memories", () => {
    expect(
      getMemorySourceKind(baseItem({ patternKey: "agent-remember" }))
    ).toBe("agent-tool");
    expect(
      getMemorySourceKind(baseItem({ patternKey: "procedural-runbook" }))
    ).toBe("agent-tool");
  });

  it("classifies inferred understanding memories", () => {
    expect(
      getMemorySourceKind(
        baseItem({
          tags: ["understanding-memory"],
          subjectType: "agent",
        })
      )
    ).toBe("inferred-understanding");
  });

  it("defaults to agent-tool for unknown patterns", () => {
    expect(getMemorySourceKind(baseItem({}))).toBe("agent-tool");
  });

  it("uses explicit sourceKind when provided", () => {
    expect(
      getMemorySourceKind(
        baseItem({
          sourceKind: "explicit-user-directive",
          patternKey: "agent-remember",
        })
      )
    ).toBe("explicit-user-directive");
  });
});
