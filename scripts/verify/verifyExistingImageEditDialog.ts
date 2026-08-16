#!/usr/bin/env bun

import { DataType } from "../../packages/create/types";
import { createKey } from "../../packages/database/keys";
import { toErrorMessage } from "core/errorMessage";
import { resolveAuthToken } from "../helpers/authContext";
import {
  buildServerCandidates,
  canUseLocalDb,
  parseDialogInput,
  readDialogFromLocalDb,
  tryHttpDialogCandidates,
  type HttpAttempt,
  type ReadSource,
} from "../helpers/dialogDataHelpers";
import { verifyExistingContinuousImageEditDialog } from "./verifyPublicImageAgentsWeb.helpers";

function usage() {
  console.log(`Usage:
  bun scripts/verify/verifyExistingImageEditDialog.ts <dialogId|dialogUrl> [limit]

Purpose:
  Zero-cost verifier for an already persisted dialog. It only reads dialog records
  and verifies that a successful openAIGptImageEdit reused a prior image artifact
  and emitted a new image artifact. It does not create agent runs or call image APIs.

Examples:
  bun scripts/verify/verifyExistingImageEditDialog.ts \\
    https://nolo.chat/dialog-0e95801d90-01KRC3QTRRRKK0YHJKTRFAEH77
`);
}

function isHelpArg(value?: string) {
  return value === "-h" || value === "--help";
}

const rawInput = process.argv[2];
const rawLimit = process.argv[3] ?? "100";

if (!rawInput || isHelpArg(rawInput)) {
  usage();
  process.exit(rawInput ? 0 : 1);
}

if (!/^\d+$/.test(rawLimit)) {
  console.error("limit must be a number");
  process.exit(1);
}

const limit = Number(rawLimit);
const { base, dialogId, userId } = parseDialogInput(rawInput);
const candidateBases = buildServerCandidates(base);
const dialogKey = createKey(DataType.DIALOG, userId, dialogId);
const authToken = resolveAuthToken();

let msgs: any[] = [];
let source: ReadSource = "http";
let resolvedBase = base;
let attempts: HttpAttempt[] = [];

try {
  ({ msgs, source, resolvedBase, attempts } = await tryHttpDialogCandidates({
    bases: candidateBases,
    dialogKey,
    dialogId,
    limit,
    authToken,
  }));
} catch (error) {
  attempts =
    typeof error === "object" && error !== null && "attempts" in error
      ? ((error as any).attempts as HttpAttempt[])
      : attempts;

  const localhostCandidate = candidateBases.find(canUseLocalDb);
  if (!localhostCandidate) {
    console.error(
      `read dialog failed across candidates: ${attempts
        .map((attempt) => `${attempt.base} -> ${attempt.status ?? attempt.message}`)
        .join("; ")}`
    );
    process.exit(1);
  }

  try {
    ({ msgs, source } = await readDialogFromLocalDb(dialogKey, dialogId, limit));
    resolvedBase = localhostCandidate;
  } catch (fallbackError) {
    const fallbackMessage = toErrorMessage(fallbackError);
    console.error(
      `read dialog failed: HTTP candidates were ${attempts
        .map((attempt) => `${attempt.base} -> ${attempt.status ?? attempt.message}`)
        .join("; ")}; local DB fallback also failed (${fallbackMessage})`
    );
    process.exit(1);
  }
}

const messages = Array.isArray(msgs) ? [...msgs].reverse() : [];
const result = verifyExistingContinuousImageEditDialog({
  messages,
  userId,
  dialogUrl: rawInput,
});

console.log(
  JSON.stringify(
    {
      ok: true,
      source,
      base: resolvedBase,
      dialogId,
      userId,
      editMessageIndex: result.editMessageIndex,
      reusedPriorArtifactKeys: result.reusedPriorArtifactKeys,
      outputArtifactKeys: result.outputArtifactKeys,
      failedEditIndexes: result.failedEditIndexes,
    },
    null,
    2
  )
);
