/**
 * 桌面端的账号级 settings 读取：**按 TTL 收敛到服务器**。
 *
 * 桌面端此前有两处（chrome connector 开关、systemBuiltinSkills 内置 skill
 * 开关）只用 `read(key, { remote: false })` 读本地副本——本地一旦有记录就永不
 * 刷新，用户在 Web 上改的账号级偏好在桌面端同样会永久陈旧。这与 CLI 侧的
 * bug 是同一个成因（CLI 侧已在 packages/cli/client/localRuntimeAdapter.ts 修好）。
 *
 * 语义（与 CLI 侧一致）：
 * - 远端可用且更新的记录 → 采用远端值（hybrid store 的 LWW：远端 updatedAt
 *   更新才替换本地，更旧则保留本地）；
 * - 远端不可用 → 回退本地副本，**不抛错、不清空偏好**；
 * - 远端读带专属预算 `timeoutMs = 3000`（默认 250ms < 实测往返 592–668ms，
 *   必然超时——这正是原始 bug 的成因）。
 *
 * 为什么用**进程内** TTL 而不是持久化同步标记（取舍说明）：
 * - 桌面端 runtime 是**单进程长驻**的，进程内标记就能把远端读上限压到
 *   「每 TTL 一次 / 每账号」，与 CLI 侧跨进程持久标记的上限等价；
 * - 桌面端的记录存储契约 `DesktopAgentRuntimeRecordStore` 只保证 `read`，
 *   `batch` 是可选的；要落持久标记就得扩契约并给「写不进去」再补一条退路，
 *   为一个纯优化引入新的失败模式不划算；
 * - 持久标记会在用户本地 LevelDB 里留下 `local-settings-sync-<userId>` 这条
 *   合成记录（桌面端的 db 迭代器能看到它），桌面端没有必要背这个副作用。
 * - 代价：桌面端重启后的第一轮会打一次远端读（预算 3000ms，失败即回退本地）。
 *
 * 纯函数（TTL 判定、标记构造）复用 `core/settingsSyncFreshness`，与 CLI 侧
 * 保持同一套常量与判定语义。
 */

import {
  SETTINGS_REFRESH_RETRY_MS,
  SETTINGS_REMOTE_MISS_RETRY_MS,
  SETTINGS_REMOTE_READ_TIMEOUT_MS,
  SETTINGS_SYNC_TTL_MS,
  isSettingsSyncDue,
} from "core/settingsSyncFreshness";
import { createUserKey } from "database/keys";

/**
 * 桌面端记录存储的读选项（与 hybrid store 对齐）。
 *
 * `timeoutMs` 是**按这一次调用**放宽远端预算；缺省时 hybrid store 走默认的
 * 250ms（对账号 settings 必然超时）。
 */
export type DesktopAccountSettingsReadOptions = {
  remote?: boolean;
  timeoutMs?: number;
  onRemoteUnavailable?: () => void;
};

/** 桌面端账号 settings 读取所需的最小存储契约（只要 read）。 */
export type DesktopAccountSettingsStore = {
  read(dbKey: string, options?: DesktopAccountSettingsReadOptions): Promise<unknown>;
};

type DesktopAccountSettingsSyncState = {
  /** 上次**成功**对齐服务器的时刻（毫秒）；null = 从未对齐过。 */
  syncedAt: number | null;
  /** 下一次允许尝试刷新（对齐）的时刻；远端失败后的退避。 */
  nextRefreshAttemptAt: number;
  /** 下一次允许尝试补拉（本地缺失）的时刻。 */
  nextMissingAttemptAt: number;
};

/**
 * 进程内同步状态（按账号）。
 *
 * 桌面端是长驻单进程，状态放进程内即可；进程重启即重新对齐一次。
 */
const syncStates = new Map<string, DesktopAccountSettingsSyncState>();

/** 仅供测试：清空进程内同步状态（避免用例之间互相影响）。 */
export function resetDesktopAccountSettingsSyncState(): void {
  syncStates.clear();
}

function resolveSyncState(userId: string): DesktopAccountSettingsSyncState {
  const existing = syncStates.get(userId);
  if (existing) return existing;
  const created: DesktopAccountSettingsSyncState = {
    syncedAt: null,
    nextRefreshAttemptAt: 0,
    nextMissingAttemptAt: 0,
  };
  syncStates.set(userId, created);
  return created;
}

function asSettingsRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * 远端读一次账号 settings。
 *
 * 返回 `available=false` 表示「远端不可用」（超时/网络错误/抛错）——此时
 * hybrid store 会把本地副本原样返回，调用方必须**继续用本地副本**。
 */
async function readRemoteAccountSettings(args: {
  store: DesktopAccountSettingsStore;
  settingsKey: string;
}): Promise<{ available: boolean; record: Record<string, unknown> | null }> {
  let unavailable = false;
  try {
    const record = await args.store.read(args.settingsKey, {
      remote: true,
      // 账号 settings 的远端读单独放宽预算：默认 250ms 必然超时
      // （实测服务器往返 592–668ms），不放宽就永远拿不到服务器真值。
      timeoutMs: SETTINGS_REMOTE_READ_TIMEOUT_MS,
      onRemoteUnavailable: () => {
        unavailable = true;
      },
    });
    return { available: !unavailable, record: asSettingsRecord(record) };
  } catch {
    // 远端读抛错 = 远端不可用：回退本地，不把异常抛给调用方。
    return { available: false, record: null };
  }
}

/**
 * 读取账号级 settings（带服务器收敛）。
 *
 * 收敛策略：本地副本 + 进程内 TTL（`SETTINGS_SYNC_TTL_MS`，60s）。TTL 窗口内只读本地、
 * 零网络；到期才向服务器对齐一次，远端不可用则回退本地副本（不抛错、不清空偏好）。
 * 桌面端是长驻单进程，所以用进程内状态而非持久标记——重启后从头计时。
 *
 * **已知代价（不要当成无代价）**：进程刚启动时 `syncedAt` 为空，**第一个** turn /
 * 第一次工具面过滤会同步等一次远端读，预算 `SETTINGS_REMOTE_READ_TIMEOUT_MS`（3000ms）。
 * 远端正常时约 0.6–0.7s（实测 RTT 592–668ms）；远端不可用时这一轮最坏阻塞约 3s，
 * 之后进入 60s 节流。这是新增的最坏路径，换取「账号级 skill 开关等在桌面端真的能生效」。
 * 后续若要再削这一下，可把首轮读改成 fire-and-forget 预热。
 *
 * @param args.userId 账号 id（settings key = `${userId}-settings`）
 * @param args.now    可注入的时钟（测试用）
 * @param args.warn   远端不可用时的告警回调（可选，一次性诊断用）
 */
export async function readDesktopAccountSettings(args: {
  store: DesktopAccountSettingsStore;
  userId: string;
  now?: () => number;
  warn?: (message: string) => void;
}): Promise<Record<string, unknown> | null> {
  const now = args.now ?? Date.now;
  const settingsKey = createUserKey.settings(args.userId);
  const state = resolveSyncState(args.userId);

  const localRecord = asSettingsRecord(
    await args.store.read(settingsKey, { remote: false }),
  );
  if (!localRecord) {
    // 本地没有副本：补拉一次远端（进程内节流，避免每轮都打网络）。
    if (now() < state.nextMissingAttemptAt) return null;
    state.nextMissingAttemptAt = now() + SETTINGS_REMOTE_MISS_RETRY_MS;
    const remote = await readRemoteAccountSettings({ store: args.store, settingsKey });
    if (!remote.available) {
      args.warn?.(
        "[desktop-runtime] Account settings unavailable; no local copy to fall back to.",
      );
      return null;
    }
    if (remote.record) {
      state.syncedAt = now();
    }
    return remote.record;
  }

  // 本地有副本：真值可能在服务器侧（用户在 Web 上改的）。
  // 是否该再问一次由「上次成功对齐的时刻」决定（进程内标记 + TTL），
  // 不用记录自己的 updatedAt——那反映的是本地写入时刻，不是对齐时刻。
  const marker = state.syncedAt === null ? null : { syncedAt: state.syncedAt };
  if (
    isSettingsSyncDue(marker, now(), SETTINGS_SYNC_TTL_MS) &&
    now() >= state.nextRefreshAttemptAt
  ) {
    state.nextRefreshAttemptAt = now() + SETTINGS_REFRESH_RETRY_MS;
    const remote = await readRemoteAccountSettings({ store: args.store, settingsKey });
    if (remote.available) {
      // 服务器应答了：远端更新则用远端，更旧则保留本地（hybrid store 的 LWW）。
      state.syncedAt = now();
      if (remote.record) return remote.record;
      return localRecord;
    }
    // 远端不可用：继续用本地副本，不抛错、不清空偏好。
    args.warn?.(
      "[desktop-runtime] Account settings unavailable; using the local copy, retrying on a later turn.",
    );
  }
  return localRecord;
}
