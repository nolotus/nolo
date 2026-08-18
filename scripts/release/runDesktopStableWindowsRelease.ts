#!/usr/bin/env bun

import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

type Step = {
  name: string;
  command: string[];
  env?: Record<string, string>;
};

const args = process.argv.slice(2);
const repoRoot = resolve(import.meta.dir, "..", "..");

function readArg(flag: string) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function readFlag(flag: string) {
  return args.includes(flag);
}

function usage() {
  console.log(`Usage:
  bun scripts/release/runDesktopStableWindowsRelease.ts [options]

Runs the stable Windows desktop release path without GitHub Actions.

Options:
  --sync-ref <ref>        Fetch origin/<ref> and hard-reset this runner checkout before building.
                          Use this only in a dedicated release checkout.
  --allow-dirty          Allow a dirty worktree when --sync-ref is not used.
  --skip-install         Skip bun install.
  --skip-build           Skip Windows installer build.
  --skip-smoke           Skip installed-desktop smoke test.
  --skip-publish         Skip publishDesktopDownloads.ts.
  --dry-run              Print the plan without running commands. Works on non-Windows hosts.
  --json                 Print dry-run output as JSON.
  -h, --help             Show this help.

Required for real execution:
  - Windows host with Bun, Git, Inno Setup, tar, and network access.
  - Desktop publish credentials accepted by scripts/release/publishDesktopDownloads.ts.
`);
}

function fail(message: string): never {
  console.error(`[desktop-stable-windows-release] ${message}`);
  process.exit(1);
}

async function run(command: string[], options: { name: string; env?: Record<string, string> }) {
  console.log(`[desktop-stable-windows-release] ${options.name}`);
  console.log(`$ ${command.join(" ")}`);
  const proc = Bun.spawn(command, {
    cwd: repoRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      ...options.env,
    },
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    fail(`${options.name} failed with exit code ${exitCode}`);
  }
}

function cleanDesktopBuildOutputs() {
  const targets = [
    resolve(repoRoot, "packages/desktop/build"),
    resolve(repoRoot, "packages/desktop/artifacts"),
  ];
  for (const target of targets) {
    rmSync(target, {
      force: true,
      recursive: true,
    });
  }
}

async function capture(command: string[]) {
  const proc = Bun.spawn(command, {
    cwd: repoRoot,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    fail(`${command.join(" ")} failed with ${exitCode}\n${stdout}${stderr}`);
  }
  return stdout.trim();
}

async function ensureCleanWorktree() {
  const status = await capture(["git", "status", "--porcelain"]);
  if (status) {
    fail(
      "Worktree is dirty. Use a dedicated release checkout, commit/stash changes, pass --sync-ref <ref>, or pass --allow-dirty intentionally.",
    );
  }
}

function buildPlan(args: {
  syncRef?: string;
  skipInstall: boolean;
  skipBuild: boolean;
  skipSmoke: boolean;
  skipPublish: boolean;
  buildSha: string;
}) {
  const steps: Step[] = [];
  if (args.syncRef) {
    steps.push({
      name: `Sync release checkout from origin ${args.syncRef}`,
      command: ["git", "fetch", "origin", args.syncRef],
    });
    steps.push({
      name: "Reset release checkout to fetched ref",
      command: ["git", "reset", "--hard", "FETCH_HEAD"],
    });
  }
  if (!args.skipInstall) {
    steps.push({
      name: "Install dependencies",
      command: ["bun", "install", "--frozen-lockfile"],
    });
  }
  if (!args.skipBuild) {
    steps.push({
      name: "Clean desktop build outputs",
      command: ["internal:clean-desktop-build-outputs"],
    });
    steps.push({
      name: "Build Windows desktop installer artifacts",
      command: ["bun", "run", "--cwd", "packages/desktop", "build:stable:windows-installer"],
      env: {
        NOLO_DESKTOP_SKIP_PATCH: "1",
      },
    });
  }
  if (!args.skipSmoke) {
    steps.push({
      name: "Smoke installed Windows desktop artifact",
      command: [
        process.env.NOLO_POWERSHELL ?? "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts/verify/desktop/smokeInstalledWindowsDesktop.ps1",
      ],
      env: {
        NOLO_DESKTOP_SMOKE_MODE: "release",
        NOLO_DESKTOP_SMOKE_SETUP:
          "packages/desktop/smoke-artifacts/NoloDesktop-Smoke-Setup.exe",
        NOLO_DESKTOP_SMOKE_LAUNCHER: "Nolo Desktop Smoke.vbs",
      },
    });
  }
  if (!args.skipPublish) {
    steps.push({
      name: "Publish stable Windows desktop downloads",
      command: [
        "bun",
        "scripts/release/publishDesktopDownloads.ts",
        "--channel",
        "stable",
        "--platform",
        "windows",
        "--artifact-dir",
        "packages/desktop/artifacts",
        "--build-sha",
        args.buildSha,
      ],
    });
  }
  return steps;
}

if (readFlag("-h") || readFlag("--help")) {
  usage();
  process.exit(0);
}

const syncRef = readArg("--sync-ref");
const dryRun = readFlag("--dry-run");
const jsonOutput = readFlag("--json");
const allowDirty = readFlag("--allow-dirty");
const skipInstall = readFlag("--skip-install");
const skipBuild = readFlag("--skip-build");
const skipSmoke = readFlag("--skip-smoke");
const skipPublish = readFlag("--skip-publish");

if (!dryRun && process.platform !== "win32") {
  fail("Real Windows stable desktop release must run on Windows. Use --dry-run to inspect the plan here.");
}

if (!dryRun && !syncRef && !allowDirty) {
  await ensureCleanWorktree();
}

const buildSha = syncRef
  ? `origin/${syncRef}`
  : await capture(["git", "rev-parse", "HEAD"]);
const steps = buildPlan({
  syncRef,
  skipInstall,
  skipBuild,
  skipSmoke,
  skipPublish,
  buildSha,
});

const summary = {
  repoRoot,
  platform: process.platform,
  syncRef: syncRef ?? null,
  buildSha,
  dryRun,
  steps,
};

if (dryRun) {
  console.log(jsonOutput ? JSON.stringify(summary, null, 2) : summary);
  process.exit(0);
}

if (!existsSync(resolve(repoRoot, "packages/desktop/package.json"))) {
  fail(`Not a bun-nolo checkout: ${repoRoot}`);
}

let executableSteps = steps;
if (syncRef) {
  const syncSteps = steps.filter((step) =>
    step.name === `Sync release checkout from origin ${syncRef}` ||
    step.name === "Reset release checkout to fetched ref"
  );
  for (const step of syncSteps) {
    await run(step.command, {
      name: step.name,
      env: step.env,
    });
  }
  const syncedBuildSha = await capture(["git", "rev-parse", "HEAD"]);
  executableSteps = buildPlan({
    syncRef: undefined,
    skipInstall,
    skipBuild,
    skipSmoke,
    skipPublish,
    buildSha: syncedBuildSha,
  });
}

for (const step of executableSteps) {
  if (step.command[0] === "internal:clean-desktop-build-outputs") {
    console.log(`[desktop-stable-windows-release] ${step.name}`);
    cleanDesktopBuildOutputs();
    continue;
  }
  await run(step.command, {
    name: step.name,
    env: step.env,
  });
}

console.log("[desktop-stable-windows-release] Done");
