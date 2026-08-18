#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { toErrorMessage } from "core/errorMessage";
import {
  parseUserIdFromAuthToken,
  readOption,
  resolveAuthToken,
  resolveServerUrl,
} from "../../packages/cli/cliEnvHelpers";
import { runAgent } from "../helpers/agentHelpers";
import {
  evaluateCaseOutputs,
  summarizeEvalResults,
  validateEvalCases,
  type AgentEvalCase,
  type AgentEvalCaseResult,
} from "../helpers/agentMultiTurnEval";

const DEFAULT_SERVER = "https://nolo.chat";

function usage() {
  console.log(`Usage:
  bun scripts/verify/verifyAgentMultiTurnEval.ts --agent <agentKey> --cases-file <cases.json> [--server https://nolo.chat] [--owner <userId>] [--max-cases <n>] [--run-live]

Default mode is dry-run: it validates the cases file but does not call the model.
Pass --run-live to create real agent dialogs and evaluate the outputs.`);
}

function readProfileToken() {
  const configPath = join(homedir(), ".nolo", "config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const profile = config.profiles?.[config.currentProfile];
  return typeof profile?.authToken === "string" ? profile.authToken : "";
}

function resolveToken(args: string[]) {
  const explicit = readOption(args, "--token") || readOption(args, "--machine-key");
  if (explicit) return explicit;
  const envToken = resolveAuthToken(process.env, ["NOLO_AUTH_TOKEN"]);
  if (envToken && parseUserIdFromAuthToken(envToken)) return envToken;
  const profileToken = readProfileToken();
  if (profileToken) return profileToken;
  throw new Error("Missing user auth token. Set AUTH_TOKEN/NOLO_AUTH_TOKEN to a user token or log in with nolo.");
}

function resolveOwnerUserId(args: string[], authToken: string) {
  const authenticatedUserId = parseUserIdFromAuthToken(authToken);
  if (!authenticatedUserId) {
    throw new Error("Auth token could not be decoded to a userId. Pass --token for the owner account.");
  }
  const ownerUserId = readOption(args, "--owner") || authenticatedUserId;
  if (authenticatedUserId !== ownerUserId) {
    throw new Error(`Auth token belongs to ${authenticatedUserId}, but this eval is scoped to owner ${ownerUserId}. Pass --owner or --token explicitly.`);
  }
  return ownerUserId;
}

function parsePositiveInteger(raw: string | undefined, fallback: number) {
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error("--max-cases must be a positive integer.");
  return value;
}

function readCases(path: string): AgentEvalCase[] {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("Cases file must contain a JSON array.");
  validateEvalCases(parsed);
  return parsed;
}

async function runCase(args: {
  server: string;
  authToken: string;
  agentKey: string;
  testCase: AgentEvalCase;
  category?: string;
}): Promise<AgentEvalCaseResult> {
  const outputs: Array<{ output: string; dialogId?: string }> = [];
  let continueDialogId = "";

  for (const turn of args.testCase.turns) {
    const result = await runAgent(
      args.server,
      args.authToken,
      args.agentKey,
      turn.input,
      continueDialogId || undefined,
      {
        category: args.category,
      },
    );
    continueDialogId = result.dialogId || continueDialogId;
    outputs.push({ output: result.content, dialogId: result.dialogId || continueDialogId });
  }

  return evaluateCaseOutputs(args.testCase, outputs);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const agentKey = readOption(args, "--agent") || readOption(args, "--id");
  if (!agentKey) throw new Error("Missing --agent <agentKey>.");
  const casesFile = readOption(args, "--cases-file");
  if (!casesFile) throw new Error("Missing --cases-file <cases.json>.");

  const server = (readOption(args, "--server") || resolveServerUrl(process.env) || DEFAULT_SERVER).replace(/\/+$/, "");
  const authToken = resolveToken(args);
  const ownerUserId = resolveOwnerUserId(args, authToken);
  const runLive = args.includes("--run-live");
  const maxCases = parsePositiveInteger(readOption(args, "--max-cases"), Number.MAX_SAFE_INTEGER);
  const category = readOption(args, "--category") || "agent-multiturn-eval";
  const cases = readCases(casesFile).slice(0, maxCases);

  if (!runLive) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      runLive: false,
      server,
      ownerUserId,
      agentKey,
      cases: cases.map((testCase) => ({
        id: testCase.id,
        title: testCase.title,
        turns: testCase.turns.length,
      })),
      summary: {
        cases: cases.length,
        turns: cases.reduce((total, testCase) => total + testCase.turns.length, 0),
      },
    }, null, 2));
    return;
  }

  const results: AgentEvalCaseResult[] = [];
  for (const testCase of cases) {
    try {
      results.push(await runCase({ server, authToken, agentKey, testCase, category }));
    } catch (error) {
      results.push({
        id: testCase.id,
        title: testCase.title,
        ok: false,
        turns: [],
        error: toErrorMessage(error),
      });
    }
  }

  const summary = summarizeEvalResults(results);
  console.log(JSON.stringify({
    ok: summary.failedCases === 0,
    dryRun: false,
    runLive: true,
    server,
    ownerUserId,
    agentKey,
    category,
    summary,
    results,
  }, null, 2));
  process.exit(summary.failedCases === 0 ? 0 : 1);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(toErrorMessage(error));
    process.exit(1);
  });
}
