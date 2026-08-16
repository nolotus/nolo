import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires must stay on the shared core/abortError seam so
 * AbortError name detection cannot drift across chat SSE/stream paths, shared
 * SSE transport, public-agent fetch cancellation, and server proxy handlers.
 *
 * Batch 1: exact `error?.name === "AbortError"` clones.
 * Batch 2: streamAgentChatTurn local helper (name part), QuickChatRuntime dual
 * name checks, RTK action.error name check, native completions, runAgentBackground,
 * OAuthStatusBox, UserRechargeHistoryModal.
 * Batch 3: database/requests pure `error.name !== "AbortError"` log-suppression.
 * Batch 4 / wave25: ChildRunDetailModal dialog-read abort swallow
 * (`instanceof DOMException && name === "AbortError"` → isAbortError).
 *
 * Mixed TimeoutError||AbortError residuals kept on purpose where rewiring the
 * AbortError half would change shape or behavior:
 * - agentRun/loop toUserFacingLoopLlmError treatAsCapacity: string errorName from
 *   `instanceof Error` only (AbortError|TimeoutError|TypeError triad)
 * - kimi shouldMapToPlatformBusyMessage: API is errorName string, not error object
 * - cli agentRecordHelpers shouldUseCurlTransportFallback: name from
 *   `instanceof Error` only; isAbortError would expand to plain objects
 * agentRun/loop LLM catch maps TimeoutError || isAbortError (AbortError half rewired).
 * Probe scripts left alone.
 */
const REWIRED_SOURCES = [
  "packages/server/handlers/firecrawlHandler.ts",
  "packages/server/handlers/chatHandler.ts",
  "packages/ai/chat/sseClient.ts",
  "packages/ai/chat/streamReader.ts",
  "packages/ai/agent/hooks/usePublicAgents.ts",
  "packages/app/realtime/sharedSse.ts",
  "packages/ai/chat/sendOpenAICompletionsRequest.ts",
  "packages/ai/chat/sendOpenAIResponseRequest.ts",
  "packages/ai/agent/streamAgentChatTurn.ts",
  "packages/app/pages/QuickChatRuntime.tsx",
  "packages/chat/dialog/dialogSlice.ts",
  "packages/ai/chat/sendOpenAICompletionsRequest.native.ts",
  "packages/ai/agent/runAgentBackground.ts",
  "packages/ai/agent/web/OAuthStatusBox.tsx",
  "packages/auth/web/UserRechargeHistoryModal.tsx",
  "packages/database/requests.ts",
  "packages/chat/dialog/ChildRunDetailModal.tsx",
] as const;

describe("isAbortError residual consumers source contract", () => {
  it("routes pure AbortError detectors through core/abortError", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/abortError"');
      expect(source).toContain("isAbortError(");
      expect(source).not.toMatch(
        /\?\.\s*name\s*===\s*["']AbortError["']/,
      );
      expect(source).not.toMatch(
        /\.name\s*===\s*["']AbortError["']/,
      );
      expect(source).not.toMatch(
        /\.name\s*!==\s*["']AbortError["']/,
      );
    }
  });
});
