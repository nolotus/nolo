import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "createAgentTool.ts"), "utf8");

describe("createAgentTool source contract", () => {
    it("auto-attaches a hosted shell runtime policy for execShell agents", () => {
        expect(source).toContain("HOSTED_EXEC_RUNTIME_TOOL_POLICY");
        expect(source).toContain("runtimeTools: [\"execShell\"]");
        expect(source).toContain('workspace: { mode: "lease"');
        expect(source).toContain("normalizedTools.includes(\"execShell\")");
    });

    it("does not introduce Agent Spec as a creation layer", () => {
        expect(source).not.toMatch(/Agent\s*Spec/);
        expect(source).not.toContain("specPageKey");
        expect(source).not.toContain("agent_spec");
    });
});
