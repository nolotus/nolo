import { join } from "path";
import * as nodeFs from "fs";
import {
  type HostMemorySnapshot,
  type HostMemoryDeps,
} from "./hostMemory";
import {
  assertHostMemoryAdmission,
  LOCAL_AGENT_RUN_MIN_AVAILABLE_MB,
  STARTUP_WINDOW_MS,
  STARTUP_WINDOW_RESERVED_MB_PER_RUN,
} from "./hostMemoryAdmission";

export const MEMORY_RESERVATION_LOCK_ID = "__host_memory_reservation__";

export type MemoryReservationStatus = "reserved" | "active" | "released" | "reclaimed";

export type MemoryReservationRecord = {
  id: string;
  status: MemoryReservationStatus;
  reservedMb: number;
  createdAt: string;
  createdAtMs: number;
  holderPid: number;
  holderStartedAt?: string;
  childStartedAt?: string;
  childIdentity?: "verified" | "unverified";
  childPid?: number;
  runId?: string;
  releasedAt?: string;
  reclaimedAt?: string;
  reason?: string;
};

export type RunRecordLockFn = <T>(
  lockId: string,
  fn: () => T,
  opts?: { strict?: boolean }
) => T | undefined;

export interface MemoryReservationHandle {
  readonly id: string;
  readonly reservedMb: number;
  readonly recordPath: string;
  associate(params: { runId: string; pid?: number; processStartedAt?: string }): void;
  release(reason?: string): void;
}

export type HostMemoryReservationFs = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: string) => string;
  writeFileSync: (path: string, data: string, options?: any) => void;
  mkdirSync: (path: string, options?: any) => void;
  readdirSync: (path: string) => string[];
  renameSync?: (oldPath: string, newPath: string) => void;
  statSync?: (path: string) => { mtimeMs: number };
};

export type HostMemoryReservationDeps = {
  runsDir: string;
  runId?: string;
  fs?: HostMemoryReservationFs;
  readHostMemory?: (deps?: HostMemoryDeps) => HostMemorySnapshot | null;
  hostMemoryDeps?: HostMemoryDeps;
  now?: () => Date;
  withLock?: RunRecordLockFn;
  isProcessAlive?: (pid: number) => boolean;
  getProcessStartTime?: (pid: number) => Date | null | undefined;
  minAvailableMb?: number;
  startupWindowMs?: number;
  requestedMb?: number;
  maxLockAttempts?: number;
  lockRetryDelayMs?: number;
};

export function resolveReservationsDir(runsDir: string): string {
  return join(runsDir, "reservations");
}

export function defaultIsProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) throw new Error("Invalid PID");
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    if (err && err.code === "ESRCH") {
      return false;
    }
    // EPERM 意味着进程存在但无权发信号
    return true;
  }
}

function sleepSync(ms: number): void {
  if (ms <= 0) return;
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      // fallback busy-wait
    }
  }
}

function updateReservationFile(
  filePath: string,
  fs: HostMemoryReservationFs,
  updater: (record: MemoryReservationRecord) => void
): MemoryReservationRecord {
  const record = JSON.parse(fs.readFileSync(filePath, "utf8")) as MemoryReservationRecord;
  updater(record);
  const payload = JSON.stringify(record, null, 2);
  if (fs.renameSync) {
    const tmpPath = `${filePath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tmpPath, payload);
    fs.renameSync(tmpPath, filePath);
  } else {
    fs.writeFileSync(filePath, payload);
  }
  return record;
}

export function scanActiveReservations(
  reservationsDir: string,
  deps: {
    fs: HostMemoryReservationFs;
    nowMs: number;
    startupWindowMs: number;
    isProcessAlive: (pid: number) => boolean;
    getProcessStartTime?: (pid: number) => Date | null | undefined;
  }
): { activeStartupRuns: number; reservedStartupMb: number } {
  const { fs, nowMs, startupWindowMs, isProcessAlive } = deps;
  if (!fs.existsSync(reservationsDir)) {
    return { activeStartupRuns: 0, reservedStartupMb: 0 };
  }

  let entries: string[];
  try {
    entries = fs.readdirSync(reservationsDir);
  } catch (err: any) {
    throw new Error(
      `[host-memory-reservation] 读取预留目录失败: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let activeStartupRuns = 0;
  let reservedStartupMb = 0;

  for (const entry of entries) {
    if (!entry.endsWith(".json") || !entry.startsWith("reservation-")) continue;
    const filePath = join(reservationsDir, entry);
    let record: MemoryReservationRecord;
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      record = JSON.parse(raw);
    } catch (err: any) {
      throw new Error(
        `[host-memory-reservation] 解析预留记录文件失败 (${filePath}): ${
          err instanceof Error ? err.message : String(err)
        }，拒绝未知当归零`
      );
    }

    if (!record || typeof record !== "object") {
      throw new Error(`[host-memory-reservation] 预留记录格式损坏 (${filePath})，拒绝未知当归零`);
    }

    if (
      typeof record.reservedMb !== "number" ||
      Number.isNaN(record.reservedMb) ||
      !Number.isFinite(record.reservedMb) || record.reservedMb < 0
    ) {
      throw new Error(`[host-memory-reservation] 预留记录包含无效 reservedMb (${filePath})`);
    }

    if (
      typeof record.createdAtMs !== "number" ||
      Number.isNaN(record.createdAtMs) ||
      !Number.isFinite(record.createdAtMs) || record.createdAtMs < 0
    ) {
      throw new Error(`[host-memory-reservation] 预留记录包含无效 createdAtMs (${filePath})`);
    }

    // 终态（released 或 reclaimed）不占用预留
    if (record.status === "released" || record.status === "reclaimed") {
      continue;
    }

    if (record.status !== "reserved" && record.status !== "active") {
      throw new Error(`[host-memory-reservation] invalid status: ${filePath}`);
    }
    const ageMs = nowMs - record.createdAtMs;
    const pid = record.childPid ?? record.holderPid;
    if (!Number.isInteger(pid) || pid <= 0 || ageMs < 0) {
      throw new Error(`[host-memory-reservation] invalid process/time: ${filePath}`);
    }
    const expectedStart = record.childPid ? record.childStartedAt : record.holderStartedAt;
    let alive = true;
    let actualStart: Date | null | undefined;
    try {
      alive = isProcessAlive(pid);
      if (alive && expectedStart) actualStart = deps.getProcessStartTime?.(pid);
    } catch {
      // EPERM / inaccessible process is unknown, never proof of death.
    }
    const reused = expectedStart && actualStart && Number.isFinite(actualStart.getTime()) &&
      actualStart.toISOString() !== expectedStart;
    if (!alive || reused || (record.status === "active" && !!expectedStart && record.childIdentity !== "unverified" && ageMs >= startupWindowMs)) {
      updateReservationFile(filePath, fs, (r) => {
        r.status = "reclaimed";
        r.reclaimedAt = new Date(nowMs).toISOString();
        r.reason = !alive ? "stale_process_died" : reused ? "pid_reused" : "startup_window_elapsed_rss_accounted";
      });
      continue;
    }
    activeStartupRuns += 1;
    reservedStartupMb += record.reservedMb;
    if (!Number.isFinite(reservedStartupMb)) throw new Error("Invalid reservation total");
  }

  return { activeStartupRuns, reservedStartupMb };
}

/**
 * 在受控锁内执行：read -> verify -> atomic reserve。
 * 返回预留凭据 Handle，支持 associate(pid/runId) 与 release(reason)。
 * 严守删除红线：失败与释放仅更新状态为 released/reclaimed，绝不物理删除。
 */
export function reserveHostMemory(
  deps: HostMemoryReservationDeps
): MemoryReservationHandle {
  const fs: HostMemoryReservationFs = deps.fs ?? (nodeFs as any);
  const runsDir = deps.runsDir;
  const reservationsDir = resolveReservationsDir(runsDir);
  const now = deps.now ? deps.now() : new Date();
  let nowMs = now.getTime();
  const minAvailableMb = deps.minAvailableMb ?? LOCAL_AGENT_RUN_MIN_AVAILABLE_MB;
  const startupWindowMs = deps.startupWindowMs ?? STARTUP_WINDOW_MS;
  const requestedMb = deps.requestedMb ?? STARTUP_WINDOW_RESERVED_MB_PER_RUN;
  const isProcessAlive = deps.isProcessAlive ?? defaultIsProcessAlive;
  const maxAttempts = deps.maxLockAttempts ?? 5;
  const delayMs = deps.lockRetryDelayMs ?? 15;

  for (const [name, value] of Object.entries({ requestedMb, minAvailableMb, startupWindowMs, maxAttempts, delayMs, nowMs })) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`[host-memory-reservation] invalid ${name}: ${value}`);
    }
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error("Invalid lock attempts");
  if (!deps.withLock) throw new Error("[host-memory-reservation] exclusive lock required");
  fs.mkdirSync(reservationsDir, { recursive: true });

  const locked = <T>(fn: () => T): T => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = deps.withLock!(MEMORY_RESERVATION_LOCK_ID, () => ({ value: fn() }), { strict: true });
      if (result !== undefined) return result.value;
      if (attempt + 1 < maxAttempts) sleepSync(delayMs);
    }
    throw new Error("[host-memory-reservation] exclusive lock timeout");
  };

  const executeReservation = (): MemoryReservationHandle => {
    nowMs = (deps.now ? deps.now() : new Date()).getTime();
    if (!Number.isFinite(nowMs)) throw new Error("Invalid reservation time");
    // 1. 扫描当前活跃预留（在锁内，防止跨进程竞态）
    const { activeStartupRuns, reservedStartupMb } = scanActiveReservations(reservationsDir, {
      fs,
      nowMs,
      startupWindowMs,
      isProcessAlive,
      getProcessStartTime: deps.getProcessStartTime,
    });

    assertHostMemoryAdmission({
      readHostMemory: deps.readHostMemory,
      hostMemoryDeps: deps.hostMemoryDeps,
      minAvailableMb: minAvailableMb + reservedStartupMb + requestedMb,
      now: () => new Date(nowMs),
    });

    // 4. 持久化原子预留记录
    const id = `res-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const recordPath = join(reservationsDir, `reservation-${id}.json`);
    const record: MemoryReservationRecord = {
      id,
      runId: deps.runId,
      status: "reserved",
      reservedMb: requestedMb,
      createdAt: new Date(nowMs).toISOString(),
      createdAtMs: nowMs,
      holderPid: process.pid,
      holderStartedAt: deps.getProcessStartTime?.(process.pid)?.toISOString(),
    };

    const payload = JSON.stringify(record, null, 2);
    fs.writeFileSync(recordPath, payload, "utf8");

    return {
      id,
      reservedMb: requestedMb,
      recordPath,
      associate(params: { runId: string; pid?: number; processStartedAt?: string }) {
        if (!params.runId || !Number.isInteger(params.pid) || params.pid! <= 0) throw new Error("Invalid child association");
        const validStart = !!params.processStartedAt && Number.isFinite(Date.parse(params.processStartedAt));
        locked(() => updateReservationFile(recordPath, fs, (r) => {
          if (r.status !== "reserved") throw new Error("Reservation is not reserved");
          // Persist the child even if identity probing failed: parent death must
          // not reclaim a possibly live child's reservation.
          r.status = "active";
          r.childIdentity = validStart ? "verified" : "unverified";
          if (validStart) {
            r.childStartedAt = params.processStartedAt;
          }
          if (params.runId) r.runId = params.runId;
          if (typeof params.pid === "number") r.childPid = params.pid;
        }));
      },
      release(reason?: string) {
        locked(() => updateReservationFile(recordPath, fs, (r) => {
          if (r.status === "reserved" || r.status === "active") {
            r.status = "released";
            r.releasedAt = new Date().toISOString();
            if (reason) r.reason = reason;
          }
        }));
      },
    };
  };

  // 锁注入执行
  if (deps.withLock) {
    const withLock = deps.withLock;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const handle = withLock(MEMORY_RESERVATION_LOCK_ID, executeReservation, {
        strict: true,
      });
      if (handle !== undefined) {
        return handle;
      }
      if (attempt < maxAttempts - 1) {
        sleepSync(delayMs);
      }
    }
    throw new Error(
      `[host-memory-reservation] 获取预留互斥锁超时（尝试 ${maxAttempts} 次），拒绝并发击穿`
    );
  }

  throw new Error("[host-memory-reservation] exclusive lock required");
}
