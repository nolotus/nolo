import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

export type DevProcessKey = "web" | "api";

export type ManagedProcessConfig = {
  key: DevProcessKey;
  command: string[];
};

type RunningProcess = {
  key: DevProcessKey;
  pid: number;
};

const DEV_RUNNER_NEEDLE = "./scripts/dev/devRunner.ts";

function joinForInput(root: string, ...parts: string[]): string {
  return root.includes("\\") ? path.win32.join(root, ...parts) : path.join(root, ...parts);
}

function parsePsLines(output: string): Array<{ pid: number; command: string }> {
  const processes: Array<{ pid: number; command: string }> = [];
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    const pid = Number(match[1]);
    if (!Number.isInteger(pid)) continue;
    processes.push({ pid, command: match[2] });
  }
  return processes;
}

export function getDevControlLogDir(repoRoot = process.cwd()) {
  return joinForInput(repoRoot, "logs", "dev-control");
}

export function getPidFilePath(
  key: DevProcessKey,
  repoRoot = process.cwd()
) {
  return joinForInput(getDevControlLogDir(repoRoot), `${key}.pid`);
}

export function getPidCommandFilePath(
  key: DevProcessKey,
  repoRoot = process.cwd()
) {
  return joinForInput(getDevControlLogDir(repoRoot), `${key}.command`);
}

export function getLogFilePath(
  key: DevProcessKey,
  repoRoot = process.cwd()
) {
  return joinForInput(getDevControlLogDir(repoRoot), `${key}.log`);
}

export function isPidRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // Node surfaces process.kill(0) errors as ErrnoException; the cast reads .code on the well-known shape.
    const errno = error as { code?: unknown };
    return errno?.code === "EPERM";
  }
}

export function readPidFile(
  key: DevProcessKey,
  repoRoot = process.cwd()
): number | null {
  try {
    const raw = readFileSync(getPidFilePath(key, repoRoot), "utf8").trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function readPidCommandFile(
  key: DevProcessKey,
  repoRoot = process.cwd()
): string | null {
  try {
    return readFileSync(getPidCommandFilePath(key, repoRoot), "utf8").trim() || null;
  } catch {
    return null;
  }
}

export function findExistingPid(
  needle: string,
  options?: {
    repoRoot?: string;
    psOutput?: string;
    currentPid?: number;
    pidRunningChecker?: (pid: number) => boolean;
  }
): number | null {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const currentPid = options?.currentPid ?? process.pid;

  try {
    const output =
      options?.psOutput ??
      execFileSync("ps", ["-Ao", "pid=,command="], {
        cwd: repoRoot,
        encoding: "utf8",
      });
    for (const { pid, command } of parsePsLines(output)) {
      if (!Number.isInteger(pid) || pid === currentPid) continue;
      if (command.includes(needle)) return pid;
    }
    return null;
  } catch {
    return null;
  }
}

function pidMatchesNeedle(
  pid: number,
  needle: string,
  options?: {
    repoRoot?: string;
    psOutput?: string;
  }
): boolean {
  try {
    if (options?.psOutput) {
      return parsePsLines(options.psOutput).some(
        (entry) => entry.pid === pid && entry.command.includes(needle)
      );
    }
    const output = execFileSync("ps", ["-p", String(pid), "-o", "command="], {
      cwd: options?.repoRoot ?? process.cwd(),
      encoding: "utf8",
    });
    return output.includes(needle);
  } catch {
    return false;
  }
}

export function resolveManagedPid(
  config: ManagedProcessConfig,
  options?: {
    repoRoot?: string;
    psOutput?: string;
    currentPid?: number;
    pidRunningChecker?: (pid: number) => boolean;
  }
): number | null {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const pidRunningChecker = options?.pidRunningChecker ?? isPidRunning;
  const pidFromFile = readPidFile(config.key, repoRoot);
  const needle = config.command.slice(1).join(" ");
  const pidCommandFromFile = readPidCommandFile(config.key, repoRoot);
  if (pidFromFile && pidRunningChecker(pidFromFile)) {
    if (
      pidCommandFromFile === needle ||
      pidMatchesNeedle(pidFromFile, needle, { repoRoot, psOutput: options?.psOutput })
    ) {
      return pidFromFile;
    }
    // Live pid with a different launch fingerprint: leave foreign metadata alone
    // and do not rediscover/overwrite (would steal another config's pid files
    // or claim an unrelated system process matching the command needle).
    return null;
  }
  const discoveredPid = findExistingPid(needle, options);
  return discoveredPid && pidRunningChecker(discoveredPid) ? discoveredPid : null;
}

export function collectRunningManagedProcesses(
  configs: Record<DevProcessKey, ManagedProcessConfig>,
  options?: {
    repoRoot?: string;
    psOutput?: string;
    currentPid?: number;
    pidRunningChecker?: (pid: number) => boolean;
  }
): RunningProcess[] {
  const pidRunningChecker = options?.pidRunningChecker ?? isPidRunning;
  const running: RunningProcess[] = [];
  for (const key of ["web", "api"] as const) {
    const pid = resolveManagedPid(configs[key], options);
    if (pid && pidRunningChecker(pid)) {
      running.push({ key, pid });
    }
  }
  return running;
}

export function findDevRunnerPid(options?: {
  repoRoot?: string;
  psOutput?: string;
  currentPid?: number;
}): number | null {
  return findExistingPid(DEV_RUNNER_NEEDLE, options);
}
