import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveMachineId } from "connector-experimental/machineInfo";
import { isCompiledBinary } from "./cliEnvHelpers";
import { acquireConnectorInstanceLock } from "./connectorInstanceLock";

type EnvLike = Record<string, string | undefined>;
type OutputLike = { write(chunk: string): unknown };

type PackageJson = {
  name?: string;
  workspaces?: string[] | { packages?: string[] };
};

const CONNECTOR_RUNTIME_WORKSPACE_PACKAGES = new Set([
  "connector-experimental",
  "ai",
]);

function readJsonFile<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function getWorkspacePatterns(packageJson: PackageJson) {
  if (Array.isArray(packageJson.workspaces)) return packageJson.workspaces;
  return packageJson.workspaces?.packages ?? [];
}

function normalizePath(path: string) {
  const resolved = resolve(path);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isInsideOrSame(path: string, parent: string) {
  const relativePath = relative(parent, path);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function findWorkspaceRoot(startPath: string) {
  let current = resolve(startPath);
  while (true) {
    const packageJsonPath = join(current, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = readJsonFile<PackageJson>(packageJsonPath);
      if (packageJson && getWorkspacePatterns(packageJson).length > 0) {
        return current;
      }
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function listWorkspacePackageJsonFiles(workspaceParent: string): string[] {
  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try {
    entries = readdirSync(workspaceParent, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const relativePath = `${entry.name}/package.json`;
    if (existsSync(join(workspaceParent, relativePath))) {
      results.push(relativePath);
    }
  }
  return results;
}

function validateConnectorWorkspaceLinks(cwd: string) {
  const repoRoot = findWorkspaceRoot(cwd);
  if (!repoRoot) return [];

  const rootPackageJson = readJsonFile<PackageJson>(join(repoRoot, "package.json"));
  if (!rootPackageJson) return [];

  const normalizedRepoRoot = normalizePath(realpathSync(repoRoot));
  const errors: string[] = [];

  for (const pattern of getWorkspacePatterns(rootPackageJson)) {
    if (!pattern.endsWith("/*")) continue;
    const workspaceParent = join(repoRoot, pattern.slice(0, -2));
    if (!existsSync(workspaceParent)) continue;

    for (const entry of listWorkspacePackageJsonFiles(workspaceParent)) {
      const packageDir = join(workspaceParent, dirname(entry));
      const packageJson = readJsonFile<PackageJson>(join(workspaceParent, entry));
      if (!packageJson?.name || !CONNECTOR_RUNTIME_WORKSPACE_PACKAGES.has(packageJson.name)) {
        continue;
      }

      const linkPath = join(repoRoot, "node_modules", ...packageJson.name.split("/"));
      if (!existsSync(linkPath)) {
        errors.push(`${linkPath} is missing. Run bun install in ${repoRoot}.`);
        continue;
      }

      const actualPath = normalizePath(realpathSync(linkPath));
      const expectedPath = normalizePath(realpathSync(packageDir));
      if (!isInsideOrSame(actualPath, normalizedRepoRoot)) {
        errors.push(
          `${linkPath} points outside this checkout: ${actualPath}. Run bun install in ${repoRoot}.`,
        );
        continue;
      }
      if (actualPath !== expectedPath) {
        errors.push(
          `${linkPath} points at ${actualPath}, expected ${expectedPath}. Run bun install in ${repoRoot}.`,
        );
      }
    }
  }

  return errors;
}

export async function checkConnectorWorkspaceLinks(
  cwd: string,
  output: OutputLike,
  validateWorkspaceLinks: (cwd: string) => string[] | Promise<string[]>,
) {
  const errors = await validateWorkspaceLinks(cwd);
  if (errors.length === 0) return true;
  output.write(
    [
      "[nolo] Connector workspace package links are unsafe.",
      "The connector would import workspace packages from a different checkout, so machine capabilities and runtime behavior may be stale.",
      ...errors,
      "",
    ].join("\n"),
  );
  return false;
}

function resolveDaemonLogPath(env: EnvLike) {
  return env.NOLO_CONNECT_LOG || join(homedir(), ".nolo", "logs", "connector.log");
}

function buildDaemonCommand(cliEntrypointPath: string | undefined) {
  const execPath = process.execPath;
  const entrypoint = cliEntrypointPath || fileURLToPath(import.meta.url);
  if (isCompiledBinary() || entrypoint === execPath) {
    // Standalone binary: the executable itself is the CLI entrypoint.
    return [execPath, "connect", "--ws"];
  }
  return [execPath, entrypoint, "connect", "--ws"];
}

function defaultSpawnDaemon(args: {
  cmd: string[];
  cwd: string;
  env: EnvLike;
  logPath: string;
}) {
  mkdirSync(dirname(args.logPath), { recursive: true });
  const out = openSync(args.logPath, "a");
  const env = Object.fromEntries(
    Object.entries(args.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
  const proc = spawn(args.cmd[0], args.cmd.slice(1), {
    cwd: args.cwd,
    env,
    detached: true,
    stdio: ["ignore", out, out],
  });
  proc.unref();
  return { pid: proc.pid };
}

export type MachineDaemonCommandDeps = {
  env?: EnvLike;
  output?: OutputLike;
  cliEntrypointPath?: string;
  validateWorkspaceLinks?: (cwd: string) => string[] | Promise<string[]>;
  spawnDaemon?: (args: {
    cmd: string[];
    cwd: string;
    env: EnvLike;
    logPath: string;
  }) => { pid?: number };
  /** 单实例锁的 home 目录（测试隔离用；默认 `~/.nolo` 或 `$NOLO_HOME`）。 */
  connectorHomeDir?: string;
  /** 机器 id（默认从 machine-id 文件解析；测试可注入）。 */
  machineId?: string;
};

export async function runMachineDaemonCommand(
  deps: MachineDaemonCommandDeps = {}
) {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;
  const validateWorkspaceLinks = deps.validateWorkspaceLinks ?? validateConnectorWorkspaceLinks;

  if (!(await checkConnectorWorkspaceLinks(process.cwd(), output, validateWorkspaceLinks))) {
    return 1;
  }

  // 单实例互斥（2026-10-27 事故）：daemon 之前先探一次锁——已有存活实例时直接
  // 拒绝，不再多起一个进程（多起的那个会和存量实例互相踢下线）。
  // 真正的锁由随后 spawn 的 `connect --ws` 子进程持有：子进程自己用 O_EXCL
  // 原子获取，锁里的 pid 始终是那个活着的 connector 进程，陈旧锁判活才准确。
  const probe = acquireConnectorInstanceLock({
    machineId: deps.machineId ?? resolveMachineId(),
    homeDir: deps.connectorHomeDir,
    noloHome: env.NOLO_HOME,
    kind: "daemon",
  });
  if (!probe.ok) {
    output.write(
      `[nolo] A connector for this machine is already running (pid=${probe.pid}). ` +
        `Do not start two connectors at the same time — stop the running one first ` +
        `(or check whether it is still healthy) before starting a new one.\n`
    );
    return 3;
  }
  probe.release();

  const logPath = resolveDaemonLogPath(env);
  const result = (deps.spawnDaemon ?? defaultSpawnDaemon)({
    cmd: buildDaemonCommand(deps.cliEntrypointPath),
    cwd: process.cwd(),
    env,
    logPath,
  });
  output.write(`Connector daemon started${result.pid ? ` pid=${result.pid}` : ""}. Log: ${logPath}\n`);
  return 0;
}
