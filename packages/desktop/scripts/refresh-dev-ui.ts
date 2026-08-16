#!/usr/bin/env bun
/**
 * Cold-refresh Nolo Desktop-dev UI after web asset changes.
 *
 * Prefer the permanent fix: channel=dev serves monorepo `public/` live via
 * resolveDesktopPublicDir (source=monorepo-dev). Use this script when you still
 * need a nuclear reset (stuck WebView cache, dead instance lock, or testing
 * packaged public with NOLO_DESKTOP_USE_PACKAGED_PUBLIC=1).
 *
 * Usage (from repo root or packages/desktop):
 *   bun packages/desktop/scripts/refresh-dev-ui.ts
 *   bun packages/desktop/scripts/refresh-dev-ui.ts --no-open
 *   bun packages/desktop/scripts/refresh-dev-ui.ts --clear-cache
 */
import { existsSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(import.meta.dir, "../../..");
const desktopApp = join(
  repoRoot,
  "packages/desktop/build/dev-macos-arm64/Nolo Desktop-dev.app"
);
const channelDir = join(
  homedir(),
  "Library/Application Support/chat.nolo.desktop/dev"
);
const lockPath = join(channelDir, "desktop-instance.lock.json");
const webkitStoreRoot = join(
  homedir(),
  "Library/WebKit/chat.nolo.desktop/WebsiteDataStore"
);

const args = new Set(process.argv.slice(2));
const noOpen = args.has("--no-open");
const clearCache = args.has("--clear-cache") || args.has("--nuke-cache");
const help = args.has("--help") || args.has("-h");

if (help) {
  console.log(`refresh-dev-ui.ts — cold-restart Desktop-dev

Options:
  --clear-cache   Delete WebKit NetworkCache for chat.nolo.desktop
  --no-open       Only stop Desktop; do not reopen the app
  -h, --help      Show this help

After the monorepo-public fix, most UI changes only need Cmd+R in the app
(or a normal relaunch). Use --clear-cache when the icon/CSS still looks stuck.
`);
  process.exit(0);
}

const log = (msg: string) => console.log(`[refresh-dev-ui] ${msg}`);

const killPid = (pid: number) => {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already dead
  }
  try {
    process.kill(pid, 0);
    spawnSync("kill", ["-9", String(pid)], { stdio: "ignore" });
  } catch {
    // gone
  }
};

// Stop existing dev instance via lock file
if (existsSync(lockPath)) {
  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
      pid?: number;
      port?: number;
    };
    if (typeof lock.pid === "number") {
      log(`stopping lock pid=${lock.pid} port=${lock.port ?? "?"}`);
      killPid(lock.pid);
    }
  } catch (error) {
    log(`could not parse lock: ${error}`);
  }
  try {
    unlinkSync(lockPath);
    log(`removed ${lockPath}`);
  } catch {
    // ignore
  }
}

// Also try launcher/main by path pattern (best-effort, no pkill -f self-match)
const ps = spawnSync("ps", ["-ax", "-o", "pid=,command="], {
  encoding: "utf8",
});
if (ps.status === 0 && ps.stdout) {
  for (const line of ps.stdout.split("\n")) {
    if (!line.includes("dev-macos-arm64") || !line.includes("Nolo Desktop")) {
      continue;
    }
    const pid = Number(line.trim().split(/\s+/)[0]);
    if (Number.isFinite(pid) && pid > 0) {
      log(`stopping process pid=${pid}`);
      killPid(pid);
    }
  }
}

if (clearCache && existsSync(webkitStoreRoot)) {
  // Only NetworkCache / CacheStorage — keep cookies & localStorage
  const storeIds = spawnSync("find", [webkitStoreRoot, "-maxdepth", "1", "-type", "d"], {
    encoding: "utf8",
  });
  const roots = (storeIds.stdout ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s && s !== webkitStoreRoot);
  for (const store of roots) {
    for (const name of ["NetworkCache", "CacheStorage"]) {
      const target = join(store, name);
      if (existsSync(target)) {
        rmSync(target, { recursive: true, force: true });
        log(`cleared ${target}`);
      }
    }
  }
}

const monorepoPublic = join(repoRoot, "public");
const latestAssets = join(monorepoPublic, "latest-assets.json");
if (existsSync(latestAssets)) {
  try {
    const meta = JSON.parse(readFileSync(latestAssets, "utf8")) as {
      buildTime?: string;
      js?: string;
    };
    log(
      `monorepo public buildTime=${meta.buildTime ?? "?"} js=${meta.js ?? "?"}`
    );
  } catch {
    log(`monorepo public present at ${monorepoPublic}`);
  }
} else {
  log(
    `WARN: missing ${latestAssets} — run web build/esDev before expecting UI updates`
  );
}

if (!noOpen) {
  if (!existsSync(desktopApp)) {
    console.error(
      `[refresh-dev-ui] Desktop-dev app not found: ${desktopApp}\n` +
        `Build it first (e.g. cd packages/desktop && bun run dev / electrobun build).`
    );
    process.exit(1);
  }
  log(`opening ${desktopApp}`);
  const opened = spawnSync("open", [desktopApp], { stdio: "inherit" });
  if (opened.status !== 0) {
    process.exit(opened.status ?? 1);
  }
}

log("done — expect log line: using public dir ... (source=monorepo-dev)");
