#!/usr/bin/env bun

import { join } from "node:path";

const DEFAULT_SERVER = "https://alpha-a.nolo.chat";
const DEFAULT_AGENT = "agent-0e95801d90-01XHSPROFILETABLE000001";
const DEFAULT_TENANT_ID = "0e95801d90";
const DEFAULT_PROFILE_URL =
  "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556";

function readFlag(name: string) {
  const prefix = `${name}=`;
  const inline = Bun.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (inline !== undefined) return inline;
  const index = Bun.argv.indexOf(name);
  return index >= 0 ? Bun.argv[index + 1] : undefined;
}

function hasFlag(name: string) {
  return Bun.argv.includes(name);
}

const server = (readFlag("--server") ?? process.env.NOLO_SERVER ?? DEFAULT_SERVER).replace(/\/+$/, "");
const agentKey = readFlag("--agent") ?? process.env.AGENT_KEY ?? DEFAULT_AGENT;
const profileUrl = readFlag("--profile-url") ?? readFlag("--url") ?? process.env.XHS_PROFILE_URL ?? DEFAULT_PROFILE_URL;
const tenantId = readFlag("--tenant-id") ?? process.env.TENANT_ID ?? DEFAULT_TENANT_ID;
const timeoutMs = Number(readFlag("--timeout-ms") ?? process.env.PROBE_TIMEOUT_MS ?? 240000);
const shouldRun = hasFlag("--run");
const cliEntry = join(process.cwd(), "packages", "cli", "index.ts");

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`Usage:
  bun run verify:xhs-profile-table-smoke -- --profile-url <xhs-profile-url> --run

Validates the supported desktop/local XHS workflow:
  read_xhs_profile -> createTable -> addTableRow -> table query

Options:
  --run             Actually create a remote smoke table and row. Without it, prints a dry-run plan.
  --server=<url>    Defaults to ${DEFAULT_SERVER}
  --agent=<key>     Defaults to ${DEFAULT_AGENT}
  --tenant-id=<id>  Defaults to ${DEFAULT_TENANT_ID}
  --timeout-ms=<n>  Defaults to 240000

Optional env:
  NOLO_XHS_READER_DESKTOP_CHANNEL=<channel> Default desktop channel for CLI local runs, defaults to stable.
`);
  process.exit(0);
}

function assertNoSensitiveText(label: string, value: string) {
  if (/(^|[;\s])(?:a1|web_session|webId|galaxy_sessionid)=/i.test(value)) {
    throw new Error(`${label} appears to contain browser session material; refusing to continue.`);
  }
  if (/stealth|bypass|绕过验证|规避平台风控|隐形自动化/i.test(value)) {
    throw new Error(`${label} contains a disallowed automation route.`);
  }
}

assertNoSensitiveText("--profile-url", profileUrl);

function buildPrompt() {
  return [
    "正式 XHS 用户画像 + table E2E smoke。",
    "必须实际调用工具，不要只口头回答。",
    "小红书读取必须使用匿名公开模式：不要登录、不要使用 cookie、不要请求评论或直接详情 API。",
    "read_xhs_profile 参数要求：默认只传 url；不要补采详情或评论。",
    "然后 createTable 并 addTableRow 写入一行。",
    "行里至少写 profileUrl,nickname,noteCount,totalComments,highestLikedTitle,highestLikedCount,highestCommentedTitle,highestCommentCount,topLikedComment,topLikedCommentLikeCount,personaSummary,commentSummary,collectionMode,collectedAt,diagnosticCode,diagnosticMessage,anonymousUnavailable。",
    "如果匿名公开访问遇到登录墙或空状态，也必须写入一行：noteCount/totalComments 可以为 0，但 diagnosticCode/diagnosticMessage/anonymousUnavailable 必须说明原因。",
    "评论未采集是正常结果：totalComments 写 0，commentSummary 写“未采集”，不要把它判为失败。",
    "最后只汇报 tool 调用、table id、row id、nickname、noteCount、totalComments、diagnosticCode、anonymousUnavailable、最高赞帖、commentSummary。",
    `URL: ${profileUrl}`,
  ].join("\n");
}

async function runCommand(args: string[], env: Record<string, string | undefined>) {
  const proc = Bun.spawn(args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `command failed (${exitCode}): ${args.join(" ")}\nstdout:\n${stdout.slice(-4000)}\nstderr:\n${stderr.slice(-4000)}`,
    );
  }
  return { stdout, stderr };
}

function extractEvidence(output: string) {
  const tableId =
    /tableId=([A-Z0-9]{20,})/.exec(output)?.[1] ??
    /Table ID\*\* \| `([^`]+)`/.exec(output)?.[1] ??
    /Table ID[:：]\s*`([^`]+)`/i.exec(output)?.[1] ??
    /表 ID\*\*[:：]\s*`([^`]+)`/.exec(output)?.[1] ??
    /表 ID[:：]\s*`([^`]+)`/.exec(output)?.[1] ??
    /tableId[:：]\s*`?([A-Z0-9]{20,})`?/i.exec(output)?.[1] ??
    /"tableId":\s*"([^"]+)"/.exec(output)?.[1];
  const rowId =
    /rowId:\s*([A-Z0-9]{20,})/.exec(output)?.[1] ??
    /Row ID\*\* \| `([^`]+)`/.exec(output)?.[1] ??
    /Row ID[:：]\s*`([^`]+)`/i.exec(output)?.[1] ??
    /行 ID\*\*[:：]\s*`([^`]+)`/.exec(output)?.[1] ??
    /行 ID[:：]\s*`([^`]+)`/.exec(output)?.[1] ??
    /rowId[:：]\s*`?([A-Z0-9]{20,})`?/i.exec(output)?.[1] ??
    /"rowId":\s*"([^"]+)"/.exec(output)?.[1];
  const dialogId = /\[nolo\] dialog\s+([A-Z0-9]+)/.exec(output)?.[1] ?? null;
  const toolNames = Array.from(output.matchAll(/\[nolo:tool\]\s+#\d+\s+->\s+([a-zA-Z_]+)/g))
    .map((match) => match[1]);
  if (!tableId || !rowId) {
    throw new Error(`agent output did not include tableId/rowId:\n${output.slice(-4000)}`);
  }
  for (const required of ["read_xhs_profile", "createTable", "addTableRow"]) {
    if (!toolNames.includes(required)) {
      throw new Error(`agent output did not include required tool ${required}: ${JSON.stringify(toolNames)}`);
    }
  }
  return { tableId, rowId, dialogId, toolNames };
}

async function queryRow(tableId: string, rowId: string) {
  const tableMetaKey = `meta-${tenantId}-${tableId}`;
  const rowDbKey = `row-${tenantId}-${tableId}-${rowId}`;
  const { stdout } = await runCommand(
    [
      "bun",
      cliEntry,
      "table",
      "query",
      "--table",
      tableMetaKey,
      "--row",
      rowDbKey,
      "--output",
      "json",
    ],
    { NOLO_SERVER: server },
  );
  const parsed = JSON.parse(stdout);
  const row = parsed?.items?.[0];
  if (!row) throw new Error(`table query did not return inserted row: ${stdout}`);
  if (row.profileUrl !== profileUrl) {
    throw new Error(`inserted row profileUrl mismatch: ${row.profileUrl}`);
  }
  const noteCount = Number(row.noteCount ?? 0);
  const totalComments = Number(row.totalComments ?? 0);
  const anonymousUnavailable =
    row.anonymousUnavailable === true ||
    String(row.anonymousUnavailable ?? "").toLowerCase() === "true" ||
    ["login_required", "blocked", "captcha_required", "empty_state"].includes(String(row.diagnosticCode ?? ""));
  if (!row.nickname && !anonymousUnavailable) {
    throw new Error(`inserted row is missing nickname without anonymous-unavailable diagnostic: ${JSON.stringify(row)}`);
  }
  if (noteCount <= 0 && !anonymousUnavailable) {
    throw new Error(`inserted row has no notes without anonymous-unavailable diagnostic: ${JSON.stringify(row)}`);
  }
  if (noteCount > 0 && !anonymousUnavailable) {
    if (!row.highestLikedTitle || Number(row.highestLikedCount ?? 0) <= 0) {
      throw new Error(`inserted row has notes but no highest-liked evidence: ${JSON.stringify(row)}`);
    }
    if (totalComments !== 0) {
      throw new Error(`default anonymous smoke should not collect comments: ${JSON.stringify(row)}`);
    }
    if (!String(row.commentSummary ?? "").includes("未采集")) {
      throw new Error(`inserted row should mark comments as not collected: ${JSON.stringify(row)}`);
    }
  }
  return { tableMetaKey, rowDbKey, row };
}

async function main() {
  if (!shouldRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      classification: "verify-script",
      server,
      agentKey,
      tenantId,
      profileUrl,
      runCommand:
        "bun packages/cli/index.ts agent run <agent> --local --msg <xhs-anonymous-visible-table-smoke> --no-stream",
      followUp: "rerun with --run to execute read_xhs_profile -> createTable -> addTableRow -> table query",
    }, null, 2));
    return;
  }

  const { stdout } = await runCommand(
    [
      "bun",
      cliEntry,
      "agent",
      "run",
      agentKey,
      "--local",
      "--msg",
      buildPrompt(),
      "--timeout-ms",
      String(timeoutMs),
      "--no-stream",
    ],
    {
      NOLO_SERVER: server,
      NOLO_XHS_READER_DESKTOP_CHANNEL:
        process.env.NOLO_XHS_READER_DESKTOP_CHANNEL ?? "stable",
    },
  );
  const evidence = extractEvidence(stdout);
  const rowEvidence = await queryRow(evidence.tableId, evidence.rowId);
  console.log(JSON.stringify({
    ok: true,
    classification: "verify-script",
    server,
    agentKey,
    profileUrl,
    dialogId: evidence.dialogId,
    tableId: evidence.tableId,
    rowId: evidence.rowId,
    tableMetaKey: rowEvidence.tableMetaKey,
    rowDbKey: rowEvidence.rowDbKey,
    toolNames: evidence.toolNames,
    nickname: rowEvidence.row.nickname,
    noteCount: rowEvidence.row.noteCount,
    totalComments: rowEvidence.row.totalComments,
    highestLikedTitle: rowEvidence.row.highestLikedTitle,
    highestLikedCount: rowEvidence.row.highestLikedCount,
    commentSummary: rowEvidence.row.commentSummary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
