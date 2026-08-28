import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires must stay on the shared
 * core/compactWhitespace seam so single-line preview / HTML-strip
 * normalize / error-signature compact steps cannot drift.
 *
 * Targets exact `.replace(/\s+/g, " ").trim()` pure tails and equivalent
 * trim-then-replace / already-trimmed replace-only previews: tool API
 * response preview, ToolMessageItem parallel preview, chunk-load error
 * signatures, marxists title extract, fetchWebpage HTML clean (via core/fetchWebpageShaping),
 * Chrome connector live-site text preview, XHS human-diff compactText
 * helper, public-share input normalize, arXiv title/summary compact,
 * guided-agent name clean, understanding-memory clause normalize,
 * email HTML strip final collapse, app-deploy name reuse normalize
 * (compactWhitespace o asTrimmedLowercaseString), and execShell
 * dangerous-command normalize (trim+collapse ≡ compactWhitespace).
 *
 * Leaves browser page.evaluate inject clones, agentHandle's own handle
 * normalize seam, HTML-entity/decode hybrids without a pure compact tail
 * (e.g. jd product htmlToText), and hyphen-id/slug builders
 * (`.replace(/\s+/g, "-")` / empty-string join).
 */
const PURE_PACKAGE_SOURCES = [
  "packages/ai/tools/toolApiClient.ts",
  "packages/chat/messages/web/ToolMessageItem.tsx",
  "packages/web/chunkLoadRecovery.ts",
  "packages/ai/tools/marxistsOfflineBook.ts",
  "packages/core/fetchWebpageShaping.ts",
  "scripts/verify/desktop/verifyChromeConnectorLiveSite.ts",
  "packages/share/publicSharePolicy.ts",
  "packages/integrations/arxiv/index.ts",
  "packages/ai/agent/web/useGuidedAgentCreation.ts",
  "packages/ai/tools/emailTools.ts",
  "packages/server/handlers/appDeployFlow.ts",
  "packages/ai/tools/execShellTool.ts",
] as const;

const HELPER_WITH_BROWSER_INJECT =
  "scripts/verify/verifyXhsHumanDiff.ts" as const;

const EXACT_COMPACT_TRIM_CLONE =
  /\.replace\(\/\\s\+\/g,\s*["'] ["']\)\.trim\(\)/;

const TRIM_THEN_COMPACT_CLONE =
  /\.trim\(\)\.replace\(\/\\s\+\/g,\s*["'] ["']\)/;

describe("compactWhitespace residual consumers source contract", () => {
  it("routes pure compact-whitespace previews through core seam", () => {
    for (const relativePath of PURE_PACKAGE_SOURCES) {
      const source = readSource(relativePath);
      const expectedImport = relativePath.startsWith("packages/core/")
        ? 'from "./compactWhitespace"'
        : 'from "core/compactWhitespace"';
      expect(source).toContain(expectedImport);
      expect(source).toContain("compactWhitespace(");
      expect(source).not.toMatch(EXACT_COMPACT_TRIM_CLONE);
      expect(source).not.toMatch(TRIM_THEN_COMPACT_CLONE);
    }
  });

  it("routes XHS human-diff compactText helper through core seam", () => {
    const source = readSource(HELPER_WITH_BROWSER_INJECT);
    expect(source).toContain('from "core/compactWhitespace"');
    expect(source).toContain(
      "return compactWhitespace(String(value ?? \"\")).slice(0, max);",
    );
  });
});
