import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires must stay on the shared
 * core/trimmedString seam so whitespace / non-string handling cannot
 * drift across desktop turn client continueDialogId, agent-delegation
 * agent-delegation startAgentRun agentKey/task multi-fallback, email provider address
 * multi-fallback, understanding greeting text, memory delete patternKey
 * prefix, agent secret migration status, local workspace shell command
 * multi-fallback, nolo workspace read dialog/agent/space multi-fallback,
 * providerResolution bound machineId, localRuntimeBootstrap
 * customProviderUrl/machineId, CLI agentRunTypes providerUrl, OpenAI
 * filterAndCleanMessages tool llmContext/summary, agent-run loop
 * apiKeyFromAgentKey/apiKeyRef, automation index ownerAgentKey, message
 * slice agent name, openai/toolExecutor latest image urls, chatgpt/gemini/
 * openai image tool metadata originalName/prompt, external registration
 * verify content/agentReply multi-fallback,
 * agentSlice create machineId, buildReferenceContext dialog summaries,
 * desktopRequestSnapshot tool name multi-fallback, and agentHealthCheck
 * extractToolName multi-fallback.
 *
 * Targets exact `typeof x === "string" ? x.trim() : ""` clones and
 * multi-fallback cascades that collapse to
 * `asTrimmedString(a) || asTrimmedString(b)`.
 * Leaves asOptionalTrimmedString-shaped presence / non-empty-default
 * clones (`typeof x === "string" && x.trim() ? x.trim() : …`) and
 * String(v).trim() coercers for other seams.
 */
const REWIRED_SOURCES = [
  "packages/app/utils/desktopAgentRuntimeTurnClient.ts",
  "packages/server/handlers/agentRun/agentDelegationServerTools.ts",
  "packages/server/email/provider.ts",
  "packages/ai/memory/understandingGreeting.ts",
  "packages/ai/memory/delete.ts",
  "packages/agent-runtime/migrateAgentSecrets.ts",
  "packages/agent-runtime/localWorkspaceTools.ts",
  "packages/ai/tools/noloWorkspaceReadTools.ts",
  "packages/agent-runtime/providerResolution.ts",
  "packages/server/handlers/agentRun/localRuntimeBootstrap.ts",
  "packages/cli/client/agentRunTypes.ts",
  "packages/integrations/openai/filterAndCleanMessages.ts",
  "packages/server/handlers/agentRun/loop.ts",
  "packages/database/keys.ts",
  "packages/chat/messages/messageSlice.ts",
  "packages/server/handlers/openaiImageHandler.ts",
  "packages/server/handlers/agentRun/toolExecutor.ts",
  "packages/ai/tools/chatgptWebImageTool.ts",
  "packages/ai/tools/geminiImagePreviewTool.ts",
  "packages/ai/tools/openaiImageTool.ts",
  "scripts/verify/verifyExternalRegistrationWithAgent.ts",
  "packages/ai/agent/agentSlice.ts",
  "packages/ai/context/buildReferenceContext.ts",
  "packages/agent-runtime/desktopRequestSnapshot.ts",
  "scripts/helpers/agentHealthCheck.ts",
] as const;

const EXACT_CLONE =
  /typeof\s+[\w.?]+\s*===\s*["']string["']\s*\?\s*[\w.?]+\.trim\(\)\s*:\s*["']["']/;

const MULTI_FALLBACK_CLONE =
  /typeof\s+[\w.?]+\s*===\s*["']string["']\s*\?\s*[\w.?]+\.trim\(\)\s*:\s*typeof\s+[\w.?]+\s*===\s*["']string["']\s*\?\s*[\w.?]+\.trim\(\)\s*:\s*["']["']/;

describe("asTrimmedString residual consumers source contract", () => {
  it("routes pure trimmed-string coercions through core/trimmedString", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/trimmedString"');
      expect(source).toContain("asTrimmedString(");
      expect(source).not.toMatch(EXACT_CLONE);
      expect(source).not.toMatch(MULTI_FALLBACK_CLONE);
    }
  });
});
