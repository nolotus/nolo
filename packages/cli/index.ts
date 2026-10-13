import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { initializeDiagnostics, detectMode } from "./diagnostics";
import { isCompiledBinary } from "./cliEnvHelpers";
import { readPackageInfo } from "./updateCommands";
import {
  consumeWindowsUpdateStartupNotice,
  getWindowsUpdateStatus,
} from "./windowsSelfUpdate";

// —— 阶段 0 / Slice 1：诊断先行 ——
// 在任何应用模块顶层代码可能缓存 console 引用之前，完成模式判定 + console bridge。
// 诊断初始化绝不抛（内部已降级），但要保证同步完成后再动 import 应用本体。
const cliArgs = process.argv.slice(2);
const diagnostics = initializeDiagnostics(detectMode(cliArgs, process.env), process.env);
const logger = diagnostics.logger;

if (process.platform === "win32") {
  // `nolo update status` is a lightweight diagnostic that must answer even
  // while an update is blocking normal startup. Resolve it before the startup
  // guard and without importing any application/DB modules.
  if (cliArgs[0] === "update" && cliArgs[1] === "status") {
    const report = getWindowsUpdateStatus(process.env, {
      currentVersion: readPackageInfo().version,
    });
    process.stdout.write(`${report.text}\n`);
    process.exit(0);
  }

  // `nolo -v` / `nolo --version` are the primary way to verify an update's
  // result. They must answer even while an update blocks normal startup, so
  // resolve them before the guard with the same output the dispatcher prints.
  if (cliArgs.length === 1 && (cliArgs[0] === "-v" || cliArgs[0] === "--version")) {
    const info = readPackageInfo();
    process.stdout.write(`${info.name} ${info.version}\n`);
    process.exit(0);
  }

  const updateNotice = consumeWindowsUpdateStartupNotice(process.env, {
    ownerUpdateId: process.env.NOLO_UPDATE_OWNER_ID,
  });
  if (updateNotice) {
    process.stderr.write(`${updateNotice.text}\n`);
    if (updateNotice.blocking) {
      process.exit(75);
    }
  }
}

const SOURCE_CLI_DIR = dirname(fileURLToPath(import.meta.url));
const CLI_DIR = isCompiledBinary() ? dirname(process.execPath) : SOURCE_CLI_DIR;
const ROOT_DIR = join(CLI_DIR, "..", "..");
const SCRIPT_DIR = join(ROOT_DIR, "scripts");
const packageInfo = readPackageInfo();

const args = cliArgs;

async function runScript(script: string, forwardedArgs: string[], env: NodeJS.ProcessEnv) {
  const { spawnProcess } = await import("./processSpawn");
  const scriptPath = join(SCRIPT_DIR, script);
  const proc = spawnProcess({
    cmd: [process.execPath, scriptPath, ...forwardedArgs],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env,
  });
  return proc.exited;
}

/** TUI pulls agentRun → localRuntimeAdapter graph; only load when launching interactive shell. */
async function launchTuiWorkspace(args: { scriptDir: string; env: NodeJS.ProcessEnv }) {
  const { startTuiWorkspace } = await import("./tui/readlineWorkspace");
  const { createTuiSummaryLlmCaller } = await import("./client/tuiSummaryLlmCaller");
  return startTuiWorkspace({
    ...args,
    // Big dialogs produce ~300KB+ summary prompts that routinely take 25–30s+;
    // the old 30s abort made manual /compact silently degrade to fork-only.
    summaryLlmCaller: createTuiSummaryLlmCaller(args.env, { timeoutMs: 90_000 }),
  });
}

async function main(): Promise<never> {
  // 应用本体动态 import：bridge 装好后才执行应用模块顶层代码。
  const { createCliRuntimeContext, looksLikeDaemonShortcut, renderHelpText, resolveCommand, runResolvedCommand } =
    await import("./commandRegistry");
  const { buildCliRuntimeEnv, loadProfileConfig } = await import("./client/profileConfig");
  const { resolveTuiLaunchMode } = await import("./runtimeModeArgs");

  const runtimeEnv = {
    ...buildCliRuntimeEnv(process.env, loadProfileConfig()),
    NOLO_CLI_VERSION: packageInfo.version,
  };

  const runtimeContext = createCliRuntimeContext({
    env: runtimeEnv,
    scriptDir: SCRIPT_DIR,
    entrypointPath: isCompiledBinary() ? process.execPath : fileURLToPath(import.meta.url),
    packageInfo,
  });

  if (args.length === 0) {
    if (process.stdin.isTTY) {
      await launchTuiWorkspace({ scriptDir: SCRIPT_DIR, env: runtimeEnv });
    } else {
      // 帮助文本是**用户请求的数据**而非诊断——直接写 stdout，
      // 不经过诊断管线（bridge 已拦 console.log）。
      process.stdout.write(`${renderHelpText()}\n`);
    }
    process.exit(0);
  }

  const tuiLaunchMode = resolveTuiLaunchMode(args);
  if (tuiLaunchMode.shouldStartTui) {
    await launchTuiWorkspace({
      scriptDir: SCRIPT_DIR,
      env: { ...runtimeEnv, ...tuiLaunchMode.envPatch },
    });
    process.exit(0);
  }

  const commandArgs = looksLikeDaemonShortcut(args) ? ["daemon", ...args] : args;
  const command = resolveCommand(commandArgs);
  if (!command) {
    // "Unknown command" 也是用户面输出（stderr），直写不走诊断。
    process.stderr.write(`Unknown command: ${args.join(" ")}\n\n`);
    process.stdout.write(`${renderHelpText()}\n`);
    process.exit(1);
  }

  const exitCode = await runResolvedCommand(command, commandArgs, runtimeContext, {
    runScript,
  });
  process.exit(exitCode);
}

main().catch((error) => {
  // fatal path：终端恢复在后续 slice 处理；此处直接写 stderr 原始流
  // （bridge 已拦 console，诊断文件/ring 也已通过 logger.fatal 落盘）。
  try {
    logger.fatal("unhandled error in CLI main", error);
  } catch { /* */ }
  try {
    const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    process.stderr.write(`${msg}\n`);
  } catch {
    try { process.stderr.write("fatal: unhandled error\n"); } catch { /* */ }
  }
  process.exit(70);
});
