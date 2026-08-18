import { execFileSync } from "node:child_process";
import { findDevRunnerPid } from "@nolo/llama-runtime";
import { createDevControlRuntime, resolveKeys, type ProcessKey } from "./devControlRuntime";
import { publishDevWebBuildSignal } from "./devAssetManifest.js";

const REPO_ROOT = process.cwd();

function resolveCurrentBranch(cwd: string) {
  try {
    return execFileSync("git", ["-C", cwd, "branch", "--show-current"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

async function createRuntime() {
  const branch = process.env.GIT_BRANCH ?? resolveCurrentBranch(REPO_ROOT);
  return createDevControlRuntime({
    repoRoot: REPO_ROOT,
    env: branch ? { GIT_BRANCH_NAME: branch } : undefined,
  });
}

const runtime = await createRuntime();


function printHelp(): void {
  const { apiOrigin, logDir } = runtime.describe();
  console.log(
    [
      "bun dev:ctl commands:",
      "  bun run dev:ctl start [all|backend|web|api]",
      "  bun run dev:ctl stop [all|backend|web|api]",
      "  bun run dev:ctl restart [all|backend|web|api]",
      "  bun run dev:ctl status",
      "  bun run dev:ctl status --json",
      "  bun run dev:ctl wait [api|web] [timeoutMs]",
      "  bun run dev:ctl logs [all|backend|web|api] [lines]",
      "",
      `default api origin: ${apiOrigin}`,
      `logs dir: ${logDir}`,
    ].join("\n")
  );
}

async function main(): Promise<void> {
  const [, , command, target, extra] = process.argv;
  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "start" || command === "restart") {
    const devRunnerPid = findDevRunnerPid({ repoRoot: REPO_ROOT });
    if (devRunnerPid) {
      throw new Error(
        [
          `bun dev is already running on pid ${devRunnerPid}.`,
          "Use the interactive bun dev commands (rr / ra / rt) instead of dev:ctl start/restart,",
          "or stop bun dev before using dev:ctl.",
        ].join(" ")
      );
    }
  }

  if (command === "start") {
    await runtime.startTargets(resolveKeys(target));
    return;
  }

  if (command === "stop") {
    await runtime.stopTargets(resolveKeys(target));
    return;
  }

  if (command === "restart") {
    const keys = resolveKeys(target);
    await runtime.stopTargets(keys);
    await runtime.startTargets(keys);
    if (keys.includes("api")) {
      await publishDevWebBuildSignal({ buildMs: 0 }).catch(() => undefined);
    }
    return;
  }

  if (command === "status") {
    if (target === "--json") {
      console.log(JSON.stringify({ processes: await runtime.collectStatus() }, null, 2));
      return;
    }
    await runtime.printStatus();
    return;
  }

  if (command === "wait") {
    const waitTarget = (target ?? "api") as ProcessKey;
    if (!["api", "web"].includes(waitTarget)) {
      throw new Error(`Unknown wait target: ${waitTarget}`);
    }
    const timeoutMs = Math.max(1000, Number(extra ?? "10000") || 10000);
    await runtime.waitForTarget(waitTarget, timeoutMs);
    return;
  }

  if (command === "logs") {
    await runtime.printLogs(target, extra);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

if (import.meta.main) {
  await main();
}
