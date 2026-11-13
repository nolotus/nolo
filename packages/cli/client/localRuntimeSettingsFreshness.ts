/**
 * 账号级 settings 的**同步标记**（持久化在本地库里的一条独立记录）。
 *
 * 为什么不用记录自己的 updatedAt 判断新鲜度：本地记录的 updatedAt 反映的是
 * 「这条记录什么时候被写进本地」，不是「上次跟服务器对齐的时刻」。实测事故
 * 数据就是反例——本地 updatedAt 比服务器新约 21 小时，却是一份很旧的副本。
 * 拿它跟当前时间比会把旧副本判成新鲜；拿它跟服务器 updatedAt 比又必须先把
 * 远端拉下来才比得了，绕不开那次网络请求。
 *
 * 因此单独记一条「上次成功对齐服务器的时刻」，用 TTL 判定是否该再问一次。
 * 标记必须落库：CLI 每次 run 可能是独立进程，进程内变量不能当标记。
 *
 * 实现归属（收敛后）：TTL 判定、标记时间戳解析、标记记录构造、记录时间戳
 * 口径与 LWW 赢家判定**只在 `core/settingsSyncFreshness` 实现一份**，本文件
 * 从那里 re-export，不再保留副本（避免两侧口径漂移）。
 *
 * 本文件 CLI 侧独有的只剩「同步标记的本地 key 构造」——它是 CLI 本地专用的
 * key（不写服务器）。网络与存储由调用方（localRuntimeAdapter）负责。
 */

export {
  SETTINGS_REFRESH_RETRY_MS,
  SETTINGS_REMOTE_MISS_RETRY_MS,
  SETTINGS_REMOTE_READ_TIMEOUT_MS,
  SETTINGS_SYNC_TTL_MS,
  buildSettingsSyncMarkerRecord,
  didRemoteSettingsWinRefresh,
  isSettingsSyncDue,
  resolveSettingsRecordTimestamp,
  resolveSettingsSyncMarkerTimestamp,
} from "core/settingsSyncFreshness";

/** 同步标记的本地 key（CLI 本地专用，不写服务器）。 */
export function buildSettingsSyncMarkerKey(userId: string): string {
  return `local-settings-sync-${userId}`;
}
