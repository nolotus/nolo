import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SYSTEM_AGENT_CAPABILITIES,
  SYSTEM_AGENT_CAPABILITIES,
  SYSTEM_AGENT_CAPABILITY_IDS,
} from "./agentCapabilities";

describe("system agent capability registry", () => {
  test("has unique ids and tool names", () => {
    expect(new Set(SYSTEM_AGENT_CAPABILITY_IDS).size).toBe(
      SYSTEM_AGENT_CAPABILITY_IDS.length,
    );
    for (const capability of SYSTEM_AGENT_CAPABILITIES) {
      expect(capability.tools.length).toBeGreaterThan(0);
      expect(new Set(capability.tools).size).toBe(capability.tools.length);
    }
  });

  test("derives default settings from the registry", () => {
    expect(DEFAULT_SYSTEM_AGENT_CAPABILITIES).toEqual({
      "web-search": true,
      "web-scrape": true,
      "conversation-todo": true,
      "agent-orchestration": true,
    });
  });
});
