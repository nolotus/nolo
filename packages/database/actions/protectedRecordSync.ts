// 文件路径: database/actions/protectedRecordSync.ts
//
// C1：protected record 的**客户端持久同步状态机**（只实现状态机，不发请求）。
//
// 职责边界（重要，不要越界解读）：
// - 本模块只维护「本地草稿 + 待发队列 + ACK 基线 + 旧副本候选」的持久状态，
//   并保证同一 (actorId, dbKey) 的状态迁移有序、原子、可重启恢复。
// - 本模块**不发任何网络请求**、不重放、不选择 authority、不接路由与页面；
//   传输层（把 outbox 送出去、把 ACK 收回来）由后续接线负责。
// - 本模块不 import server 侧模块，也不 import node:crypto：客户端 bundle 不能带
//   服务端加密依赖。sidecar key 用 URL 编码分段（无碰撞、无需哈希）。
//
// 两把锁（2026-11-05 修订，修「持锁跨越网络堵住本地自动保存」）：
// - **状态锁**（namespace=state）：只覆盖短事务——读状态、取队首快照、落盘结果。
//   网络等待期间**不持有**状态锁，所以本地自动保存不会被一次慢请求堵住。
// - **发送锁**（namespace=send）：覆盖整个网络生命周期，保证同 key 同一时刻只有
//   一个发送者。默认 navigator.locks，命名空间与状态锁分开。
// - 两把锁的取用顺序恒为「先 send 后 state」，且**从不**在持有状态锁时去等发送锁，
//   因此不会形成互等死锁。发送回调运行期间不持任何锁。
// - 没有可靠协调器时**显式拒绝**（LOCK_UNAVAILABLE），绝不静默退化成进程内锁
//   冒充跨标签安全 —— 进程内锁在多标签下等于没有锁。
//
// 认领（claim）模型：
// - **不持久化 in-flight 标志**。持久化的认领在重启/崩溃后会永久卡住队列
//   （永远 OUT_OF_ORDER），而且进程内标志冒充不了跨标签安全。
// - 认领 = 在发送锁内取队首快照 → 发送 → **重新加载最新状态**后核对队首再落地 ACK。
//   网络期间其它标签/窗口可以保存新草稿；ACK 落地时基于最新状态，后继草稿不被抹掉。
// - 重启后未 ACK 的条目仍是 pending，可用**同一个 mutationId** 重新认领发送；
//   是否被服务端判为重复，取决于服务端按 mutationId 的幂等收据（server 侧已有
//   收据机制，但尚未接入客户端传输入口）。本模块**不把 baseRevision 当幂等依据**
//   （前置版本相同不等于同一次提交；丢 ACK 只能靠服务端幂等收据去重）。
//
// 持久化：sidecar 是内部前缀的独立记录，按 actorId + dbKey 隔离，避免跨账号串读。
// 每次状态迁移把 workingCopy 与 outbox 放在**同一个 batch** 里落盘，
// 因此不存在「草稿已存、队列未存」的中间态。

import { parseProtectedMutation, type ProtectedRecord, type JsonValue, type ProtectedMutationAckFields } from "../protectedRecordProtocol";
export type { JsonValue } from "../protectedRecordProtocol";

/** Local ACK projection, NOT a wire ACK. Transport must validate the full wire identity first. */
type LocalAck = Pick<ProtectedMutationAckFields<JsonValue>, "mutationId" | "revision" | "record">;

/** sidecar 内部前缀：业务记录 key 永远不会用这个前缀，内部状态不对业务读取暴露。 */
export const PROTECTED_SYNC_PREFIX = "\u0000protected-record-sync:v1:";

/** 注入的 db 契约：与现有 Level 兼容（client/db.ts 的 Level 实例满足它）。 */
export type ProtectedSyncDb = {
  get(key: string): Promise<unknown>;
  batch(
    operations: Array<{ type: "put" | "del"; key: string; value?: unknown }>,
  ): Promise<unknown> | unknown;
};

export type ProtectedSyncLockScope = {
  actorId: string;
  dbKey: string;
  /** 锁命名空间：state=短事务，send=跨网络发送。缺省按 state 处理。 */
  namespace?: "state" | "send";
};

/**
 * 可靠互斥协调器：同一 scope 的 task 不重叠。
 * 必须跨标签页生效（navigator.locks / 其它跨上下文原语）。
 */
export type ProtectedSyncLock = <T>(scope: ProtectedSyncLockScope, task: () => Promise<T>) => Promise<T>;

export type ProtectedSyncErrorCode =
  | "INVALID_INPUT"
  | "LOCK_UNAVAILABLE"
  | "MUTATION_ID_CONFLICT"
  | "MUTATION_NOT_FOUND"
  | "OUT_OF_ORDER"
  | "BLOCKED"
  | "BATCH_FAILED";

export class ProtectedSyncError extends Error {
  constructor(readonly code: ProtectedSyncErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ProtectedSyncError";
  }
}

/** 本地草稿（用户当前看到的那一版内容）。 */
type PatchIntent = { operation?: "patch"; payload?: ProtectedRecord; authorityEpoch?: string };

export type ProtectedSyncWorkingCopy = PatchIntent & {
  mutationId: string;
  data: JsonValue;
  /** 该草稿的基线 revision：下一次提交应带的 expectedRevision。 */
  baseRevision: string | null;
  authorityServer: string;
  /** 全局单调序号，用于队列定序。 */
  seq: number;
};

/**
 * 待发队列中的一条（有序）。payload 一旦入队不可变。
 *
 * `inFlight` 只保留字段兼容：旧版本持久化过该标志，读取时**不再解释为占用**
 * （没有持锁者时它不构成认领），因此重启后不会留下永久卡住的队列。
 */
export type ProtectedSyncOutboxEntry = PatchIntent & {
  mutationId: string;
  data: JsonValue;
  baseRevision: string | null;
  authorityServer: string;
  seq: number;
  /** @deprecated 不再作为认领依据，仅为兼容旧持久化数据保留。 */
  inFlight?: boolean;
};

/** 未分类的旧副本：完整保留，不按 timestamp 丢弃。 */
export type ProtectedSyncLegacyCandidate = {
  candidateId: string;
  source: string;
  record: JsonValue;
  revision: string | null;
  observedAt: number | null;
};

export type ProtectedSyncBlocked = {
  reason: string;
  detail: string | null;
  at: number;
};

export type ProtectedSyncState = {
  actorId: string;
  dbKey: string;
  workingCopy: ProtectedSyncWorkingCopy | null;
  /** 有序待发队列；队首才是下一个该发的。 */
  outbox: ProtectedSyncOutboxEntry[];
  /** 服务端已确认的基线 revision。 */
  baselineRevision: string | null;
  lastAck: LocalAck | null;
  legacyCandidates: ProtectedSyncLegacyCandidate[];
  /** 因 pending/legacy 未能采用的远端记录：完整保留，不丢内容。 */
  remoteCandidate: { revision: string | null; record: JsonValue } | null;
  blocked: ProtectedSyncBlocked | null;
  nextSeq: number;
};

export type SaveLocalDraftInput = {
  actorId: string;
  dbKey: string;
  authorityServer: string;
  baseRevision: string | null;
  mutationId: string;
  data: JsonValue;
} & ({ operation?: never; payload?: never; authorityEpoch?: never } | { operation: "patch"; payload: ProtectedRecord; authorityEpoch: string });

export type AckMutationInput = LocalAck & {
  actorId: string;
  dbKey: string;
};

export const protectedPageBaselineKey = (actorId: string, dbKey: string) =>
  `\u0000page-read-baseline:v1:${encodeURIComponent(actorId)}:${encodeURIComponent(dbKey)}`;

export type AcceptRemoteInput = {
  actorId: string;
  dbKey: string;
  revision: string | null;
  record: JsonValue;
  /** Synchronous session check, repeated under the state lock immediately before commit. */
  assertCurrentAccess?: () => void;
  /** Discovery identity committed atomically with state and accepted content. */
  authority?: { authorityServer: string; authorityEpoch: string };
  /** 调用方发现的未分类旧副本：完整候选，状态机负责保留。 */
  legacyCandidates?: ProtectedSyncLegacyCandidate[];
};

export type AcceptRemoteReason =
  | "pending-mutations"
  | "working-copy"
  | "legacy-candidates"
  | null;

export type AcceptRemoteResult = {
  applied: boolean;
  reason: AcceptRemoteReason;
  state: ProtectedSyncState;
};

export type MarkBlockedInput = {
  actorId: string;
  dbKey: string;
  reason: string;
  detail?: string | null;
};

export type BeginInFlightInput = {
  actorId: string;
  dbKey: string;
  mutationId?: string;
};

/** 发送回调的返回：确认成功，或服务端明确冲突（409/blocked 语义）。 */
export type NextMutationSendResult =
  | ({ outcome: "acked" } & Pick<LocalAck, "revision" | "record">)
  | { outcome: "conflict" | "blocked" | "pending"; reason: string; detail?: string | null };

export type WithNextMutationResult = {
  /** 被认领并发送的 mutationId；未发送时为 null。 */
  mutationId: string | null;
  outcome: "none" | "acked" | "conflict" | "blocked" | "pending";
  reason?: string;
  /** true 表示本次未发送：队首已被别的发送者处理或基线已变。 */
  skipped?: boolean;
  state: ProtectedSyncState;
};

export type ProtectedRecordSync = {
  saveLocalDraft(input: SaveLocalDraftInput): Promise<ProtectedSyncState>;
  ackMutation(input: AckMutationInput): Promise<ProtectedSyncState>;
  readState(input: { actorId: string; dbKey: string }): Promise<ProtectedSyncState>;
  acceptRemote(input: AcceptRemoteInput): Promise<AcceptRemoteResult>;
  markBlocked(input: MarkBlockedInput): Promise<ProtectedSyncState>;
  clearBlocked(input: { actorId: string; dbKey: string }): Promise<ProtectedSyncState>;
  /**
   * @deprecated 认领必须在 withNextMutation 内完成。本函数不再持久化认领标志
   * （避免重启后永久卡住队列），只做顺序与状态校验，保留用于源码兼容。
   */
  beginInFlight(input: BeginInFlightInput): Promise<ProtectedSyncState>;
  /**
   * @deprecated 没有持久化认领可释放；保留用于源码兼容，状态原样返回。
   */
  releaseInFlight(input: { actorId: string; dbKey: string; mutationId: string }): Promise<ProtectedSyncState>;
  /**
   * 认领队首并在**发送锁**内发送（网络生命周期全程持发送锁），期间**不持状态锁**，
   * 本地自动保存可立即落盘；ACK/冲突落地前会重新加载最新状态并核对队首，
   * 因此不会用网络前的旧状态覆盖新草稿。
   *
   * 发送回调**不得**回调本模块的其它方法（锁不可重入）。
   * 回调抛错时：条目保持 pending、不推进 baseline、不清草稿，两把锁随异常释放。
   */
  withNextMutation(
    scope: { actorId: string; dbKey: string },
    send: (entry: ProtectedSyncOutboxEntry) => Promise<NextMutationSendResult>,
  ): Promise<WithNextMutationResult>;
};

/* ------------------------------------------------------------------ *
 * key 编码
 * ------------------------------------------------------------------ */

/**
 * 分段编码：encodeURIComponent 对 ':' 转义为 %3A，所以分段与分隔符不会歧义，
 * 不同 (actorId, dbKey) 一定映射到不同 sidecar key —— 无需哈希，也不引 node:crypto。
 */
const encodeSegment = (value: string): string => encodeURIComponent(value);

export const protectedSyncWorkingCopyKey = (actorId: string, dbKey: string): string =>
  `${PROTECTED_SYNC_PREFIX}working:${encodeSegment(actorId)}:${encodeSegment(dbKey)}`;

export const protectedSyncStateKey = (actorId: string, dbKey: string): string =>
  `${PROTECTED_SYNC_PREFIX}state:${encodeSegment(actorId)}:${encodeSegment(dbKey)}`;

/** 状态锁名：按 actor + key 隔离，不同账号不互相阻塞。 */
export const protectedSyncLockName = (actorId: string, dbKey: string): string =>
  `protected-record-sync:${encodeSegment(actorId)}:${encodeSegment(dbKey)}`;

/** 发送锁名：与状态锁分开命名空间，避免「持锁跨越网络」把状态锁也堵住。 */
export const protectedSyncSendLockName = (actorId: string, dbKey: string): string =>
  `protected-record-send:${encodeSegment(actorId)}:${encodeSegment(dbKey)}`;

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

const isNotFound = (error: unknown): boolean =>
  !!error && typeof error === "object" && (error as { notFound?: unknown }).notFound === true;

async function readOptional(db: ProtectedSyncDb, key: string): Promise<unknown | undefined> {
  try {
    return await db.get(key);
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

/**
 * 深拷贝：状态与草稿数据一律 JSON 值，深拷贝后调用方改动返回值/入参都不会
 * 触及持久上下文，也不会让模块内部状态与 db 返回对象产生别名。
 */
export function protectedSyncCopy<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

/** JSON 深比较：同 mutationId 幂等判定用。 */
export function protectedSyncJsonEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== typeof right) return false;
  if (left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => protectedSyncJsonEqual(item, right[index]));
  }
  if (typeof left === "object") {
    const leftKeys = Object.keys(left as object).sort();
    const rightKeys = Object.keys(right as object).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    if (leftKeys.some((key, index) => key !== rightKeys[index])) return false;
    return leftKeys.every((key) =>
      protectedSyncJsonEqual((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]),
    );
  }
  return false;
}

const requireNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProtectedSyncError("INVALID_INPUT", `${field} 必须是非空字符串`);
  }
  return value;
};

const requireJsonValue = (value: unknown, field: string): JsonValue => {
  if (value === undefined) {
    throw new ProtectedSyncError("INVALID_INPUT", `${field} 不能是 undefined`);
  }
  try {
    JSON.stringify(value);
  } catch {
    throw new ProtectedSyncError("INVALID_INPUT", `${field} 必须是可 JSON 序列化的数据`);
  }
  return value as JsonValue;
};

/**
 * Web 默认协调器：navigator.locks，按 actor/key + 命名空间命名。
 * 不可用时显式拒绝（LOCK_UNAVAILABLE），不做进程内 fallback。
 */
export function createNavigatorLocksLock(namespace: "state" | "send" = "state"): ProtectedSyncLock {
  return async <T>(scope: ProtectedSyncLockScope, task: () => Promise<T>): Promise<T> => {
    const locks = (
      globalThis as {
        navigator?: {
          locks?: {
            request?: (
              name: string,
              options: { mode: "exclusive" },
              callback: () => Promise<unknown>,
            ) => Promise<unknown>;
          };
        };
      }
    ).navigator?.locks;
    if (!locks || typeof locks.request !== "function") {
      throw new ProtectedSyncError(
        "LOCK_UNAVAILABLE",
        `navigator.locks 不可用（${namespace} 锁）：没有可靠的跨标签协调器，拒绝以进程内锁冒充跨标签互斥`,
      );
    }
    const name = (scope.namespace ?? namespace) === "send"
      ? protectedSyncSendLockName(scope.actorId, scope.dbKey)
      : protectedSyncLockName(scope.actorId, scope.dbKey);
    const result = await locks.request(name, { mode: "exclusive" }, async () => task());
    return result as T;
  };
}

/* ------------------------------------------------------------------ *
 * 状态机
 * ------------------------------------------------------------------ */

export type ProtectedRecordSyncDeps = {
  db: ProtectedSyncDb;
  /** 状态锁（短事务）。不传则用 navigator.locks 的 state 命名空间。 */
  lock?: ProtectedSyncLock;
  /** 发送锁（跨网络串行）。不传则用 navigator.locks 的 send 命名空间。 */
  sendLock?: ProtectedSyncLock;
};

export function createProtectedRecordSync(deps: ProtectedRecordSyncDeps): ProtectedRecordSync {
  const { db } = deps;
  const stateLock = deps.lock ?? createNavigatorLocksLock("state");
  const sendLock = deps.sendLock ?? createNavigatorLocksLock("send");

  const withStateLock = <T>(scope: { actorId: string; dbKey: string }, task: () => Promise<T>): Promise<T> =>
    stateLock({ ...scope, namespace: "state" }, task);
  const withSendLock = <T>(scope: { actorId: string; dbKey: string }, task: () => Promise<T>): Promise<T> =>
    sendLock({ ...scope, namespace: "send" }, task);

  const loadState = async (actorId: string, dbKey: string): Promise<ProtectedSyncState> => {
    const [workingRaw, stateRaw] = await Promise.all([
      readOptional(db, protectedSyncWorkingCopyKey(actorId, dbKey)),
      readOptional(db, protectedSyncStateKey(actorId, dbKey)),
    ]);
    const working = (workingRaw as { workingCopy?: ProtectedSyncWorkingCopy | null } | undefined)?.workingCopy ?? null;
    const persisted = (stateRaw ?? {}) as {
      outbox?: ProtectedSyncOutboxEntry[];
      baselineRevision?: string | null;
      lastAck?: ProtectedSyncState["lastAck"];
      legacyCandidates?: ProtectedSyncLegacyCandidate[];
      remoteCandidate?: ProtectedSyncState["remoteCandidate"];
      blocked?: ProtectedSyncBlocked | null;
      nextSeq?: number;
    };
    const outbox = (Array.isArray(persisted.outbox) ? persisted.outbox : []).map((entry) => ({
      ...entry,
      // 旧版本持久化的认领标志不再解释为占用：重启后队列必须可继续。
      inFlight: false,
    }));
    return protectedSyncCopy({
      actorId,
      dbKey,
      workingCopy: working,
      outbox,
      baselineRevision: persisted.baselineRevision ?? null,
      lastAck: persisted.lastAck ?? null,
      legacyCandidates: Array.isArray(persisted.legacyCandidates) ? persisted.legacyCandidates : [],
      remoteCandidate: persisted.remoteCandidate ?? null,
      blocked: persisted.blocked ?? null,
      nextSeq: typeof persisted.nextSeq === "number" ? persisted.nextSeq : 1,
    } as ProtectedSyncState);
  };

  /**
   * 落盘：workingCopy 与 outbox（及基线/候选/blocked）永远在**同一个 batch**，
   * 因此不存在两边不同步的中间态。批失败 → 抛错，绝不报告成功。
   */
  const persist = async (state: ProtectedSyncState, extra?: { key: string; value: unknown }, discovery?: { key: string; value: unknown }): Promise<void> => {
    const operations: Parameters<ProtectedSyncDb["batch"]>[0] = [
      {
        type: "put" as const,
        key: protectedSyncWorkingCopyKey(state.actorId, state.dbKey),
        value: { workingCopy: state.workingCopy },
      },
      {
        type: "put" as const,
        key: protectedSyncStateKey(state.actorId, state.dbKey),
        value: {
          outbox: state.outbox,
          baselineRevision: state.baselineRevision,
          lastAck: state.lastAck,
          legacyCandidates: state.legacyCandidates,
          remoteCandidate: state.remoteCandidate,
          blocked: state.blocked,
          nextSeq: state.nextSeq,
        },
      },
    ];
    if (extra) operations.push({ type: "put" as const, key: extra.key, value: extra.value });
    if (discovery) operations.push({ type: "put" as const, key: discovery.key, value: discovery.value });
    try {
      await db.batch(operations);
    } catch (error) {
      throw new ProtectedSyncError(
        "BATCH_FAILED",
        `protected record sync 落盘失败：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const validateScope = (actorId: unknown, dbKey: unknown): { actorId: string; dbKey: string } => {
    const actor = requireNonEmptyString(actorId, "actorId");
    const key = requireNonEmptyString(dbKey, "dbKey");
    if (key.startsWith("\u0000")) {
      throw new ProtectedSyncError("INVALID_INPUT", "dbKey 不能使用内部保留前缀");
    }
    return { actorId: actor, dbKey: key };
  };

  /**
   * ACK 落地（队首确认）。**调用方必须已持有状态锁**（unlocked：自身不再取锁）。
   * 只允许队首 ACK：移除该条，baseline = 该 revision，后继基线接 ACK；
   * 网络期间保存的新草稿不在被确认的 mutationId 上，因此不会被清掉。
   */
  const applyAckUnlocked = async (
    state: ProtectedSyncState,
    mutationId: string,
    revision: string,
    record: JsonValue,
  ): Promise<ProtectedSyncState> => {
    state.outbox = state.outbox.slice(1);
    state.baselineRevision = revision;
    state.lastAck = { mutationId, revision, record };
    state.outbox = state.outbox.map((entry) => ({ ...entry, baseRevision: revision }));
    if (state.workingCopy) {
      state.workingCopy = state.workingCopy.mutationId === mutationId
        ? null
        : { ...state.workingCopy, baseRevision: revision };
    }
    await persist(state, { key: state.dbKey, value: protectedSyncCopy(record) });
    return state;
  };

  const saveLocalDraft = async (input: SaveLocalDraftInput): Promise<ProtectedSyncState> => {
    const scope = validateScope(input?.actorId, input?.dbKey);
    const authorityServer = requireNonEmptyString(input.authorityServer, "authorityServer");
    const mutationId = requireNonEmptyString(input.mutationId, "mutationId");
    const data = requireJsonValue(input.data, "data");
    const baseRevision = input.baseRevision ?? null;
    const intent: PatchIntent = {};
    if (input.operation !== undefined) {
      const mutation = parseProtectedMutation({ protocolVersion: 1, operation: input.operation,
        payload: input.payload, authorityEpoch: input.authorityEpoch, authorityServer, mutationId,
        expectedRevision: baseRevision });
      intent.operation = "patch";
      intent.payload = protectedSyncCopy(mutation.payload);
      intent.authorityEpoch = mutation.authorityEpoch;
    } else if (input.payload !== undefined || input.authorityEpoch !== undefined) {
      throw new ProtectedSyncError("INVALID_INPUT", "patch intent requires explicit operation");
    }
    return withStateLock(scope, async () => {
      const state = await loadState(scope.actorId, scope.dbKey);
      const existing = state.outbox.find((entry) => entry.mutationId === mutationId);
      if (existing) {
        if (!protectedSyncJsonEqual(existing.data, data) || existing.authorityServer !== authorityServer ||
            existing.operation !== intent.operation || existing.authorityEpoch !== intent.authorityEpoch ||
            !protectedSyncJsonEqual(existing.payload, intent.payload)) {
          throw new ProtectedSyncError(
            "MUTATION_ID_CONFLICT",
            `mutationId ${mutationId} 已存在且 payload 不同：拒绝改写队列中的不可变 payload`,
          );
        }
        // 幂等：同 ID 同 payload 不重复入队，也不覆盖更晚的草稿。
        return protectedSyncCopy(state);
      }
      const entry: ProtectedSyncOutboxEntry = {
        ...intent,
        mutationId,
        data: protectedSyncCopy(data),
        baseRevision: baseRevision ?? state.baselineRevision,
        authorityServer,
        seq: state.nextSeq,
      };
      state.outbox = [...state.outbox, entry];
      state.nextSeq = state.nextSeq + 1;
      state.workingCopy = {
        ...intent,
        mutationId,
        data: protectedSyncCopy(data),
        baseRevision: entry.baseRevision,
        authorityServer,
        seq: entry.seq,
      };
      await persist(state);
      return protectedSyncCopy(state);
    });
  };

  const ackMutation = async (input: AckMutationInput): Promise<ProtectedSyncState> => {
    const scope = validateScope(input?.actorId, input?.dbKey);
    const mutationId = requireNonEmptyString(input.mutationId, "mutationId");
    const revision = requireNonEmptyString(input.revision, "revision");
    const record = requireJsonValue(input.record, "record");
    return withStateLock(scope, async () => {
      const state = await loadState(scope.actorId, scope.dbKey);
      // 丢 ACK 重试：同一次确认的重复投递，幂等返回，状态不变（不重复推进 baseline）。
      if (state.lastAck?.mutationId === mutationId) return protectedSyncCopy(state);
      const head = state.outbox[0];
      if (!head) {
        throw new ProtectedSyncError("MUTATION_NOT_FOUND", `未找到待确认的 mutation：${mutationId}`);
      }
      if (head.mutationId !== mutationId) {
        // 乱序/迟到 ACK：队列未变、baseline 未推进、草稿未清。
        const known = state.outbox.some((entry) => entry.mutationId === mutationId);
        throw new ProtectedSyncError(
          known ? "OUT_OF_ORDER" : "MUTATION_NOT_FOUND",
          known
            ? `只允许确认队首：当前队首是 ${head.mutationId}，不是 ${mutationId}`
            : `未找到待确认的 mutation：${mutationId}`,
        );
      }
      const next = await applyAckUnlocked(state, mutationId, revision, protectedSyncCopy(record));
      return protectedSyncCopy(next);
    });
  };

  const readState = async (input: { actorId: string; dbKey: string }): Promise<ProtectedSyncState> => {
    const scope = validateScope(input?.actorId, input?.dbKey);
    return withStateLock(scope, async () => protectedSyncCopy(await loadState(scope.actorId, scope.dbKey)));
  };

  const acceptRemote = async (input: AcceptRemoteInput): Promise<AcceptRemoteResult> => {
    const scope = validateScope(input?.actorId, input?.dbKey);
    const record = requireJsonValue(input.record, "record");
    const discovery = input.authority ? {
      key: protectedPageBaselineKey(scope.actorId, scope.dbKey),
      value: { authorityServer: requireNonEmptyString(input.authority.authorityServer, "authorityServer"),
        authorityEpoch: requireNonEmptyString(input.authority.authorityEpoch, "authorityEpoch"), revision: input.revision },
    } : undefined;
    return withStateLock(scope, async () => {
      const state = await loadState(scope.actorId, scope.dbKey);
      if (Array.isArray(input.legacyCandidates) && input.legacyCandidates.length > 0) {
        const merged = [...state.legacyCandidates];
        for (const candidate of input.legacyCandidates) {
          const position = merged.findIndex((item) => item.candidateId === candidate.candidateId);
          if (position === -1) merged.push(protectedSyncCopy(candidate));
          else merged[position] = { ...merged[position], ...protectedSyncCopy(candidate) };
        }
        // 旧副本按 candidateId 去重合并；不按 timestamp 丢弃任何一条。
        state.legacyCandidates = merged;
      }
      const hasPending = state.outbox.length > 0;
      const hasWorking = state.workingCopy !== null;
      const hasLegacy = state.legacyCandidates.length > 0;
      if (hasPending || hasWorking || hasLegacy) {
        state.remoteCandidate = { revision: input.revision ?? null, record: protectedSyncCopy(record) };
        input.assertCurrentAccess?.();
        await persist(state, undefined, discovery);
        return {
          applied: false,
          reason: hasPending ? "pending-mutations" : hasWorking ? "working-copy" : "legacy-candidates",
          state: protectedSyncCopy(state),
        };
      }
      state.baselineRevision = input.revision ?? state.baselineRevision;
      state.remoteCandidate = null;
      state.workingCopy = null;
      input.assertCurrentAccess?.();
      await persist(state, { key: scope.dbKey, value: protectedSyncCopy(record) }, discovery);
      return { applied: true, reason: null, state: protectedSyncCopy(state) };
    });
  };

  const markBlocked = async (input: MarkBlockedInput): Promise<ProtectedSyncState> => {
    const scope = validateScope(input?.actorId, input?.dbKey);
    const reason = requireNonEmptyString(input.reason, "reason");
    return withStateLock(scope, async () => {
      const state = await loadState(scope.actorId, scope.dbKey);
      // 冲突/blocked 只记录状态：草稿与队列原样保留。
      state.blocked = { reason, detail: input.detail ?? null, at: Date.now() };
      await persist(state);
      return protectedSyncCopy(state);
    });
  };

  const clearBlocked = async (input: { actorId: string; dbKey: string }): Promise<ProtectedSyncState> => {
    const scope = validateScope(input?.actorId, input?.dbKey);
    return withStateLock(scope, async () => {
      const state = await loadState(scope.actorId, scope.dbKey);
      state.blocked = null;
      await persist(state);
      return protectedSyncCopy(state);
    });
  };

  const beginInFlight = async (input: BeginInFlightInput): Promise<ProtectedSyncState> => {
    const scope = validateScope(input?.actorId, input?.dbKey);
    return withStateLock(scope, async () => {
      const state = await loadState(scope.actorId, scope.dbKey);
      if (state.blocked) {
        throw new ProtectedSyncError("BLOCKED", `记录处于 blocked 状态：${state.blocked.reason}`);
      }
      const head = state.outbox[0];
      if (!head) {
        throw new ProtectedSyncError("MUTATION_NOT_FOUND", "待发队列为空");
      }
      if (input.mutationId !== undefined && input.mutationId !== head.mutationId) {
        throw new ProtectedSyncError(
          "OUT_OF_ORDER",
          `队列必须按序发送：当前队首是 ${head.mutationId}，不是 ${input.mutationId}`,
        );
      }
      // 不再持久化认领标志：真正的认领在 withNextMutation 内完成。
      return protectedSyncCopy(state);
    });
  };

  const releaseInFlight = async (
    input: { actorId: string; dbKey: string; mutationId: string },
  ): Promise<ProtectedSyncState> => {
    const scope = validateScope(input?.actorId, input?.dbKey);
    requireNonEmptyString(input.mutationId, "mutationId");
    return withStateLock(scope, async () => protectedSyncCopy(await loadState(scope.actorId, scope.dbKey)));
  };

  const withNextMutation = async (
    scopeInput: { actorId: string; dbKey: string },
    send: (entry: ProtectedSyncOutboxEntry) => Promise<NextMutationSendResult>,
  ): Promise<WithNextMutationResult> => {
    const scope = validateScope(scopeInput?.actorId, scopeInput?.dbKey);
    if (typeof send !== "function") {
      throw new ProtectedSyncError("INVALID_INPUT", "send 必须是函数");
    }
    // ① 短事务：取队首快照，随即释放状态锁。
    const snapshot = await withStateLock(scope, async () => {
      const state = await loadState(scope.actorId, scope.dbKey);
      if (state.blocked) {
        throw new ProtectedSyncError("BLOCKED", `记录处于 blocked 状态：${state.blocked.reason}`);
      }
      const head = state.outbox[0];
      return { state: protectedSyncCopy(state), entry: head ? protectedSyncCopy(head) : null };
    });
    if (!snapshot.entry) {
      return { mutationId: null, outcome: "none" as const, state: snapshot.state };
    }
    const entry = snapshot.entry;
    // ② 发送锁覆盖网络生命周期；③ 状态锁只在前后各持有一小段。
    return withSendLock(scope, async () => {
      const ready = await withStateLock(scope, async () => {
        const state = await loadState(scope.actorId, scope.dbKey);
        const head = state.outbox[0];
        const same = !!head && head.mutationId === entry.mutationId && head.baseRevision === entry.baseRevision;
        return { state, same };
      });
      if (!ready.same) {
        // 队首已被别的发送者处理（或基线已变）：不重复发送。
        return {
          mutationId: null,
          outcome: "none" as const,
          skipped: true,
          state: protectedSyncCopy(ready.state),
        };
      }
      // ④ 网络发送：期间不持状态锁 → 本地自动保存可立即落盘。
      const result = await send(protectedSyncCopy(entry));
      // ⑤ 落地前重新加载最新状态并核对队首：不用网络前的旧状态覆盖新草稿。
      return withStateLock(scope, async () => {
        const state = await loadState(scope.actorId, scope.dbKey);
        if (result?.outcome === "acked") {
          const revision = requireNonEmptyString(result.revision, "revision");
          const record = requireJsonValue(result.record, "record");
          if (state.lastAck?.mutationId === entry.mutationId) {
            return { mutationId: entry.mutationId, outcome: "acked" as const, state: protectedSyncCopy(state) };
          }
          const head = state.outbox[0];
          if (!head || head.mutationId !== entry.mutationId) {
            return {
              mutationId: null,
              outcome: "none" as const,
              skipped: true,
              state: protectedSyncCopy(state),
            };
          }
          const next = await applyAckUnlocked(state, entry.mutationId, revision, protectedSyncCopy(record));
          return { mutationId: entry.mutationId, outcome: "acked" as const, state: protectedSyncCopy(next) };
        }
        if (result?.outcome === "pending") {
          return { mutationId: entry.mutationId, outcome: "pending" as const,
            reason: result.reason, state: protectedSyncCopy(state) };
        }
        if (result?.outcome === "conflict" || result?.outcome === "blocked") {
          const reason = requireNonEmptyString(result.reason, "reason");
          // 只标记仍然 pending 的那一条；队首已换则不污染新队首。
          const stillPending = state.outbox.some((item) => item.mutationId === entry.mutationId);
          if (stillPending) {
            state.blocked = { reason, detail: result.detail ?? null, at: Date.now() };
            await persist(state);
          }
          return {
            mutationId: entry.mutationId,
            outcome: result.outcome,
            reason,
            state: protectedSyncCopy(state),
          };
        }
        throw new ProtectedSyncError("INVALID_INPUT", "send 必须返回 acked/conflict/blocked/pending");
      });
    });
  };

  return {
    saveLocalDraft,
    ackMutation,
    readState,
    acceptRemote,
    markBlocked,
    clearBlocked,
    beginInFlight,
    releaseInFlight,
    withNextMutation,
  };
}
