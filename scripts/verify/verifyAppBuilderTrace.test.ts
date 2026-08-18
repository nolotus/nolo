import { describe, expect, it } from "bun:test";
import {
  collectAppToolNames,
  evaluateAppBuilderTrace,
} from "./verifyAppBuilderTrace";

describe("verifyAppBuilderTrace", () => {
  it("accepts a complete lifecycle trace that uses precise replacement", () => {
    const toolNames = collectAppToolNames({
      msgs: [
        { toolName: "appList" },
        { toolName: "appRead" },
        { toolName: "appFileReplace" },
        { toolName: "appPreflight" },
        { toolName: "appDeploy" },
      ],
    });

    expect(evaluateAppBuilderTrace(toolNames, { mode: "small-edit" })).toMatchObject({
      ok: true,
      hasWorkspaceEdit: true,
      usedReplace: true,
    });
  });

  it("allows whole-file write only when precise replacement is not required", () => {
    const result = evaluateAppBuilderTrace([
      "appRead",
      "appFileWrite",
      "appPreflight",
      "appDeploy",
    ]);

    expect(result.ok).toBe(true);
    expect(result.usedWrite).toBe(true);
    expect(result.messages.join("\n")).toContain("used appFileWrite without appFileReplace");
  });

  it("fails when requireReplace is enabled but only write was used", () => {
    const result = evaluateAppBuilderTrace([
      "appRead",
      "appFileWrite",
      "appPreflight",
      "appDeploy",
    ], { mode: "small-edit" });

    expect(result.ok).toBe(false);
    expect(result.messages.join("\n")).toContain("missing appFileReplace");
  });

  it("fails when lifecycle gates are missing", () => {
    const result = evaluateAppBuilderTrace(["appRead", "appFileReplace"]);

    expect(result.ok).toBe(false);
    expect(result.missingTools).toEqual(["appPreflight", "appDeploy"]);
  });

  it("allows deploy-only traces in any-deploy mode", () => {
    const result = evaluateAppBuilderTrace([
      "appRead",
      "appPreflight",
      "appDeploy",
    ], { mode: "any-deploy" });

    expect(result.ok).toBe(true);
    expect(result.hasWorkspaceEdit).toBe(false);
  });
});
