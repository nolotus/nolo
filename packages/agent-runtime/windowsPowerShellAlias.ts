import { lstatSync, readlinkSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { win32 } from "node:path";

const VERSION_COMMAND = "$PSVersionTable.PSVersion.Major";

type AliasProbeOptions = {
  platform?: string;
  env?: NodeJS.ProcessEnv;
  isAlias?: (path: string) => boolean;
  probe?: (path: string) => string;
  resolveTarget?: (path: string) => string;
};

function defaultIsAlias(path: string): boolean {
  return lstatSync(path).isSymbolicLink();
}

function defaultResolveTarget(path: string): string {
  const target = win32.resolve(win32.dirname(path), readlinkSync(path));
  if (win32.basename(target).toLowerCase() !== "pwsh.exe" || !statSync(target).isFile()) {
    throw new Error("Store alias does not point to a PowerShell executable");
  }
  return target;
}

function defaultProbe(path: string): string {
  return execFileSync(path, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", VERSION_COMMAND,
  ], { encoding: "utf8", timeout: 3000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
}

/** Store 应用执行别名所在目录：%LOCALAPPDATA%\Microsoft\WindowsApps。 */
export function resolveWindowsStoreAliasRoot(
  options: { platform?: string; env?: NodeJS.ProcessEnv } = {},
): string | null {
  if ((options.platform ?? process.platform) !== "win32") return null;
  const env = options.env ?? process.env;
  if (!env.LOCALAPPDATA) return null;
  return win32.resolve(env.LOCALAPPDATA, "Microsoft", "WindowsApps");
}

/**
 * 路径是否落在 Store 别名根目录内。
 *
 * 用于判定「PATH 命中的 pwsh 其实就是别名本身」——这种情况必须换成别名指向的
 * 真实 target，否则 Bun 会去 spawn 一个无法启动的别名。
 */
export function isWindowsStoreAliasPath(
  path: string | null | undefined,
  options: { platform?: string; env?: NodeJS.ProcessEnv } = {},
): boolean {
  if (!path) return false;
  const root = resolveWindowsStoreAliasRoot(options);
  if (!root) return false;
  const relative = win32.relative(root, win32.resolve(path));
  if (relative === "") return true;
  return relative !== ".." && !relative.startsWith("..\\") && !win32.isAbsolute(relative);
}

/**
 * 把单个 Store 别名路径解析成可以直接启动的真实 pwsh.exe。
 *
 * 别名本身无法被 Bun spawn，探针与后续启动都必须用真实 target。
 * 解析失败、版本低于 7 或探针异常一律返回 null，保留 PowerShell 5.1 回退。
 */
export function resolveWindowsPowerShellAliasTarget(
  path: string,
  options: AliasProbeOptions = {},
): string | null {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  if (!isWindowsStoreAliasPath(path, { platform, env })) return null;
  const isAlias = options.isAlias ?? defaultIsAlias;
  const resolveTarget = options.resolveTarget ?? defaultResolveTarget;
  const probe = options.probe ?? defaultProbe;
  try {
    if (!isAlias(path)) return null;
    const target = resolveTarget(path);
    const major = probe(target).trim();
    if (/^\d+$/.test(major) && Number(major) >= 7) return target;
    return null;
  } catch {
    // Missing, disabled, inaccessible or hung aliases must preserve the 5.1 fallback.
    return null;
  }
}

/**
 * 在 Store 别名目录里找出可以直接启动的真实 pwsh.exe。
 *
 * 只看 %LOCALAPPDATA%\Microsoft\WindowsApps 及其子目录，绝不探测任意 PATH 目录。
 */
export function findWindowsPowerShellAlias(options: AliasProbeOptions = {}): string | null {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const root = resolveWindowsStoreAliasRoot({ platform, env });
  if (!root) return null;
  const dirs = [...(env.PATH ?? "").split(";"), root];
  const visited = new Set<string>();
  for (const dir of dirs) {
    if (!dir.trim()) continue;
    const relative = win32.relative(root, win32.resolve(dir));
    // Only probe Store aliases, never arbitrary unstatable PATH entries.
    if (relative === ".." || relative.startsWith("..\\") || win32.isAbsolute(relative)) continue;
    const candidate = win32.join(dir, "pwsh.exe");
    const key = candidate.toLowerCase();
    if (visited.has(key)) continue;
    visited.add(key);
    const target = resolveWindowsPowerShellAliasTarget(candidate, options);
    if (target) return target;
  }
  return null;
}
