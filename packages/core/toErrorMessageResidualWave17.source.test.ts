import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (wave17) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets static-string / String() pure clones in query handler,
 * workspace tools, space members, artifact block, desktop settings UI,
 * and chat message file input. Leaves i18n `t()` fallbacks, optional
 * reason-prefix empty-string clones, truncated message.slice clones,
 * and isolated packages without core import path for later.
 */
const REWIRED_SOURCES = [
  "packages/database/server/routes/query.ts",
  "packages/agent-runtime/localWorkspaceTools.ts",
  "packages/create/space/pages/SpaceMembers.tsx",
  "packages/render/web/elements/IframeArtifactBlock.tsx",
  "packages/app/settings/web/DesktopMachines.tsx",
  "packages/app/settings/web/DesktopUpdates.tsx",
  "packages/chat/web/useMessageInputFiles.ts",
] as const;

describe("toErrorMessage residual wave17 consumers source contract", () => {
  it("routes pure error coercions through core/errorMessage", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/errorMessage"');
      expect(source).toContain("toErrorMessage(");
      expect(source).not.toMatch(
        /\w+\s+instanceof\s+Error\s*\?\s*\w+\.message\s*:\s*["'`]/,
      );
      expect(source).not.toMatch(
        /\w+\s+instanceof\s+Error\s*\?\s*\w+\.message\s*:\s*String\(\w+/,
      );
    }
  });
});
