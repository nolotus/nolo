import {
  readHostMemory,
  formatHostMemoryMb,
  type HostMemorySnapshot,
  type HostMemoryDeps,
} from "./hostMemory";
import type { RunRecord } from "../agentRunControl";

/**
 * 本地 fork 单个 Agent Run 所需的最小有效可用内存（MB）。
 *
 * 保守依据：
 * 1. Bun / Node.js 运行时自身冷启动基线 RSS 约 150MB~300MB；
 * 2. CLI 初始化、上下文解析、工具依赖加载以及 IO/AST 缓冲区在启动峰值期常见额外 200MB~300MB 开销；
 * 3. Linux 宿主在可用内存紧绷（< 512MB）时会引发严重的页面直接回收（direct reclaim）与 IO 颠簸，
 *    在 cgroup 限制下更容易直接撞上 memory.max 触发 OOM-killer 杀进程；
 * 4. 因此保守设为 512MB 作为单进程启动硬底线。
 */
export const LOCAL_AGENT_RUN_MIN_AVAILABLE_MB = 512;

/**
 * 并发启动窗口（ms）。
 *
 * 进程刚 fork/spawn 时尚未完成全部堆分配与模块加载，OS 报告的 MemAvailable
 * 无法瞬时反映其实际内存开销。在该时间窗口内启动的活跃 run 需计入预留。
 */
export const STARTUP_WINDOW_MS = 10_000;

/**
 * 处于启动窗口内的每个并发 run 估算预留的内存量（MB）。
 *
 * 保守依据：
 * 按单进程启动基线 ~384MB 预估，防止短时间内并发扇出多个 run
 * 在 OS 内存统计刷新前同时越过准入门槛打爆系统。
 */
export const STARTUP_WINDOW_RESERVED_MB_PER_RUN = 384;

export class HostMemoryAdmissionError extends Error {
  readonly code = "HOST_MEMORY_ADMISSION_DENIED";
  readonly details: {
    effectiveAvailableMb: number | null;
    requiredMinMb: number;
    source: string;
    limitingSource: "cgroup" | "host" | "unknown";
    activeStartupRuns: number;
    reservedStartupMb: number;
    unreservedAvailableMb: number | null;
  };

  constructor(
    message: string,
    details: {
      effectiveAvailableMb: number | null;
      requiredMinMb: number;
      source: string;
      limitingSource: "cgroup" | "host" | "unknown";
      activeStartupRuns: number;
      reservedStartupMb: number;
      unreservedAvailableMb: number | null;
    }
  ) {
    super(message);
    this.name = "HostMemoryAdmissionError";
    this.details = details;
  }
}

export type HostMemoryAdmissionDeps = {
  readHostMemory?: (deps?: HostMemoryDeps) => HostMemorySnapshot | null;
  hostMemoryDeps?: HostMemoryDeps;
  listRecentRuns?: () => RunRecord[];
  now?: () => Date;
  minAvailableMb?: number;
  startupWindowMs?: number;
  reservedMbPerRun?: number;
};

export type HostMemoryAdmissionVerdict = {
  allowed: boolean;
  effectiveAvailableMb: number;
  requiredMinMb: number;
  activeStartupRuns: number;
  snapshot: HostMemorySnapshot;
};

/**
 * 在本地 fork / spawn 任何副作用（记录写盘、消息快照、log 文件打开、fork 进程）之前
 * 执行的内存准入检查。
 *
 * 核心契约：
 * 1. 检查宿主 MemAvailable 与有效 cgroup 限额，取【更严格值】（min）；
 * 2. 读取失败或占用未知绝不无声当充足，抛出明确诊断错误拒绝；
 * 3. 统计处于并发启动窗口（最近 10s 内 started 且 running）的 run 数量，扣除并发预留；
 * 4. 显式 local 语义不借机假自动分流，给出明确可诊断的错误。
 */
export function assertHostMemoryAdmission(
  deps: HostMemoryAdmissionDeps = {}
): HostMemoryAdmissionVerdict {
  const readMem = deps.readHostMemory ?? readHostMemory;
  const snapshot = readMem(deps.hostMemoryDeps);

  const minAvailableMb = deps.minAvailableMb ?? LOCAL_AGENT_RUN_MIN_AVAILABLE_MB;
  const startupWindowMs = deps.startupWindowMs ?? STARTUP_WINDOW_MS;
  const reservedMbPerRun = deps.reservedMbPerRun ?? STARTUP_WINDOW_RESERVED_MB_PER_RUN;
  const now = deps.now ? deps.now().getTime() : Date.now();

  for (const [name, value] of Object.entries({ minAvailableMb, startupWindowMs, reservedMbPerRun, now })) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`Invalid ${name}`);
  }
  if (!snapshot) {
    throw new HostMemoryAdmissionError(
      `[host-memory-admission] 无法测定本机可用内存（快照为 null），拒绝本地 fork。` +
        `需确保 /proc/meminfo 或 OS 内存指标可读。`,
      {
        effectiveAvailableMb: null,
        requiredMinMb: minAvailableMb,
        source: "null",
        limitingSource: "unknown",
        activeStartupRuns: 0,
        reservedStartupMb: 0,
        unreservedAvailableMb: null,
      }
    );
  }

  if (!["cgroup", "proc-meminfo", "os"].includes(snapshot.source)) throw new Error("Unknown host memory source");

  let effectiveAvailableMb: number | null = null;
  let limitingSource: "cgroup" | "host" | "unknown" = "host";

  if (snapshot.source === "cgroup") {
    const cgroupAvail = snapshot.availableMb;
    const hostAvail = snapshot.hostAvailableMb;

    if (
      cgroupAvail === null ||
      typeof cgroupAvail !== "number" ||
      Number.isNaN(cgroupAvail) ||
      !Number.isFinite(cgroupAvail) || cgroupAvail < 0
    ) {
      throw new HostMemoryAdmissionError(
        `[host-memory-admission] cgroup 配额内存占用未知或无效，拒绝无声当充足。`,
        {
          effectiveAvailableMb: null,
          requiredMinMb: minAvailableMb,
          source: snapshot.source,
          limitingSource: "cgroup",
          activeStartupRuns: 0,
          reservedStartupMb: 0,
          unreservedAvailableMb: null,
        }
      );
    }

    if (typeof hostAvail !== "number" || !Number.isFinite(hostAvail) || hostAvail < 0) {
      throw new HostMemoryAdmissionError("[host-memory-admission] 宿主可用内存未知或无效，拒绝本地 fork。", {
        effectiveAvailableMb: null, requiredMinMb: minAvailableMb, source: snapshot.source,
        limitingSource: "host", activeStartupRuns: 0, reservedStartupMb: 0, unreservedAvailableMb: null,
      });
    }
    if (Number.isFinite(hostAvail)) {
      if (cgroupAvail <= hostAvail) {
        effectiveAvailableMb = cgroupAvail;
        limitingSource = "cgroup";
      } else {
        effectiveAvailableMb = hostAvail;
        limitingSource = "host";
      }
    } else {
      effectiveAvailableMb = cgroupAvail;
      limitingSource = "cgroup";
    }
  } else {
    if (
      snapshot.availableMb === null ||
      typeof snapshot.availableMb !== "number" ||
      Number.isNaN(snapshot.availableMb) ||
      !Number.isFinite(snapshot.availableMb) || snapshot.availableMb < 0
    ) {
      throw new HostMemoryAdmissionError(
        `[host-memory-admission] 宿主可用内存未知或无效，拒绝无声当充足。`,
        {
          effectiveAvailableMb: null,
          requiredMinMb: minAvailableMb,
          source: snapshot.source,
          limitingSource: "host",
          activeStartupRuns: 0,
          reservedStartupMb: 0,
          unreservedAvailableMb: null,
        }
      );
    }
    effectiveAvailableMb = snapshot.availableMb;
    limitingSource = "host";
  }

  // 计算并发启动窗口内的活跃 run
  let activeStartupRuns = 0;
  if (deps.listRecentRuns) {
    const records = deps.listRecentRuns();
    if (!Array.isArray(records)) {
      throw new HostMemoryAdmissionError(
        `[host-memory-admission] 获取最近运行记录列表失败，拒绝未知当归零。`,
        {
          effectiveAvailableMb,
          requiredMinMb: minAvailableMb,
          source: snapshot.source,
          limitingSource,
          activeStartupRuns: 0,
          reservedStartupMb: 0,
          unreservedAvailableMb: effectiveAvailableMb,
        }
      );
    }
    for (const rec of records) {
      if (!rec || typeof rec !== "object") {
        throw new HostMemoryAdmissionError(
          `[host-memory-admission] 运行记录损坏，拒绝未知当归零。`,
          {
            effectiveAvailableMb,
            requiredMinMb: minAvailableMb,
            source: snapshot.source,
            limitingSource,
            activeStartupRuns: 0,
            reservedStartupMb: 0,
            unreservedAvailableMb: effectiveAvailableMb,
          }
        );
      }
      if (rec.status !== "running") continue;
      const startedTime = new Date(rec.startedAt).getTime();
      if (!Number.isFinite(startedTime) || Number.isNaN(startedTime)) {
        throw new HostMemoryAdmissionError(
          `[host-memory-admission] 运行记录 startedAt 无效，拒绝未知当归零。`,
          {
            effectiveAvailableMb,
            requiredMinMb: minAvailableMb,
            source: snapshot.source,
            limitingSource,
            activeStartupRuns: 0,
            reservedStartupMb: 0,
            unreservedAvailableMb: effectiveAvailableMb,
          }
        );
      }
      if (now - startedTime >= 0 && now - startedTime < startupWindowMs) {
        activeStartupRuns += 1;
      }
    }
  }

  const reservedStartupMb = activeStartupRuns * reservedMbPerRun;
  const netAvailableMb = effectiveAvailableMb - reservedStartupMb;

  if (netAvailableMb < minAvailableMb) {
    const detailMsg =
      `当前有效可用 ${formatHostMemoryMb(effectiveAvailableMb)}（受限源: ${limitingSource}）` +
      (activeStartupRuns > 0
        ? `，并发启动窗口内有 ${activeStartupRuns} 个进行中任务（预留 ${formatHostMemoryMb(reservedStartupMb)}，折算剩余 ${formatHostMemoryMb(netAvailableMb)}）`
        : "") +
      `，低于安全阈值 ${formatHostMemoryMb(minAvailableMb)}。`;

    throw new HostMemoryAdmissionError(
      `[host-memory-admission] 拒绝本地派发：${detailMsg}为避免触发宿主/cgroup OOM-killer 崩溃，请等待其他任务完成或释放内存后再试。`,
      {
        effectiveAvailableMb: netAvailableMb,
        requiredMinMb: minAvailableMb,
        source: snapshot.source,
        limitingSource,
        activeStartupRuns,
        reservedStartupMb,
        unreservedAvailableMb: effectiveAvailableMb,
      }
    );
  }

  return {
    allowed: true,
    effectiveAvailableMb: netAvailableMb,
    requiredMinMb: minAvailableMb,
    activeStartupRuns,
    snapshot,
  };
}
