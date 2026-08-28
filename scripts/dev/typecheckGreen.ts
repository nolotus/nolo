/**
 * Parallel green typecheck runner.
 *
 * Runs each green gate concurrently, prints labeled per-gate diagnostics
 * (in fixed gate order), then a wall-time / exit summary table.
 * Exit code is non-zero if any gate fails.
 *
 * Usage: bun ./scripts/dev/typecheckGreen.ts
 * Invoked by package.json script `typecheck:green`.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..");

/** Stable order for output + summary (matches historical sequential chain). */
export const GREEN_TYPECHECK_GATES = [
  "typecheck:build-tools",
  "typecheck:scripts-dev",
  "typecheck:core",
  "typecheck:server",
  "typecheck:agent-runtime",
  "typecheck:lab",
  "typecheck:ai",
] as const;

export type GreenGateName = (typeof GREEN_TYPECHECK_GATES)[number];

export type GateResult = {
  gate: GreenGateName;
  realSec: number;
  exitCode: number;
  output: string;
};

function runGate(gate: GreenGateName): Promise<GateResult> {
  const started = performance.now();
  return new Promise((resolve) => {
    const child = spawn("bun", ["run", gate], {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      output += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      output += chunk;
    });

    child.on("error", (err) => {
      const realSec = (performance.now() - started) / 1000;
      resolve({
        gate,
        realSec,
        exitCode: 1,
        output: `${output}${output.endsWith("\n") ? "" : "\n"}[typecheck:green] failed to spawn ${gate}: ${err.message}\n`,
      });
    });

    child.on("close", (code, signal) => {
      const realSec = (performance.now() - started) / 1000;
      const exitCode =
        typeof code === "number" ? code : signal ? 1 : 1;
      resolve({ gate, realSec, exitCode, output });
    });
  });
}

export async function runGreenTypechecks(
  gates: readonly GreenGateName[] = GREEN_TYPECHECK_GATES
): Promise<{ results: GateResult[]; wallSec: number; failed: GateResult[] }> {
  const wallStart = performance.now();
  const results = await Promise.all(gates.map((gate) => runGate(gate)));
  const wallSec = (performance.now() - wallStart) / 1000;
  const failed = results.filter((r) => r.exitCode !== 0);
  return { results, wallSec, failed };
}

function printResults(results: GateResult[], wallSec: number): void {
  for (const result of results) {
    const banner = `=== ${result.gate} (real ${result.realSec.toFixed(2)}s, exit ${result.exitCode}) ===`;
    process.stdout.write(`${banner}\n`);
    if (result.output) {
      process.stdout.write(
        result.output.endsWith("\n") ? result.output : `${result.output}\n`
      );
    }
  }

  process.stdout.write("\n=== typecheck:green summary ===\n");
  process.stdout.write(
    ["gate".padEnd(28), "real(s)".padStart(8), "exit".padStart(6)].join(" ") +
      "\n"
  );
  for (const result of results) {
    process.stdout.write(
      [
        result.gate.padEnd(28),
        result.realSec.toFixed(2).padStart(8),
        String(result.exitCode).padStart(6),
      ].join(" ") + "\n"
    );
  }
  const failedNames = results
    .filter((r) => r.exitCode !== 0)
    .map((r) => r.gate);
  process.stdout.write(
    `wall: ${wallSec.toFixed(2)}s  failed: ${
      failedNames.length === 0 ? "(none)" : failedNames.join(", ")
    }\n`
  );
}

const isMain =
  typeof Bun !== "undefined"
    ? Boolean(Bun.main && import.meta.path === Bun.main)
    : process.argv[1]?.endsWith("typecheckGreen.ts") === true;

if (isMain) {
  const { results, wallSec, failed } = await runGreenTypechecks();
  printResults(results, wallSec);
  process.exit(failed.length === 0 ? 0 : 1);
}
