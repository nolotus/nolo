import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (wave15) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets static-string fallback pure clones in desktop/server handlers,
 * API route adapter, and artifact runtime page. Leaves i18n `t()`
 * fallbacks, agent inbox/settings static clones beyond the file cap,
 * and remaining non-priority pure clones for later.
 */
const REWIRED_SOURCES = [
  "packages/server/handlers/desktopLlamaRuntimeHandler.ts",
  "packages/server/handlers/chatgptWebImageHandler.ts",
  "packages/server/handlers/tableToolHandlers.ts",
  "packages/server/handlers/desktopPickFolderHandler.ts",
  "packages/server/handlers/openaiImageHandler.ts",
  "packages/server/handlers/desktopUpdaterHandler.ts",
  "packages/server/handlers/desktopClipboardHandler.ts",
  "packages/server/handlers/desktopAgentRuntimeStatusHandler.ts",
  "packages/server/apiRouteAdapter.ts",
  "packages/render/web/elements/ArtifactRuntimePage.tsx",
] as const;

describe("toErrorMessage residual wave15 consumers source contract", () => {
  it("routes pure error coercions through core/errorMessage", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/errorMessage"');
      expect(source).toContain("toErrorMessage(");
      expect(source).not.toMatch(
        /\w+\s+instanceof\s+Error\s*\?\s*\w+\.message\s*:\s*["']/,
      );
    }
  });
});
