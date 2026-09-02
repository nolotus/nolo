#!/usr/bin/env bun
/**
 * scripts/dev/stylexRuntimeBoundaryGuard.ts
 *
 * StyleX Runtime Boundary Guard
 *
 * Enforces strict runtime separation:
 * 1. UI / StyleX carrier -> pure domain/store/util (ALLOWED)
 * 2. CLI / agent-runtime / server / pure util -> React UI -> *.styles.ts -> StyleX (FORBIDDEN)
 *
 * Verification levels:
 * - Direct import scanner: Scans all protected runtime packages for direct imports of StyleX carriers or Web UI.
 * - Transitive module graph probe: Uses Bun.build with workspace resolution to trace full dependency graphs from runtime entrypoints.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import type { BunPlugin } from "bun";

export interface DirectViolation {
  file: string;
  line: number;
  importedSpecifier: string;
  kind: "stylex-package" | "styles-carrier" | "web-ui-component";
  rule: string;
  rawLine: string;
}

export interface TransitiveViolation {
  entry: string;
  carrier: string;
  kind: "stylex-package" | "styles-carrier";
  rule: string;
}

export interface BuildError {
  entry: string;
  stage: "resolve" | "probe-build" | "metafile-missing";
  message: string;
}

export interface ProbeResult {
  entry: string;
  inputsCount: number;
  violations: TransitiveViolation[];
  buildErrors: BuildError[];
}

export interface GuardSummary {
  directViolations: DirectViolation[];
  transitiveViolations: TransitiveViolation[];
  buildErrors: BuildError[];
  scannedFilesCount: number;
  scannedEntriesCount: number;
  passed: boolean;
}

// Packages that must never import StyleX carriers or Web UI components
export const PROTECTED_RUNTIME_PACKAGES = [
  "packages/cli",
  "packages/agent-runtime",
  "packages/server",
];

// Additional pure packages checked for StyleX carriers
export const ADDITIONAL_PURE_PACKAGES = [
  "packages/core",
  "packages/database",
  "packages/database-engine",
  "packages/desktop-runtime",
];

// Runtime entry points to verify with module graph probe
export const RUNTIME_ENTRYPOINTS = [
  "packages/cli/index.ts",
  "packages/cli/compileRunner.ts",
  "packages/cli/tui/tuiTurnRunner.ts",
  "packages/agent-runtime/index.ts",
  "packages/agent-runtime/agentThread.ts",
  "packages/agent-runtime/localLoop.ts",
  "packages/ai/index.ts",
  "packages/ai/agent/runAgentClientLoop.ts",
  "packages/ai/agent/runAgentBackground.ts",
  "packages/server/entry.ts",
  "packages/server/index.ts",
  "packages/server/publicRequestHandler.ts",
];

export const WORKSPACE_PACKAGES = [
  "agent-runtime",
  "ai",
  "app",
  "auth",
  "billing",
  "chat",
  "cli",
  "connector-experimental",
  "core",
  "create",
  "database",
  "database-engine",
  "desktop",
  "desktop-chrome-connector",
  "desktop-runtime",
  "form",
  "game",
  "identity",
  "integrations",
  "lab",
  "leveldb",
  "life",
  "nolo-ci",
  "nolo-connector",
  "oauth",
  "remotion-demo",
  "render",
  "rn",
  "server",
  "share",
  "shared",
  "testing",
  "tui",
  "web",
];

// Explicitly documented exemptions (must be empty or strictly justified)
export const EXPLICIT_EXEMPTIONS: Array<{
  entryOrFile: string;
  target: string;
  reason: string;
}> = [];

// Explicitly documented build error exemptions (must be strictly justified)
export const BUILD_ERROR_EXEMPTIONS: Array<{
  entry: string;
  reason: string;
}> = [];

/**
 * Find all source files recursively
 */
export function findFiles(
  dir: string,
  exts: string[] = [".ts", ".tsx", ".js", ".jsx"],
  ignorePatterns: RegExp[] = [/node_modules/, /\.git/, /dist/, /__bench__/]
): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (ignorePatterns.some((p) => p.test(full))) continue;
      if (entry.isDirectory()) {
        results.push(...findFiles(full, exts, ignorePatterns));
      } else if (exts.some((e) => entry.name.endsWith(e))) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

/**
 * Identify if a specifier or file is a StyleX carrier
 */
export function isStylexCarrierSpecifier(specifier: string): boolean {
  if (specifier.includes("terminalStyles")) return false;
  if (specifier === "@stylexjs/stylex" || specifier.startsWith("@stylexjs/stylex/")) return true;
  if (
    specifier.endsWith(".styles") ||
    specifier.endsWith(".styles.ts") ||
    specifier.endsWith(".styles.tsx") ||
    specifier.endsWith(".styles.js") ||
    specifier.includes(".styles/")
  ) {
    return true;
  }
  return false;
}

/**
 * Identify if a specifier is a Web UI component path
 */
export function isWebUiSpecifier(specifier: string): boolean {
  // Allow pure stores / utilities that have been cleanly separated
  if (specifier.endsWith("toastStore") || specifier.endsWith("toastStore.ts")) return false;
  if (specifier.endsWith("agentDisplayUtils") || specifier.endsWith("agentDisplayUtils.ts"))
    return false;
  if (specifier.endsWith("avatarUtils") || specifier.endsWith("avatarUtils.ts")) return false;
  if (specifier.endsWith("siteRoutes") || specifier.endsWith("siteRoutes.ts")) return false;
  if (specifier.endsWith("pageMeta") || specifier.endsWith("pageMeta.ts")) return false;

  // Disallow direct imports from UI component directories
  if (
    /(?:^|\/)(?:chat\/web|render\/web\/ui|render\/web\/elements|render\/web\/form|life\/web|auth\/web|app\/pages|app\/components|ai\/agent\/web\/[A-Z])/.test(
      specifier
    )
  ) {
    return true;
  }

  return false;
}

export function resolvePathWithExtensions(basePath: string): string | null {
  const VARIANTS = ["", ".cloud", ".local"];
  for (const variant of VARIANTS) {
    for (const ext of [".tsx", ".ts", ".jsx", ".js", ".json"]) {
      const withExt = `${basePath}${variant}${ext}`;
      if (existsSync(withExt) && !statSync(withExt).isDirectory()) return withExt;
    }
  }

  if (existsSync(basePath) && !statSync(basePath).isDirectory()) return basePath;

  if (existsSync(basePath) && statSync(basePath).isDirectory()) {
    const pkgJsonPath = join(basePath, "package.json");
    if (existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
        const main = pkgJson.module || pkgJson.main;
        if (main) {
          const direct = join(basePath, main);
          if (existsSync(direct) && !statSync(direct).isDirectory()) return direct;
          for (const ext of [".tsx", ".ts", ".jsx", ".js"]) {
            const candidate = `${direct}${ext}`;
            if (existsSync(candidate) && !statSync(candidate).isDirectory()) return candidate;
          }
        }
      } catch {}
    }
    for (const ext of ["index.tsx", "index.ts", "index.jsx", "index.js"]) {
      const idx = join(basePath, ext);
      if (existsSync(idx) && !statSync(idx).isDirectory()) return idx;
    }
  }

  return null;
}

export function resolveWorkspaceSubpath(
  pkg: string,
  subpath: string,
  repoRoot: string
): string | null {
  const basePath = join(repoRoot, "packages", pkg, subpath);
  return resolvePathWithExtensions(basePath);
}

export function createBunWorkspaceResolverPlugin(repoRoot: string): BunPlugin {
  return {
    name: "bun-workspace-resolver",
    setup(build) {
      // Resolve relative imports (./ and ../) with extension and variant probing
      build.onResolve({ filter: /^\.{1,2}\// }, (args) => {
        if (!args.importer) return null;
        const base = resolve(dirname(args.importer), args.path);
        const resolved = resolvePathWithExtensions(base);
        if (resolved) {
          return { path: resolved };
        }
        return null;
      });

      // Resolve workspace packages
      for (const pkg of WORKSPACE_PACKAGES) {
        const filter = new RegExp(`^${pkg}(/.*)?$`);
        build.onResolve({ filter }, (args) => {
          const subpath = args.path.slice(pkg.length);
          const resolved = resolveWorkspaceSubpath(pkg, subpath, repoRoot);
          if (resolved) {
            return { path: resolved };
          }
          return null;
        });
      }
    },
  };
}

/**
 * Scan direct imports in protected packages
 */
export function scanDirectViolations(
  rootDir: string,
  targetDirs: string[] = [...PROTECTED_RUNTIME_PACKAGES, ...ADDITIONAL_PURE_PACKAGES]
): { violations: DirectViolation[]; totalFilesScanned: number } {
  const violations: DirectViolation[] = [];
  let totalFilesScanned = 0;

  for (const pkg of targetDirs) {
    const fullPkgDir = resolve(rootDir, pkg);
    if (!existsSync(fullPkgDir)) continue;

    const files = findFiles(fullPkgDir);
    for (const file of files) {
      if (
        file.includes(".test.") ||
        file.includes(".spec.") ||
        file.includes("testHelpers") ||
        file.includes("testUtils") ||
        file.includes("cliTestMocks")
      ) {
        continue;
      }

      totalFilesScanned++;
      const relPath = relative(rootDir, file);
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          !/^\s*(?:import\s+|export\s+(?:[\s\w{},*]+\s+from\s+)|require\()/.test(line)
        ) {
          continue;
        }

        // Ignore type-only imports (they are erased at compile time)
        if (/^\s*(?:import|export)\s+type\s+/.test(line)) continue;

        const match = line.match(/["']([^"']+)["']/);
        if (!match) continue;
        const specifier = match[1];

        if (specifier === "@stylexjs/stylex" || specifier.startsWith("@stylexjs/stylex/")) {
          violations.push({
            file: relPath,
            line: i + 1,
            importedSpecifier: specifier,
            kind: "stylex-package",
            rule: "no-direct-stylex-in-runtime",
            rawLine: line.trim(),
          });
        } else if (isStylexCarrierSpecifier(specifier)) {
          violations.push({
            file: relPath,
            line: i + 1,
            importedSpecifier: specifier,
            kind: "styles-carrier",
            rule: "no-direct-styles-carrier-in-runtime",
            rawLine: line.trim(),
          });
        } else if (PROTECTED_RUNTIME_PACKAGES.some((p) => relPath.startsWith(p))) {
          // In core runtime packages (cli, agent-runtime, server), also check for direct web UI imports
          if (isWebUiSpecifier(specifier)) {
            // Check if exempted
            const isExempt = EXPLICIT_EXEMPTIONS.some(
              (ex) => relPath.includes(ex.entryOrFile) && specifier.includes(ex.target)
            );
            if (!isExempt) {
              violations.push({
                file: relPath,
                line: i + 1,
                importedSpecifier: specifier,
                kind: "web-ui-component",
                rule: "no-direct-web-ui-in-runtime",
                rawLine: line.trim(),
              });
            }
          }
        }
      }
    }
  }

  return { violations, totalFilesScanned };
}

/**
 * Probe a runtime entrypoint with Bun.build to inspect full transitive module graph
 */
export async function probeRuntimeEntry(
  entryFile: string,
  rootDir: string
): Promise<ProbeResult> {
  const fullEntry = resolve(rootDir, entryFile);
  if (!existsSync(fullEntry)) {
    return {
      entry: entryFile,
      inputsCount: 0,
      violations: [],
      buildErrors: [
        {
          entry: entryFile,
          stage: "probe-build",
          message: `Entry file not found: ${fullEntry}`,
        },
      ],
    };
  }

  const buildErrors: BuildError[] = [];

  try {
    const res = await Bun.build({
      entrypoints: [fullEntry],
      target: "bun",
      metafile: true,
      sourcemap: "none",
      plugins: [createBunWorkspaceResolverPlugin(rootDir)],
      external: ["chromium-bidi", "chromium-bidi/*"],
      throw: false,
    });

    if (!res.success) {
      const isExempt = BUILD_ERROR_EXEMPTIONS.some((ex) => entryFile.includes(ex.entry));
      if (!isExempt) {
        const errorDetails =
          res.logs?.map((l) => (typeof l === "string" ? l : l.message)).join("\n") ||
          "Bun.build failed";
        buildErrors.push({
          entry: entryFile,
          stage: "probe-build",
          message: errorDetails,
        });
      }
      return {
        entry: entryFile,
        inputsCount: 0,
        violations: [],
        buildErrors,
      };
    }

    if (!res.metafile || !res.metafile.inputs) {
      const isExempt = BUILD_ERROR_EXEMPTIONS.some((ex) => entryFile.includes(ex.entry));
      if (!isExempt) {
        buildErrors.push({
          entry: entryFile,
          stage: "metafile-missing",
          message: "Bun.build did not return metafile inputs",
        });
      }
      return {
        entry: entryFile,
        inputsCount: 0,
        violations: [],
        buildErrors,
      };
    }

    const inputs = Object.keys(res.metafile.inputs);
    const violations: TransitiveViolation[] = [];

    for (const input of inputs) {
      if (input.includes("terminalStyles")) continue;

      if (input.includes("@stylexjs/stylex")) {
        const isExempt = EXPLICIT_EXEMPTIONS.some(
          (ex) => entryFile.includes(ex.entryOrFile) && input.includes(ex.target)
        );
        if (!isExempt) {
          violations.push({
            entry: entryFile,
            carrier: input,
            kind: "stylex-package",
            rule: "no-transitive-stylex-in-runtime-graph",
          });
        }
      } else if (
        input.endsWith(".styles.ts") ||
        input.endsWith(".styles.tsx") ||
        input.endsWith(".styles.js")
      ) {
        const isExempt = EXPLICIT_EXEMPTIONS.some(
          (ex) => entryFile.includes(ex.entryOrFile) && input.includes(ex.target)
        );
        if (!isExempt) {
          violations.push({
            entry: entryFile,
            carrier: input,
            kind: "styles-carrier",
            rule: "no-transitive-styles-carrier-in-runtime-graph",
          });
        }
      }
    }

    return {
      entry: entryFile,
      inputsCount: inputs.length,
      violations,
      buildErrors: [],
    };
  } catch (err: any) {
    const isExempt = BUILD_ERROR_EXEMPTIONS.some((ex) => entryFile.includes(ex.entry));
    if (!isExempt) {
      buildErrors.push({
        entry: entryFile,
        stage: "probe-build",
        message: err?.message ?? String(err),
      });
    }
    return {
      entry: entryFile,
      inputsCount: 0,
      violations: [],
      buildErrors,
    };
  }
}

/**
 * Run full StyleX runtime boundary audit
 */
export async function runStylexRuntimeBoundaryGuard(
  rootDir = process.cwd(),
  entries: readonly string[] = RUNTIME_ENTRYPOINTS
): Promise<GuardSummary> {
  const { violations: directViolations, totalFilesScanned } = scanDirectViolations(rootDir);

  const transitiveViolations: TransitiveViolation[] = [];
  const buildErrors: BuildError[] = [];
  let scannedEntriesCount = 0;

  for (const entry of entries) {
    const fullEntry = resolve(rootDir, entry);
    if (!existsSync(fullEntry)) {
      // Fail closed: a missing runtime entry means the entry list is stale
      // (renamed/deleted path or typo). Silent skip would let the guard pass
      // while probing fewer entries than intended.
      buildErrors.push({
        entry,
        stage: "resolve",
        message: `runtime entry not found: ${entry} (resolved: ${fullEntry}). Update RUNTIME_ENTRYPOINTS explicitly; silent skip is forbidden.`,
      });
      continue;
    }

    scannedEntriesCount++;
    const probeResult = await probeRuntimeEntry(entry, rootDir);
    transitiveViolations.push(...probeResult.violations);
    buildErrors.push(...probeResult.buildErrors);
  }

  const passed =
    directViolations.length === 0 &&
    transitiveViolations.length === 0 &&
    buildErrors.length === 0;

  return {
    directViolations,
    transitiveViolations,
    buildErrors,
    scannedFilesCount: totalFilesScanned,
    scannedEntriesCount,
    passed,
  };
}

// CLI runner
if (import.meta.main) {
  const rootDir = process.cwd();
  console.log("🛡️  Running StyleX Runtime Boundary Guard...\n");

  const summary = await runStylexRuntimeBoundaryGuard(rootDir);

  console.log(`📦 Scanned ${summary.scannedFilesCount} runtime files across protected packages.`);
  console.log(`🔍 Probed ${summary.scannedEntriesCount} runtime entrypoints via Bun compiler module graph.\n`);

  if (summary.directViolations.length > 0) {
    console.error("❌ DIRECT IMPORT VIOLATIONS FOUND:");
    for (const v of summary.directViolations) {
      console.error(`  - ${v.file}:${v.line} [${v.rule}]`);
      console.error(`    import: "${v.importedSpecifier}"`);
      console.error(`    source: ${v.rawLine}`);
    }
    console.error("");
  }

  if (summary.transitiveViolations.length > 0) {
    console.error("❌ TRANSITIVE MODULE GRAPH VIOLATIONS FOUND:");
    for (const v of summary.transitiveViolations) {
      console.error(`  - Entry [${v.entry}] pulls StyleX carrier: ${v.carrier} [${v.rule}]`);
    }
    console.error("");
  }

  if (summary.buildErrors.length > 0) {
    console.error("❌ RUNTIME ENTRY BUILD ERRORS FOUND:");
    for (const err of summary.buildErrors) {
      console.error(`  - Entry [${err.entry}] [${err.stage}]: ${err.message}`);
    }
    console.error("");
  }

  if (summary.passed) {
    console.log("✅ StyleX Runtime Boundary Guard PASSED: 0 direct or transitive StyleX violations in runtime code.");
    process.exit(0);
  } else {
    console.error("❌ StyleX Runtime Boundary Guard FAILED.");
    process.exit(1);
  }
}
