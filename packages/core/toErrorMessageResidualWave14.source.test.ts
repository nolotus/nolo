import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (wave14) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets static-string fallback pure clones in desktop client utils,
 * browser credential broker stub, raw CDP x-reader backend, and Recharge
 * checkout error path. Leaves i18n `t()` fallbacks, stack||message
 * variants, and remaining non-priority pure clones for later.
 */
const REWIRED_SOURCES = [
  "packages/app/utils/desktopChromeConnectorClient.ts",
  "packages/app/utils/desktopAgentRuntimeTurnClient.ts",
  "packages/app/utils/desktopLocalConnectorClient.ts",
  "packages/agent-runtime/fileCredentialBroker.browser.stub.ts",
  "packages/integrations/x-reader/backends/rawCdp.ts",
  "packages/app/pages/Recharge.tsx",
] as const;

describe("toErrorMessage residual wave14 consumers source contract", () => {
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
