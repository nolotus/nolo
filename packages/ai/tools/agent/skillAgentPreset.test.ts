import { describe, expect, it } from "bun:test";
import {
  buildCreateSkillAgentArgs,
  buildSkillAgentRecord,
} from "./skillAgentPreset";

describe("skillAgentPreset", () => {
  it("builds evaluator preset args", () => {
    const args = buildCreateSkillAgentArgs({
      mode: "evaluator",
      name: "My Skill Evaluator",
    });

    expect(args.name).toBe("My Skill Evaluator");
    expect(args.tools).toEqual(
      expect.arrayContaining(["doctorSkill", "evalSkill", "readDoc"])
    );
    expect(args.prompt).toContain("skill evaluator");
  });

  it("builds a persisted skill agent record", () => {
    const agent = buildSkillAgentRecord({
      userId: "user-demo",
      currentSpaceId: "space-demo",
      args: { mode: "creator" },
    });

    expect(agent.userId).toBe("user-demo");
    expect(agent.spaceId).toBe("space-demo");
    expect(agent.tools).toEqual(
      expect.arrayContaining(["createSkillDoc", "doctorSkill", "evalSkill"])
    );
    expect(agent.dbKey).toContain("agent-user-demo-");
  });
});
