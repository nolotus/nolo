import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires must stay on the shared
 * core/positiveFiniteNumberOrFallback seam so missing/zero/float handling
 * cannot drift across verify scripts, probe helpers, CLI heartbeat/stall
 * timeouts, Waffo credits-per-currency, nolo-ci smoke flags, X-reader probe
 * number flags, and provider-call sweeper timeout env.
 *
 * Batch 1: verify/probe number readers (vision web, public image agents,
 * hosted exec runtime, compressImage, processRunner, playwrightLaunch).
 * Batch 2: CLI connector heartbeat interval (machineWsSession +
 * machineWatchCommands), agent-run stall timeout, Waffo
 * WAFFO_CREDITS_PER_CURRENCY_UNIT, and smokeNoloCi number flags.
 * Batch 3: live/raw CDP X-reader probe --timeout-ms flags and
 * sweepProviderCalls PROVIDER_CALL_PENDING_TIMEOUT_MS.
 * Batch 4: residual pure clones with floor/clamp kept local —
 * createMenuOpenCount, notifications limit, dialog --offset.
 *
 * Skips throw-on-invalid CLI parsers (sweepTombstones), parseInt truncators
 * (playwright/paired quick-chat probes), optional-undefined readers that
 * now route through asOptionalPositiveFiniteNumber(Number(...)) instead
 * (llama supervisor / agent-runtime policy / query limit normalizer /
 * agent-run loop null-boundary timeout override / share toSafeTimestamp),
 * remaining Date.parse-only record timestamp extractors (table row cache /
 * readResolution / recentRelationshipRecap), and zero-as-unlimited CLI
 * limit parsers (dialogCommands resolveResultLimit).
 */
const REWIRED_SOURCES = [
  "scripts/verify/verifyCustomAgentVisionWeb.ts",
  "scripts/verify/verifyPublicImageAgentsWeb.ts",
  "scripts/verify/verifyWebHostedExecRuntime.ts",
  "scripts/agent-tools/compressImage.ts",
  "scripts/probes/helpers/processRunner.ts",
  "scripts/probes/helpers/playwrightLaunch.ts",
  "packages/cli/machineWsSession.ts",
  "packages/cli/machineWatchCommands.ts",
  "packages/cli/agentRunCommand.ts",
  "packages/server/payments/waffo/waffoPaymentProvider.ts",
  "scripts/smokeNoloCi.ts",
  "scripts/probes/x/liveXAgentRead.ts",
  "scripts/probes/x/rawCdpXAgentRead.ts",
  "scripts/sweepProviderCalls.ts",
  "packages/app/settings/fieldSelectors.ts",
  "packages/server/handlers/notificationsHandler.ts",
  "packages/cli/dialogCommands.ts",
] as const;

describe("parsePositiveFiniteNumberOrFallback residual consumers source contract", () => {
  it("routes pure positive-finite coercions through core seam", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/positiveFiniteNumberOrFallback"');
      expect(source).toContain("parsePositiveFiniteNumberOrFallback(");
      expect(source).not.toMatch(
        /Number\.isFinite\(\w+\)\s*&&\s*\w+\s*>\s*0\s*\?\s*\w+\s*:\s*\w+/,
      );
    }
  });
});
