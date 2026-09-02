import { describe, expect, it, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  scanDirectViolations,
  probeRuntimeEntry,
  runStylexRuntimeBoundaryGuard,
  isStylexCarrierSpecifier,
  isWebUiSpecifier,
  PROTECTED_RUNTIME_PACKAGES,
  RUNTIME_ENTRYPOINTS,
} from "./stylexRuntimeBoundaryGuard";

const TEMP_PROBE_DIR = resolve(process.cwd(), "scripts/dev/.temp-runtime-boundary-probe");

function cleanupTempDir() {
  if (existsSync(TEMP_PROBE_DIR)) {
    rmSync(TEMP_PROBE_DIR, { recursive: true, force: true });
  }
}

describe("StyleX runtime boundary guard", () => {
  afterEach(() => {
    cleanupTempDir();
  });

  it(
    "passes repo-wide baseline check with 0 direct or transitive StyleX violations in runtime code",
    async () => {
      const summary = await runStylexRuntimeBoundaryGuard(process.cwd());
      if (!summary.passed) {
        console.log("TEST 1 FAILED SUMMARY:", {
          directViolations: summary.directViolations,
          transitiveViolations: summary.transitiveViolations,
          buildErrors: summary.buildErrors,
        });
      }
      expect(summary.directViolations).toEqual([]);
      expect(summary.transitiveViolations).toEqual([]);
      expect(summary.buildErrors).toEqual([]);
      expect(summary.scannedFilesCount).toBeGreaterThan(500);
      expect(summary.scannedEntriesCount).toBeGreaterThanOrEqual(10);
      expect(summary.passed).toBe(true);
    },
    30_000
  );

  it(
    "fails closed when a declared runtime entry is missing (no silent skip)",
    async () => {
      const summary = await runStylexRuntimeBoundaryGuard(process.cwd(), [
        "packages/__nonexistent_runtime__/entry.ts",
      ]);

      expect(summary.passed).toBe(false);
      expect(summary.scannedEntriesCount).toBe(0);
      expect(summary.buildErrors).toHaveLength(1);
      expect(summary.buildErrors[0]?.stage).toBe("resolve");
      expect(summary.buildErrors[0]?.message).toContain("__nonexistent_runtime__");
    },
    30_000
  );

  describe("specifier identification helpers", () => {
    it("correctly identifies StyleX carriers", () => {
      expect(isStylexCarrierSpecifier("@stylexjs/stylex")).toBe(true);
      expect(isStylexCarrierSpecifier("@stylexjs/stylex/lib/StyleXSheet")).toBe(true);
      expect(isStylexCarrierSpecifier("./button.styles")).toBe(true);
      expect(isStylexCarrierSpecifier("./button.styles.ts")).toBe(true);
      expect(isStylexCarrierSpecifier("./button.styles.tsx")).toBe(true);
      expect(isStylexCarrierSpecifier("render/web/ui/toast.styles")).toBe(true);
    });

    it("does not flag terminalStyles (ANSI CLI formatting)", () => {
      expect(isStylexCarrierSpecifier("./terminalStyles")).toBe(false);
      expect(isStylexCarrierSpecifier("./terminalStyles.ts")).toBe(false);
      expect(isStylexCarrierSpecifier("cli/client/terminalStyles")).toBe(false);
    });

    it("correctly identifies Web UI component paths", () => {
      expect(isWebUiSpecifier("render/web/ui/Toast")).toBe(true);
      expect(isWebUiSpecifier("chat/web/ChatMessage")).toBe(true);
      expect(isWebUiSpecifier("ai/agent/web/AgentForm")).toBe(true);
    });

    it("allows pure stores and decoupled non-UI modules", () => {
      expect(isWebUiSpecifier("render/web/ui/toastStore")).toBe(false);
      expect(isWebUiSpecifier("ai/agent/web/agentDisplayUtils")).toBe(false);
      expect(isWebUiSpecifier("ai/agent/avatarUtils")).toBe(false);
    });
  });

  describe("machine proof - direct import violation detection", () => {
    it("catches direct StyleX package import in runtime code -> FAILS -> recovers on removal", () => {
      cleanupTempDir();
      mkdirSync(TEMP_PROBE_DIR, { recursive: true });

      const testPkgRel = "scripts/dev/.temp-runtime-boundary-probe";
      const badFile = join(TEMP_PROBE_DIR, "badRuntimeModule.ts");

      // Inject a direct import of @stylexjs/stylex
      writeFileSync(
        badFile,
        `import * as stylex from "@stylexjs/stylex";\nexport const styles = stylex.create({ root: {} });\n`,
        "utf8"
      );

      const scanBad = scanDirectViolations(process.cwd(), [testPkgRel]);
      expect(scanBad.violations.length).toBe(1);
      expect(scanBad.violations[0].importedSpecifier).toBe("@stylexjs/stylex");
      expect(scanBad.violations[0].kind).toBe("stylex-package");
      expect(scanBad.violations[0].rule).toBe("no-direct-stylex-in-runtime");

      // Remove the offending file
      rmSync(badFile);

      const scanClean = scanDirectViolations(process.cwd(), [testPkgRel]);
      expect(scanClean.violations).toEqual([]);
    });

    it("catches direct styles-carrier import in runtime code -> FAILS -> recovers on removal", () => {
      cleanupTempDir();
      mkdirSync(TEMP_PROBE_DIR, { recursive: true });

      const testPkgRel = "scripts/dev/.temp-runtime-boundary-probe";
      const badFile = join(TEMP_PROBE_DIR, "badService.ts");

      // Inject a direct import of a .styles.ts carrier
      writeFileSync(
        badFile,
        `import { buttonStyles } from "./button.styles";\nexport function doWork() { return buttonStyles; }\n`,
        "utf8"
      );

      const scanBad = scanDirectViolations(process.cwd(), [testPkgRel]);
      expect(scanBad.violations.length).toBe(1);
      expect(scanBad.violations[0].importedSpecifier).toBe("./button.styles");
      expect(scanBad.violations[0].kind).toBe("styles-carrier");
      expect(scanBad.violations[0].rule).toBe("no-direct-styles-carrier-in-runtime");

      // Remove the offending file
      rmSync(badFile);

      const scanClean = scanDirectViolations(process.cwd(), [testPkgRel]);
      expect(scanClean.violations).toEqual([]);
    });
  });

  describe("machine proof - transitive module graph violation detection", () => {
    it("catches transitive import chain (entry -> intermediate -> styles.ts) -> FAILS -> recovers on removal", async () => {
      cleanupTempDir();
      mkdirSync(TEMP_PROBE_DIR, { recursive: true });

      const entryFile = join(TEMP_PROBE_DIR, "entry.ts");
      const intermediateFile = join(TEMP_PROBE_DIR, "intermediate.ts");
      const stylesFile = join(TEMP_PROBE_DIR, "badge.styles.ts");

      // Set up transitive chain: entry -> intermediate -> badge.styles.ts
      writeFileSync(
        stylesFile,
        `import * as stylex from "@stylexjs/stylex";\nexport const styles = stylex.create({ root: { color: "red" } });\n`,
        "utf8"
      );
      writeFileSync(
        intermediateFile,
        `import { styles } from "./badge.styles";\nexport function getBadgeStyle() { return styles; }\n`,
        "utf8"
      );
      writeFileSync(
        entryFile,
        `import { getBadgeStyle } from "./intermediate";\nconsole.log(getBadgeStyle());\n`,
        "utf8"
      );

      // Probe entry with Bun.build
      const relEntry = join("scripts/dev/.temp-runtime-boundary-probe", "entry.ts");
      const probeBad = await probeRuntimeEntry(relEntry, process.cwd());

      expect(probeBad.violations.length).toBeGreaterThan(0);
      const styleCarrierViolation = probeBad.violations.find((v) =>
        v.carrier.includes("badge.styles.ts")
      );
      expect(styleCarrierViolation).toBeDefined();
      expect(styleCarrierViolation?.kind).toBe("styles-carrier");
      expect(styleCarrierViolation?.rule).toBe("no-transitive-styles-carrier-in-runtime-graph");

      // Remove the transitive StyleX import from intermediate
      writeFileSync(
        intermediateFile,
        `export function getBadgeStyle() { return { color: "red" }; }\n`,
        "utf8"
      );

      const probeClean = await probeRuntimeEntry(relEntry, process.cwd());
      expect(probeClean.violations).toEqual([]);
    });

    it("catches build failure on unresolved import -> FAILS with buildErrors -> recovers on fix", async () => {
      cleanupTempDir();
      mkdirSync(TEMP_PROBE_DIR, { recursive: true });

      const entryFile = join(TEMP_PROBE_DIR, "unresolved-entry.ts");

      // Entry imports a non-existent module
      writeFileSync(
        entryFile,
        `import { nonExistentFunction } from "./non-existent-module-xyz";\nconsole.log(nonExistentFunction());\n`,
        "utf8"
      );

      const relEntry = join("scripts/dev/.temp-runtime-boundary-probe", "unresolved-entry.ts");
      const probeBad = await probeRuntimeEntry(relEntry, process.cwd());

      expect(probeBad.buildErrors.length).toBeGreaterThan(0);
      const buildErr = probeBad.buildErrors.find((e) => e.entry === relEntry);
      expect(buildErr).toBeDefined();
      expect(buildErr?.stage).toBe("probe-build");
      expect(buildErr?.message).toContain("non-existent-module-xyz");

      // Fix entry to resolve cleanly
      writeFileSync(
        entryFile,
        `export function validFunction() { return 42; }\nconsole.log(validFunction());\n`,
        "utf8"
      );

      const probeClean = await probeRuntimeEntry(relEntry, process.cwd());
      expect(probeClean.buildErrors).toEqual([]);
      expect(probeClean.violations).toEqual([]);
      expect(probeClean.inputsCount).toBeGreaterThanOrEqual(1);
    });
  });
});
