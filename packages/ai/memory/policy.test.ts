import { describe, expect, test } from "bun:test";

import {
  buildMemorySubjectsForAgent,
  isPublicAgentKey,
  resolveAgentMemoryPolicy,
} from "./policy";

describe("agent memory policy", () => {
  test("private assistants may use user-global memory fallback", () => {
    const policy = resolveAgentMemoryPolicy({ agentKey: "agent-user1-private" });

    expect(policy).toEqual({
      includeUserSubject: true,
      ownerFallback: "always",
      allowDynamicGreetingMemory: true,
    });
    expect(
      buildMemorySubjectsForAgent({
        userId: "user1",
        spaceId: "space1",
        agentKey: "agent-user1-private",
        policy,
      }),
    ).toEqual([
      { subjectType: "agent", subjectId: "agent-user1-private" },
      { subjectType: "user", subjectId: "user1" },
      { subjectType: "space", subjectId: "space1" },
    ]);
  });

  test("public specialist agents keep user-agent and space memory but skip user-global fallback", () => {
    expect(isPublicAgentKey("agent-pub-01NIHAISHATCMMVP000001")).toBe(true);
    const policy = resolveAgentMemoryPolicy({
      agentKey: "agent-pub-01NIHAISHATCMMVP000001",
    });

    expect(policy).toEqual({
      includeUserSubject: false,
      ownerFallback: "onSubjectMiss",
      allowDynamicGreetingMemory: false,
    });
    expect(
      buildMemorySubjectsForAgent({
        userId: "user1",
        spaceId: "space1",
        agentKey: "agent-pub-01NIHAISHATCMMVP000001",
        policy,
      }),
    ).toEqual([
      { subjectType: "agent", subjectId: "agent-pub-01NIHAISHATCMMVP000001" },
      { subjectType: "space", subjectId: "space1" },
    ]);
  });
});
