import { describe, expect, it } from "bun:test";
import type { Agent } from "app/types";
import {
  AGENT_NAV_PREVIEW_STATE_KEY,
  buildAgentNavLocationState,
  buildAgentNavPreview,
  resolveAgentNavPreview,
} from "./agentNavigationPreview";

const sampleAgent = {
  id: "agent-pub-01ABC",
  dbKey: "agent-pub-01ABC",
  name: "Demo Agent",
  introduction: "hello",
  provider: "openai",
  model: "gpt-5",
  userId: "user-1",
  useServerProxy: true,
  isPublic: true,
  updatedAt: "2026-01-01",
  createdAt: 1,
} as Agent;

describe("agentNavigationPreview", () => {
  it("builds a lightweight preview snapshot for card → page handoff", () => {
    const preview = buildAgentNavPreview(sampleAgent);
    expect(preview.dbKey).toBe("agent-pub-01ABC");
    expect(preview.name).toBe("Demo Agent");
    expect(preview.model).toBe("gpt-5");
  });

  it("wraps preview under the stable location.state key", () => {
    const state = buildAgentNavLocationState(sampleAgent);
    expect(state[AGENT_NAV_PREVIEW_STATE_KEY]?.name).toBe("Demo Agent");
  });

  it("resolves preview only when keys match the target agent", () => {
    const state = buildAgentNavLocationState(sampleAgent);
    expect(resolveAgentNavPreview(state, "agent-pub-01ABC")?.name).toBe(
      "Demo Agent"
    );
    expect(resolveAgentNavPreview(state, "agent-pub-other")).toBeUndefined();
    expect(resolveAgentNavPreview(null, "agent-pub-01ABC")).toBeUndefined();
  });
});
