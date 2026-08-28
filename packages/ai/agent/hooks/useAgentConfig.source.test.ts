import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const useAgentConfigSource = readFileSync(
  join(import.meta.dir, "useAgentConfig.ts"),
  "utf-8"
);

describe("useAgentConfig source contract", () => {
  it("tracks dialog bootstrap and auth readiness before reading the agent record", () => {
    expect(useAgentConfigSource).toContain("if (!agentKey) {");
    expect(useAgentConfigSource).toContain("if (currentDialogKey && !currentDialogConfig) {");
    expect(useAgentConfigSource).toContain(
      "if (!currentToken && !isDeviceLocalDbKey(agentKey)) {"
    );
    expect(useAgentConfigSource).toContain("currentDialogConfig,");
    expect(useAgentConfigSource).toContain("currentDialogKey,");
    expect(useAgentConfigSource).toContain("currentToken,");
  });
});
