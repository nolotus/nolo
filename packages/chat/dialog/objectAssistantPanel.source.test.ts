import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "ObjectAssistantPanel.tsx"), "utf-8");

describe("object assistant panel source contract", () => {
  it("waits for builtin assistants to be prepared before exposing preferred keys", () => {
    expect(source).toContain(
      'kind === "app" ? getPreferredObjectAssistantKey(kind, currentUser?.userId) : []'
    );
    expect(source).toContain("dispatch(readAndWait(agent.dbKey))");
    expect(source).toContain("isPreparingPreferredAgent && preferredAgentKeys.length === 0");
  });
});
