import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (fileName: string) =>
  readFileSync(join(import.meta.dir, fileName), "utf-8");

describe("dialog derived data source contract", () => {
  it("updates reference keys through dbSlice.patch", () => {
    const source = readSource("addReferenceKeysAction.ts");
    expect(source).toContain('import { selectById, patch } from "database/dbSlice";');
    expect(source).toContain("referenceKeys: updatedKeys");
    expect(source).toContain("patch({");
  });

  it("updates dialog summaries through dbSlice.patch", () => {
    const source = readSource("updateDialogSummaryAction.ts");
    const builtinSource = readSource("builtinDialogLlm.ts");
    expect(source).toContain('import { patch, selectById } from "database/dbSlice";');
    expect(source).toContain("summaryPending");
    expect(source).toContain("summarizedBeforeId");
    expect(source).toContain("BUILTIN_SUMMARY_LLM_CONFIG");
    expect(source).not.toContain("summaryAgentDbKey");
    expect(source).toContain("patch({");
    expect(builtinSource).toContain('model: "nemotron-3-5-lightning-30b"');
  });

  it("persists token records through dbSlice.write and patches dialog aggregates", () => {
    const source = readSource("updateTokensAction.ts");
    expect(source).toContain('import { patch, read, selectById, write } from "database/dbSlice";');
    expect(source).toContain("createTokenStatsKey");
    expect(source).toContain("write({");
    expect(source).toContain("patch({");
  });
});
