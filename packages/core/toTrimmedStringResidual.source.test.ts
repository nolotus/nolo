import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires must stay on the shared
 * core/toTrimmedString seam so nullish-vs-String-coerce handling cannot
 * drift across agent-create tool args, agent-card display readers, billing
 * audit secrets, query prefixes, email report/delivery fields, app domain
 * ids, and share display names.
 *
 * Wave22 rewires residual String(x||"").trim() pure clones for:
 * - billing/env secrets (BILLING_LEDGER_AUDIT_SECRET, USER_AUTHORITY_MOVE_SECRET)
 * - database query prefixes / fetchUserData type lists
 * - share token normalize helper
 * - auth email report/delivery/provider/delete/spaceInvite fields
 * - server app domain appIds + email provider registry secrets
 * - app ShareCard displayAgentName / EmailAdmin userId
 *
 * Wave23 rewires remaining pure String(x||"").trim() clones for:
 * - imageOutput modelName, tools index toolquery task
 * - security quarantine IP normalize, preview slot slug/fallback origin
 * - resend recipients map + marketing segmentId
 * - searchWorkspace title/type/contentKey field normalize
 * - agentSlice tags array map coerce-trim, createAgentTool tags map
 *
 * Targets exact local helpers:
 * `typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim()`.
 * Leaves asTrimmedString-shaped non-string→"" drops, CSV-split hybrids,
 * daemon/embed String.raw sites, and numeric-counter String(x||"").trim()
 * clones for other seams.
 */
const REWIRED_SOURCES = [
  "packages/ai/tools/agent/createAgentTool.ts",
  "packages/chat/messages/web/CreateAgentToolCard.tsx",
  "packages/chat/messages/web/UpdateAgentToolCard.tsx",
  "packages/chat/messages/web/resolveAgentCardDialogKey.ts",
  // wave22 — billing/env secrets
  "packages/server/handlers/providerCallsRecentHandler.ts",
  "packages/server/handlers/billingUsageReportHandler.ts",
  "packages/server/handlers/billingLedgerDeletedUserProjectionRepairHandler.ts",
  "packages/server/handlers/providerReconciliationRunHandler.ts",
  "packages/server/handlers/billingLedgerAuditHandler.ts",
  "packages/server/handlers/userAuthorityMoveHandler.ts",
  "packages/server/handlers/revenueShareReportHandler.ts",
  "packages/server/handlers/creatorEarningsReportHandler.ts",
  "packages/server/handlers/creatorSettlementReportHandler.ts",
  "packages/server/handlers/appRuntimeAuditHandler.ts",
  // wave22 — database / query / share
  "packages/database/queryPrefixes.ts",
  "packages/database/client/fetchUserData.ts",
  "packages/share/keys.ts",
  // wave22 — auth email / report
  "packages/auth/server/emailReport.ts",
  "packages/auth/server/emailDelivery.ts",
  "packages/auth/server/emailDeliveryGuards.ts",
  "packages/auth/server/emailProvider.ts",
  "packages/auth/server/delete.ts",
  "packages/auth/server/spaceInvite.ts",
  // wave22 — server app domain / email registry / email repo
  "packages/server/handlers/appDomainHandler.ts",
  "packages/server/email/providerRegistry.ts",
  "packages/database/server/routes/emailRepository.ts",
  // wave22 — app UI pure
  "packages/app/pages/ShareCard.tsx",
  "packages/app/pages/EmailAdmin.tsx",
  // wave23 — residual pure String||trim
  "packages/ai/agent/utils/imageOutput.ts",
  "packages/ai/tools/index.ts",
  "packages/server/securityQuarantine.ts",
  "packages/server/preview/previewConfig.ts",
  "packages/integrations/resend/index.ts",
  "packages/ai/tools/searchWorkspaceTool.ts",
  "packages/ai/agent/agentSlice.ts",
] as const;

const EXACT_CLONE =
  /typeof\s+\w+\s*===\s*["']string["']\s*\?\s*\w+\.trim\(\)\s*:\s*\w+\s*==\s*null\s*\?\s*["']["']\s*:\s*String\(\w+\)\.trim\(\)/;

describe("toTrimmedString residual consumers source contract", () => {
  it("routes pure coerced trimmed-string helpers through core seam", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/toTrimmedString"');
      expect(source).toContain("toTrimmedString(");
      expect(source).not.toMatch(EXACT_CLONE);
      expect(source).not.toMatch(
        /const\s+toTrimmed\s*=\s*\([^)]*\)\s*:\s*string\s*=>/,
      );
    }
  });
});
