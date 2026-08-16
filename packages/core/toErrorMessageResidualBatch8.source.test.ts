import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 8) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Skips custom-fallback UI strings (useMessageInputFiles / fileProcessor),
 * payload-preferring AgentEmailE2EPage logs, embedded DAEMON_SCRIPT clones
 * in machineInstallAssets, and standalone stylized-scene (no core dep).
 */
const REWIRED_SOURCES = [
  "packages/database/server/routes/emailRepository.ts",
  "packages/server/handlers/googleDocumentOcrHandler.ts",
  "packages/server/handlers/geminiImagePreviewHandler.ts",
  "packages/ai/chat/fetchUtils.ts",
  "packages/ai/chat/fetchUtils.native.ts",
  "packages/ai/tools/readDocTool.ts",
] as const;

describe("toErrorMessage residual batch 8 consumers source contract", () => {
  it("routes pure error coercions through core/errorMessage", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/errorMessage"');
      expect(source).toContain("toErrorMessage(");
      expect(source).not.toMatch(/\w+\?\.message\s*\|\|\s*String\(\w+\)/);
      expect(source).not.toMatch(
        /\w+\.message\s*\|\|\s*String\(\w+\)/
      );
      expect(source).not.toMatch(
        /\(\w+\s+as\s+Error\)\.message\s*\|\|\s*String\(\w+\)/
      );
    }
  });
});
