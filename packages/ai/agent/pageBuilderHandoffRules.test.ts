import { describe, expect, it } from "bun:test";

import {
  PAGE_BUILDER_HANDOFF_INSTRUCTIONS,
  PAGE_BUILDER_AGENT_PUBLIC_KEY,
  PAGE_BUILDER_SCENARIOS,
} from "./pageBuilderHandoffRules";

describe("page builder handoff rules", () => {
  it("covers broad visual intent categories instead of only the first three demos", () => {
    expect(PAGE_BUILDER_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "information-display",
      "data-analysis",
      "process-guide",
      "decision-comparison",
      "plan-roadmap",
      "mixed-pitch",
    ]);
  });

  it("points orchestrators at the public page builder agent with explicit handoff boundaries", () => {
    expect(PAGE_BUILDER_AGENT_PUBLIC_KEY).toBe("agent-pub-01PAGEBUILDR00000000FT7R9G");
    expect(PAGE_BUILDER_HANDOFF_INSTRUCTIONS).toContain(PAGE_BUILDER_AGENT_PUBLIC_KEY);
    expect(PAGE_BUILDER_HANDOFF_INSTRUCTIONS).toContain("runStreamingAgent");
    expect(PAGE_BUILDER_HANDOFF_INSTRUCTIONS).toContain("明确要求");
    expect(PAGE_BUILDER_HANDOFF_INSTRUCTIONS).toContain("先询问用户");
    expect(PAGE_BUILDER_HANDOFF_INSTRUCTIONS).toContain("不要把普通问答");
  });
});
