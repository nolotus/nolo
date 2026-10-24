/**
 * 本机内存可见性提示（只提示，不阻断；跨平台一行输出）。
 *
 * 背景：16GB、无盘 swap 的机器上并发跑多个本地 agent run，匿名内存贴顶时
 * systemd-oomd 会直接杀掉整个桌面会话——用户当时并不知道内存已经到顶。
 * 这里在派发时读一次内存，把一行事实打到已有 output 通道上，让用户在按下
 * 第二个 run 之前就看见。
 *
 * 数据源优先级（全部只读、失败即退让）：
 *   1. 有效 cgroup v2 限额：按本进程实际所属 cgroup（/proc/self/cgroup 的
 *      `0::/path`，拼到 /proc/mounts 里的 cgroup2 挂载点，读不到再退根路径）
 *      读 memory.max + memory.current；`memory.max` 为 `max` = 无限制 → 回退宿主。
 *      是否**展示成 [sandbox]** 另由容器标记决定：systemd service/scope 里的
 *      非容器进程也有配额，那部分同样要显示（标 `[限额]`），不能漏报。
 *   2. Linux 宿主：/proc/meminfo 的 MemTotal / MemAvailable / SwapTotal / SwapFree。
 *   3. Windows / macOS 宿主，或 /proc/meminfo 不可读：node:os 的
 *      totalmem()/freemem()；swap 不可知就显示 `swap n/a`。
 *
 * 契约（刻意的）：不判断、不排队、不拒绝、不抛错。什么都读不到就返回 null，
 * 调用方照常派发；阈值只决定「要不要多一句提醒」。
 */

import { readFileSync, existsSync } from "node:fs";
import { freemem as osFreemem, totalmem as osTotalmem } from "node:os";

export type HostMemorySource = "proc-meminfo" | "cgroup" | "os";

/** 展示口径：宿主总量 / 容器配额 / 非容器进程的 cgroup 限额。 */
export type HostMemoryScope = "host" | "sandbox" | "cgroup-limit";

export type HostMemorySnapshot = {
  source: HostMemorySource;
  /** 展示口径；缺省由 source 推导（cgroup → sandbox，其余 → host）。 */
  scope?: HostMemoryScope;
  totalMb: number;
  /**
   * 可用内存；**null = 占用未知**（如 cgroup 限额目录的 memory.current 读不到）。
   * 未知时绝不退化成「全部可用」：格式化显示「占用未知」，压力判据不触发。
   */
  availableMb: number | null;
  /** null = 不可知（Windows / macOS / 容器里读不到宿主 swap）→ 显示 `swap n/a`。 */
  swapTotalMb: number | null;
  swapUsedMb: number | null;
  /** 仅 cgroup 快照：宿主此刻可用内存（cgroup 之外的重活参考值）；宿主视图为 null。 */
  hostAvailableMb: number | null;
};

/** 注入点只供测试与环境适配；缺省读真实文件系统与 node:os。 */
export type HostMemoryDeps = {
  /** 缺省 process.platform。 */
  platform?: string;
  /** 读文本文件；抛错即视为读不到（由调用方兜住）。 */
  readFile?: (path: string) => string;
  /** 路径是否存在；抛错即视为不存在。 */
  exists?: (path: string) => boolean;
  /** 缺省 node:os；如此注入测试不需要真实宿主。 */
  os?: { totalmem(): number; freemem(): number };
};

export const PROC_MEMINFO_PATH = "/proc/meminfo";
export const PROC_MOUNTS_PATH = "/proc/mounts";
export const CGROUP_V2_MEMORY_MAX_PATH = "/sys/fs/cgroup/memory.max";
export const CGROUP_V2_MEMORY_CURRENT_PATH = "/sys/fs/cgroup/memory.current";
/** /proc/mounts 里找不到 cgroup2 时的默认挂载点。 */
export const DEFAULT_CGROUP2_MOUNT = "/sys/fs/cgroup";
/** 容器标记文件（docker / podman）。 */
export const SANDBOX_MARKER_PATHS = ["/.dockerenv", "/run/.containerenv"] as const;
export const PROC_SELF_CGROUP_PATH = "/proc/self/cgroup";
/** 容器运行时在 cgroup 路径里留下的特征串。 */
export const SANDBOX_CGROUP_PATTERN = /(docker|kubepods|instabox|containerd)/;

/** 可用内存低于总量的这个比例即视为偏紧。 */
export const MEMORY_AVAILABLE_RATIO_THRESHOLD = 0.15;
/** swap 使用率高于这个比例即视为偏紧。 */
export const SWAP_USED_RATIO_THRESHOLD = 0.7;

export const HOST_MEMORY_PRESSURE_HINT = "⚠ 内存偏紧，建议重活放沙盒/远端或减少并发";

const BYTES_PER_MB = 1024 * 1024;

function toMbFromBytes(bytes: number): number {
  return Math.round(bytes / BYTES_PER_MB);
}

function kbToMb(kb: number): number {
  return Math.round(kb / 1024);
}

function tryReadText(deps: HostMemoryDeps, path: string): string | null {
  try {
    const reader = deps.readFile ?? ((p: string) => readFileSync(p, "utf8"));
    const text = reader(path);
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}

function tryExists(deps: HostMemoryDeps, path: string): boolean {
  try {
    const checker = deps.exists ?? ((p: string) => existsSync(p));
    return checker(path) === true;
  } catch {
    return false;
  }
}

/**
 * 读一条 `Key:   12345 kB` 的数值（/proc/meminfo 的固定口径）。
 * 字段不存在返回 null——绝不把「没有」当成 0。
 */
function readKbValue(text: string, key: string): number | null {
  const match = new RegExp(`^${key}:\\s*(\\d+)`, "m").exec(text);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

/**
 * 解析 /proc/meminfo 文本。
 *
 * 必需字段只有 MemTotal 与 MemAvailable：缺任何一个返回 null，因为此时「可用多少」
 * 只能靠猜（MemFree 不含可回收 cache），一条猜错的数字比没有数字更坏。
 * SwapTotal / SwapFree 缺失按 0 处理（无 swap 的机器不一定两条都写）。
 */
export function parseProcMeminfo(text: string): HostMemorySnapshot | null {
  if (typeof text !== "string" || text.length === 0) return null;

  const totalKb = readKbValue(text, "MemTotal");
  const availableKb = readKbValue(text, "MemAvailable");
  if (totalKb === null || availableKb === null) return null;
  if (!(totalKb > 0)) return null;

  const swapTotalKb = readKbValue(text, "SwapTotal") ?? 0;
  const swapFreeKb = readKbValue(text, "SwapFree") ?? 0;

  return {
    source: "proc-meminfo",
    totalMb: kbToMb(totalKb),
    availableMb: kbToMb(Math.max(0, availableKb)),
    swapTotalMb: kbToMb(Math.max(0, swapTotalKb)),
    swapUsedMb: kbToMb(Math.max(0, swapTotalKb - swapFreeKb)),
    hostAvailableMb: null,
  };
}

/**
 * 是否跑在容器里（docker / podman / k8s / instabox 等）。
 *
 * 只决定**展示标签**（`[sandbox]` vs `[限额]`），不决定要不要读限额——
 * 非容器的 systemd service/scope 一样可能有 cgroup 配额，见 readCgroupLimitView。
 */
export function detectSandbox(deps: HostMemoryDeps = {}): boolean {
  // 只有 Linux 有这套标记（/.dockerenv、cgroup v2 路径）；Windows / macOS 宿主
  // 不存在这些文件，探测只会白读文件系统，直接跳过。
  const platform = deps.platform ?? process.platform;
  if (platform !== "linux") return false;

  for (const marker of SANDBOX_MARKER_PATHS) {
    if (tryExists(deps, marker)) return true;
  }
  const selfCgroup = tryReadText(deps, PROC_SELF_CGROUP_PATH);
  return selfCgroup !== null && SANDBOX_CGROUP_PATTERN.test(selfCgroup);
}

/** node:os 回退：Windows / macOS 唯一的来源，也是 Linux 上 /proc 不可读时的兜底。 */
function readOsView(deps: HostMemoryDeps): HostMemorySnapshot | null {
  const os = deps.os ?? { totalmem: osTotalmem, freemem: osFreemem };
  try {
    const totalMb = toMbFromBytes(os.totalmem());
    const availableMb = toMbFromBytes(os.freemem());
    if (!(totalMb > 0) || !Number.isFinite(availableMb)) return null;
    return {
      source: "os",
      totalMb,
      availableMb: Math.max(0, availableMb),
      // os 没有可移植的 swap 口径：按契约显示 n/a，而不是编一个数字。
      swapTotalMb: null,
      swapUsedMb: null,
      hostAvailableMb: null,
    };
  } catch {
    return null;
  }
}

/** 宿主视角：Linux 先 /proc/meminfo，其余（或读不到）走 node:os。 */
function readHostView(deps: HostMemoryDeps): HostMemorySnapshot | null {
  const platform = deps.platform ?? process.platform;
  if (platform === "linux") {
    const text = tryReadText(deps, PROC_MEMINFO_PATH);
    if (text !== null) {
      const parsed = parseProcMeminfo(text);
      if (parsed) return parsed;
    }
  }
  return readOsView(deps);
}

/**
 * 从 /proc/self/cgroup 解析本进程所属 cgroup v2 路径（`0::/user.slice/...`）。
 * 没有 v2 行（纯 v1 系统）返回 null = 只试挂载根。
 */
export function parseCgroup2RelativePath(text: string): string | null {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(":");
    if (parts.length < 3 || parts[0] !== "0" || parts[1] !== "") continue;
    const path = parts.slice(2).join(":").trim();
    if (!path) continue;
    return path.startsWith("/") ? path : `/${path}`;
  }
  return null;
}

/** 从 /proc/mounts 找 cgroup2 挂载点（字段：dev mountpoint fstype opts …）。 */
export function parseCgroup2MountPoint(mountsText: string): string | null {
  for (const line of mountsText.split("\n")) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 3) continue;
    if (fields[2] !== "cgroup2") continue;
    const mountPoint = fields[1].replace(/\\040/g, " ");
    if (mountPoint.startsWith("/")) return mountPoint;
  }
  return null;
}

/**
 * 候选目录：从进程自己的 cgroup 沿路径**逐级向上**到挂载根（最深在前）。
 *
 * 为什么必须走整条链：cgroup v2 的限额是层次化的，父 slice 上的 memory.max
 * 对本进程同样生效；systemd 常见形态就是「child 是 max、父 slice 有限制」，
 * 只看当前目录 + 根会漏掉父层的限制。
 */
function cgroupAncestorDirs(mountPoint: string, relativePath: string | null): string[] {
  const base = mountPoint.length > 1 && mountPoint.endsWith("/")
    ? mountPoint.slice(0, -1)
    : mountPoint;
  const dirs: string[] = [];
  if (relativePath && relativePath !== "/") {
    const rel = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
    const segments = rel.split("/").filter(Boolean);
    for (let depth = segments.length; depth >= 1; depth -= 1) {
      dirs.push(`${base}/${segments.slice(0, depth).join("/")}`);
    }
  }
  dirs.push(base);
  return dirs;
}

/** 读某个 cgroup 目录的有效限额（MB）；`max` / 读不到 / 数字坏掉都返回 null。 */
function readCgroupMaxMb(deps: HostMemoryDeps, dir: string): number | null {
  const maxText = tryReadText(deps, `${dir}/memory.max`);
  if (maxText === null) return null;

  const maxRaw = maxText.trim();
  if (maxRaw === "" || maxRaw === "max") return null;

  const maxBytes = Number.parseInt(maxRaw, 10);
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) return null;

  const totalMb = toMbFromBytes(maxBytes);
  return totalMb > 0 ? totalMb : null;
}

/**
 * 用「限额所在目录 + 限额」构造快照。
 *
 * 占用取限额所在目录的 memory.current：父 slice 的 current 已经包含本进程的
 * 消耗，正是这个上限被吃掉的量。读不到就是**未知**（availableMb = null），
 * 绝不按 0 处理——那等于把「不知道」画成「全部可用」，是本条 review 的第二个问题。
 */
function buildCgroupSnapshot(
  deps: HostMemoryDeps,
  dir: string,
  totalMb: number,
  hostView: HostMemorySnapshot | null
): HostMemorySnapshot {
  const currentText = tryReadText(deps, `${dir}/memory.current`);
  let usedMb: number | null = null;
  if (currentText !== null) {
    const currentBytes = Number.parseInt(currentText.trim(), 10);
    if (Number.isFinite(currentBytes)) {
      usedMb = Math.min(totalMb, Math.max(0, toMbFromBytes(currentBytes)));
    }
  }

  return {
    source: "cgroup",
    totalMb,
    availableMb: usedMb === null ? null : Math.max(0, totalMb - usedMb),
    // swap 不是 cgroup 配额的一部分，只能借宿主视角（Linux 上就是 /proc/meminfo）。
    swapTotalMb: hostView?.swapTotalMb ?? null,
    swapUsedMb: hostView?.swapUsedMb ?? null,
    hostAvailableMb: hostView?.availableMb ?? null,
  };
}

/**
 * 本进程真正受着的 cgroup 限额。
 *
 * 之所以不能只看容器标记：① systemd service/scope 里的普通进程同样带配额，
 * 没有容器标记却会被 memory.max 杀；② 未隔离 cgroup namespace 的容器里，
 * 挂载根的 memory.max 往往是 `max`，真正的限额在 /proc/self/cgroup 指出的子
 * 路径上。③ 限额还常设在**父 slice** 而不是当前目录。所以沿祖先链逐级检查。
 *
 * 取值策略：路径上所有有效限额取**最小值**（最紧的那个）。cgroup v2 里每一级
 * 都是硬上限，本进程实际能达到的天花板就是 min(各级)；取最小值既不会高估
 * 可用空间（高估会让人放心地多开 run，正是要避免的事），也不会漏掉父层限制。
 */
function readCgroupLimitView(
  deps: HostMemoryDeps,
  hostView: HostMemorySnapshot | null
): HostMemorySnapshot | null {
  const selfCgroupText = tryReadText(deps, PROC_SELF_CGROUP_PATH) ?? "";
  const relativePath = parseCgroup2RelativePath(selfCgroupText);
  const mountsText = tryReadText(deps, PROC_MOUNTS_PATH) ?? "";
  const mountPoint = parseCgroup2MountPoint(mountsText) ?? DEFAULT_CGROUP2_MOUNT;

  let limitingDir: string | null = null;
  let limitingMb = Number.POSITIVE_INFINITY;
  for (const dir of cgroupAncestorDirs(mountPoint, relativePath)) {
    const totalMb = readCgroupMaxMb(deps, dir);
    if (totalMb === null) continue;
    if (totalMb < limitingMb) {
      limitingMb = totalMb;
      limitingDir = dir;
    }
  }

  if (limitingDir === null) return null;
  return buildCgroupSnapshot(deps, limitingDir, limitingMb, hostView);
}

/**
 * 读一次本机内存快照；什么都读不到返回 null（调用方不得因此改变行为）。
 *
 * 展示口径与限额判定刻意分开：限额照实际 cgroup 路径取（容器、systemd scope
 * 都算），`[sandbox]` 标签才看容器标记。
 */
export function readHostMemory(deps: HostMemoryDeps = {}): HostMemorySnapshot | null {
  const platform = deps.platform ?? process.platform;
  if (platform !== "linux") {
    // Windows / macOS：不碰 /proc，纯 node:os 回退。
    return readHostView(deps);
  }

  const hostView = readHostView(deps);
  const cgroupView = readCgroupLimitView(deps, hostView);
  if (!cgroupView) return hostView;
  return {
    ...cgroupView,
    scope: detectSandbox(deps) ? "sandbox" : "cgroup-limit",
  };
}

/**
 * 内存是否偏紧：可用 < 总量的 15%，或 swap 使用 > 70%（swap 不可知则不判这一条）。
 * 只影响提示文案，不影响任何准入。
 */
export function isHostMemoryTight(mem: HostMemorySnapshot): boolean {
  if (!(mem.totalMb > 0)) return false;
  // 占用未知 ≠ 不紧张：这里只是**无法判断**，按契约不触发提醒，也绝不当成「全部可用」。
  if (mem.availableMb !== null && mem.availableMb / mem.totalMb < MEMORY_AVAILABLE_RATIO_THRESHOLD) {
    return true;
  }
  if (
    mem.swapTotalMb !== null &&
    mem.swapUsedMb !== null &&
    mem.swapTotalMb > 0 &&
    mem.swapUsedMb / mem.swapTotalMb > SWAP_USED_RATIO_THRESHOLD
  ) {
    return true;
  }
  return false;
}

/**
 * 6.5G / 0M；>= 1G 用一位小数的 G，否则整数 M。
 *
 * MB→G 统一走**四舍五入**到 0.1G（`toFixed(1)`），不是截断：
 * 用户拿这行和 htop / 系统监视器对比，那些工具也是四舍五入；截断会让 15.9G
 * 显示成 15.8G、10.0G 显示成 9.9G，每一处都差一档，看起来像「又少了一点」。
 * 0.05G 级别误差远小于 15% 压力判据的粒度，方向性偏差（永远少报可用）反而更
 * 容易误导，所以不取整到保守方向。
 */
export function formatHostMemoryMb(mb: number): string {
  const value = Math.max(0, Math.round(Number.isFinite(mb) ? mb : 0));
  if (value >= 1024) return `${(value / 1024).toFixed(1)}G`;
  return `${value}M`;
}

function formatSwapPart(mem: HostMemorySnapshot): string {
  if (mem.swapTotalMb === null || mem.swapUsedMb === null) return "swap n/a";
  return `swap ${formatHostMemoryMb(mem.swapUsedMb)}/${formatHostMemoryMb(mem.swapTotalMb)}`;
}

/**
 * 一行的展示文案（永不换行）：
 *   宿主：`本地内存 11.2G/15.9G（可用 8.9G）· swap 0M/11.6G`
 *   沙盒：`[sandbox] 容器内存 1.2G/4.0G · 宿主可用 8.9G`
 *   非容器但受 cgroup 限额：`[限额] 本进程内存 1.2G/4.0G · 宿主可用 8.9G`
 *   无 swap 口径：`本地内存 6.5G/16.0G（可用 9.3G）· swap n/a`
 * 偏紧时追加 ` · ⚠ 内存偏紧，建议重活放沙盒/远端或减少并发`。
 */
export function formatHostMemoryLine(mem: HostMemorySnapshot): string {
  const usedMb =
    mem.availableMb === null ? null : Math.max(0, mem.totalMb - mem.availableMb);
  let line: string;
  if (mem.source === "cgroup") {
    const hostAvailable =
      mem.hostAvailableMb === null ? "n/a" : formatHostMemoryMb(mem.hostAvailableMb);
    // 限额来源必须一眼可辨：`[sandbox]` = 容器配额，`[限额]` = 非容器进程自己的
    // cgroup 上限；两者都不能被误读成「宿主总共就这么多」。
    const prefix =
      (mem.scope ?? "sandbox") === "cgroup-limit" ? "[限额] 本进程内存" : "[sandbox] 容器内存";
    // 占用读不到就写「占用未知」，绝不填成 0/满额可用：那样会给出一个正好相反的
    // 结论（「还有满满可用」），比不给数字更危险。
    const usage = usedMb === null ? "占用未知" : formatHostMemoryMb(usedMb);
    line = `${prefix} ${usage}/${formatHostMemoryMb(mem.totalMb)}` + ` · 宿主可用 ${hostAvailable}`;
  } else {
    // 宿主视图永远有可用值；这里的 null 分支只是类型兜底。
    const available = mem.availableMb === null ? "n/a" : formatHostMemoryMb(mem.availableMb);
    line =
      `本地内存 ${formatHostMemoryMb(usedMb ?? 0)}/${formatHostMemoryMb(mem.totalMb)}` +
      `（可用 ${available}）· ${formatSwapPart(mem)}`;
  }
  return isHostMemoryTight(mem) ? `${line} · ${HOST_MEMORY_PRESSURE_HINT}` : line;
}
