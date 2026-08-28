import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires must stay on the shared
 * core/optionalPositiveNumber seam so zero / float / non-finite handling
 * cannot drift across token billing gates, product purchase amounts,
 * revenue-share cost readers, pricing validators, cloud credential /
 * tombstone / sync / hybrid timestamps, and positive-only timeoutMs option
 * readers (local workspace exec + agent-run delegation).
 *
 * Batch 2 continues pure residual clones: product entitlements amountCredits,
 * revenue-split creator pay presence, connector + machine-connector request
 * timeoutMs, dialog usage gauge fill gate, agent-thread active count,
 * storeGetMany concurrency, dialog-read bridge limit, agent-run timeout
 * normalizer, and connector-run timeout normalizer (floor/clamp kept local).
 *
 * Wave 11a: share toSafeTimestamp (Number + Date.parse), agent-runtime
 * readPositiveNumber (Number coerce → optional), query normalizeQueryLimit
 * (floor/clamp local), agent-run loop parseTimeoutOverride (undefined→null
 * at boundary).
 *
 * Leaves non-isFinite timeout gates (embedded daemon script, queryRequest
 * zero-disables, CLI agent-run watchdog), unit-interval confidence gates,
 * typeof-number-only width/tailCount gates, and Date.parse-only record
 * timestamp extractors that still use asOptionalFiniteNumber for typed
 * numbers (query getComparableTimestamp, readResolution,
 * fetchAndCacheTableRows, recentRelationshipRecap) for later.
 */
const REWIRED_SOURCES = [
  "packages/auth/server/productPurchase.ts",
  "packages/auth/server/revenueShareLedger.ts",
  "packages/auth/server/tokenUsageBilling.ts",
  "packages/ai/llm/getPricing.ts",
  "packages/agent-runtime/cloudCredentialGrant.ts",
  "packages/agent-runtime/hybridRecordStore.ts",
  "packages/database/sync/syncMapping.ts",
  "packages/database/tombstones.ts",
  "packages/agent-runtime/localWorkspaceTools.ts",
  "packages/server/handlers/agentRun/agentDelegationServerTools.ts",
  "packages/auth/server/productEntitlements.ts",
  "packages/auth/server/revenueSplitPolicy.ts",
  "packages/server/handlers/connector/connectorConnectionRegistry.ts",
  "packages/server/handlers/agentRun/machineConnector.ts",
  "packages/chat/web/DialogUsageGaugeIcon.tsx",
  "packages/agent-runtime/agentThreadAdmission.ts",
  "packages/server/dialogReadBridgeRoutes.ts",
  "packages/server/handlers/agentRun/requestContext.ts",
  "packages/cli/machineWsRunDispatchPurity.ts",
  "packages/share/helpers.ts",
  "packages/agent-runtime/runtimeToolPolicy.ts",
  "packages/database/server/routes/query.ts",
] as const;

describe("asOptionalPositiveFiniteNumber residual consumers source contract", () => {
  it("routes pure positive-finite optional gates through core seam", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/optionalPositiveNumber"');
      expect(source).toContain("asOptionalPositiveFiniteNumber(");
      expect(source).not.toMatch(
        /typeof\s+[\w.?]+\s*===\s*["']number["']\s*&&\s*Number\.isFinite\([\w.?]+\)\s*&&\s*[\w.?]+\s*>\s*0/,
      );
    }
  });
});
