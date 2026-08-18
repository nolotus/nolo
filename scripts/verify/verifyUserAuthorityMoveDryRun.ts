#!/usr/bin/env bun

import { toErrorMessage } from "core/errorMessage";
import { normalizeServerOrigin as normalizeBaseUrl } from "core/serverOrigin";
import { buildAuthorityMoveAdminUrl } from "../authorityMoveUser";

export type VerifyUserAuthorityMoveDryRunArgs = {
  sourceUrl: string;
  targetUrl: string;
  userId: string;
  moveId?: string;
  movedAt?: string;
  allowManualReview: boolean;
  wantJson: boolean;
  help: boolean;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const usage = () => {
  console.log(`Read-only verifier for user authority move dry-run.

Usage:
  USER_AUTHORITY_MOVE_SOURCE_SECRET=<secret> bun scripts/verify/verifyUserAuthorityMoveDryRun.ts --source-url https://source.example.com --target-url https://target.example.com --user <userId> --json

Options:
  --source-url <origin>       Source server origin.
  --target-url <origin>       Target server origin.
  --user, --user-id <id>      User id to dry-run.
  --move-id <id>              Optional audit id passed to export.
  --moved-at <iso>            Optional audit timestamp passed to export.
  --allow-manual-review       Do not fail when manualReviewCount is non-zero.
  --json                      Print full machine-readable report.
  -h, --help                  Show help.

Environment:
  USER_AUTHORITY_MOVE_SOURCE_SECRET or USER_AUTHORITY_MOVE_SECRET is required.

Safety:
  This verifier only calls source export. It never calls target import or source cutover.
`);
};

const readValue = (argv: string[], index: number, flag: string) => {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`missing value for ${flag}`);
  }
  return value;
};

export function parseVerifyUserAuthorityMoveDryRunArgs(
  argv: string[]
): VerifyUserAuthorityMoveDryRunArgs {
  const parsed: VerifyUserAuthorityMoveDryRunArgs = {
    sourceUrl: "",
    targetUrl: "",
    userId: "",
    moveId: undefined,
    movedAt: undefined,
    allowManualReview: false,
    wantJson: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") {
      parsed.help = true;
      continue;
    }
    if (arg === "--json") {
      parsed.wantJson = true;
      continue;
    }
    if (arg === "--allow-manual-review") {
      parsed.allowManualReview = true;
      continue;
    }
    if (arg === "--source-url") {
      parsed.sourceUrl = normalizeBaseUrl(readValue(argv, index, arg));
      index += 1;
      continue;
    }
    if (arg === "--target-url") {
      parsed.targetUrl = normalizeBaseUrl(readValue(argv, index, arg));
      index += 1;
      continue;
    }
    if (arg === "--user" || arg === "--user-id") {
      parsed.userId = readValue(argv, index, arg).trim();
      index += 1;
      continue;
    }
    if (arg === "--move-id") {
      parsed.moveId = readValue(argv, index, arg).trim();
      index += 1;
      continue;
    }
    if (arg === "--moved-at") {
      parsed.movedAt = readValue(argv, index, arg).trim();
      index += 1;
      continue;
    }
    throw new Error(`unknown arg: ${arg}`);
  }

  if (parsed.help) return parsed;
  if (!parsed.sourceUrl) throw new Error("--source-url is required");
  if (!parsed.targetUrl) throw new Error("--target-url is required");
  if (!parsed.userId) throw new Error("--user is required");
  if (parsed.sourceUrl === parsed.targetUrl) {
    throw new Error("source and target URLs must be different");
  }
  return parsed;
}

export function buildUserAuthorityMoveDryRunUrl(args: {
  sourceUrl: string;
  targetUrl: string;
  userId: string;
  moveId?: string;
  movedAt?: string;
}) {
  return buildAuthorityMoveAdminUrl({
    baseUrl: args.sourceUrl,
    action: "export",
    params: {
      userId: args.userId,
      sourceServer: normalizeBaseUrl(args.sourceUrl),
      targetServer: normalizeBaseUrl(args.targetUrl),
      moveId: args.moveId,
      movedAt: args.movedAt,
    },
  });
}

export function resolveUserAuthorityMoveDryRunSecret(
  env: Record<string, string | undefined>
) {
  const secret =
    env.USER_AUTHORITY_MOVE_SOURCE_SECRET?.trim() ||
    env.USER_AUTHORITY_MOVE_SECRET?.trim() ||
    "";
  if (!secret) {
    throw new Error(
      "missing USER_AUTHORITY_MOVE_SOURCE_SECRET or USER_AUTHORITY_MOVE_SECRET"
    );
  }
  return secret;
}

const parseJsonResponse = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { success: false, error: text };
  }
};

export async function runVerifyUserAuthorityMoveDryRun({
  args,
  env = process.env,
  fetchImpl = fetch,
}: {
  args: VerifyUserAuthorityMoveDryRunArgs;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
}) {
  const secret = resolveUserAuthorityMoveDryRunSecret(env);
  const url = buildUserAuthorityMoveDryRunUrl(args);

  const unauthedResponse = await fetchImpl(url);
  if (unauthedResponse.ok) {
    throw new Error(
      `unauthed dry-run endpoint unexpectedly returned HTTP ${unauthedResponse.status}`
    );
  }

  const response = await fetchImpl(url, {
    headers: {
      "x-user-authority-move-secret": secret,
    },
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok || payload?.success !== true) {
    throw new Error(
      `authority move dry-run failed HTTP ${response.status}: ${JSON.stringify(payload)}`
    );
  }

  const manualReviewCount = Number(payload?.result?.manualReviewCount ?? 0);
  if (manualReviewCount > 0 && !args.allowManualReview) {
    throw new Error(
      `manual-review records exist: ${JSON.stringify(
        payload?.result?.manualReviewRecordKeys ?? []
      )}`
    );
  }

  return {
    ok: true,
    url: url.toString(),
    unauthenticatedStatus: unauthedResponse.status,
    result: payload.result,
    recordsPreview: Array.isArray(payload.records) ? payload.records.slice(0, 5) : [],
  };
}

const summarizeReport = (report: any) => ({
  ok: report.ok,
  unauthenticatedStatus: report.unauthenticatedStatus,
  userId: report.result?.userId,
  sourceServer: report.result?.sourceServer,
  targetServer: report.result?.targetServer,
  moveableCount: report.result?.moveableCount,
  manualReviewCount: report.result?.manualReviewCount,
  skippedRecordCount: report.result?.skippedRecordCount,
  manualReviewRecordKeys: report.result?.manualReviewRecordKeys ?? [],
  moveableRecordKeysPreview: Array.isArray(report.result?.moveableRecordKeys)
    ? report.result.moveableRecordKeys.slice(0, 20)
    : [],
});

export async function runVerifyUserAuthorityMoveDryRunCli(
  argv = process.argv.slice(2),
  env: Record<string, string | undefined> = process.env
) {
  const args = parseVerifyUserAuthorityMoveDryRunArgs(argv);
  if (args.help) {
    usage();
    return null;
  }

  const report = await runVerifyUserAuthorityMoveDryRun({ args, env });
  console.log(JSON.stringify(args.wantJson ? report : summarizeReport(report), null, 2));
  return report;
}

if (import.meta.main) {
  runVerifyUserAuthorityMoveDryRunCli().catch((error) => {
    console.error(toErrorMessage(error));
    usage();
    process.exit(1);
  });
}
