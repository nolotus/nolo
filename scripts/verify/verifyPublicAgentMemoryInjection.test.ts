import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

import {
  buildMemorySubjectsForAgent,
  resolveAgentMemoryPolicy,
} from "../../packages/ai/memory/policy";
import { shouldUseRecentRelationshipRecap } from "../../packages/ai/memory/recentRelationshipRecap";

describe("public agent memory injection guard", () => {
  test("public specialist agents do not use dynamic greeting memory", () => {
    expect(
      shouldUseRecentRelationshipRecap({
        userId: "user-1",
        agentKey: "agent-pub-01NIHAISHATCMMVP000001",
        agentsCount: 1,
        triggerType: "user",
      }),
    ).toBe(false);
  });

  test("public specialist agents can use user-agent memory without user-global fallback", () => {
    const policy = resolveAgentMemoryPolicy({
      agentKey: "agent-pub-01NIHAISHATCMMVP000001",
    });

    expect(policy.ownerFallback).toBe("onSubjectMiss");
    expect(policy.includeUserSubject).toBe(false);
    expect(
      buildMemorySubjectsForAgent({
        userId: "user-1",
        spaceId: "space-1",
        agentKey: "agent-pub-01NIHAISHATCMMVP000001",
        policy,
      }),
    ).toEqual([
      { subjectType: "agent", subjectId: "agent-pub-01NIHAISHATCMMVP000001" },
      { subjectType: "space", subjectId: "space-1" },
    ]);
  });

  test("dialog greeting path is guarded by the public-agent memory policy", () => {
    const source = readFileSync(
      "./packages/chat/dialog/actions/createDialogAction.ts",
      "utf8",
    );
    const recapSource = readFileSync(
      "./packages/ai/memory/recentRelationshipRecap.ts",
      "utf8",
    );

    expect(source).toContain("shouldUseRecentRelationshipRecap");
    expect(recapSource).toContain("resolveAgentMemoryPolicy");
    expect(recapSource).toContain("allowDynamicGreetingMemory");
  });
});
