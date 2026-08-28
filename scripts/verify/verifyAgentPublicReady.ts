#!/usr/bin/env bun

import { readFileSync } from "node:fs";

import { toErrorMessage } from "core/errorMessage";
import { asNonEmptyStringArray } from "core/stringArray";
import { asTrimmedString } from "core/trimmedString";
import { readOption } from "../../packages/cli/cliEnvHelpers";
import {
  getCurrentProfile,
  getDefaultProfileConfigPath,
  loadProfileConfig,
} from "../../packages/cli/client/profileConfig";
import { parseAgentIdFromKey, readAgentRecord } from "../helpers/agentDataHelpers";
import {
  parseAgentCreationSpec,
  type AgentCreationSpecReference,
  type AgentPublicGateConfig,
} from "../helpers/agentCreationSpec";
import { validateEvalCases, type AgentEvalCase } from "../helpers/agentMultiTurnEval";
import {
  evaluateAgentPublicReadiness,
  type MemoryInjectionResult,
  type AgentPublicReadinessReport,
  type ReferenceReadabilityResult,
} from "../helpers/agentPublicReadiness";
import { apiGet } from "../helpers/apiHelpers";

function usage() {
  console.log(`Usage:
  bun scripts/verify/verifyAgentPublicReady.ts --spec-file <spec.json> [--server <url>] [--owner <userId>] [--cases-file <path>] [--token <token>]

Validates agent public readiness by checking eval-pack coverage and agent record safety.
Default mode is read-only; no live eval, no writes.

Exit code 0 only if no "fail" checks.`);
}

function parseArgs(args: string[]) {
  return {
    specFile: readOption(args, "--spec-file"),
    server: readOption(args, "--server"),
    owner: readOption(args, "--owner"),
    agent: readOption(args, "--agent"),
    casesFile: readOption(args, "--cases-file"),
    token: readOption(args, "--token"),
  };
}

function loadJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function derivePublicAliasKey(agentKey: string): string {
  const agentId = parseAgentIdFromKey(agentKey);
  if (!agentId) {
    throw new Error(`Could not derive public alias key from ${agentKey}.`);
  }
  return `agent-pub-${agentId}`;
}

function referenceTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      return String(record.title ?? record.name ?? record.dbKey ?? "").trim();
    })
    .filter(Boolean);
}

export function buildAgentRecordText(record: Record<string, unknown>): string {
  return [
    record.name,
    record.greeting,
    record.introduction,
    record.prompt,
    record.systemPrompt,
    asNonEmptyStringArray(record.tags).join("\n"),
    referenceTitles(record.references).join("\n"),
  ]
    .map(asTrimmedString)
    .filter(Boolean)
    .join("\n");
}

type AgentRecord = Record<string, unknown>;

async function fetchAgentRecord(
  server: string,
  agentKey: string,
  token?: string,
): Promise<AgentRecord | null> {
  try {
    return await readAgentRecord({
      baseUrl: server.replace(/\/+$/, ""),
      agentKey,
      authToken: token,
    }) as AgentRecord;
  } catch {
    return null;
  }
}

function resolveToken(cliToken?: string): string {
  if (cliToken?.trim()) return cliToken.trim();
  const envToken = process.env.AUTH_TOKEN?.trim() || process.env.AUTH?.trim();
  if (envToken) return envToken;
  const profile = getCurrentProfile(loadProfileConfig(getDefaultProfileConfigPath()));
  return profile?.authToken?.trim() ?? "";
}

export type { AgentPublicReadinessReport, ReferenceReadabilityResult };

export function inspectPublicAgentMemoryIsolation(projectRoot = "."): MemoryInjectionResult {
  const root = projectRoot.replace(/\/+$/, "");
  const readProjectFile = (path: string) => readFileSync(`${root}/${path}`, "utf8");
  const policySource = readProjectFile("packages/ai/memory/policy.ts");
  const runtimeSource = readProjectFile("packages/ai/memory/runtime.ts");
  const recapSource = readProjectFile("packages/ai/memory/recentRelationshipRecap.ts");

  const missing: string[] = [];
  if (!policySource.includes("includeUserSubject: false")) {
    missing.push("public policy does not disable user-global subject");
  }
  if (!policySource.includes('ownerFallback: "onSubjectMiss"')) {
    missing.push("public policy does not avoid always-on owner fallback");
  }
  if (!policySource.includes("allowDynamicGreetingMemory: false")) {
    missing.push("public policy does not disable dynamic greeting memory");
  }
  if (!runtimeSource.includes("buildMemorySubjectsForAgent")) {
    missing.push("runtime does not build subjects through agent memory policy");
  }
  if (!runtimeSource.includes("policy.ownerFallback")) {
    missing.push("runtime does not pass policy ownerFallback to memory query");
  }
  if (!recapSource.includes("resolveAgentMemoryPolicy")) {
    missing.push("greeting recap is not guarded by agent memory policy");
  }
  if (!recapSource.includes("allowDynamicGreetingMemory")) {
    missing.push("greeting recap does not check allowDynamicGreetingMemory");
  }

  return {
    hasUnrelatedUserGlobalMemory: missing.length > 0,
    detail: missing.length > 0
      ? `Memory isolation contract missing: ${missing.join("; ")}`
      : "Public agent memory isolation source contract verified.",
  };
}

export async function fetchReferenceReadabilityResults(
  server: string,
  references: AgentCreationSpecReference[],
  agentKey?: string,
): Promise<ReferenceReadabilityResult[]> {
  const results: ReferenceReadabilityResult[] = [];
  const base = server.replace(/\/+$/, "");

  for (const ref of references) {
    try {
      const query = agentKey ? `?agentKey=${encodeURIComponent(agentKey)}` : "";
      const res = await apiGet(`${base}/api/v1/db/read/${encodeURIComponent(ref.dbKey)}${query}`);
      results.push({
        dbKey: ref.dbKey,
        title: ref.title,
        ok: res.ok,
        status: res.status,
      });
    } catch (error) {
      results.push({
        dbKey: ref.dbKey,
        title: ref.title,
        ok: false,
        message: toErrorMessage(error),
      });
    }
  }

  return results;
}

export async function verifyAgentPublicReady(options: {
  specFile: string;
  server?: string;
  owner?: string;
  agent?: string;
  casesFile?: string;
  token?: string;
}): Promise<AgentPublicReadinessReport> {
  const spec = parseAgentCreationSpec(loadJsonFile(options.specFile));

  const publicGate: AgentPublicGateConfig = spec.publicGate ?? {};
  const server = options.server ?? publicGate.server ?? spec.server;
  const agentKey = options.agent ?? spec.agent;
  const casesFilePath = options.casesFile ?? spec.casesFile;

  if (!server) {
    throw new Error("Server URL is required (via --server or spec.server).");
  }

  // Load eval cases from file
  const rawCases = loadJsonFile<AgentEvalCase[]>(casesFilePath);
  validateEvalCases(rawCases);
  const token = resolveToken(options.token);

  // Fetch private agent record
  const privateRecord = await fetchAgentRecord(server, agentKey, token);
  if (!privateRecord) {
    throw new Error(`Could not read agent record for ${agentKey} from ${server}.`);
  }

  const prompt = String(privateRecord.prompt ?? privateRecord.systemPrompt ?? "");
  const recordName = String(privateRecord.name ?? "");
  const recordText = buildAgentRecordText(privateRecord);

  // Fetch public alias if required
  let publicAlias: Record<string, unknown> | null = null;
  if (publicGate.requirePublicAlias) {
    const publicKey = derivePublicAliasKey(agentKey);
    publicAlias = await fetchAgentRecord(server, publicKey, token);
  }

  // Fetch reference readability from public gate server (unauthenticated)
  let referenceReadabilityResults: ReferenceReadabilityResult[] | undefined;
  if (publicGate.requireReferenceReadability) {
    const publicServer = publicGate.server ?? server;
    referenceReadabilityResults = await fetchReferenceReadabilityResults(
      publicServer,
      spec.references,
      derivePublicAliasKey(agentKey),
    );
  }

  const memoryInjectionResult = publicGate.forbidUnrelatedUserGlobalMemory
    ? inspectPublicAgentMemoryIsolation()
    : undefined;

  return evaluateAgentPublicReadiness({
    evalCases: rawCases,
    prompt,
    recordName,
    recordText,
    publicAlias,
    publicName: spec.publicName ?? spec.name,
    gate: publicGate,
    referenceReadabilityResults,
    memoryInjectionResult,
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const opts = parseArgs(args);
  if (!opts.specFile) throw new Error("Missing --spec-file <spec.json>.");

  const report = await verifyAgentPublicReady({
    ...opts,
    specFile: opts.specFile,
  });
  const output = {
    ok: report.ok,
    summary: report.summary,
    checks: report.checks,
    specFile: opts.specFile,
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(report.ok ? 0 : 1);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(toErrorMessage(error));
    process.exit(1);
  });
}
