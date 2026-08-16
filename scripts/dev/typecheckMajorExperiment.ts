/**
 * Opt-in full-repo typecheck against a TypeScript major via bunx.
 * Does not change the default `typescript` dependency.
 *
 * Usage:
 *   bun ./scripts/dev/typecheckMajorExperiment.ts typescript@6
 *   bun ./scripts/dev/typecheckMajorExperiment.ts typescript@7
 *   bun ./scripts/dev/typecheckMajorExperiment.ts --compare
 *
 * `--compare` runs current workspace tsc, then typescript@6 and typescript@7,
 * printing a wall-time / error-count table. Full diagnostics still stream.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..");

type RunResult = {
  label: string;
  version: string;
  realSec: number;
  errorCount: number;
  exitCode: number;
};

function usage(exitCode = 1): never {
  console.error(
    [
      "Usage:",
      "  bun ./scripts/dev/typecheckMajorExperiment.ts typescript@6",
      "  bun ./scripts/dev/typecheckMajorExperiment.ts typescript@7",
      "  bun ./scripts/dev/typecheckMajorExperiment.ts --compare",
    ].join("\n")
  );
  process.exit(exitCode);
}

function countTsErrors(text: string): number {
  let n = 0;
  for (const line of text.split("\n")) {
    if (/\berror TS\d+\b/.test(line)) n += 1;
  }
  return n;
}

function resolveVersion(argsPrefix: string[]): string {
  const r = spawnSync(argsPrefix[0]!, [...argsPrefix.slice(1), "--version"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  const line = out.split("\n").find((l) => /Version\s+/i.test(l)) ?? out.split("\n")[0] ?? "unknown";
  return line.trim();
}

function runTypecheck(label: string, argsPrefix: string[]): RunResult {
  const version = resolveVersion(argsPrefix);
  console.error(`\n=== ${label} (${version}) ===`);

  const started = performance.now();
  const r = spawnSync(argsPrefix[0]!, [...argsPrefix.slice(1), "--noEmit", "--pretty", "false"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const realSec = (performance.now() - started) / 1000;
  const combined = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (combined) process.stdout.write(combined.endsWith("\n") ? combined : `${combined}\n`);

  const errorCount = countTsErrors(combined);
  const exitCode = typeof r.status === "number" ? r.status : 1;

  console.error(
    [
      `--- summary: ${label} ---`,
      `version: ${version}`,
      `real: ${realSec.toFixed(2)}s`,
      `errors: ${errorCount}`,
      `exit: ${exitCode}`,
    ].join("\n")
  );

  return { label, version, realSec, errorCount, exitCode };
}

function workspaceTscPrefix(): string[] {
  const local = join(repoRoot, "node_modules", ".bin", "tsc");
  if (existsSync(local)) return [local];
  return ["bunx", "tsc"];
}

function bunxTypescriptPrefix(spec: string): string[] {
  // e.g. typescript@6 / typescript@7 — keep the string in package.json for contract tests
  return ["bunx", "-p", spec, "tsc"];
}

function printCompareTable(rows: RunResult[]): void {
  console.error("\n=== typecheck major compare ===");
  const header = ["label".padEnd(18), "version".padEnd(28), "real(s)".padStart(8), "errors".padStart(8), "exit".padStart(5)].join("  ");
  console.error(header);
  console.error("-".repeat(header.length));
  for (const row of rows) {
    console.error(
      [
        row.label.padEnd(18),
        row.version.slice(0, 28).padEnd(28),
        row.realSec.toFixed(2).padStart(8),
        String(row.errorCount).padStart(8),
        String(row.exitCode).padStart(5),
      ].join("  ")
    );
  }
  console.error(
    "\nNote: experiments stay opt-in until the full-repo baseline is clean enough for default gates."
  );
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) usage(args.length === 0 ? 1 : 0);

  if (args[0] === "--compare") {
    const rows: RunResult[] = [
      runTypecheck("workspace (default)", workspaceTscPrefix()),
      runTypecheck("typescript@6", bunxTypescriptPrefix("typescript@6")),
      runTypecheck("typescript@7", bunxTypescriptPrefix("typescript@7")),
    ];
    printCompareTable(rows);
    // non-zero if any run failed (expected while baseline is dirty)
    process.exit(rows.some((r) => r.exitCode !== 0) ? 1 : 0);
  }

  const spec = args[0];
  if (!spec || !/^typescript@\d/.test(spec)) usage();

  const result = runTypecheck(spec, bunxTypescriptPrefix(spec));
  process.exit(result.exitCode);
}

main();
