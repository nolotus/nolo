#!/usr/bin/env bun

import { readAgentRecord, buildAgentKeys } from "../helpers/agentDataHelpers";
import {
  buildServerCandidates,
  canUseLocalDb,
  readDialogFromLocalDb,
  tryHttpDialogCandidates,
} from "../helpers/dialogDataHelpers";
import { apiPost } from "../helpers/apiHelpers";
import { deterministicId } from "../helpers/agentHelpers";
import { resolveAgentWorkspaceContext } from "../helpers/agentWorkspace";
import {
  resolveExternalRegistrationTargets,
  type ExternalRegistrationTarget,
} from "../helpers/externalRegistrationTargets";
import { toErrorMessage } from "core/errorMessage";
import { isRecord } from "core/isRecord";
import { normalizeServerOrigin as normalizeBaseUrl } from "core/serverOrigin";
import { asTrimmedString } from "core/trimmedString";

const argv = process.argv.slice(2);

function getArg(flag: string) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function hasFlag(flag: string) {
  return argv.includes(flag);
}

function usage() {
  console.log(`
Launch the existing alpha registration test agent against a target signup URL.

Usage:
  bun ./scripts/verifyExternalRegistrationWithAgent.ts [--target-url <url>] [--server <url>] [--timeout-ms <ms>]

Options:
  --target-url   Optional explicit target signup URL. If omitted, uses the repo-native candidate pool.
  --server       Override the token-first workspace base URL.
  --timeout-ms   Dialog wait timeout in milliseconds. Default: 900000.
  --poll-ms      Poll interval in milliseconds. Default: 5000.
`);
}

const REGISTRATION_AGENT_SEED = "alpha-agent-email-registration-test-agent-v1";
const DEFAULT_AGENT_ID = deterministicId(
  "01AGEMREGTEST",
  REGISTRATION_AGENT_SEED
);
const REQUIRED_RESULT_FIELDS = [
  "targetUrl",
  "resolvedSignupUrl",
  "emailAddress",
  "registrationId",
  "verified",
  "failedStage",
  "blockingReason",
] as const;
const TERMINAL_DIALOG_STATUSES = new Set(["done", "failed"] as const);
const FOREGROUND_RETRY_TIMEOUT_MS = 10 * 60 * 1000;
const FAILED_STAGES = new Set([
  "discover",
  "assess supportability",
  "register",
  "verify",
  "closeout",
] as const);
type FailedStage =
  | "discover"
  | "assess supportability"
  | "register"
  | "verify"
  | "closeout";

const LEGACY_FAILED_STAGE_ALIASES: Record<string, FailedStage> = {
  assess_supportability: "assess supportability",
};

type AgentProbeBlocker = {
  kind?: string | null;
  reason?: string | null;
  // allow additional fields but keep typed shape
  [key: string]: unknown;
};

type AgentProbeEvidence = {
  forms?: unknown[] | null;
  actions?: unknown[] | null;
  messages?: string[] | null;
  blockers?: AgentProbeBlocker[] | null;
  summary?: string | null;
  [key: string]: unknown;
};

type AgentResult = {
  targetUrl: string;
  resolvedSignupUrl: string;
  emailAddress: string | null;
  registrationId: string | null;
  verified: boolean;
  failedStage: FailedStage | null;
  blockingReason: string | null;
  // Optional probe evidence produced by browser_probePage during discover
  probe?: AgentProbeEvidence | null;
};

type ProvisionIdentityResult = {
  agentId: string;
  emailAddress: string;
  readinessStatus?: "created" | "warming" | "ready" | "failed_warmup";
  ingressReadyAt?: string | null;
  lastWarmupAt?: string | null;
  lastWarmupError?: string | null;
};

type FailureClassification =
  | "unsupported-captcha"
  | "unsupported-oauth"
  | "unsupported-phone"
  | "unsupported-other"
  | "likely-anti-bot"
  | "mail-not-received"
  | "verified";

type DialogSnapshot = Awaited<ReturnType<typeof readDialogSnapshot>>;
type WaitForDialogResultArgs = {
  baseUrl: string;
  authToken: string;
  dialogKey: string;
  dialogId: string;
  timeoutMs: number;
  pollMs: number;
};

type WaitForDialogResultDeps = {
  readSnapshot: (args: WaitForDialogResultArgs) => Promise<DialogSnapshot>;
  sleep: (ms: number) => Promise<unknown>;
  now: () => number;
};

export function buildAgentRunRequest(args: {
  agentKey: string;
  targetUrl: string;
  background?: boolean;
  continueDialogId?: string;
  summaryOnly?: boolean;
}) {
  return {
    agentKey: args.agentKey,
    userInput: args.summaryOnly
      ? [
          `Summarize the already-completed external registration attempt for this target signup URL: ${args.targetUrl}`,
          "Do not call any more tools.",
          "Reply with one JSON object only.",
          "The JSON must include targetUrl, resolvedSignupUrl, emailAddress, registrationId, verified, failedStage, and blockingReason. Probe evidence under 'probe' is optional.",
        ].join("\n")
      : buildUserPrompt(args.targetUrl),
    stream: false,
    background: args.background ?? true,
    ...(args.continueDialogId ? { continueDialogId: args.continueDialogId } : {}),
  };
}

function parseJsonObject(raw: unknown): Record<string, any> | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const trimmed = raw.trim();

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidates = [fencedMatch?.[1], trimmed].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isRecord(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {}
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      if (isRecord(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {}
  }

  return null;
}

function requireJsonFields(result: Record<string, unknown>) {
  const missing = REQUIRED_RESULT_FIELDS.filter((field) => !(field in result));
  if (missing.length > 0) {
    throw new Error(
      `Agent JSON is missing required fields: ${missing.join(", ")}`
    );
  }
}

function buildUserPrompt(targetUrl: string) {
  return [
    `Run the external registration verification against this target signup URL: ${targetUrl}`,
    "Use the staged workflow exactly: discover -> assess supportability -> prepare inbox -> register -> verify -> closeout.",
    "During discover, probe the page before typing anything.",
    "During prepare inbox, keep reusing the same provisioned alias until its readinessStatus is ready before starting registration.",
    "Do not treat missing verification mail as target-side evidence until the alias is already ingress-ready.",
    "Use browser_probePage to assess the page before interacting and, when useful, include concise probe evidence (forms/actions/messages/blockers/summary) in the returned JSON under the 'probe' key.",

    "During assess supportability, only continue for simple email signup + email verification.",
    "If the flow is unsupported or blocked, stop safely and set failedStage plus blockingReason.",
    "If verified is false for any reason, both failedStage and blockingReason are mandatory.",
    "During closeout, close any browser sessions you opened with browser_closeSession.",
    "Reply with one JSON object only.",
    "The JSON must include targetUrl, resolvedSignupUrl, emailAddress, registrationId, verified, failedStage, and blockingReason. Probe evidence under 'probe' is optional.",
  ].join("\n");
}

export function requireReadyProvisionResult(result: ProvisionIdentityResult) {
  if (result.readinessStatus !== "ready" || !result.ingressReadyAt) {
    throw new Error(
      `Alias is not ingress-ready: ${JSON.stringify({
        emailAddress: result.emailAddress,
        readinessStatus: result.readinessStatus ?? null,
        ingressReadyAt: result.ingressReadyAt ?? null,
        lastWarmupAt: result.lastWarmupAt ?? null,
        lastWarmupError: result.lastWarmupError ?? null,
      })}`
    );
  }
  return result;
}

function normalizeUrlField(value: string, fieldName: string) {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`Agent returned invalid ${fieldName}: ${JSON.stringify(value)}`);
  }
}

function parseRequiredUrlField(
  result: Record<string, unknown>,
  fieldName: "targetUrl" | "resolvedSignupUrl"
) {
  const value = result[fieldName];
  if (typeof value !== "string") {
    throw new Error(
      `Agent returned invalid ${fieldName}: expected string, got ${typeof value}`
    );
  }
  return normalizeUrlField(value, fieldName);
}

function parseNullableStringField(
  result: Record<string, unknown>,
  fieldName: string
) {
  const value = result[fieldName];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(
      `Agent returned invalid ${fieldName}: expected string|null, got ${typeof value}`
    );
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Agent returned invalid ${fieldName}: expected non-empty string`);
  }
  return trimmed;
}

function normalizeFailedStage(value: unknown): FailedStage | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`Agent returned invalid failedStage: ${JSON.stringify(value)}`);
  }
  if (FAILED_STAGES.has(value as FailedStage)) {
    return value as FailedStage;
  }
  const normalizedAlias = LEGACY_FAILED_STAGE_ALIASES[value];
  if (normalizedAlias) {
    return normalizedAlias;
  }
  throw new Error(`Agent returned invalid failedStage: ${JSON.stringify(value)}`);
}

export function validateAgentResult(
  result: Record<string, unknown>,
  expectedTargetUrl: string
): AgentResult {
  requireJsonFields(result);

  const normalizedExpectedTargetUrl = normalizeUrlField(
    expectedTargetUrl,
    "expectedTargetUrl"
  );
  const targetUrl = parseRequiredUrlField(result, "targetUrl");
  if (targetUrl !== normalizedExpectedTargetUrl) {
    throw new Error(
      `Agent returned targetUrl ${JSON.stringify(targetUrl)} but expected ${JSON.stringify(
        normalizedExpectedTargetUrl
      )}`
    );
  }

  const resolvedSignupUrl = parseRequiredUrlField(result, "resolvedSignupUrl");

  if (typeof result.verified !== "boolean") {
    throw new Error(
      `Agent returned invalid verified: expected boolean, got ${typeof result.verified}`
    );
  }

  const emailAddress = parseNullableStringField(result, "emailAddress");
  if (emailAddress !== null && !emailAddress.includes("@")) {
    throw new Error(`Agent returned invalid emailAddress: ${JSON.stringify(emailAddress)}`);
  }

  const registrationId = parseNullableStringField(result, "registrationId");
  const failedStage = normalizeFailedStage(result.failedStage);
  const blockingReason = parseNullableStringField(result, "blockingReason");

  if (failedStage === null && blockingReason !== null) {
    throw new Error("Agent returned blockingReason without failedStage");
  }
  if (failedStage !== null && blockingReason === null) {
    throw new Error("Agent returned failedStage without blockingReason");
  }
  if (!result.verified && (failedStage === null || blockingReason === null)) {
    throw new Error(
      "Agent returned verified=false without failedStage and blockingReason"
    );
  }
  if (result.verified && failedStage !== null) {
    throw new Error("Agent returned verified=true together with failedStage");
  }
  if (result.verified && (emailAddress === null || registrationId === null)) {
    throw new Error("Agent returned verified=true without emailAddress and registrationId");
  }

  // Optional probe evidence
  const probeEvidence =
    typeof result.probe === "object" && result.probe !== null ? (result.probe as AgentProbeEvidence) : null;

  return {
    targetUrl,
    resolvedSignupUrl,
    emailAddress,
    registrationId,
    verified: result.verified,
    failedStage,
    blockingReason,
    probe: probeEvidence,
  };
}

export function parseRequiredAgentResult(raw: unknown) {
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;
  try {
    requireJsonFields(parsed);
  } catch {
    return null;
  }
  return parsed;
}

export async function recoverAgentResultFromSummary(
  args: {
    baseUrl: string;
    authToken: string;
    agentKey: string;
    dialogId: string;
    targetUrl: string;
  },
  deps: {
    apiPost: typeof apiPost;
  } = {
    apiPost,
  }
) {
  const response = await deps.apiPost<{
    dialogId?: string;
    content?: string;
    agentReply?: string;
  }>(
    `${args.baseUrl}/api/agent/run`,
    buildAgentRunRequest({
      agentKey: args.agentKey,
      targetUrl: args.targetUrl,
      background: false,
      continueDialogId: args.dialogId,
      summaryOnly: true,
    }),
    args.authToken,
    { timeoutMs: FOREGROUND_RETRY_TIMEOUT_MS }
  );

  if (!response.ok) {
    throw new Error(
      `Summary recovery failed (${response.status}): ${JSON.stringify(response.data)}`
    );
  }

  const summaryText =
    asTrimmedString(response.data?.content) ||
    asTrimmedString(response.data?.agentReply);
  const parsed = parseRequiredAgentResult(summaryText);
  if (!parsed) {
    throw new Error(
      `Summary recovery did not return parseable JSON for dialog ${args.dialogId}: ${summaryText}`
    );
  }
  return validateAgentResult(parsed, args.targetUrl);
}

export function classifyExternalRegistrationFailure(
  result: Pick<AgentResult, "verified" | "failedStage" | "blockingReason" | "probe">
): FailureClassification {
  if (result.verified) {
    return "verified";
  }

  // Inspect probe evidence first if available
  const probe = (result as AgentResult).probe ?? null;
  if (probe && Array.isArray(probe.blockers)) {
    const captchaKinds = ["captcha", "recaptcha", "turnstile", "cloudflare-challenge", "cloudflare"];
    const captchaPhrases = ["captcha", "recaptcha", "turnstile", "cloudflare challenge", "cloudflare"];
    for (const b of probe.blockers) {
      const kind = typeof b?.kind === "string" ? b.kind.toLowerCase() : "";
      const reason = typeof b?.reason === "string" ? b.reason.toLowerCase() : "";
      if (
        captchaKinds.some((k) => kind.includes(k)) ||
        captchaPhrases.some((p) => reason.includes(p))
      ) {
        return "unsupported-captcha";
      }
    }
  }

  const reason = result.blockingReason?.toLowerCase() || "";

  // Check for CAPTCHA indicators (consistent phrase set)
  if (["captcha", "recaptcha", "turnstile", "cloudflare challenge", "cloudflare"].some((p) => reason.includes(p))) {
    return "unsupported-captcha";
  }

  // Check for OAuth indicators
  if (reason.includes("oauth") || reason.includes("google") || reason.includes("github")) {
    return "unsupported-oauth";
  }

  // Check for phone indicators
  if (reason.includes("phone")) {
    return "unsupported-phone";
  }

  // Check for likely-anti-bot: no verification email + incorrect credentials
  if (
    result.failedStage === "verify" &&
    (reason.includes("no verification email") ||
      reason.includes("verification email not")) &&
    (reason.includes("incorrect") ||
      reason.includes("invalid credentials") ||
      reason.includes("username or password"))
  ) {
    return "likely-anti-bot";
  }

  // Check for mail-not-received: verification email missing without credential issues
  if (
    result.failedStage === "verify" &&
    (reason.includes("no verification email") ||
      reason.includes("verification email not")) &&
    !reason.includes("incorrect") &&
    !reason.includes("invalid credentials") &&
    !reason.includes("username or password")
  ) {
    return "mail-not-received";
  }

  // Default for other assess supportability or registration failures
  return "unsupported-other";
}

type TargetAttempt = {
  target: ExternalRegistrationTarget;
  agentResult: AgentResult;
  classification: FailureClassification;
};

type RunTargetAttemptsResult = {
  attempts: TargetAttempt[];
  finalResult: AgentResult;
};

export async function runTargetAttempts(args: {
  targets: ExternalRegistrationTarget[];
  runSingle: (targetUrl: string) => Promise<AgentResult>;
}): Promise<RunTargetAttemptsResult> {
  const attempts: TargetAttempt[] = [];

  for (const target of args.targets) {
    const agentResult = await args.runSingle(target.url);
    const classification = classifyExternalRegistrationFailure(agentResult);

    attempts.push({
      target,
      agentResult,
      classification,
    });

    const shouldTryNextTarget =
      classification === "unsupported-captcha" ||
      classification === "unsupported-oauth" ||
      classification === "unsupported-phone" ||
      (classification === "unsupported-other" &&
        (agentResult.failedStage === "discover" ||
          agentResult.failedStage === "assess supportability"));

    if (!shouldTryNextTarget) {
      return {
        attempts,
        finalResult: agentResult,
      };
    }
  }

  // All targets failed, return the last result
  return {
    attempts,
    finalResult: attempts[attempts.length - 1].agentResult,
  };
}

function getReadFailureStatus(error: unknown) {
  const message = toErrorMessage(error);
  const match = message.match(/\((\d{3})\)/);
  return match ? Number(match[1]) : null;
}

export async function requireRegistrationAgentRecord(
  args: {
    baseUrl: string;
    agentKey: string;
    authToken: string;
  },
  deps: {
    readAgentRecord: typeof readAgentRecord;
  } = {
    readAgentRecord,
  }
) {
  try {
    return await deps.readAgentRecord(args);
  } catch (error) {
    if (getReadFailureStatus(error) === 404) {
      throw new Error(
        `Registration agent not found at ${args.agentKey}. Run bun ./scripts/createAgentEmailRegistrationTestAgent.ts first.`
      );
    }
    throw error;
  }
}

function getLastAssistantMessage(msgs: any[]) {
  const newestFirstMsgs = Array.isArray(msgs) ? msgs : [];
  const lastAssistantMessage = newestFirstMsgs.find(
    (message) =>
      message?.role === "assistant" || message?.authorRole === "assistant"
  );
  return { newestFirstMsgs, lastAssistantMessage };
}

export function getDialogStatus(snapshot: {
  meta?: { status?: unknown; runtimeCheckpoint?: { status?: unknown } };
}) {
  return typeof snapshot.meta?.status === "string"
    ? snapshot.meta.status
    : typeof snapshot.meta?.runtimeCheckpoint?.status === "string"
      ? snapshot.meta.runtimeCheckpoint.status
      : "unknown";
}

export function shouldRetryForegroundAfterStaleBackgroundFailure(snapshot: {
  status?: unknown;
  msgs?: any[];
  meta?: {
    agentReply?: unknown;
    runtimeCheckpoint?: {
      errorMessage?: unknown;
      toolCallCount?: unknown;
      lastAssistantText?: unknown;
      runtimeBinding?: {
        executionMode?: unknown;
      };
    };
  };
}) {
  const status = typeof snapshot.status === "string" ? snapshot.status : getDialogStatus(snapshot as any);
  const checkpoint = snapshot.meta?.runtimeCheckpoint;
  const errorMessage =
    typeof checkpoint?.errorMessage === "string" ? checkpoint.errorMessage.toLowerCase() : "";
  const toolCallCount =
    typeof checkpoint?.toolCallCount === "number"
      ? checkpoint.toolCallCount
      : 0;
  const assistantText =
    getAssistantText(snapshot).assistantText ||
    (typeof checkpoint?.lastAssistantText === "string" ? checkpoint.lastAssistantText.trim() : "");
  const executionMode =
    typeof checkpoint?.runtimeBinding?.executionMode === "string"
      ? checkpoint.runtimeBinding.executionMode
      : "";

  return (
    status === "failed" &&
    executionMode === "background" &&
    errorMessage.includes("stale running dialog exceeded") &&
    !assistantText &&
    toolCallCount === 0
  );
}

export function getAssistantText(snapshot: {
  msgs?: any[];
  meta?: { agentReply?: unknown };
}) {
  const { lastAssistantMessage } = getLastAssistantMessage(snapshot.msgs ?? []);
  return {
    lastAssistantMessage,
    assistantText:
      asTrimmedString(lastAssistantMessage?.content) ||
      asTrimmedString(snapshot.meta?.agentReply),
  };
}

async function readDialogSnapshot(args: {
  baseUrl: string;
  authToken: string;
  dialogKey: string;
  dialogId: string;
}) {
  const candidateBases = buildServerCandidates(args.baseUrl);

  try {
    return await tryHttpDialogCandidates({
      bases: candidateBases,
      dialogKey: args.dialogKey,
      dialogId: args.dialogId,
      limit: 100,
      authToken: args.authToken,
    });
  } catch (error) {
    const localhostCandidate = candidateBases.find(canUseLocalDb);
    if (!localhostCandidate) {
      throw error;
    }

    const fallback = await readDialogFromLocalDb(
      args.dialogKey,
      args.dialogId,
      100
    );
    return {
      ...fallback,
      resolvedBase: localhostCandidate,
      attempts:
        typeof error === "object" && error !== null && "attempts" in error
          ? (error as any).attempts
          : [],
    };
  }
}

export async function waitForDialogResult(
  args: WaitForDialogResultArgs,
  deps: WaitForDialogResultDeps = {
    readSnapshot: readDialogSnapshot,
    sleep: (ms) => Bun.sleep(ms),
    now: () => Date.now(),
  }
) {
  const deadline = deps.now() + args.timeoutMs;

  while (deps.now() <= deadline) {
    const snapshot = await deps.readSnapshot(args);
    const status = getDialogStatus(snapshot);
    const { lastAssistantMessage, assistantText } = getAssistantText(snapshot);
    const parsedResult = status === "done" ? parseJsonObject(assistantText) : null;

    if (TERMINAL_DIALOG_STATUSES.has(status as "done" | "failed")) {
      return { ...snapshot, status, lastAssistantMessage, parsedResult };
    }

    await deps.sleep(args.pollMs);
  }

  throw new Error(`Timed out waiting for dialog ${args.dialogId}`);
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    usage();
    process.exit(0);
  }

  const rawTargetUrl = getArg("--target-url")?.trim();
  const timeoutMs = Number(getArg("--timeout-ms") ?? "900000");
  const pollMs = Number(getArg("--poll-ms") ?? "5000");
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    throw new Error("--timeout-ms must be >= 1000");
  }
  if (!Number.isFinite(pollMs) || pollMs < 250) {
    throw new Error("--poll-ms must be >= 250");
  }

  const workspace = resolveAgentWorkspaceContext();
  const baseUrl = normalizeBaseUrl(getArg("--server")?.trim() || workspace.baseUrl);
  const agentKey = buildAgentKeys(DEFAULT_AGENT_ID, workspace.userId).privateKey;

  await requireRegistrationAgentRecord({
    baseUrl,
    agentKey,
    authToken: workspace.authToken,
  });

  // Resolve targets: explicit or pool
  const targets = resolveExternalRegistrationTargets({
    explicitTargetUrl: rawTargetUrl,
  });

  // Single-target runner
  let lastDialogId = "";
  let lastResolvedBase = "";
  
  const runSingle = async (targetUrl: string): Promise<AgentResult> => {
    const runResponse = await apiPost<{ dialogId?: string }>(
      `${baseUrl}/api/agent/run`,
      buildAgentRunRequest({
        agentKey,
        targetUrl,
        background: true,
      }),
      workspace.authToken
    );

    if (!runResponse.ok) {
      throw new Error(
        `Agent run failed (${runResponse.status}): ${JSON.stringify(runResponse.data)}`
      );
    }

    const dialogId = runResponse.data?.dialogId?.trim();
    if (!dialogId) {
      throw new Error("Agent run did not return dialogId");
    }

    const dialogKey = `dialog-${workspace.userId}-${dialogId}`;
    const snapshot = await waitForDialogResult({
      baseUrl,
      authToken: workspace.authToken,
      dialogKey,
      dialogId,
      timeoutMs,
      pollMs,
    });

    lastDialogId = dialogId;
    lastResolvedBase = snapshot.resolvedBase;

    const { assistantText } = getAssistantText(snapshot);
    if (snapshot.status !== "done") {
      if (shouldRetryForegroundAfterStaleBackgroundFailure(snapshot as any)) {
        const foregroundResponse = await apiPost<{
          dialogId?: string;
          content?: string;
          agentReply?: string;
        }>(
          `${baseUrl}/api/agent/run`,
          buildAgentRunRequest({
            agentKey,
            targetUrl,
            background: false,
          }),
          workspace.authToken,
          { timeoutMs: FOREGROUND_RETRY_TIMEOUT_MS }
        );

        if (!foregroundResponse.ok) {
          throw new Error(
            `Foreground retry failed (${foregroundResponse.status}): ${JSON.stringify(
              foregroundResponse.data
            )}`
          );
        }

        const foregroundDialogId = foregroundResponse.data?.dialogId?.trim();
        if (foregroundDialogId) {
          lastDialogId = foregroundDialogId;
          lastResolvedBase = baseUrl;
        }

        const foregroundText =
          asTrimmedString(foregroundResponse.data?.content) ||
          asTrimmedString(foregroundResponse.data?.agentReply);

        if (!foregroundText) {
          throw new Error(
            `Foreground retry after stale background failure returned no assistant content for dialog ${dialogId}`
          );
        }

        const foregroundParsed = parseJsonObject(foregroundText);
        if (!foregroundParsed) {
          throw new Error(
            `Foreground retry after stale background failure did not return parseable JSON: ${foregroundText}`
          );
        }

        return validateAgentResult(foregroundParsed, targetUrl);
      }

      throw new Error(
        `Dialog ${dialogId} ended with status ${snapshot.status}; refusing to accept assistant payload`
      );
    }

    const parsed = snapshot.parsedResult ?? parseJsonObject(assistantText);
    if (!parsed) {
      return recoverAgentResultFromSummary({
        baseUrl,
        authToken: workspace.authToken,
        agentKey,
        dialogId,
        targetUrl,
      });
    }
    return validateAgentResult(parsed, targetUrl);
  };

  const { finalResult } = await runTargetAttempts({
    targets,
    runSingle,
  });

  console.log(
    JSON.stringify(
      {
        targetUrl: finalResult.targetUrl,
        resolvedSignupUrl: finalResult.resolvedSignupUrl,
        emailAddress: finalResult.emailAddress,
        registrationId: finalResult.registrationId,
        verified: finalResult.verified,
        failedStage: finalResult.failedStage,
        blockingReason: finalResult.blockingReason,
        dialogId: lastDialogId,
        baseUrl: lastResolvedBase,
        agentKey,
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.stack || error.message : String(error)
    );
    process.exit(1);
  });
}
