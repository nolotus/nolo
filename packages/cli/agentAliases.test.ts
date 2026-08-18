import { describe, expect, test } from "bun:test";

import {
  LOCAL_CODEX_AGENT_KEY,
  NOLO_FRONTEND_AGENT_KEY,
  NOLO_PROJECT_MANAGER_AGENT_KEY,
  resolveCliAgentKeyInput,
} from "./agentAliases";

describe("agent aliases", () => {
  test("keeps named product agents as data-backed handles", () => {
    expect(resolveCliAgentKeyInput("custom-agent")).toBe("custom-agent");
    expect(resolveCliAgentKeyInput("frontend-implementer")).toBe(NOLO_FRONTEND_AGENT_KEY);
    expect(resolveCliAgentKeyInput("project-manager")).toBe(NOLO_PROJECT_MANAGER_AGENT_KEY);
    expect(resolveCliAgentKeyInput("pm")).toBe(NOLO_PROJECT_MANAGER_AGENT_KEY);
  });

  test("keeps only local built-in CLI aliases in code", () => {
    expect(resolveCliAgentKeyInput("local-codex")).toBe(LOCAL_CODEX_AGENT_KEY);
  });
});
