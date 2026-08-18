#!/usr/bin/env bun

import { parseDialogInput, buildServerCandidates, tryHttpDialogCandidates, readDialogFromLocalDb, canUseLocalDb } from "../helpers/dialogDataHelpers";
import { resolveAuthToken } from "../helpers/authContext";

export type AppBuilderTraceEvaluation = {
  ok: boolean;
  toolNames: string[];
  missingTools: string[];
  hasWorkspaceEdit: boolean;
  usedReplace: boolean;
  usedWrite: boolean;
  messages: string[];
};

export type AppBuilderTraceMode = "any-deploy" | "workspace-edit" | "small-edit";

type VerifyOptions = {
  mode?: AppBuilderTraceMode;
  requireReplace?: boolean;
  requiredTools?: string[];
};

const DEFAULT_REQUIRED_TOOLS = ["appRead", "appPreflight", "appDeploy"];

function visitToolNames(value: unknown, out: string[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) visitToolNames(item, out);
    return;
  }

  const record = value as Record<string, unknown>;
  const directToolName = record.toolName ?? record.tool_name ?? record.name;
  if (typeof directToolName === "string" && /^app[A-Z]/.test(directToolName)) {
    out.push(directToolName);
  }

  const fn = record.function;
  if (fn && typeof fn === "object") {
    const name = (fn as Record<string, unknown>).name;
    if (typeof name === "string" && /^app[A-Z]/.test(name)) out.push(name);
  }

  for (const child of Object.values(record)) visitToolNames(child, out);
}

export function collectAppToolNames(dialogPayload: unknown): string[] {
  const toolNames: string[] = [];
  visitToolNames(dialogPayload, toolNames);
  const seen = new Set<string>();
  return toolNames.filter((toolName) => {
    if (seen.has(toolName)) return false;
    seen.add(toolName);
    return true;
  });
}

export function evaluateAppBuilderTrace(
  toolNames: string[],
  options: VerifyOptions = {},
): AppBuilderTraceEvaluation {
  const mode = options.mode ?? (options.requireReplace ? "small-edit" : "workspace-edit");
  const requiredTools = options.requiredTools ?? DEFAULT_REQUIRED_TOOLS;
  const missingTools = requiredTools.filter((toolName) => !toolNames.includes(toolName));
  const usedReplace = toolNames.includes("appFileReplace");
  const usedWrite = toolNames.includes("appFileWrite");
  const hasWorkspaceEdit = usedReplace || usedWrite;
  const messages: string[] = [];

  if (mode !== "any-deploy" && !hasWorkspaceEdit) {
    messages.push("missing workspace edit tool: expected appFileReplace or appFileWrite");
  }
  if (mode === "small-edit" && !usedReplace) {
    messages.push("missing appFileReplace: small edits should use precise replacement before whole-file write");
  }
  if (usedWrite && !usedReplace) {
    messages.push("used appFileWrite without appFileReplace; verify this was a new file or whole-file rewrite");
  }
  for (const toolName of missingTools) {
    messages.push(`missing required tool: ${toolName}`);
  }

  return {
    ok:
      missingTools.length === 0 &&
      (mode === "any-deploy" || hasWorkspaceEdit) &&
      (mode !== "small-edit" || usedReplace),
    toolNames,
    missingTools,
    hasWorkspaceEdit,
    usedReplace,
    usedWrite,
    messages,
  };
}

function parseArgs(argv: string[]) {
  const parsed = {
    dialog: "",
    limit: 120,
    json: false,
    mode: "workspace-edit" as AppBuilderTraceMode,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dialog") parsed.dialog = argv[++index] ?? "";
    else if (arg.startsWith("--dialog=")) parsed.dialog = arg.slice("--dialog=".length);
    else if (arg === "--limit") parsed.limit = Number(argv[++index] ?? parsed.limit);
    else if (arg.startsWith("--limit=")) parsed.limit = Number(arg.slice("--limit=".length));
    else if (arg === "--require-replace") parsed.mode = "small-edit";
    else if (arg === "--mode") parsed.mode = parseMode(argv[++index] ?? "");
    else if (arg.startsWith("--mode=")) parsed.mode = parseMode(arg.slice("--mode=".length));
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Verify a real App Builder dialog used the expected app lifecycle tools.

Usage:
  READ_DIALOG_BASE=https://us.nolo.chat bun scripts/verify/verifyAppBuilderTrace.ts --dialog <dialogId|dialogUrl> [--mode small-edit|workspace-edit|any-deploy] [--json]
`);
      process.exit(0);
    }
  }
  if (!parsed.dialog) throw new Error("--dialog is required");
  if (!Number.isFinite(parsed.limit) || parsed.limit <= 0) parsed.limit = 120;
  return parsed;
}

function parseMode(value: string): AppBuilderTraceMode {
  if (value === "small-edit" || value === "workspace-edit" || value === "any-deploy") return value;
  throw new Error(`Unsupported --mode: ${value}`);
}

if (import.meta.main) {
  const args = parseArgs(Bun.argv.slice(2));
  const input = parseDialogInput(args.dialog);
  const dialogKey = `dialog-${input.userId}-${input.dialogId}`;
  const authToken = resolveAuthToken();
  let payload: { meta: unknown; msgs: unknown; source: string; resolvedBase?: string };
  try {
    payload = await tryHttpDialogCandidates({
      bases: buildServerCandidates(input.base),
      dialogKey,
      dialogId: input.dialogId,
      limit: args.limit,
      authToken,
    });
  } catch (error) {
    if (!canUseLocalDb(input.base)) throw error;
    payload = await readDialogFromLocalDb(dialogKey, input.dialogId, args.limit);
  }

  const toolNames = collectAppToolNames(payload);
  const evaluation = evaluateAppBuilderTrace(toolNames, { mode: args.mode });
  const report = {
    dialogId: input.dialogId,
    base: input.base,
    source: payload.source,
    resolvedBase: payload.resolvedBase,
    ...evaluation,
  };
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`App Builder trace: ${evaluation.ok ? "ok" : "failed"}`);
    console.log(`dialogId: ${input.dialogId}`);
    console.log(`tools: ${toolNames.join(" -> ") || "(none)"}`);
    for (const message of evaluation.messages) console.log(`- ${message}`);
  }
  if (!evaluation.ok) process.exit(1);
}
