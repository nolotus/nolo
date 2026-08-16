#!/usr/bin/env bun

import { copyFileSync, existsSync, realpathSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { tmpdir, homedir } from "node:os";

import { toErrorMessage } from "core/errorMessage";

export type LocalDesktopUpdateE2EArgs = {
  oldApp: string;
  feedDir: string;
  expectedVersion: string;
  feedPort: number;
  desktopPortBase: number;
  timeoutMs: number;
  skipApply: boolean;
  keepCache: boolean;
};

type DesktopUpdaterSnapshotLike = {
  activeOperation?: string | null;
  localInfo?: {
    version?: string;
  } | null;
  summary?: {
    phase?: string;
    primaryAction?: string | null;
    statusMessage?: string | null;
  } | null;
};

type DesktopUpdateE2EOutcome = "download" | "apply" | "updated" | "failed" | "wait";

function readArg(argv: string[], flag: string) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

function readFlag(argv: string[], flag: string) {
  return argv.includes(flag);
}

function parsePositiveInt(value: string | undefined, fallback: number, name: string) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function parseLocalDesktopUpdateE2EArgs(argv: string[]): LocalDesktopUpdateE2EArgs {
  const oldApp = readArg(argv, "--old-app")?.trim();
  const feedDir = readArg(argv, "--feed-dir")?.trim();
  const expectedVersion = readArg(argv, "--expected-version")?.trim();

  if (!oldApp) throw new Error("--old-app is required");
  if (!feedDir) throw new Error("--feed-dir is required");
  if (!expectedVersion) throw new Error("--expected-version is required");

  return {
    oldApp,
    feedDir,
    expectedVersion,
    feedPort: parsePositiveInt(readArg(argv, "--port"), 49275, "--port"),
    desktopPortBase: parsePositiveInt(
      readArg(argv, "--desktop-port-base"),
      3233,
      "--desktop-port-base",
    ),
    timeoutMs: parsePositiveInt(readArg(argv, "--timeout-ms"), 180000, "--timeout-ms"),
    skipApply: readFlag(argv, "--skip-apply"),
    keepCache: readFlag(argv, "--keep-cache"),
  };
}

export function resolveOldAppLauncherPath(oldApp: string) {
  if (basename(oldApp) === "launcher") {
    return oldApp;
  }
  return join(oldApp, "Contents", "MacOS", "launcher");
}

function escapeProcessPattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolveDesktopAppProcessPatterns(args: {
  oldApp: string;
  realApp?: string;
}) {
  const paths = new Set<string>();
  paths.add(args.oldApp);
  if (args.realApp) {
    paths.add(args.realApp);
  } else if (existsSync(args.oldApp)) {
    paths.add(realpathSync(args.oldApp));
  }
  return [...paths].map(escapeProcessPattern);
}

export function resolveDesktopUpdateE2EOutcome(args: {
  expectedVersion: string;
  snapshot: DesktopUpdaterSnapshotLike;
}): DesktopUpdateE2EOutcome {
  const phase = args.snapshot.summary?.phase;
  const primaryAction = args.snapshot.summary?.primaryAction;

  if (args.snapshot.localInfo?.version === args.expectedVersion && phase === "up_to_date") {
    return "updated";
  }
  if (phase === "error" || phase === "invalid_remote") {
    return "failed";
  }
  if (primaryAction === "download") {
    return "download";
  }
  if (primaryAction === "apply") {
    return "apply";
  }
  return "wait";
}

function usage() {
  console.log(`Usage:
  bun scripts/verify/desktop/localDesktopUpdateE2E.ts \\
    --old-app "/tmp/nolo-desktop-old-build/Nolo Desktop.app" \\
    --feed-dir /tmp/nolo-desktop-feed-new \\
    --expected-version 0.1.12 [options]

Options:
  --port <number>               Local feed port. Default: 49275
  --desktop-port-base <number>  First desktop API port to poll. Default: 3233
  --timeout-ms <number>         End-to-end timeout. Default: 180000
  --skip-apply                  Stop after the update reaches ready_to_install
  --keep-cache                  Do not clear stable desktop runtime/cache dirs
`);
}

function log(message: string) {
  console.log(`[local-desktop-update-e2e] ${message}`);
}

function clearStableDesktopCache() {
  const paths = [
    join(homedir(), "Library", "Application Support", "chat.nolo.desktop", "stable"),
    join(homedir(), "Library", "Caches", "chat.nolo.desktop", "stable"),
  ];
  for (const path of paths) {
    rmSync(path, { recursive: true, force: true });
    log(`cleared ${path}`);
  }
}

function serveFeed(feedDir: string, port: number) {
  const root = resolve(feedDir);
  return Bun.serve({
    hostname: "127.0.0.1",
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const relative = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
      if (!relative || relative.includes("..")) {
        return new Response("not found", { status: 404 });
      }
      const file = Bun.file(join(root, relative));
      if (!(await file.exists())) {
        return new Response("not found", { status: 404 });
      }
      return new Response(file);
    },
  });
}

async function fetchSnapshot(port: number) {
  const response = await fetch(`http://127.0.0.1:${port}/api/desktop-updater`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`desktop updater returned HTTP ${response.status}`);
  }
  return (await response.json()) as DesktopUpdaterSnapshotLike;
}

async function postAction(port: number, action: "check" | "download" | "apply") {
  const response = await fetch(`http://127.0.0.1:${port}/api/desktop-updater`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok && response.status !== 202) {
    throw new Error(
      `desktop updater ${action} returned HTTP ${response.status}: ${await response.text()}`,
    );
  }
  return (await response.json()) as DesktopUpdaterSnapshotLike;
}

async function terminateDesktopAppProcesses(oldApp: string) {
  for (const pattern of resolveDesktopAppProcessPatterns({ oldApp })) {
    const proc = Bun.spawn(["pkill", "-f", pattern], {
      stdout: "ignore",
      stderr: "ignore",
    });
    await proc.exited.catch(() => 1);
  }
}

async function pollSnapshot(args: {
  desktopPortBase: number;
  timeoutAt: number;
}): Promise<{ port: number; snapshot: DesktopUpdaterSnapshotLike }> {
  while (Date.now() < args.timeoutAt) {
    for (let offset = 0; offset < 20; offset += 1) {
      const port = args.desktopPortBase + offset;
      try {
        return { port, snapshot: await fetchSnapshot(port) };
      } catch {
        // Try the next possible desktop port; the app falls through when the base is occupied.
      }
    }
    await Bun.sleep(500);
  }
  throw new Error("timed out waiting for desktop updater API");
}

async function waitForOutcome(args: {
  expectedVersion: string;
  desktopPortBase: number;
  timeoutAt: number;
  wanted: DesktopUpdateE2EOutcome[];
}) {
  let lastSnapshot: DesktopUpdaterSnapshotLike | null = null;
  while (Date.now() < args.timeoutAt) {
    const { port, snapshot } = await pollSnapshot(args);
    lastSnapshot = snapshot;
    const outcome = resolveDesktopUpdateE2EOutcome({
      expectedVersion: args.expectedVersion,
      snapshot,
    });
    log(
      `snapshot port=${port} local=${snapshot.localInfo?.version ?? "?"} phase=${
        snapshot.summary?.phase ?? "?"
      } action=${snapshot.summary?.primaryAction ?? "-"}`
    );
    if (outcome === "failed") {
      throw new Error(
        `desktop updater failed: ${snapshot.summary?.statusMessage ?? snapshot.summary?.phase}`,
      );
    }
    if (args.wanted.includes(outcome)) {
      return { port, snapshot, outcome };
    }
    await Bun.sleep(1000);
  }
  throw new Error(
    `timed out waiting for ${args.wanted.join("/")} after snapshot ${JSON.stringify(
      lastSnapshot,
    )}`,
  );
}

async function runLocalDesktopUpdateE2E(args: LocalDesktopUpdateE2EArgs) {
  if (process.platform !== "darwin") {
    throw new Error("local desktop update E2E currently supports macOS only");
  }
  const launcherPath = resolveOldAppLauncherPath(args.oldApp);
  if (!existsSync(launcherPath)) {
    throw new Error(`old app launcher does not exist: ${launcherPath}`);
  }
  if (!existsSync(join(args.feedDir, "stable-macos-arm64-update.json"))) {
    throw new Error(`feed is missing stable-macos-arm64-update.json: ${args.feedDir}`);
  }
  const channelManifestPath = join(args.feedDir, "desktop-release-manifest.stable.json");
  const legacyManifestPath = join(args.feedDir, "desktop-release-manifest.json");
  if (!existsSync(channelManifestPath) && !existsSync(legacyManifestPath)) {
    throw new Error(
      `feed is missing desktop-release-manifest.stable.json (or legacy desktop-release-manifest.json): ${args.feedDir}`,
    );
  }
  if (!existsSync(channelManifestPath) && existsSync(legacyManifestPath)) {
    // Local E2E feeds may only ship the legacy alias; mirror it to the
    // per-channel path so updater coordinator channel-first lookup succeeds.
    copyFileSync(legacyManifestPath, channelManifestPath);
  }

  if (!args.keepCache) {
    clearStableDesktopCache();
  }

  const server = serveFeed(args.feedDir, args.feedPort);
  const logPath = join(tmpdir(), `nolo-desktop-update-e2e-${Date.now()}.log`);
  log(`serving ${args.feedDir} at http://127.0.0.1:${args.feedPort}`);
  log(`launching ${launcherPath}`);
  log(`desktop log ${logPath}`);

  const app = Bun.spawn([launcherPath], {
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      NOLO_DESKTOP_LOG_PATH: logPath,
      NOLO_DESKTOP_UPDATE_CHECK_DELAY_MS: "0",
    },
  });

  const timeoutAt = Date.now() + args.timeoutMs;
  try {
    const initial = await waitForOutcome({
      expectedVersion: args.expectedVersion,
      desktopPortBase: args.desktopPortBase,
      timeoutAt,
      wanted: ["download", "updated"],
    });
    if (initial.outcome === "updated") {
      log(`already updated to ${args.expectedVersion}`);
      return;
    }

    log("requesting update download");
    await postAction(initial.port, "download");
    const ready = await waitForOutcome({
      expectedVersion: args.expectedVersion,
      desktopPortBase: args.desktopPortBase,
      timeoutAt,
      wanted: ["apply", "updated"],
    });
    if (ready.outcome === "updated" || args.skipApply) {
      log(`update reached ${ready.outcome}`);
      return;
    }

    log("requesting update apply");
    await postAction(ready.port, "apply");
    await waitForOutcome({
      expectedVersion: args.expectedVersion,
      desktopPortBase: args.desktopPortBase,
      timeoutAt,
      wanted: ["updated"],
    });
    log(`updated to ${args.expectedVersion}`);
  } finally {
    app.kill();
    await Bun.sleep(500);
    await terminateDesktopAppProcesses(args.oldApp);
    server.stop(true);
  }
}

if (import.meta.main) {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    usage();
    process.exit(0);
  }

  try {
    await runLocalDesktopUpdateE2E(parseLocalDesktopUpdateE2EArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(
      `[local-desktop-update-e2e] ${toErrorMessage(error)}`,
    );
    process.exit(1);
  }
}
