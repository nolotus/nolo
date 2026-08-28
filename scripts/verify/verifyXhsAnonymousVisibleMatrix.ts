#!/usr/bin/env bun

import { readXhsProfileWithBridge } from "../../packages/integrations/xhs-reader/bridge/readXhsProfileWithBridge";
import { redactXhsSensitiveValue } from "../../packages/integrations/xhs-reader/redaction";
import type {
  XhsCollectorDiagnostic,
  XhsProfileCollection,
  XhsReadResult,
} from "../../packages/integrations/xhs-reader/types";

const DEFAULT_PROFILE_URLS = [
  "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
];
const ROUTES = {
  directProfile: {
    accessPattern: "direct_profile",
    anonymousSessionMode: "ephemeral",
  },
  homepageWarmupThenProfile: {
    accessPattern: "homepage_warmup_then_profile",
    anonymousSessionMode: "ephemeral",
  },
  persistentAnonymousWarmupThenProfile: {
    accessPattern: "homepage_warmup_then_profile",
    anonymousSessionMode: "persistent",
  },
} as const;
type RouteName = keyof typeof ROUTES;

function readFlag(name: string) {
  const prefix = `${name}=`;
  const inline = Bun.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (inline !== undefined) return inline;
  const index = Bun.argv.indexOf(name);
  return index >= 0 ? Bun.argv[index + 1] : undefined;
}

function readFlags(name: string) {
  const values: string[] = [];
  for (let index = 0; index < Bun.argv.length; index += 1) {
    const arg = Bun.argv[index];
    const prefix = `${name}=`;
    if (arg.startsWith(prefix)) {
      values.push(arg.slice(prefix.length));
      continue;
    }
    if (arg === name && Bun.argv[index + 1]) {
      values.push(Bun.argv[index + 1]);
      index += 1;
    }
  }
  return values;
}

function hasFlag(name: string) {
  return Bun.argv.includes(name);
}

const timeoutMs = Number(readFlag("--timeout-ms") ?? process.env.PROBE_TIMEOUT_MS ?? 120000);
const attempts = Math.min(5, Math.max(1, Number(readFlag("--attempts") ?? 1)));
const delayMs = Math.max(0, Number(readFlag("--delay-ms") ?? 2000));
const shouldRun = hasFlag("--run");
const routeNames = ((readFlag("--routes") ?? Object.keys(ROUTES).join(","))
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean) as RouteName[])
  .filter((route) => route in ROUTES);
const rawProfileUrls = [
  ...readFlags("--profile-url"),
  ...readFlags("--url"),
  ...(readFlag("--urls") ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  ...(process.env.XHS_PROFILE_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
];
const profileUrls = Array.from(new Set(rawProfileUrls.length > 0 ? rawProfileUrls : DEFAULT_PROFILE_URLS));

if (routeNames.length === 0) {
  throw new Error(`No valid --routes selected. Valid routes: ${Object.keys(ROUTES).join(",")}`);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`Usage:
  bun run verify:xhs-anonymous-visible-matrix -- --run --profile-url <xhs-profile-url>

Validates the anonymous-visible XHS reader path without writing tables:
  readXhsProfileWithBridge -> JSON visibleCoverage matrix

Options:
  --run                    Actually open anonymous desktop browser reads. Without it, prints a dry-run plan.
  --profile-url=<url>      XHS profile URL. Repeatable.
  --urls=<url1,url2>       Comma-separated XHS profile URLs.
  --attempts=<n>           Attempts per profile. Defaults to 1, max 5.
  --delay-ms=<n>           Delay between attempts. Defaults to 2000.
  --routes=<names>         Comma-separated route names. Defaults to all routes:
                           directProfile,homepageWarmupThenProfile,persistentAnonymousWarmupThenProfile.
  --timeout-ms=<n>         Per-profile timeout. Defaults to 120000.

Optional env:
  NOLO_XHS_READER_DESKTOP_CHANNEL=<channel> Default desktop channel for local runs, defaults to stable.
  XHS_PROFILE_URLS=<urls>                    Comma-separated profile URLs.
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

for (const profileUrl of profileUrls) {
  assertNoSensitiveText("--profile-url", profileUrl);
}

function redactProfileUrl(profileUrl: string) {
  return redactXhsSensitiveValue(profileUrl) as string;
}

function countComments(data: XhsProfileCollection) {
  return Object.values(data.commentsByNote ?? {}).reduce(
    (total, comments) => total + comments.length,
    0,
  );
}

function pageDiagnostics(diagnostic: XhsCollectorDiagnostic | undefined) {
  if (!diagnostic) return undefined;
  return {
    finalUrl: diagnostic.finalUrl ? redactProfileUrl(diagnostic.finalUrl) : undefined,
    pageTitle: diagnostic.pageTitle,
    redirectedToLogin: diagnostic.redirectedToLogin,
    loginDetected: diagnostic.loginDetected,
    loginPromptDismissed: diagnostic.loginPromptDismissed,
    initialStatePresent: diagnostic.initialStatePresent,
    initialStateNoteCount: diagnostic.initialStateNoteCount,
    capturedApiResponseCount: diagnostic.capturedApiResponseCount,
    firstApiResponseStatus: diagnostic.firstApiResponseStatus,
    bodyTextLength: diagnostic.bodyTextLength,
    visibleCloseCandidateCount: diagnostic.visibleCloseCandidateCount,
    visibleNoteLinkCount: diagnostic.visibleNoteLinkCount,
  };
}

function summarizeResult(
  profileUrl: string,
  routeName: RouteName,
  attemptIndex: number,
  result: XhsReadResult<XhsProfileCollection>,
) {
  if (!result.ok) {
    return {
      profileUrl: redactProfileUrl(profileUrl),
      routeName,
      attemptIndex,
      ok: false,
      anonymousUnavailable: true,
      diagnosticCode: result.code,
      diagnosticMessage: result.message,
      pageDiagnostics: pageDiagnostics(result.diagnostic),
      visibleCoverage: {
        profile: false,
        profileCounts: false,
        notes: false,
        covers: false,
        comments: false,
      },
      commentSummary: "未采集",
      fetchedAt: result.fetchedAt,
    };
  }

  const data = result.data;
  const interactionCounts = data.profile.interactionCounts ?? {};
  const noteCount = data.notes.length;
  const coverCount = data.notes.filter((note) => Boolean(note.coverUrl)).length;
  const totalComments = countComments(data);
  const highestLiked = data.analysis.highestLikedNote;
  const anonymousUnavailable = ["login_required", "blocked", "captcha_required", "empty_profile_state"].includes(
    String(data.diagnostic?.code ?? ""),
  );

  return {
    profileUrl: redactProfileUrl(profileUrl),
    routeName,
    attemptIndex,
    ok: true,
    anonymousUnavailable,
    userId: data.profile.userId,
    nickname: data.profile.nickname,
    redId: data.profile.redId,
    ipLocation: data.profile.ipLocation,
    interactionCounts,
    noteCount,
    coverCount,
    firstNoteTitles: data.notes.slice(0, 5).map((note) => note.title ?? ""),
    highestLikedTitle: highestLiked?.title ?? "",
    highestLikedCount: highestLiked?.count ?? 0,
    totalComments,
    commentSummary: totalComments > 0 ? `匿名公开页面返回 ${totalComments} 条评论` : "未采集",
    diagnosticCode: data.diagnostic?.code ?? "OK",
    diagnosticMessage: data.diagnostic?.message ?? "匿名公开读取完成",
    pageDiagnostics: pageDiagnostics(data.diagnostic),
    loginPromptDismissed: data.diagnostic?.loginPromptDismissed ?? false,
    visibleCoverage: {
      profile: Boolean(data.profile.nickname || data.profile.userId),
      profileCounts: Boolean(
        interactionCounts.follows != null ||
          interactionCounts.fans != null ||
          interactionCounts.likesAndCollects != null,
      ),
      notes: noteCount > 0,
      covers: coverCount > 0,
      comments: totalComments > 0,
    },
    fetchedAt: result.fetchedAt,
  };
}

function coverageScore(row: ReturnType<typeof summarizeResult>) {
  return (
    (row.visibleCoverage.profile ? 100 : 0) +
    (row.visibleCoverage.profileCounts ? 40 : 0) +
    (row.visibleCoverage.notes ? 40 : 0) +
    (row.visibleCoverage.covers ? 10 : 0) +
    (row.visibleCoverage.comments ? 1 : 0) +
    Number("noteCount" in row ? row.noteCount : 0) +
    Number("coverCount" in row ? row.coverCount : 0)
  );
}

function selectBestAttempt(rows: Array<ReturnType<typeof summarizeResult>>) {
  return rows.reduce((best, row) => (
    coverageScore(row) > coverageScore(best) ? row : best
  ));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!shouldRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      classification: "verify-script",
      profileUrls: profileUrls.map(redactProfileUrl),
      timeoutMs,
      attempts,
      delayMs,
      routes: routeNames,
      runCommand:
        "bun run verify:xhs-anonymous-visible-matrix -- --run --attempts 3 --routes directProfile,homepageWarmupThenProfile,persistentAnonymousWarmupThenProfile --profile-url <xhs-profile-url>",
      policy: "匿名公开 desktop bridge；不登录、不使用 cookie、不补采详情/评论、不写表。",
    }, null, 2));
    return;
  }

  process.env.NOLO_XHS_READER_DESKTOP_CHANNEL =
    process.env.NOLO_XHS_READER_DESKTOP_CHANNEL ?? "stable";

  const rows = [];
  for (const profileUrl of profileUrls) {
    const routeRows = [];
    for (const routeName of routeNames) {
      const route = ROUTES[routeName];
      const attemptRows = [];
      for (let attemptIndex = 1; attemptIndex <= attempts; attemptIndex += 1) {
        const result = await readXhsProfileWithBridge({
          url: profileUrl,
          timeoutMs,
          accessPattern: route.accessPattern,
          anonymousSessionMode: route.anonymousSessionMode,
        });
        attemptRows.push(summarizeResult(profileUrl, routeName, attemptIndex, result));
        if (attemptIndex < attempts && delayMs > 0) await sleep(delayMs);
      }
      routeRows.push({
        routeName,
        accessPattern: route.accessPattern,
        anonymousSessionMode: route.anonymousSessionMode,
        bestAttempt: selectBestAttempt(attemptRows),
        attempts: attemptRows,
      });
    }
    rows.push({
      profileUrl: redactProfileUrl(profileUrl),
      bestRoute: routeRows.reduce((best, row) => (
        coverageScore(row.bestAttempt) > coverageScore(best.bestAttempt) ? row : best
      )),
      routes: routeRows,
    });
  }

  console.log(JSON.stringify({
    ok: rows.every((row) => row.bestRoute.bestAttempt.ok || row.bestRoute.bestAttempt.anonymousUnavailable),
    classification: "verify-script",
    policy: "匿名公开读取；评论默认未采集。",
    profileCount: rows.length,
    attemptsPerProfile: attempts,
    routeNames,
    rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
