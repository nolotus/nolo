// 文件路径: database/actions/writeAck.ts
//
// 单条写入的「服务端确认（ACK）」注册表。
//
// 背景：writeAction 只在本地落库后就让 dispatch(write(...)) 的 Promise 结束，
// 远程复制由 scheduleWriteReplication 即发即忘地跑。于是「刚创建的对话记录」
// 在客户端看起来已经存在，而服务端可能还没收到；此时立刻 POST /api/agent/run，
// 服务端 continueDialogContext 查不到对话记录，会退到 findDialogRecord 的全库
// 扫描（线上实测 TTFB 5.6–7.9s，对比带 key 且已落库 0.82s）。
//
// 这里不新造第二套同步协议：注册进来的 Promise 就是 scheduleWriteReplication
// 里那一次 POST /database/write/ 的响应（noloWriteRequest → response.ok）。
// 上层只是把「已经发出的那一次写」的结果取出来 await，而不是另起轮询。
//
// 目标维度：一次写的复制计划是多台服务器（authority 优先，后备随后）。需要
// ACK 的调用方（新对话首条消息）等的必须是**本次 run 真正请求的那台服务器**，
// 所以注册表按 server 维度保留每个目标的那一次写请求；run 目标不在计划里时
// 回退到主目标，并在日志里说明（见 waitForWriteAck）。

import { normalizeServerOrigin } from "core/serverOrigin";
import { normalizeKnownServerOrigin } from "database/config";

/**
 * 等待服务端写入确认的默认上限：1500ms。
 *
 * 取值理由（alpha 线上实测口径）：
 * - 记录未落库时服务端要走全库扫描，TTFB 5.6–7.9s；带 key 且已落库时
 *   0.82s（其中 0.53s 是网络）。而我们等待的写请求是同一个服务器的单次
 *   POST /database/write/，正常往返在数百毫秒量级。
 * - 1500ms ≈ 3× 典型写往返，足以吃掉绝大多数「写还在飞」的窗口；同时仍远
 *   小于 miss 扫描的 5.6s 下限，所以即便等到超时，用户也远没走到最坏路径。
 * - 超时后调用方照旧继续，因此这个常量只决定「最多多等多久」，不改变任何
 *   失败语义（慢网络下退化为修复前的行为）。
 */
export const DEFAULT_WRITE_ACK_TIMEOUT_MS = 1500;

/**
 * 已 settle 的槽位保留时长：留给「写早已完成、稍后才来 await」的调用方
 * （例如新对话路径上写先落库、首条消息稍后才走到检查点），据此可以把日志
 * 记成 acked 而不是 unknown。超过这个窗口的槽位会被清掉，等待方立即返回。
 */
const ACK_ENTRY_RETENTION_MS = 10_000;

/** 槽位表硬上限，防止长时间运行下无界增长（Map 保持插入顺序，超出即丢最旧）。 */
const ACK_ENTRY_MAX = 256;

export type WriteAckOutcomeStatus =
  /** 服务端已确认写入成功 */
  | "acked"
  /** 服务端明确拒绝 / 网络错误（写请求本身失败） */
  | "failed"
  /** 没有可写服务器（device-local / 离线）：服务端本来就不会有这条记录 */
  | "not-replicated"
  /** 本地写入失败或抛错，根本没有安排复制 */
  | "aborted"
  /** 到超时点仍在飞 */
  | "pending"
  /** 该 dbKey 没有 in-flight 写入（例如已有对话的普通发送） */
  | "unknown";

/**
 * 本次等待实际等的是哪一份 ACK。
 * - `run-target`：命中了 run 目标服务器自己的那一次写请求（期望路径）。
 * - `primary-fallback`：复制计划里没有 run 目标（authority override 到别的
 *   服务器等），回退等主目标，并打一条可读 warn。
 * - `primary`：没传 run 目标，或复制计划尚未登记（写还在本地阶段），等主目标。
 * - `none`：该 dbKey 没有 in-flight 写入，没有可等的东西。
 */
export type WriteAckWaitTarget =
  | "run-target"
  | "primary-fallback"
  | "primary"
  | "none";

export interface WriteAckWaitResult {
  outcome: { status: WriteAckOutcomeStatus };
  timedOut: boolean;
  waitedMs: number;
  /** 实际等待的 ACK 归属；用于诊断「等的是不是 run 目标」。 */
  waitTarget: WriteAckWaitTarget;
}

/**
 * 复制计划里比较服务器是否同一台的键。
 *
 * 复制计划的服务器来自 getAllServers / 记录 authority（可能带遗留域名别名），
 * 而 run 目标是 settings 里的原始值；两边先过同一个已知别名映射，再退到纯
 * origin 归一化，避免别名写法把「同一台服务器」判成两台。
 */
export const replicationTargetKey = (server: unknown): string =>
  normalizeKnownServerOrigin(server) ?? normalizeServerOrigin(server);

/**
 * 一次复制的「各目标 ACK 清单」，由 scheduleWriteReplication 产出：
 * - `servers`：复制计划里的服务器（保持 authority 优先顺序，仅用于诊断）
 * - `primary`：主（第一台）目标那次写请求的 Promise，等价于修复前
 *   scheduleWriteReplication 的返回值
 * - `targets`：归一化 origin → 该目标那次写请求的 Promise。每个目标在写请求
 *   发出前就有对应条目，所以闸门无论等哪一台都能拿到它（后备目标的请求因为
 *   「主目标先写」的顺序会稍后才发出，等待方只是等同一个 1500ms 预算）。
 */
export interface WriteReplicationAckHandle {
  servers: string[];
  primary: Promise<boolean>;
  targets: Map<string, Promise<boolean>>;
}

interface WriteAckEntry {
  /** 主目标（计划第一台）的最终状态，保持修复前的单目标语义。 */
  promise: Promise<WriteAckOutcomeStatus>;
  settle: (status: WriteAckOutcomeStatus) => void;
  settledAt: number | null;
  /** 复制计划里的服务器顺序（诊断 / 回退日志用）。 */
  servers: string[];
  /** 主目标的比较键；回退时用于日志。 */
  primaryTargetKey: string | null;
  /** 复制计划是否已经登记（区分「计划里没有 run 目标」与「计划还没来」）。 */
  planRegistered: boolean;
  /** 各目标服务器那次写请求的状态。 */
  targetAcks: Map<string, Promise<WriteAckOutcomeStatus>>;
}

const ackEntries = new Map<string, WriteAckEntry>();

const nowMs = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const sweepAckEntries = (): void => {
  const wallClock = Date.now();
  for (const [key, entry] of ackEntries) {
    if (
      entry.settledAt !== null &&
      wallClock - entry.settledAt > ACK_ENTRY_RETENTION_MS
    ) {
      ackEntries.delete(key);
    }
  }
  while (ackEntries.size > ACK_ENTRY_MAX) {
    const oldest = ackEntries.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    ackEntries.delete(oldest);
  }
};

const isReplicationAckHandle = (
  value: unknown
): value is WriteReplicationAckHandle => {
  if (!value || typeof value !== "object") return false;
  const handle = value as Partial<WriteReplicationAckHandle>;
  return (
    typeof handle.primary?.then === "function" && handle.targets instanceof Map
  );
};

const asAckStatus = (
  ack: Promise<boolean>
): Promise<WriteAckOutcomeStatus> =>
  ack.then(
    (ok) => (ok ? "acked" : "failed"),
    () => "failed"
  );

export interface PendingWriteAck {
  /**
   * 把这次写的复制结果交给该槽位。可传：
   * - `scheduleWriteReplication` 的返回值（各目标清单），按 server 维度登记；
   * - 单个 Promise（主目标那次写请求），保持旧契约；
   * - null/undefined 视为「没有可写服务器」，立即 settle 为 not-replicated。
   */
  settleWithReplication: (
    replication:
      | Promise<boolean>
      | WriteReplicationAckHandle
      | null
      | undefined
  ) => void;
  /** 明确无服务器可写（离线 / device-local）。 */
  markNotReplicated: () => void;
  /** 本地写入失败等异常路径。 */
  markAborted: () => void;
}

/**
 * 为一次写入登记待确认槽位。
 *
 * 约定：必须在 writeAction 的第一个 await 之前调用，这样
 * dispatch(write(...)) 同步返回时槽位一定已存在——新对话路径正是在
 * dispatch 返回后（导航、附件准备之后）才来 await 它。
 */
export const beginWriteAck = (dbKey: string): PendingWriteAck => {
  let resolveOutcome: (status: WriteAckOutcomeStatus) => void = () => { };
  const promise = new Promise<WriteAckOutcomeStatus>((resolve) => {
    resolveOutcome = resolve;
  });
  const entry: WriteAckEntry = {
    promise,
    settledAt: null,
    servers: [],
    primaryTargetKey: null,
    planRegistered: false,
    targetAcks: new Map(),
    settle: (status) => {
      entry.settledAt = Date.now();
      resolveOutcome(status);
    },
  };
  ackEntries.set(dbKey, entry);
  sweepAckEntries();

  return {
    settleWithReplication: (replication) => {
      if (isReplicationAckHandle(replication)) {
        entry.planRegistered = true;
        entry.servers = [...replication.servers];
        entry.primaryTargetKey = replicationTargetKey(replication.servers[0]);
        for (const [key, ack] of replication.targets) {
          entry.targetAcks.set(key, asAckStatus(ack));
        }
        void asAckStatus(replication.primary).then((status) =>
          entry.settle(status)
        );
        return;
      }
      if (
        replication &&
        typeof (replication as Promise<boolean>).then === "function"
      ) {
        void asAckStatus(replication as Promise<boolean>).then((status) =>
          entry.settle(status)
        );
        return;
      }
      // 没有可写服务器：等待没有意义，立刻放行。
      entry.settle("not-replicated");
    },
    markNotReplicated: () => entry.settle("not-replicated"),
    markAborted: () => entry.settle("aborted"),
  };
};

/**
 * 等待某个 dbKey 那次写入的服务端确认，带上限。
 *
 * 语义要点：
 * - 该 dbKey 没有 in-flight 写入 → 立即返回（waitedMs 0，不引入任何延迟），
 *   这正是「已有对话的普通发送」和「写早已落库」的情形。
 * - 传了 targetServer（本次 run 请求的服务器）→ 等**那台服务器**自己的写
 *   请求；它不在复制计划里时回退到主目标，并打 warn 说明回退。
 * - 有 in-flight 写入 → 等它 settle 或 timeoutMs 到点；到点后调用方照旧继续。
 */
export const waitForWriteAck = async (
  dbKey: string,
  options: { timeoutMs?: number; targetServer?: string | null } = {}
): Promise<WriteAckWaitResult> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_WRITE_ACK_TIMEOUT_MS;
  const entry = ackEntries.get(dbKey);
  if (!entry) {
    return {
      outcome: { status: "unknown" },
      timedOut: false,
      waitedMs: 0,
      waitTarget: "none",
    };
  }

  const targetKey = replicationTargetKey(options.targetServer);
  let ack = entry.promise;
  let waitTarget: WriteAckWaitTarget = "primary";
  if (targetKey) {
    const targetAck = entry.targetAcks.get(targetKey);
    if (targetAck) {
      ack = targetAck;
      waitTarget = "run-target";
    } else if (entry.planRegistered) {
      // run 目标不在这条记录的复制计划里（authority override 到别的服务器等）：
      // 有界回退到主目标，等的是同一次写、同一个 1500ms 预算。
      waitTarget = "primary-fallback";
      console.warn(
        `[WriteAck] run target ${targetKey} is not in this write's replication plan [${entry.servers.join(
          ", "
        )}] for ${dbKey}; waiting on primary ${
          entry.primaryTargetKey ?? "unknown"
        } instead`
      );
    }
  }

  const startedAt = nowMs();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const raced = await Promise.race<WriteAckOutcomeStatus | null>([
    ack,
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), Math.max(0, timeoutMs));
    }),
  ]);
  if (timer !== undefined) clearTimeout(timer);

  const waitedMs = nowMs() - startedAt;
  if (raced === null) {
    return {
      outcome: { status: "pending" },
      timedOut: true,
      waitedMs,
      waitTarget,
    };
  }
  return { outcome: { status: raced }, timedOut: false, waitedMs, waitTarget };
};

/** 仅用于测试与诊断：当前登记的槽位数量。 */
export const __getPendingWriteAckCount = (): number => ackEntries.size;

/** 仅用于测试与诊断：不改状态地看某个 dbKey 的槽位是否已登记。 */
export const __peekWriteAck = (
  dbKey: string
):
  | {
      registered: true;
      settled: boolean;
      planRegistered: boolean;
      servers: string[];
      targetKeys: string[];
    }
  | null => {
  const entry = ackEntries.get(dbKey);
  if (!entry) return null;
  return {
    registered: true,
    settled: entry.settledAt !== null,
    planRegistered: entry.planRegistered,
    servers: [...entry.servers],
    targetKeys: [...entry.targetAcks.keys()],
  };
};
