import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 7) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Skips custom-fallback reject/UI strings (streamAgentChatTurn rejectWithValue,
 * toolThunks 未知错误), duck-typed emailRepository lastWarmupError, and
 * payload-preferring AgentEmailE2EPage logs.
 */
const REWIRED_SOURCES = [
  "packages/ai/agent/streamAgentChatTurn.ts",
  "packages/chat/messages/toolThunks.ts",
  "packages/auth/server/inviteReward.ts",
  "packages/server/handlers/apifyActorHandler.ts",
  "packages/render/web/ui/ErrorView.tsx",
] as const;

describe("toErrorMessage residual batch 7 consumers source contract", () => {
  it("routes pure error coercions through core/errorMessage", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/errorMessage"');
      expect(source).toContain("toErrorMessage(");
      // Pure optional-chain coercions must be gone; custom-fallback
      // `error?.message || "…"` strings may remain and are not pure clones.
      expect(source).not.toMatch(/\w+\?\.message\s*\|\|\s*String\(\w+\)/);
    }
  });
});
