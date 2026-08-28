import { describe, expect, it, mock } from "bun:test";
import { localFirstLog } from "./localFirstLog";

describe("localFirstLog", () => {
  it("emits a structured console.info line without throwing", () => {
    const lines: unknown[][] = [];
    const original = console.info;
    console.info = mock((...args: unknown[]) => {
      lines.push(args);
    });
    try {
      localFirstLog("agent.create.done", {
        owner: "local",
        key: "agent-local-01",
        hasCredentialRef: true,
      });
      expect(lines.length).toBe(1);
      expect(String(lines[0][0])).toContain("[localFirst]");
      expect(String(lines[0][1])).toBe("agent.create.done");
      expect(String(lines[0][2])).toContain("agent-local-01");
      expect(String(lines[0][2])).not.toContain("sk-");
    } finally {
      console.info = original;
    }
  });
});
