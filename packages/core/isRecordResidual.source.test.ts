import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires must stay on the shared core/isRecord seam so
 * Array vs object handling cannot drift across agent-runtime, agent-run
 * handlers, CLI dispatch/local-job readers, canvas, and scripts helpers.
 *
 * Includes residual inverted typeof-object+Array.isArray detectors in OpenAI
 * responses parameter sanitize, machine task subject-ref walk, local runtime
 * remote subject-ref normalize, xAI OAuth JSON object parse, ChatGPT web image
 * result validate, agent-email registration E2E body parse, Chrome connector
 * tool argument parse, desktop single-instance lock JSON, upsertTableMeta
 * columns normalize, and toolCallArgumentGuard arguments parse.
 *
 * Wave7 residual bare `x && typeof x === "object" && !Array.isArray(x)` /
 * inverted path-setter pure clones: email provider rawHeaders, desktop turn
 * runtimeContext, tableToolHandlers body.values, createTable publicIntake,
 * database patch deepMerge (server+actions), and toolValueUtils setValueByPath.
 *
 * Wave8 residual bare isRecord clone: agent BasicInfoTab greeting menu bag.
 *
 * Wave18 residual bare `value && typeof value === "object"` pure clones:
 * localRuntimeAdapter prepareRemoteDialogEvidenceRecord, dialogCommands
 * writeJsonStream, cliSpaceHelpers / noloWorkspaceTools contentKey bags,
 * toolFailureGuard stableStringify, agentReferenceGrants grant maps,
 * ledger normalizeAccountState, and create space local-agents asRecord.
 *
 * Wave19c residual bare object detectors where arrays must not count as
 * records: providerBillingHealthReport bags, ShareImportPage shared-object
 * checks, nolo workspace readSpace content filters, runtimeToolSurface
 * redaction recurse, and fetchMessages message-shaped objects.
 *
 * Wave20 residual pure clones where arrays are invalid records: agentEmailRpc
 * RPC body/agent bags (replaced local typeof-object isRecord), agentRecordConfig
 * tool name/function-name duck types, and BasicInfoTab greeting .text field.
 *
 * Skips intentional variants (tombstones/useRnMyAgents omit Array.isArray —
 * not exact clones of core/isRecord; normalizeToolCallArgumentsInPlace loose
 * object checks; cloudflareCrawlHandler plain-object prototype gate; HTML
 * template browser inject CSS variable walk; xhs/x-reader redaction walkers
 * that intentionally treat arrays as objects; web/entry desktop diagnostic
 * JSON walk must still serialize arrays). toolValueUtils hasOwn keeps
 * hasOwnProperty on top of core/isRecord.
 */
const REWIRED_SOURCES = [
  "packages/agent-runtime/runtimeToolPolicy.ts",
  "packages/agent-runtime/noloWorkspaceTools.ts",
  "packages/server/handlers/agentRun/agentDialogQuery.ts",
  "packages/server/handlers/agentRun/machineConnector.ts",
  "packages/cli/chatgptWebImageLocalJob.ts",
  "packages/cli/dialogCommands.ts",
  "packages/cli/machineWsRunDispatchPurity.ts",
  "packages/cli/machineWsRunDispatch.ts",
  "packages/render/canvas/canvasTree.ts",
  "scripts/helpers/agentCreationSpec.ts",
  "scripts/helpers/subjectRefLookup.ts",
  "scripts/verify/taskThreadLoopVerifier.ts",
  "packages/auth/server/emailDbConfig.ts",
  "packages/auth/server/adminUsageReport.ts",
  "packages/auth/server/billingUsageReport.ts",
  "packages/auth/server/creatorEarningCreditConversion.ts",
  "packages/auth/server/creatorEarningsReport.ts",
  "packages/auth/server/creatorSettlementReport.ts",
  "packages/auth/server/ledgerAudit.ts",
  "packages/auth/server/ledgerWitness.ts",
  "packages/auth/server/revenueShareReport.ts",
  "packages/auth/server/revenueSplitPolicy.ts",
  "packages/auth/server/userGrowthReport.ts",
  "packages/chat/messages/parseJsonRecord.ts",
  "packages/chat/dialog/actions/createDialogAction.ts",
  "packages/ai/agent/web/agentDisplayUtils.ts",
  "packages/ai/agent/web/AdvancedSettingsTab.tsx",
  "packages/ai/agent/web/BasicInfoTab.tsx",
  "packages/ai/token/providerBillingDrilldown.ts",
  "packages/ai/token/providerBillingAnomalyDrilldown.ts",
  "packages/ai/tools/agent/prepareAgentDraftTool.ts",
  "packages/cli/tableCommands.ts",
  "packages/server/handlers/agentRun/toolExecutor.ts",
  "packages/share/shareReadResolver.ts",
  "packages/database/sync/stripAgentForAccountSync.ts",
  "packages/ai/tools/toolSchemaCompatibility.ts",
  "packages/integrations/x-reader/fixtureParser.ts",
  "packages/agent-runtime/agentRecordConfig.ts",
  "packages/database/authority/userAuthorityMove.ts",
  "packages/database/authority/recordAuthority.ts",
  "packages/server/handlers/desktopCredentialBrokerHandler.ts",
  "packages/server/handlers/agentRun/developerServerTools.ts",
  "packages/server/handlers/agentRun/saveDialog.ts",
  "packages/integrations/openai/filterAndCleanMessages.ts",
  "packages/agent-runtime/fileCredentialBroker.browser.stub.ts",
  "packages/agent-runtime/desktopRequestSnapshot.ts",
  "packages/chat/messages/toolPresentation.ts",
  "scripts/helpers/agentEmailRegistrationE2E.ts",
  "scripts/audits/auditLegacyInlineImagePayloads.ts",
  "scripts/audits/auditDialogMessagePayloads.ts",
  "scripts/verify/verifyExternalRegistrationWithAgent.ts",
  "packages/render/table/tableView.ts",
  "packages/app/theme/GlobalThemeController.tsx",
  "packages/desktop/src/bun/index.ts",
  "packages/chat/messages/web/toolDisplayName.ts",
  "packages/ai/agent/streamAgentChatTurn.ts",
  "packages/auth/server/ledgerDeletedUserProjection.ts",
  "packages/server/handlers/agentRun/loop.ts",
  "packages/chat/messages/toolThunks.ts",
  "packages/ai/agent/web/AgentInboxPage.tsx",
  "packages/agent-runtime/actionGate.ts",
  "packages/chat/messages/extractTextFromContent.ts",
  "packages/agent-runtime/localWorkspaceTools.ts",
  "packages/server/handlers/tableToolHandlers.ts",
  "packages/ai/tools/table/rowTools.ts",
  "packages/server/handlers/desktopAgentRuntimeAdapter.ts",
  "packages/server/handlers/chatProxyRouting.ts",
  "packages/server/handlers/chatBillingSse.ts",
  "packages/server/handlers/userAuthorityMoveHandler.ts",
  "packages/server/handlers/agentRun/dialogLookup.ts",
  "packages/server/handlers/agentRun/tableActivityProjection.ts",
  "packages/database/authority/userAuthorityRegistry.ts",
  "packages/database/subjectRefIndex.ts",
  "packages/auth/adminPermissions.ts",
  "packages/auth/server/revenueShareLedger.ts",
  "packages/ai/agent/createAgentSchema.ts",
  "packages/ai/tools/toolApiClient.ts",
  "packages/ai/tools/table/addTableRowTool.ts",
  "packages/chat/messages/web/PrepareAgentDraftToolCard.tsx",
  "packages/render/table/createTableAction.ts",
  "packages/integrations/openai/responsesHelpers.ts",
  "packages/cli/machineCommands.ts",
  "packages/cli/oauth/flows/xai.ts",
  "packages/server/handlers/chatgptWebImageHandler.ts",
  "packages/server/handlers/agentEmailRegistrationE2EHandler.ts",
  "packages/desktop-chrome-connector/chromeConnector.ts",
  "packages/desktop/src/bun/singleInstanceLock.ts",
  "scripts/upsertTableMeta.ts",
  "packages/ai/chat/toolCallArgumentGuard.ts",
  "packages/server/email/provider.ts",
  "packages/server/handlers/desktopAgentRuntimeTurnHandler.ts",
  "packages/ai/tools/table/createTableTool.ts",
  "packages/database/server/routes/patch.ts",
  "packages/database/actions/patch.ts",
  "packages/render/table/toolValueUtils.ts",
  "packages/cli/cliSpaceHelpers.ts",
  "packages/ai/agent/toolFailureGuard.ts",
  "packages/database-engine/agentReferenceGrants.ts",
  "packages/auth/server/ledger.ts",
  "packages/create/space/runSyncAccountSpaceLocalAgentsToAccount.ts",
  "packages/ai/token/providerBillingHealthReport.ts",
  "packages/app/pages/ShareImportPage.tsx",
  "packages/server/handlers/agentRun/noloWorkspaceServerTools.ts",
  "packages/ai/tools/noloWorkspaceReadTools.ts",
  "packages/agent-runtime/runtimeToolSurface.ts",
  "packages/chat/messages/fetchMessages.ts",
  "packages/cli/agentEmailRpc.ts",
] as const;

describe("isRecord residual consumers source contract", () => {
  it("routes pure record detectors through core/isRecord", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/isRecord"');
      expect(source).toContain("isRecord(");
      expect(source).not.toMatch(
        /function\s+isRecord\s*\(\s*value:\s*unknown\s*\)/,
      );
      expect(source).not.toMatch(
        /Boolean\(\w+\)\s*&&\s*typeof\s+\w+\s*===\s*["']object["']\s*&&\s*!Array\.isArray\(\w+\)/,
      );
      expect(source).not.toMatch(
        /!!\w+\s*&&\s*typeof\s+\w+\s*===\s*["']object["']\s*&&\s*!Array\.isArray\(\w+\)/,
      );
      expect(source).not.toMatch(
        /!\w+\s*\|\|\s*typeof\s+\w+\s*!==\s*["']object["']\s*\|\|\s*Array\.isArray\(\w+\)/,
      );
    }
  });
});
