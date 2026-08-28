#!/usr/bin/env bun
import { toErrorMessage } from "core/errorMessage";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { parseUserIdFromAuthToken, resolveAuthToken } from "../helpers/authContext";
import { readDbRecord } from "../helpers/spaceDataHelpers";
import { filterDialogsBySubjectRef } from "../helpers/subjectRefLookup";

const DEFAULT_BASE_URL = "https://nolo.chat";
const DIALOG_URL_RE = /\/(?:space\/[^/]+\/)?dialog-([^/]+)-([0-9A-HJKMNP-TV-Z]{26})\/?$/i;
const DIALOG_ID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readRepeatedFlag(name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
      index += 1;
    }
  }
  return values;
}

function printUsage() {
  console.error(`Usage:
  TASK_ROW_DBKEY=row-... AUTH_TOKEN=... bun scripts/verify/verifySubjectRefTaskDialogLookup.ts --dialog dialog-user-01...

Options:
  --row-dbkey <dbKey>       Task row dbKey. Defaults to TASK_ROW_DBKEY.
  --dialog <dialog>         Candidate dialog dbKey, URL, or dialog id. Repeatable.
  --server <url>            Nolo server. Defaults to NOLO_SERVER or ${DEFAULT_BASE_URL}.
  --user-id <id>            Required when --dialog is a bare dialog id.`);
}

function rowSummary(row: Record<string, any>) {
  const values = asRecordOrEmpty(row.values);
  return {
    dbKey: row.dbKey ?? null,
    rowId: row.rowId ?? row.id ?? null,
    title: values.title ?? row.title ?? values.name ?? null,
    status: values.status ?? row.status ?? null,
    codeStatus: values.codeStatus ?? row.codeStatus ?? null,
    owner: values.owner ?? row.owner ?? null,
  };
}

function resolveDialogKey(rawInput: string, userId?: string) {
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
    if (!userId) throw new Error("--user-id or USER_ID is required for bare dialog ids.");
    return `dialog-${userId}-${raw}`;
  }
  throw new Error(`Unsupported dialog input: ${raw}`);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    return;
  }

  const rowDbKey = readFlag("--row-dbkey") ?? process.env.TASK_ROW_DBKEY;
  const authToken = readFlag("--auth-token") ?? resolveAuthToken({ includeTestFallback: false });
  const baseUrl = readFlag("--server") ?? process.env.NOLO_SERVER ?? DEFAULT_BASE_URL;
  const userId = readFlag("--user-id") ?? process.env.USER_ID ?? parseUserIdFromAuthToken(authToken ?? "");
  const dialogInputs = readRepeatedFlag("--dialog");

  if (!rowDbKey || !authToken) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const row = await readDbRecord(baseUrl, authToken, rowDbKey);
  const dialogKeys = dialogInputs.map((input) => resolveDialogKey(input, userId));
  const dialogs = [];
  const dialogReadErrors = [];
  for (const dialogKey of dialogKeys) {
    try {
      dialogs.push(await readDbRecord(baseUrl, authToken, dialogKey));
    } catch (error) {
      dialogReadErrors.push({
        dialogKey,
        error: toErrorMessage(error),
      });
    }
  }

  const matches = filterDialogsBySubjectRef(dialogs, {
    kind: "table-row",
    id: rowDbKey,
    role: "task",
  });

  console.log(JSON.stringify({
    ok: dialogReadErrors.length === 0,
    source: "dialog.subjectRefs",
    readOnly: true,
    server: baseUrl,
    row: rowSummary(row),
    checkedDialogCount: dialogs.length,
    failedDialogReads: dialogReadErrors,
    matchedDialogCount: matches.length,
    matchedDialogIds: matches.map((match) => match.dialogId).filter(Boolean),
    matches,
    note:
      "This probe reads the task row only to define the target. Dialog matches come from dialog.subjectRefs, not row-side caches.",
  }, null, 2));
}

main().catch((error) => {
  console.error(toErrorMessage(error));
  process.exitCode = 1;
});
