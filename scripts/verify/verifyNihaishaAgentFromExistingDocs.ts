#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { toErrorMessage } from "core/errorMessage";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { apiGet, apiPost } from "../helpers/apiHelpers";
import {
  parseUserIdFromAuthToken,
  readOption,
  resolveAuthToken,
  resolveServerUrl,
} from "../../packages/cli/cliEnvHelpers";

const DEFAULT_SERVER = "https://nolo.chat";
const DEFAULT_OWNER_USER_ID = "0e95801d90";
const DEFAULT_AGENT_KEY = "agent-0e95801d90-01NIHAISHATCMMVP000001";
const DEFAULT_SKILL_KEY = "page-0e95801d90-01SK00000001DGUPMO";
const DEFAULT_INDEX_KEY = "page-0e95801d90-NIHAISHA-TCM-DOC-INDEX-001";
const EXPECTED_MODEL = "deepseek-v4-pro";
const EXPECTED_PROVIDER = "deepseek";

export type VerifySeverity = "ok" | "warn" | "fail";

export type VerifyCheck = {
  id: string;
  severity: VerifySeverity;
  message: string;
  actual?: unknown;
  expected?: unknown;
};

export type NihaishaVerifyReport = {
  ok: boolean;
  write: boolean;
  server: string;
  ownerUserId: string;
  agentKey: string;
  skillKey: string;
  indexKey: string;
  expected: {
    model: string;
    provider: string;
    referenceKeys: string[];
  };
  checks: VerifyCheck[];
  summary: {
    ok: number;
    warn: number;
    fail: number;
  };
  patch?: Record<string, unknown>;
};

type NihaishaVerifyInput = {
  server: string;
  ownerUserId: string;
  agentKey: string;
  skillKey: string;
  indexKey: string;
  write: boolean;
  agent: any;
  skillDoc: any;
  indexDoc: any;
};

function countBySeverity(checks: VerifyCheck[]) {
  return {
    ok: checks.filter((check) => check.severity === "ok").length,
    warn: checks.filter((check) => check.severity === "warn").length,
    fail: checks.filter((check) => check.severity === "fail").length,
  };
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function refKey(ref: any) {
  return typeof ref?.dbKey === "string" ? ref.dbKey : "";
}

function textIncludes(record: any, needle: string) {
  const haystack = [
    record?.title,
    record?.content,
    record?.text,
    record?.meta?.skillConfig?.promptPatch,
    record?.meta?.skillConfig?.description,
  ]
    .filter((item): item is string => typeof item === "string")
    .join("\n");
  return haystack.includes(needle);
}

function hasReadableBody(record: any) {
  return typeof record?.content === "string" && record.content.trim().length > 0;
}

function buildAgentPatch(input: NihaishaVerifyInput) {
  const currentRefs = asArray(input.agent?.references);
  const expectedRefs = [
    {
      dbKey: input.skillKey,
      title: input.skillDoc?.title || "倪海厦课程研读助手 Skill",
      type: "instruction",
    },
    {
      dbKey: input.indexKey,
      title: input.indexDoc?.title || "倪海厦 TCM Agent Pack Docs Index",
      type: "knowledge",
    },
  ];
  const promptPatch =
    `\n\n当前资料已经作为 Nolo docs 提供。默认入口是总索引 ${input.indexKey} 和运行 skill ${input.skillKey}。` +
    "回答具体课程、方证、症状、截图证据或出处问题时，先读取总索引，再读取对应 doc；资料不足时说明不足，不要编造出处或医疗建议。";
  const prompt = String(input.agent?.prompt ?? "");
  const hasExistingDocsPrompt =
    prompt.includes("当前资料已经作为 Nolo docs 提供") ||
    prompt.includes("当前资料已经导入为 Nolo docs");

  return {
    ...input.agent,
    model: EXPECTED_MODEL,
    provider: EXPECTED_PROVIDER,
    tools: Array.from(new Set([...asArray(input.agent?.tools), "readDoc", "readSkillDoc"])),
    references: expectedRefs,
    prompt: hasExistingDocsPrompt
      ? prompt
      : `${prompt}${promptPatch}`,
    updatedAt: Date.now(),
    meta: {
      ...asRecordOrEmpty(input.agent?.meta),
      nihaishaExistingDocsVerify: {
        verifiedAt: new Date().toISOString(),
        skillKey: input.skillKey,
        indexKey: input.indexKey,
        previousReferenceKeys: currentRefs.map(refKey).filter(Boolean),
      },
    },
  };
}

export function buildNihaishaVerifyReport(input: NihaishaVerifyInput): NihaishaVerifyReport {
  const checks: VerifyCheck[] = [];
  const references = asArray(input.agent?.references);
  const refKeys = references.map(refKey).filter(Boolean);
  const expectedRefKeys = [input.skillKey, input.indexKey];
  const tools = asArray(input.agent?.tools).map(String);

  checks.push(input.agent
    ? { id: "agent.exists", severity: "ok", message: "Agent record is readable." }
    : { id: "agent.exists", severity: "fail", message: "Agent record is missing or unreadable." });
  checks.push(input.skillDoc
    ? { id: "skill.exists", severity: "ok", message: "Skill doc is readable." }
    : { id: "skill.exists", severity: "fail", message: "Skill doc is missing or unreadable." });
  checks.push(input.indexDoc
    ? { id: "index.exists", severity: "ok", message: "Index doc is readable." }
    : { id: "index.exists", severity: "fail", message: "Index doc is missing or unreadable." });

  if (input.agent) {
    checks.push(input.agent?.model === EXPECTED_MODEL
      ? { id: "agent.model", severity: "ok", message: "Agent model matches.", actual: input.agent?.model }
      : { id: "agent.model", severity: "fail", message: "Agent model should be deepseek-v4-pro.", actual: input.agent?.model, expected: EXPECTED_MODEL });
    checks.push(input.agent?.provider === EXPECTED_PROVIDER
      ? { id: "agent.provider", severity: "ok", message: "Agent provider matches.", actual: input.agent?.provider }
      : { id: "agent.provider", severity: "fail", message: "Agent provider should be deepseek.", actual: input.agent?.provider, expected: EXPECTED_PROVIDER });
    checks.push(expectedRefKeys.every((key) => refKeys.includes(key))
      ? { id: "agent.references.required", severity: "ok", message: "Agent references include skill and index docs.", actual: refKeys }
      : { id: "agent.references.required", severity: "fail", message: "Agent references must include exactly the skill/index entry points for P0.", actual: refKeys, expected: expectedRefKeys });
    checks.push(refKeys.length === expectedRefKeys.length && expectedRefKeys.every((key) => refKeys.includes(key))
      ? { id: "agent.references.flat", severity: "ok", message: "Agent references are flat: skill doc + index doc only.", actual: refKeys }
      : { id: "agent.references.flat", severity: "warn", message: "Agent references should stay flat for P0; extra refs belong in the index doc.", actual: refKeys, expected: expectedRefKeys });
    checks.push(tools.includes("readDoc") || tools.includes("readSkillDoc")
      ? { id: "agent.tools.read", severity: "ok", message: "Agent has a doc-reading tool.", actual: tools }
      : { id: "agent.tools.read", severity: "fail", message: "Agent needs readDoc or readSkillDoc.", actual: tools, expected: ["readDoc", "readSkillDoc"] });
  }

  if (input.skillDoc) {
    checks.push(hasReadableBody(input.skillDoc)
      ? { id: "skill.body", severity: "ok", message: "Skill doc has readable content." }
      : { id: "skill.body", severity: "fail", message: "Skill doc has no readable content." });
    checks.push(input.skillDoc?.meta?.skillConfig
      ? { id: "skill.config", severity: "ok", message: "Skill doc carries meta.skillConfig." }
      : { id: "skill.config", severity: "warn", message: "Skill doc is readable, but meta.skillConfig is missing." });
    checks.push(textIncludes(input.skillDoc, "医疗") || textIncludes(input.skillDoc, "试药") || textIncludes(input.skillDoc, "安全")
      ? { id: "skill.safety", severity: "ok", message: "Skill doc appears to mention safety/medical boundaries." }
      : { id: "skill.safety", severity: "warn", message: "Skill doc should mention safety boundaries and not encourage self-medication." });
  }

  if (input.indexDoc) {
    checks.push(hasReadableBody(input.indexDoc)
      ? { id: "index.body", severity: "ok", message: "Index doc has readable content." }
      : { id: "index.body", severity: "fail", message: "Index doc has no readable content." });
    checks.push(textIncludes(input.indexDoc, input.skillKey)
      ? { id: "index.skill-link", severity: "ok", message: "Index doc points to the skill doc." }
      : { id: "index.skill-link", severity: "warn", message: "Index doc should mention the runtime skill doc key.", expected: input.skillKey });
    checks.push(textIncludes(input.indexDoc, "Core Reference Docs") || textIncludes(input.indexDoc, "All Markdown Docs")
      ? { id: "index.navigation", severity: "ok", message: "Index doc contains navigation sections." }
      : { id: "index.navigation", severity: "warn", message: "Index doc should organize existing docs into navigation sections." });
  }

  const patchNeeded = checks.some((check) => check.id.startsWith("agent.") && check.severity !== "ok");
  const patch = input.agent && input.skillDoc && input.indexDoc && patchNeeded
    ? buildAgentPatch(input)
    : undefined;
  const summary = countBySeverity(checks);
  return {
    ok: summary.fail === 0,
    write: input.write,
    server: input.server,
    ownerUserId: input.ownerUserId,
    agentKey: input.agentKey,
    skillKey: input.skillKey,
    indexKey: input.indexKey,
    expected: {
      model: EXPECTED_MODEL,
      provider: EXPECTED_PROVIDER,
      referenceKeys: expectedRefKeys,
    },
    checks,
    summary,
    ...(patch ? { patch } : {}),
  };
}

function usage() {
  console.log(`Usage:
  bun scripts/verify/verifyNihaishaAgentFromExistingDocs.ts [--server https://nolo.chat] [--owner <userId>] [--agent <agentKey>] [--skill <pageKey>] [--index <pageKey>] [--write]

Defaults:
  --server ${DEFAULT_SERVER}
  --owner  ${DEFAULT_OWNER_USER_ID}
  --agent  ${DEFAULT_AGENT_KEY}
  --skill  ${DEFAULT_SKILL_KEY}
  --index  ${DEFAULT_INDEX_KEY}

Default mode is read-only. Pass --write to update the agent record to the P0 expected config.`);
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

function assertExpectedUser(authToken: string, ownerUserId: string) {
  const authenticatedUserId = parseUserIdFromAuthToken(authToken);
  if (!authenticatedUserId) {
    throw new Error("Auth token could not be decoded to a userId. Pass --token for the owner account.");
  }
  if (authenticatedUserId !== ownerUserId) {
    throw new Error(`Auth token belongs to ${authenticatedUserId}, but this verifier is scoped to owner ${ownerUserId}. Pass --owner or --token explicitly.`);
  }
  return authenticatedUserId;
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
  const server = (readOption(args, "--server") || resolveServerUrl(process.env) || DEFAULT_SERVER).replace(/\/+$/, "");
  const authToken = resolveToken(args);
  const ownerUserId = readOption(args, "--owner") || DEFAULT_OWNER_USER_ID;
  assertExpectedUser(authToken, ownerUserId);
  const agentKey = readOption(args, "--agent") || DEFAULT_AGENT_KEY;
  const skillKey = readOption(args, "--skill") || DEFAULT_SKILL_KEY;
  const indexKey = readOption(args, "--index") || DEFAULT_INDEX_KEY;
  const write = args.includes("--write");

  const [agent, skillDoc, indexDoc] = await Promise.all([
    readRecord(server, authToken, agentKey),
    readRecord(server, authToken, skillKey),
    readRecord(server, authToken, indexKey),
  ]);
  const report = buildNihaishaVerifyReport({
    server,
    ownerUserId,
    agentKey,
    skillKey,
    indexKey,
    write,
    agent,
    skillDoc,
    indexDoc,
  });

  if (write && report.patch) {
    await writeRecord(server, authToken, ownerUserId, agentKey, report.patch);
    const nextAgent = await readRecord(server, authToken, agentKey);
    const nextReport = buildNihaishaVerifyReport({
      server,
      ownerUserId,
      agentKey,
      skillKey,
      indexKey,
      write,
      agent: nextAgent,
      skillDoc,
      indexDoc,
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
