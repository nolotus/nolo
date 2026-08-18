import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires must stay on the shared
 * core/trimmedLowercaseString seam so trim + case-fold handling cannot
 * drift across usage request options, checkEnv tool/handler key gates,
 * task-thread status normalizers, billing service-tier price resolution,
 * CLI display-mode / provider-name / table-title gates, agent-runtime
 * provider / OAuth / proxy-policy / call-plan seams, integrations email + env
 * flags, server authority driver / browser-session / email-provider resolution,
 * auth delete email + signup IP quota / email delivery guards / email report /
 * scenario notifications / unsubscribe / GPT Pro tier, app font preference /
 * onboarding / file mime labels / email-admin tags, CLI TUI arg normalizers,
 * auth email delivery / preferences / provider / policy, alpha-test host guard,
 * app space role, USDC Base address, public Vary header parts, LLM provider
 * display / ollama-cloud / kimi / agent capabilities, Waffo env, firecrawl
 * hostname, excel header normalize, agentPicker switch target, agent-run
 * runtime surface / machine CLI provider / loop fallbackProvider, chat
 * Antigravity apiKeyRef, secrets setup source, fetchWebpage segment
 * normalize, executeSql query prefix checks, tool schema provider gates,
 * CF TTS lang normalize, HTTP compression Vary parts, toolApiClient HTML
 * body preview, billing anomaly severity tone, user profile email opt-out
 * tags, wave21 residual provider-credential policy, search tools/UI filters
 * (workspace query, space/content lists, recycle bin, memory, agent pickers,
 * message-input mentions, icon picker, pdf outline match, table boolean
 * string branch), and ziwei gender normalize.
 *
 * Targets exact `typeof x === "string" ? x.trim().toLowerCase() : ""` clones
 * and pure optional/known-string trim+lowercase normalizers.
 * Leaves multi-step host parsers and browser page.evaluate tag normalizers
 * (cannot import core inside serialized browser context).
 */
const REWIRED_SOURCES = [
  "packages/ai/agent/web/referencePickerUtils.ts",
  "packages/ai/llm/agentCapabilities.ts",
  "packages/ai/llm/kimi.ts",
  "packages/ai/llm/platformHosted.ts",
  "packages/ai/llm/providerDisplay.ts",
  "packages/ai/llm/usageRequestOptions.ts",
  "packages/ai/token/calculatePrice.ts",
  "packages/ai/token/providerCredential.ts",
  "packages/ai/token/providerCredentialRegistry.ts",
  "packages/ai/token/providerCredentialRegistryList.ts",
  "packages/ai/token/providerCredentialRegistryResolver.ts",
  "packages/ai/tools/checkEnvTool.ts",
  "packages/ai/tools/executeSqlTool.ts",
  "packages/ai/tools/fetchWebpageSupport.ts",
  "packages/ai/tools/searchWorkspaceTool.ts",
  "packages/ai/tools/toolApiClient.ts",
  "packages/ai/tools/toolSchemaCompatibility.ts",
  "packages/ai/tools/ziweiChartTool.ts",
  "packages/agent-runtime/agentCallPlan.ts",
  "packages/agent-runtime/antigravityOAuth.ts",
  "packages/agent-runtime/codexResponsesProvider.ts",
  "packages/agent-runtime/platformProviderEndpoints.ts",
  "packages/agent-runtime/providerResolution.ts",
  "packages/agent-runtime/serverProxyPolicy.ts",
  "packages/app/localFirst/onboardingDismissed.ts",
  "packages/app/pages/EmailAdmin.tsx",
  "packages/app/pages/MyContentCollection.tsx",
  "packages/app/settings/web/MemoryConfig.tsx",
  "packages/app/settings/web/SecretsConfig.tsx",
  "packages/app/settings/web/UserProfile.tsx",
  "packages/app/theme/fontPreference.ts",
  "packages/app/utils/excelToSlate.ts",
  "packages/app/utils/fileUtils.ts",
  "packages/core/gptProTier.ts",
  "packages/auth/server/delete.ts",
  "packages/auth/server/emailDelivery.ts",
  "packages/auth/server/emailDeliveryGuards.ts",
  "packages/auth/server/emailPolicy.ts",
  "packages/auth/server/emailPreferences.ts",
  "packages/auth/server/emailProvider.ts",
  "packages/auth/server/emailReport.ts",
  "packages/auth/server/emailScenarioNotifications.ts",
  "packages/auth/server/emailUnsubscribe.ts",
  "packages/auth/server/signupIpQuota.ts",
  "packages/auth/web/UserUsagePage.tsx",
  "packages/chat/dialog/AddAgentDialog.tsx",
  "packages/chat/messages/rn/MessageInput.tsx",
  "packages/chat/web/messageInputAgentUi.ts",
  "packages/chat/web/sidebar/AllViewSidebar.tsx",
  "packages/cli/agentAliases.ts",
  "packages/cli/agentMachineCommands.ts",
  "packages/cli/agentRunArgs.ts",
  "packages/cli/client/agentRunTypes.ts",
  "packages/cli/client/terminalStyles.ts",
  "packages/cli/client/toolOutput.ts",
  "packages/cli/connectorWebSocketTarget.ts",
  "packages/cli/docCommandShared.ts",
  "packages/cli/tableCommands.ts",
  "packages/cli/tui/agentPicker.ts",
  "packages/create/editor/utils/pdfToSlate.ts",
  "packages/create/space/pages/SpaceContent.tsx",
  "packages/database-engine/serverStoreFactory.ts",
  "packages/integrations/openai/providerBodyCompatibility.ts",
  "packages/integrations/resend/index.ts",
  "packages/integrations/x-reader/bridge/readXPostWithBridge.ts",
  "packages/integrations/xhs-reader/bridge/readXhsProfileWithBridge.ts",
  "packages/life/web/RecycleBin.tsx",
  "packages/render/contentIcon/ContentIconPicker.tsx",
  "packages/render/table/toolValueUtils.ts",
  "packages/rn/components/space/SpaceContentList.tsx",
  "packages/server/email/providerRegistry.ts",
  "packages/server/handlers/agentRun/machineConnector.ts",
  "packages/server/handlers/agentRun/runtimeContext.ts",
  "packages/server/handlers/alphaTestRouteGuard.ts",
  "packages/server/handlers/appSpaceAccess.ts",
  "packages/server/handlers/cfTextToSpeechHandler.ts",
  "packages/server/handlers/chatAntigravityOAuth.ts",
  "packages/server/handlers/checkEnvHandler.ts",
  "packages/server/handlers/firecrawlHandler.ts",
  "packages/server/handlers/publicHandler.ts",
  "packages/server/httpCompression.ts",
  "packages/server/payments/crypto/cryptoUsdcBaseConfig.ts",
  "packages/server/payments/waffo/waffoPaymentProvider.ts",
  "packages/server/services/browserSessionManager.ts",
  "scripts/helpers/taskThreadProjection.ts",
  "scripts/helpers/taskThreadMonitor.ts",
] as const;

const EXACT_CLONE =
  /typeof\s+\w+\s*===\s*["']string["']\s*\?\s*\w+\.trim\(\)\.toLowerCase\(\)\s*:\s*["']["']/;

describe("asTrimmedLowercaseString residual consumers source contract", () => {
  it("routes pure trim+lowercase coercions through core/trimmedLowercaseString", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/trimmedLowercaseString"');
      expect(source).toContain("asTrimmedLowercaseString(");
      expect(source).not.toMatch(EXACT_CLONE);
    }
  });
});
