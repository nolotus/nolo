import {
  PERMISSION_GRANT_KINDS,
  permissionGrantList,
  saveProfilePermissionGrant,
  type PermissionGrantKind,
  type PermissionGrants,
} from "../client/profileConfig";

/**
 * 「批准一次即记住」的唯一落地点：把一类确认记进 state 并写盘。
 *
 * 两个桶（local / remote）各自独立，见 PermissionGrants。这里只负责
 * 「开启 + 持久化」，撤销走 /auto … off、/auto reset 与 /shell-revoke，
 * 它们复用 `persistPermissionGrantChanges` 做同样的差异写盘。
 *
 * 写盘失败只提示、不撤销本次放行——用户点的是「批准」，配置只读不该把它
 * 变成拒绝；此时授权仅在本次会话有效。
 */
export function createPermissionGrantEnabler(
  kind: PermissionGrantKind,
  deps: {
    getGrants: () => PermissionGrants | undefined;
    setGrants: (next: PermissionGrants) => void;
    scheduleRender: () => void;
    onPersistFailed: () => void;
  }
): () => void {
  return () => {
    deps.setGrants({ ...(deps.getGrants() ?? {}), [kind]: true });
    let saved: unknown = null;
    try {
      saved = saveProfilePermissionGrant(kind, true);
    } catch {
      saved = null;
    }
    deps.scheduleRender();
    if (!saved) deps.onPersistFailed();
  };
}

/**
 * 把 before → after 的桶差异逐项写盘（`/auto` 各子命令共用，busy / 空闲
 * 两条路径同一份实现）。返回 false 表示至少一次写盘失败——调用方据此给出
 * 「仅本次会话有效」的提示。只写真正翻转的桶，避免每条命令重写配置。
 */
export function persistPermissionGrantChanges(
  before: PermissionGrants | undefined,
  after: PermissionGrants | undefined
): boolean {
  const changed = PERMISSION_GRANT_KINDS.filter(
    (kind) => (before?.[kind] === true) !== (after?.[kind] === true)
  );
  let allSaved = true;
  for (const kind of changed) {
    let saved: unknown = null;
    try {
      saved = saveProfilePermissionGrant(kind, after?.[kind] === true);
    } catch {
      saved = null;
    }
    if (!saved) allSaved = false;
  }
  return allSaved;
}

/** 已授权桶的展示串（`/auto` 无参与启动提示共用）。 */
export function describePermissionGrants(grants: PermissionGrants | undefined): PermissionGrantKind[] {
  return permissionGrantList(grants);
}

/** Ignore a stale dialog approval if its authorization bucket changed while open. */
export function createSnapshotGuardedApproval(
  kind: PermissionGrantKind,
  getGrants: () => PermissionGrants | undefined,
  approve: () => void
): () => void {
  const snapshot = getGrants()?.[kind] === true;
  return () => {
    if ((getGrants()?.[kind] === true) !== snapshot) return;
    approve();
  };
}
