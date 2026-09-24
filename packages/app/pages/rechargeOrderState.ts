/**
 * 充值订单状态机（纯逻辑，无 React / 无 DOM 依赖）。
 *
 * 状态流转：
 *   idle → creating → awaiting_payment → confirming → credited
 *                       ↓                  ↓
 *                    failed            delayed（轮询超时）
 *                       ↓
 *                   cancelled（用户取消 / ?waffo=cancel）
 *
 * sessionStorage 只存「最后一次下单的快照」，刷新/跳回后据此恢复 UI；
 * 不存 token、不存 checkoutUrl 之外的服务端数据。
 */

export type RechargeOrderPhase =
  | "idle"
  | "creating"
  | "awaiting_payment"
  | "confirming"
  | "credited"
  | "failed"
  | "cancelled"
  | "delayed";

export type RechargeReturnStatus = "success" | "failed" | "cancel";

export interface RechargeOrderSnapshot {
  phase: RechargeOrderPhase;
  credits: number;
  method: string;
  /** 下单时刻（ms epoch）；confirming 轮询以此为起点 */
  createdAt: number;
  checkoutUrl?: string;
  /**
   * 收银台会话过期时间（ms epoch，来自 Waffo create-session 的 expiresAt）。
   * 过期后必须重新下单：直接重开旧链接会被 Waffo「自愈」成匿名会话，
   * metadata 丢失 → 这笔钱无法自动入账。
   */
  checkoutExpiresAt?: number;
  /** 跳回确认前的余额基线；命中「余额 > baseline」即判定 credited */
  balanceBaseline?: number;
}

export const RECHARGE_ORDER_STORAGE_KEY = "rechargeOrder.v1";

/** confirming 轮询：3s × 13 ≈ 40s */
export const CONFIRM_POLL_INTERVAL_MS = 3_000;
export const CONFIRM_POLL_MAX_ATTEMPTS = 13;

/** Waffo 收银台会话默认有效期（SDK 默认 45 分钟，可通过 expiresInSeconds 调整） */
export const CHECKOUT_SESSION_TTL_MS = 45 * 60 * 1000;

/** create-session 允许的最大会话有效期（文档：expiresInSeconds 上限 7 天） */
export const CHECKOUT_SESSION_MAX_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 解析 Waffo 返回的 ISO 8601 会话过期时间 → ms；缺失/非法返回 undefined。 */
export function parseCheckoutExpiresAt(value: unknown): number | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * 收银台会话是否已过期（纯函数）。
 *
 * 为什么重要：会话过期/被消费后，Waffo 收银台会「自愈」回产品页并新建**匿名**
 * 会话，那条路径会丢掉我们下单时带的 metadata（含 paymentRequestId），
 * 结果就是「钱收了、我们认不出来、没入账」（2026-09-24 真实事故）。
 * 因此过期后必须重新下单，而不是重开旧链接。
 *
 * 缺少明确的 checkoutExpiresAt（历史快照）时，用 createdAt + 默认 TTL 兜底。
 */
export function isCheckoutSessionExpired(
  snapshot: Pick<
    RechargeOrderSnapshot,
    "checkoutExpiresAt" | "createdAt"
  >,
  now = Date.now(),
  ttlMs = CHECKOUT_SESSION_TTL_MS
): boolean {
  const expiresAt = snapshot.checkoutExpiresAt;
  // 只有「有限且不超过 7 天上限」的 expiresAt 才可信：离谱的未来值通常是
  // 快照损坏或时间单位错误，按不可信用处理（回落 createdAt 判断）更安全
  const expiresAtUsable =
    typeof expiresAt === "number" &&
    Number.isFinite(expiresAt) &&
    expiresAt <= now + CHECKOUT_SESSION_MAX_TTL_MS;
  if (expiresAtUsable) return now >= expiresAt;

  const createdAt = snapshot.createdAt;
  // 不可用或**未来**的 createdAt（时钟异常/快照损坏）一律按过期处理：
  // 方向是「宁可重新下单，也不要重开可能已经死掉的链接」
  if (
    typeof createdAt !== "number" ||
    !Number.isFinite(createdAt) ||
    createdAt > now
  ) {
    return true;
  }
  const effectiveTtl =
    typeof ttlMs === "number" && Number.isFinite(ttlMs) && ttlMs > 0
      ? ttlMs
      : CHECKOUT_SESSION_TTL_MS;
  return now - createdAt >= effectiveTtl;
}

// ---------- 纯函数 ----------

export function parseRechargeReturnStatus(
  search: string,
  param = "waffo"
): RechargeReturnStatus | null {
  if (!search) return null;
  const value = new URLSearchParams(search).get(param);
  return value === "success" || value === "failed" || value === "cancel"
    ? value
    : null;
}

export function createOrderSnapshot(input: {
  credits: number;
  method: string;
  checkoutUrl?: string;
  checkoutExpiresAt?: number;
  balanceBaseline?: number;
  now?: number;
}): RechargeOrderSnapshot {
  return {
    phase: "awaiting_payment",
    credits: input.credits,
    method: input.method,
    createdAt: input.now ?? Date.now(),
    checkoutUrl: input.checkoutUrl,
    checkoutExpiresAt: input.checkoutExpiresAt,
    balanceBaseline: input.balanceBaseline,
  };
}

/**
 * 跳回参数 → 新阶段。
 * success 不直接置 credited：回调可能晚于跳回，必须先进入 confirming 轮询。
 */
export function phaseAfterReturn(
  status: RechargeReturnStatus
): RechargeOrderPhase {
  switch (status) {
    case "success":
      return "confirming";
    case "failed":
      return "failed";
    case "cancel":
      return "cancelled";
  }
}

/**
 * 全局到账 watcher 关心的阶段：进行中订单。终态（credited/delayed/failed/
 * cancelled）与创建中（idle/creating）一律不轮询。
 */
export const WATCHABLE_ORDER_PHASES: readonly RechargeOrderPhase[] = [
  "awaiting_payment",
  "confirming",
];

/**
 * 快照 → 全局 watcher 状态（纯函数）。
 * 返回 null = 不轮询：无快照 / 非进行中阶段 / 缺可比较基线（无从判定到账）。
 */
export function resolveCreditWatch(
  snapshot: RechargeOrderSnapshot | null
): { baseline: number } | null {
  if (!snapshot) return null;
  if (!WATCHABLE_ORDER_PHASES.includes(snapshot.phase)) return null;
  const baseline = snapshot.balanceBaseline;
  if (typeof baseline !== "number" || !Number.isFinite(baseline)) return null;
  return { baseline };
}

/** confirming 轮询决策：命中余额增长 → credited；次数用尽 → delayed；否则继续。 */
export function decideConfirmPoll(input: {
  attempt: number;
  currentBalance?: number;
  baseline?: number;
  maxAttempts?: number;
}): "poll" | "credited" | "delayed" {
  const max = input.maxAttempts ?? CONFIRM_POLL_MAX_ATTEMPTS;
  if (
    typeof input.currentBalance === "number" &&
    typeof input.baseline === "number" &&
    input.currentBalance > input.baseline
  ) {
    return "credited";
  }
  return input.attempt >= max ? "delayed" : "poll";
}

// ---------- sessionStorage 持久化 ----------

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const getStorage = (storage?: StorageLike | null): StorageLike | null => {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

// ---------- 同 bundle 内的快照变更订阅 ----------

type OrderSnapshotListener = () => void;
const orderSnapshotListeners = new Set<OrderSnapshotListener>();

/**
 * 订阅「快照被写入 / 更新 / 清除」。
 *
 * 存在的理由：全局到账 watcher（RechargeCreditWatcher）挂在 MainLayout 上，
 * 它不随路由切换卸载，而快照往往是在它已挂载之后才由 /recharge 页写入。只读
 * 一次的 effect 会永远看到「无快照」，导致下单后离开充值页不再有任何到账反馈。
 * 订阅让 watcher 在快照出现/消失的瞬间同步状态。
 *
 * 返回取消订阅函数；订阅者抛错不会影响写入路径与其他订阅者。
 */
export function subscribeOrderSnapshot(
  listener: OrderSnapshotListener
): () => void {
  orderSnapshotListeners.add(listener);
  return () => {
    orderSnapshotListeners.delete(listener);
  };
}

function notifyOrderSnapshotChange(): void {
  for (const listener of [...orderSnapshotListeners]) {
    try {
      listener();
    } catch {
      /* 单个订阅者异常不得影响存储写入语义 */
    }
  }
}

export function saveOrderSnapshot(
  snapshot: RechargeOrderSnapshot,
  storage?: StorageLike | null
): void {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.setItem(RECHARGE_ORDER_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* 隐私模式/存储满：快照丢失降级为无状态 */
    return;
  }
  notifyOrderSnapshotChange();
}

/**
 * 快照最长存活时间。支付确认通常分钟级完成，2h 足够宽松；超龄快照一律
 * 丢弃并清理，防止损坏/陈旧的记录在刷新或路由切换后被反复轮询
 * （review：stale createdAt 不得参与轮询与到账判定）。
 */
export const ORDER_SNAPSHOT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const VALID_PHASES: readonly RechargeOrderPhase[] = [
  "idle",
  "creating",
  "awaiting_payment",
  "confirming",
  "credited",
  "failed",
  "cancelled",
  "delayed",
];

/** 快照 schema 严格校验：类型/取值不合法即视为损坏（跨版本残留、手改）。 */
export const isValidOrderSnapshot = (
  value: unknown
): value is RechargeOrderSnapshot => {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  if (
    typeof s.phase !== "string" ||
    !VALID_PHASES.includes(s.phase as RechargeOrderPhase)
  ) {
    return false;
  }
  if (typeof s.credits !== "number" || !Number.isFinite(s.credits)) return false;
  if (typeof s.method !== "string") return false;
  if (typeof s.createdAt !== "number" || !Number.isFinite(s.createdAt)) {
    return false;
  }
  if (s.checkoutUrl !== undefined && typeof s.checkoutUrl !== "string") {
    return false;
  }
  if (
    s.checkoutExpiresAt !== undefined &&
    (typeof s.checkoutExpiresAt !== "number" ||
      !Number.isFinite(s.checkoutExpiresAt))
  ) {
    return false;
  }
  if (
    s.balanceBaseline !== undefined &&
    (typeof s.balanceBaseline !== "number" ||
      !Number.isFinite(s.balanceBaseline))
  ) {
    return false;
  }
  return true;
};

export function readOrderSnapshot(
  storage?: StorageLike | null
): RechargeOrderSnapshot | null {
  const target = getStorage(storage);
  if (!target) return null;
  try {
    const raw = target.getItem(RECHARGE_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      !isValidOrderSnapshot(parsed) ||
      Date.now() - parsed.createdAt > ORDER_SNAPSHOT_MAX_AGE_MS
    ) {
      // 损坏或超龄：清理，避免被后续轮询/到账判定误用
      try {
        target.removeItem(RECHARGE_ORDER_STORAGE_KEY);
      } catch {
        /* noop */
      }
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function updateOrderSnapshot(
  patch: Partial<RechargeOrderSnapshot>,
  storage?: StorageLike | null
): RechargeOrderSnapshot | null {
  const current = readOrderSnapshot(storage);
  if (!current) return null;
  const next = { ...current, ...patch };
  saveOrderSnapshot(next, storage);
  return next;
}

export function clearOrderSnapshot(storage?: StorageLike | null): void {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.removeItem(RECHARGE_ORDER_STORAGE_KEY);
  } catch {
    /* noop */
  }
  notifyOrderSnapshotChange();
}

// ---------- 人工收款「我已完成转账」等待态（localStorage，刷新仍在） ----------

export const TRANSFER_WAITING_STORAGE_KEY = "rechargeTransferWaiting.v1";
/** 人工核对承诺上限：30 分钟 */
export const TRANSFER_WAITING_TIMEOUT_MS = 30 * 60 * 1000;

export interface TransferWaitingSnapshot {
  username: string;
  method: string;
  startedAt: number;
}

export function saveTransferWaiting(
  snapshot: TransferWaitingSnapshot,
  storage?: StorageLike | null
): void {
  const target =
    storage !== undefined
      ? storage
      : typeof window === "undefined"
        ? null
        : (() => {
            try {
              return window.localStorage;
            } catch {
              return null;
            }
          })();
  if (!target) return;
  try {
    target.setItem(TRANSFER_WAITING_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* noop */
  }
}

export function readTransferWaiting(
  storage?: StorageLike | null
): TransferWaitingSnapshot | null {
  const target =
    storage !== undefined
      ? storage
      : typeof window === "undefined"
        ? null
        : (() => {
            try {
              return window.localStorage;
            } catch {
              return null;
            }
          })();
  if (!target) return null;
  try {
    const raw = target.getItem(TRANSFER_WAITING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TransferWaitingSnapshot;
    if (!parsed || typeof parsed.startedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTransferWaiting(storage?: StorageLike | null): void {
  const target =
    storage !== undefined
      ? storage
      : typeof window === "undefined"
        ? null
        : (() => {
            try {
              return window.localStorage;
            } catch {
              return null;
            }
          })();
  if (!target) return;
  try {
    target.removeItem(TRANSFER_WAITING_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** 是否已超出人工核对的 30 分钟承诺（决定是否显示「联系客服」）。 */
export function isTransferWaitingExpired(
  snapshot: TransferWaitingSnapshot,
  now = Date.now()
): boolean {
  return now - snapshot.startedAt > TRANSFER_WAITING_TIMEOUT_MS;
}
