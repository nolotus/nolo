import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 13) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets remaining scripts/verify pure coercions (external registration
 * read-failure status, task-thread loop verifier, legacy desktop download
 * alias + test, local desktop update e2e, chrome connector live site,
 * public image agents web, existing image-edit dialog). Leaves
 * stack||message variants, non-String fallbacks, and non-verify scripts
 * for later.
 */
const REWIRED_SOURCES = [
  "scripts/verify/verifyExternalRegistrationWithAgent.ts",
  "scripts/verify/taskThreadLoopVerifier.ts",
  "scripts/verify/desktop/verifyLegacyDesktopDownloadAlias.ts",
  "scripts/verify/desktop/verifyLegacyDesktopDownloadAlias.test.ts",
  "scripts/verify/desktop/localDesktopUpdateE2E.ts",
  "scripts/verify/desktop/verifyChromeConnectorLiveSite.ts",
  "scripts/verify/verifyPublicImageAgentsWeb.ts",
  "scripts/verify/verifyExistingImageEditDialog.ts",
] as const;

describe("toErrorMessage residual batch 13 consumers source contract", () => {
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
