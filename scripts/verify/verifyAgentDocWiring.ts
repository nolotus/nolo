#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { toErrorMessage } from "core/errorMessage";
import { apiGet, apiPost } from "../helpers/apiHelpers";
import {
  parseUserIdFromAuthToken,
  readOption,
  resolveAuthToken,
  resolveServerUrl,
} from "../../packages/cli/cliEnvHelpers";
import {
  buildAgentDocWiringReport,
  type AgentDocReferenceSpec,
} from "../helpers/agentDocWiring";

const DEFAULT_SERVER = "https://nolo.chat";

function usage() {
  console.log(`Usage:
  bun scripts/verify/verifyAgentDocWiring.ts --agent <agentKey> --ref <pageKey[:type]> [--ref <pageKey[:type]> ...] [--prompt-patch <text> | --prompt-patch-file <path>] [--server https://nolo.chat] [--owner <userId>] [--write]

Examples:
  bun scripts/verify/verifyAgentDocWiring.ts \\
    --agent agent-0e95801d90-01NIHAISHATCMMVP000001 \\
    --ref page-0e95801d90-01SK00000001DGUPMO:instruction \\
    --ref page-0e95801d90-NIHAISHA-TCM-DOC-INDEX-001:knowledge

Default mode is read-only. Pass --write to update the agent record.`);
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

export function parseReferenceSpec(raw: string): AgentDocReferenceSpec {
  const [dbKeyPart, typePart] = raw.split(":");
  const dbKey = dbKeyPart?.trim();
  if (!dbKey) throw new Error(`Invalid --ref ${JSON.stringify(raw)}: missing dbKey.`);
  return {
    dbKey,
    ...(typePart?.trim() ? { type: typePart.trim() } : {}),
  };
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
    throw new Error(`Auth token belongs to ${authenticatedUserId}, but this wiring script is scoped to owner ${ownerUserId}. Pass --owner or --token explicitly.`);
  }
  return ownerUserId;
}

function resolvePromptPatch(args: string[]) {
  const promptPatch = readOption(args, "--prompt-patch");
  const promptPatchFile = readOption(args, "--prompt-patch-file");
  if (promptPatch && promptPatchFile) {
    throw new Error("--prompt-patch and --prompt-patch-file are mutually exclusive.");
  }
  if (promptPatchFile) return readFileSync(promptPatchFile, "utf8").trim();
  return promptPatch?.trim() || undefined;
}

async function readRecord<T = any>(server: string, authToken: string, dbKey: string): Promise<T | null> {
  const response = await apiGet<T>(`${server}/api/v1/db/read/${encodeURIComponent(dbKey)}`, authToken);
  if (response.status === 404) return null;
  if (!response.ok) {
    const authHint = response.status === 401
      ? " Check that the token belongs to this server and owner, or pass --token explicitly."
      : "";
    throw new Error(`read ${dbKey} failed (${response.status}): ${JSON.stringify(response.data)}${authHint}`);
  }
  return ((response.data as any)?.data ?? response.data) as T;
}

async function writeRecord(server: string, authToken: string, userId: string, dbKey: string, data: Record<string, unknown>) {
  const response = await apiPost(
    `${server}/api/v1/db/write/`,
    { customKey: dbKey, userId, data: { ...data, dbKey } },
    authToken,
  );
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`write ${dbKey} failed (${response.status}): ${JSON.stringify(response.data)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const agentKey = readOption(args, "--agent") || readOption(args, "--id");
  if (!agentKey) throw new Error("Missing --agent <agentKey>.");
  const references = readRepeatedOption(args, "--ref").map(parseReferenceSpec);
  if (references.length === 0) throw new Error("Provide at least one --ref <pageKey[:type]>.");

  const server = (readOption(args, "--server") || resolveServerUrl(process.env) || DEFAULT_SERVER).replace(/\/+$/, "");
  const authToken = resolveToken(args);
  const ownerUserId = resolveOwnerUserId(args, authToken);
  const promptPatch = resolvePromptPatch(args);
  const write = args.includes("--write");

  const [agent, ...docs] = await Promise.all([
    readRecord(server, authToken, agentKey),
    ...references.map((ref) => readRecord(server, authToken, ref.dbKey)),
  ]);
  const docsByKey = Object.fromEntries(references.map((ref, index) => [ref.dbKey, docs[index]]));
  const report = buildAgentDocWiringReport({
    server,
    ownerUserId,
    agentKey,
    references,
    promptPatch,
    write,
    agent,
    docsByKey,
  });

  if (write && report.patch) {
    await writeRecord(server, authToken, ownerUserId, agentKey, report.patch);
    const nextAgent = await readRecord(server, authToken, agentKey);
    const nextReport = buildAgentDocWiringReport({
      server,
      ownerUserId,
      agentKey,
      references,
      promptPatch,
      write,
      agent: nextAgent,
      docsByKey,
    });
    console.log(JSON.stringify({ ...nextReport, wrote: true }, null, 2));
    process.exit(nextReport.ok ? 0 : 1);
  }

  console.log(JSON.stringify({ ...report, wrote: false }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(toErrorMessage(error));
    process.exit(1);
  });
}
