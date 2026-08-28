#!/usr/bin/env bun

import { parseUserIdFromAuthToken, resolveAuthToken } from "../helpers/authContext";
import { LOCAL_SERVER_ORIGIN } from "../helpers/serverBases";
import { queryDbRecords, readDbRecord } from "../helpers/spaceDataHelpers";
import { verifyStrictSubjectRefQueryResults } from "../helpers/subjectRefQueryVerifier";
import type { StrictSubjectRefQueryResult } from "../helpers/subjectRefQueryVerifier";
import type { SubjectRefTarget } from "../helpers/subjectRefLookup";
import { assessTaskThreadMonitor } from "../helpers/taskThreadMonitor";
import { verifyTaskThreadLoopReadOnly } from "./taskThreadLoopVerifier";

const DIALOG_URL_RE = /\/(?:space\/[^/]+\/)?dialog-([^/]+)-([0-9A-HJKMNP-TV-Z]{26})\/?$/i;
const DIALOG_ID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const KNOWN_ARGS = new Set([
  "-h",
  "--help",
  "--row-dbkey",
  "--monitor",
  "--subject-dialog",
  "--query-subject-dialogs",
  "--subject-dialog-limit",
  "--allow-broad-subject-query",
  "--allow-empty-subject-query",
]);
const VALUE_ARGS = new Set([
  "--row-dbkey",
  "--subject-dialog",
  "--subject-dialog-limit",
]);

function rejectUnknownArgs() {
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (!arg?.startsWith("-")) continue;
    if (!KNOWN_ARGS.has(arg)) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (VALUE_ARGS.has(arg)) {
      index += 1;
    }
  }
}

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getRepeatedArg(flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === flag && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
      index += 1;
    }
  }
  return values;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function getPositiveIntArg(flag: string, fallback: number) {
  const raw = getArg(flag);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return parsed;
}

function resolveDialogKey(rawInput: string, tenantId?: string) {
  const raw = rawInput.trim();
  if (!raw) throw new Error("Empty dialog input.");
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const url = new URL(raw);
    const match = url.pathname.match(DIALOG_URL_RE);
    if (!match) throw new Error(`Unsupported dialog URL: ${raw}`);
    return `dialog-${match[1]}-${match[2]}`;
  }
  if (raw.startsWith("dialog-")) return raw;
  if (DIALOG_ID_RE.test(raw)) {
    if (!tenantId) throw new Error("USER_ID is required for bare dialog ids.");
    return `dialog-${tenantId}-${raw}`;
  }
  throw new Error(`Unsupported dialog input: ${raw}`);
}

function usage() {
  console.log(`Usage:
  TASK_ROW_DBKEY=row-... bun scripts/verify/verifyExistingTaskThreadLoop.ts
  bun scripts/verify/verifyExistingTaskThreadLoop.ts --row-dbkey row-...
  bun scripts/verify/verifyExistingTaskThreadLoop.ts --row-dbkey row-... --monitor
  bun scripts/verify/verifyExistingTaskThreadLoop.ts --row-dbkey row-... --subject-dialog dialog-user-01...
  bun scripts/verify/verifyExistingTaskThreadLoop.ts --row-dbkey row-... --query-subject-dialogs --subject-dialog-limit 100 --monitor
  bun scripts/verify/verifyExistingTaskThreadLoop.ts --row-dbkey row-... --query-subject-dialogs --allow-broad-subject-query

Env:
  TASK_ROW_DBKEY  Existing task row dbKey.
  NOLO_SERVER     Target server. Alias: BASE_URL. Default: http://127.0.0.1:38123
  AUTH_TOKEN      Auth token. Falls back to current nolo CLI profile.
  USER_ID         Tenant/user id for dialog key fallback when activity refs omit dialogKey.

This script is read-only. It reports active task row fields plus linked
dialog/checkpoint/artifact evidence. --subject-dialog supplies read-only
candidate dialogs for the dialog.subjectRefs reverse lookup path.
--query-subject-dialogs reads dialog.subjectRefs links through the server
query endpoint and fails when the raw result includes unrelated dialogs. Use
--allow-broad-subject-query only for old deployment diagnostics. Use
--allow-empty-subject-query when an empty query result is expected.`);
}

rejectUnknownArgs();

if (hasFlag("--help") || hasFlag("-h")) {
  usage();
  process.exit(0);
}

const rowDbKey = getArg("--row-dbkey") ?? process.env.TASK_ROW_DBKEY;
if (!rowDbKey) {
  usage();
  process.exit(1);
}

const baseUrl = (process.env.NOLO_SERVER ?? process.env.BASE_URL ?? LOCAL_SERVER_ORIGIN).replace(/\/+$/, "");
const authToken = resolveAuthToken({ includeTestFallback: false });
if (!authToken) {
  throw new Error("AUTH_TOKEN or a nolo CLI profile auth token is required.");
}
const tenantId = process.env.USER_ID ?? parseUserIdFromAuthToken(authToken);
if (!tenantId) {
  throw new Error("USER_ID or a parseable auth token is required.");
}

const row = await readDbRecord(baseUrl, authToken, rowDbKey);
const subjectDialogCandidates = [];
const taskSubjectRef: SubjectRefTarget = { kind: "table-row", id: rowDbKey, role: "task" };
let subjectQueryStrictness: StrictSubjectRefQueryResult | undefined;
for (const input of getRepeatedArg("--subject-dialog")) {
  subjectDialogCandidates.push(
    await readDbRecord(baseUrl, authToken, resolveDialogKey(input, tenantId))
  );
}
const subjectDialogLimit = getPositiveIntArg(
  "--subject-dialog-limit",
  100
);
if (hasFlag("--query-subject-dialogs")) {
  const queriedSubjectDialogs = await queryDbRecords(baseUrl, authToken, tenantId, {
    type: "dialog",
    limit: subjectDialogLimit,
    subjectRef: taskSubjectRef,
  });
  subjectQueryStrictness = verifyStrictSubjectRefQueryResults(
    queriedSubjectDialogs,
    taskSubjectRef,
    { allowEmpty: hasFlag("--allow-empty-subject-query") }
  );
  subjectDialogCandidates.push(...queriedSubjectDialogs);
}
const verification = await verifyTaskThreadLoopReadOnly({
  row,
  tenantId,
  readDialog: (dialogKey) => readDbRecord(baseUrl, authToken, dialogKey),
  subjectDialogCandidates,
});
const monitorDecision = process.argv.includes("--monitor")
  ? assessTaskThreadMonitor(verification)
  : undefined;

console.log(JSON.stringify({
  taskRowDbKey: rowDbKey,
  server: baseUrl,
  ...(subjectQueryStrictness ? { subjectQueryStrictness } : {}),
  ...verification,
  ...(monitorDecision ? { monitorDecision } : {}),
}, null, 2));

if (
  subjectQueryStrictness &&
  !subjectQueryStrictness.ok &&
  !(subjectQueryStrictness.reason === "unmatched_results" && hasFlag("--allow-broad-subject-query"))
) {
  process.exitCode = 1;
}
