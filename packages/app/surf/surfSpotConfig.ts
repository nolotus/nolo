// 冲浪 widget 的个人浪点配置存储（M1.1b）。
//
// 事实：
// - 每个用户维护一个浪点实例（不做多浪点/多实例）。
// - 首次使用没有配置 → 返回默认双月湾（本地首次配置默认值，非全局数据真值）。
// - 持久化到 localStorage，key 独立且版本化（v1）。
// - owner 隔离：localStorage 是浏览器级共享存储，当前前端登录态切换用户时
//   不能串用另一个用户的浪点。sessionSnapshot 提供 userId，优先以 userId 作为
//   owner 维度拼 key；当 userId 不可用（未挂快照桥 / 登录前 / 测试未提供）时，
//   回退到「无 owner」的版本化 key。该回退在「同一浏览器内多账号并存」场景
//   不保证隔离——这是本轮的明确限制，不做服务端账号/数据库。
import {
  readStorageJSON,
  writeStorageJSON,
} from "app/utils/localStorageState";
import {
  SURF_SPOT,
  parseSurfSpotConfig,
  type SurfSpotConfig,
} from "./surfForecast";

/** 配置 key 版本号：结构或默认值变更时递增（v1 冻结，新增字段应升 v2）。 */
const CONFIG_KEY_VERSION = "v1";
const CONFIG_KEY_PREFIX = "surf-spot-config";

/** 未登录/无 userId 时的回退 key（版本化但无 owner 维度）。 */
const FALLBACK_KEY = `${CONFIG_KEY_PREFIX}-${CONFIG_KEY_VERSION}`;

/** 带 owner（userId）维度的 key。userId 空/缺失时回退 FALLBACK_KEY。 */
export function surfSpotConfigKey(userId: string | null | undefined): string {
  if (!userId) return FALLBACK_KEY;
  const safe = userId.replace(/[^A-Za-z0-9._-]/g, "_");
  return `${CONFIG_KEY_PREFIX}-${CONFIG_KEY_VERSION}-${safe}`;
}

/** 读取当前用户的浪点配置；无配置或损坏一律回退默认双月湾，不抛错。 */
export function readSurfSpotConfig(userId: string | null | undefined): SurfSpotConfig {
  const raw = readStorageJSON<unknown>(surfSpotConfigKey(userId));
  if (raw == null) {
    // 首次配置：返回默认双月湾，但不写回（保持「未配置」状态，直到用户保存）。
    return {
      name: SURF_SPOT.name,
      latitude: SURF_SPOT.latitude,
      longitude: SURF_SPOT.longitude,
      beachOrientation: SURF_SPOT.beachOrientation,
    };
  }
  return parseSurfSpotConfig(raw);
}

/** 保存当前用户的浪点配置。仅写入合法配置。 */
export function writeSurfSpotConfig(
  userId: string | null | undefined,
  cfg: SurfSpotConfig
): void {
  writeStorageJSON(surfSpotConfigKey(userId), cfg);
}
