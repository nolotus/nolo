import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 19) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets remaining scripts pure coercions in probes/benchmarks
 * (memory story, quick-chat timing, playwright dialog/doc CRUD,
 * prompt pruning, agent token + local toolset benchmarks). Leaves
 * remaining scripts pure clones, stack||message variants, webview.js
 * clones, and non-String fallbacks for later.
 */
const REWIRED_SOURCES = [
  "scripts/probes/runMemoryStoryProbe.ts",
  "scripts/probes/playwrightQuickChatTimingProbe.ts",
  "scripts/probes/playwrightDialogCrudProbe.ts",
  "scripts/probes/playwrightDocCrudProbe.ts",
  "scripts/probes/promptPruningProbe.ts",
  "scripts/benchmarks/agentTokenBenchmark.ts",
  "scripts/benchmarks/localAgentToolsetBenchmark.ts",
] as const;

describe("toErrorMessage residual batch 19 consumers source contract", () => {
  it("routes pure error coercions through core/errorMessage", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/errorMessage"');
      expect(source).toContain("toErrorMessage(");
      expect(source).not.toMatch(
        /\w+\s+instanceof\s+Error\s*\?\s*\w+\.message\s*:\s*String\(\w+\)/,
      );
    }
  });
});
