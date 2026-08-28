#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { toErrorMessage } from "core/errorMessage";
import { readOption } from "../../packages/cli/cliEnvHelpers";
import {
  buildClosedLoopArgsFromSpec,
  parseAgentCreationSpec,
  redactClosedLoopArgs,
  type AgentCreationSpecOverrides,
} from "../helpers/agentCreationSpec";
import { buildAgentCreationHumanSummary } from "../helpers/agentCreationSummary";

function usage() {
  console.log(`Usage:
  bun scripts/verify/verifyAgentCreationSpec.ts --spec-file <spec.json> [--server <url>] [--owner <userId>] [--write-wiring] [--run-live]

The spec describes an existing-docs agent creation loop:
  - agent key
  - references to attach/verify
  - multi-turn eval cases file
  - optional server/owner/category/maxCases defaults

Default mode validates the spec and runs the closed-loop in dry-run mode.
Pass --write-wiring to patch the agent.
Pass --run-live to create real multi-turn eval dialogs.`);
}

function readPositiveIntegerOption(args: string[], flag: string) {
  const value = readOption(args, flag);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} must be a positive integer.`);
  return parsed;
}

function childJson(commandArgs: string[]) {
  const result = spawnSync("bun", commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  });
  if (result.error) throw result.error;
  const stdout = result.stdout.trim();
  if (!stdout) {
    throw new Error(result.stderr.trim() || `child command produced no JSON: bun ${commandArgs.join(" ")}`);
  }
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`child command did not return JSON: bun ${commandArgs.join(" ")}\nstdout:\n${stdout}\nstderr:\n${result.stderr.trim()}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const specFile = readOption(args, "--spec-file");
  if (!specFile) throw new Error("Missing --spec-file <spec.json>.");

  const spec = parseAgentCreationSpec(JSON.parse(readFileSync(specFile, "utf8")));
  const overrides: AgentCreationSpecOverrides = {
    server: readOption(args, "--server"),
    owner: readOption(args, "--owner"),
    agent: readOption(args, "--agent") || readOption(args, "--id"),
    casesFile: readOption(args, "--cases-file"),
    token: readOption(args, "--token"),
    machineKey: readOption(args, "--machine-key"),
    promptPatch: readOption(args, "--prompt-patch"),
    promptPatchFile: readOption(args, "--prompt-patch-file"),
    category: readOption(args, "--category"),
    maxCases: readPositiveIntegerOption(args, "--max-cases"),
    writeWiring: args.includes("--write-wiring"),
    runLive: args.includes("--run-live"),
  };

  const closedLoopArgs = buildClosedLoopArgsFromSpec(spec, overrides);
  const closedLoop = childJson(closedLoopArgs);
  const humanSummary = buildAgentCreationHumanSummary({
    spec,
    specFile,
    closedLoop,
    writeWiring: Boolean(overrides.writeWiring),
    runLive: Boolean(overrides.runLive),
  });
  const report = {
    ok: Boolean(closedLoop?.ok),
    specFile,
    specName: spec.name,
    humanSummary,
    dryRun: !overrides.writeWiring && !overrides.runLive,
    runLive: Boolean(overrides.runLive),
    writeWiring: Boolean(overrides.writeWiring),
    command: {
      runner: "verifyAgentCreationClosedLoop.ts",
      args: redactClosedLoopArgs(closedLoopArgs),
    },
    closedLoop,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(toErrorMessage(error));
    process.exit(1);
  });
}
