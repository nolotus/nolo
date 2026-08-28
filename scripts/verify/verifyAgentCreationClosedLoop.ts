#!/usr/bin/env bun

import { spawnSync } from "node:child_process";

import { toErrorMessage } from "core/errorMessage";
import { readOption } from "../../packages/cli/cliEnvHelpers";
import {
  buildClosedLoopReport,
  failedStep,
  stepFromChildReport,
  type ClosedLoopStepResult,
} from "../helpers/agentClosedLoopVerify";

function usage() {
  console.log(`Usage:
  bun scripts/verify/verifyAgentCreationClosedLoop.ts --agent <agentKey> --cases-file <cases.json> --ref <pageKey[:type]> [--ref ...] [--server <url>] [--owner <userId>] [--write-wiring] [--run-live] [--max-cases <n>]

This composes:
  1. verifyAgentDocWiring.ts
  2. verifyAgentMultiTurnEval.ts

Default mode validates wiring and eval cases without writing or calling the model.
Pass --write-wiring to patch the agent before eval.
Pass --run-live to create real multi-turn eval dialogs.`);
}

function readRepeatedOption(args: string[], flag: string) {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== flag || !args[index + 1]) continue;
    values.push(args[index + 1]);
    index += 1;
  }
  return values;
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
  } catch (error) {
    throw new Error(`child command did not return JSON: bun ${commandArgs.join(" ")}\nstdout:\n${stdout}\nstderr:\n${result.stderr.trim()}`);
  }
}

function optionalFlag(args: string[], flag: string) {
  const value = readOption(args, flag);
  return value ? [flag, value] : [];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const agentKey = readOption(args, "--agent") || readOption(args, "--id");
  const casesFile = readOption(args, "--cases-file");
  const refs = readRepeatedOption(args, "--ref");
  if (!agentKey) throw new Error("Missing --agent <agentKey>.");
  if (!casesFile) throw new Error("Missing --cases-file <cases.json>.");
  if (refs.length === 0) throw new Error("Provide at least one --ref <pageKey[:type]>.");

  const writeWiring = args.includes("--write-wiring");
  const runLive = args.includes("--run-live");
  const steps: ClosedLoopStepResult[] = [];

  try {
    const wiringArgs = [
      "./scripts/verify/verifyAgentDocWiring.ts",
      "--agent",
      agentKey,
      ...refs.flatMap((ref) => ["--ref", ref]),
      ...optionalFlag(args, "--server"),
      ...optionalFlag(args, "--owner"),
      ...optionalFlag(args, "--token"),
      ...optionalFlag(args, "--machine-key"),
      ...optionalFlag(args, "--prompt-patch"),
      ...optionalFlag(args, "--prompt-patch-file"),
      ...(writeWiring ? ["--write"] : []),
    ];
    const wiringReport = childJson(wiringArgs);
    steps.push(stepFromChildReport("agent-doc-wiring", wiringReport));
  } catch (error) {
    steps.push(failedStep("agent-doc-wiring", error));
  }

  if (steps.at(-1)?.ok) {
    try {
      const evalArgs = [
        "./scripts/verify/verifyAgentMultiTurnEval.ts",
        "--agent",
        agentKey,
        "--cases-file",
        casesFile,
        ...optionalFlag(args, "--server"),
        ...optionalFlag(args, "--owner"),
        ...optionalFlag(args, "--token"),
        ...optionalFlag(args, "--machine-key"),
        ...optionalFlag(args, "--max-cases"),
        ...optionalFlag(args, "--category"),
        ...(runLive ? ["--run-live"] : []),
      ];
      const evalReport = childJson(evalArgs);
      steps.push(stepFromChildReport("agent-multiturn-eval", evalReport));
    } catch (error) {
      steps.push(failedStep("agent-multiturn-eval", error));
    }
  } else {
    steps.push({
      name: "agent-multiturn-eval",
      status: "skipped",
      ok: true,
      error: "Skipped because agent-doc-wiring failed.",
    });
  }

  const report = buildClosedLoopReport({
    dryRun: !writeWiring && !runLive,
    runLive,
    writeWiring,
    steps,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(toErrorMessage(error));
    process.exit(1);
  });
}
