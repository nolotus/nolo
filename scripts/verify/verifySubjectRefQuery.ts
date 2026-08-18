#!/usr/bin/env bun

import { toErrorMessage } from "core/errorMessage";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { parseUserIdFromAuthToken, resolveAuthToken } from "../helpers/authContext";
import { LOCAL_SERVER_ORIGIN } from "../helpers/serverBases";
import { queryDbRecords, readDbRecord } from "../helpers/spaceDataHelpers";
import { verifyStrictSubjectRefQueryResults } from "../helpers/subjectRefQueryVerifier";
import type { SubjectRefTarget } from "../helpers/subjectRefLookup";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
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

function printUsage() {
  console.error(`Usage:
  TASK_ROW_DBKEY=row-... bun scripts/verify/verifySubjectRefQuery.ts
  bun scripts/verify/verifySubjectRefQuery.ts --row-dbkey row-...
  bun scripts/verify/verifySubjectRefQuery.ts --subject-kind table-row --subject-id row-...

Options:
  --row-dbkey <dbKey>       Convenience target for table-row subject refs. Defaults to TASK_ROW_DBKEY.
  --subject-kind <kind>     Generic subject ref kind. Defaults to table-row when --row-dbkey is set.
  --subject-id <id>         Generic subject ref id. Defaults to --row-dbkey.
  --subject-role <role>     Optional role included in the query payload.
  --limit <n>               Query limit. Default: 100.
  --allow-empty             Treat zero returned dialogs as a passing deployment probe.
  --server <url>            Nolo server. Defaults to NOLO_SERVER, BASE_URL, or ${LOCAL_SERVER_ORIGIN}.
  --auth-token <token>      Auth token. Defaults to AUTH_TOKEN or current nolo CLI profile.`);
}

function rowSummary(row: Record<string, any> | null) {
  if (!row) return null;
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

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    printUsage();
    return;
  }

  const rowDbKey = getArg("--row-dbkey") ?? process.env.TASK_ROW_DBKEY;
  const subjectKind = getArg("--subject-kind") ?? (rowDbKey ? "table-row" : undefined);
  const subjectId = getArg("--subject-id") ?? rowDbKey;
  const subjectRole = getArg("--subject-role") ?? (rowDbKey ? "task" : undefined);
  const baseUrl = (
    getArg("--server") ??
    process.env.NOLO_SERVER ??
    process.env.BASE_URL ??
    LOCAL_SERVER_ORIGIN
  ).replace(/\/+$/, "");
  const authToken = getArg("--auth-token") ?? resolveAuthToken({ includeTestFallback: false });
  const tenantId = process.env.USER_ID ?? parseUserIdFromAuthToken(authToken ?? "");
  const limit = getPositiveIntArg("--limit", 100);

  if (!subjectKind || !subjectId || !authToken || !tenantId) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const subjectRef: SubjectRefTarget = {
    kind: subjectKind,
    id: subjectId,
    ...(subjectRole ? { role: subjectRole } : {}),
  };
  const row = rowDbKey ? await readDbRecord(baseUrl, authToken, rowDbKey) : null;
  const dialogs = await queryDbRecords(baseUrl, authToken, tenantId, {
    type: "dialog",
    limit,
    subjectRef: subjectRef,
  });
  const result = verifyStrictSubjectRefQueryResults(dialogs, subjectRef, {
    allowEmpty: hasFlag("--allow-empty"),
  });

  console.log(JSON.stringify({
    ...result,
    strict: true,
    readOnly: true,
    source: "db.query.subjectRef",
    server: baseUrl,
    row: rowSummary(row),
    note:
      "Strict mode checks the raw query result set. Any returned dialog without the requested dialog.subjectRefs match fails the probe.",
  }, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(toErrorMessage(error));
  process.exitCode = 1;
});
