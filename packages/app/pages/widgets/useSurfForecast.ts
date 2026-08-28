// 文件路径: app/pages/widgets/useSurfForecast.ts
// 冲浪 widget 数据获取 hook：缓存优先、按天刷新、两数据源并行、降级兜底。
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSessionSnapshot } from "app/sessionSnapshot";
import {
  buildDayProfile,
  fetchMarine,
  fetchTideViaProxy,
  fetchWind,
  tomorrowDateKey,
  type RawHourly,
  type SurfDayProfile,
  type SurfSpotConfig,
} from "./surfForecast";
import { readSurfSpotConfig } from "./surfSpotConfig";

// 当日缓存 key：按（日期 + 浪点坐标/名称 + 海滩朝向）隔离，不同地点/朝向不串缓存。
// 原始数据（浪/涌/风）只依赖坐标，不依赖朝向；但 day profile 内烘焙了
// windRelation（风向-朝向相对关系），朝向变化必须重建 profile，故 key 纳入朝向，
// 确保缓存命中即反映最新朝向。
const cacheKey = (dateKey: string, spot: SurfSpotConfig): string =>
  `surf-forecast-cache-${spot.latitude.toFixed(5)}-${spot.longitude.toFixed(5)}-${spot.name}-${spot.beachOrientation}-${dateKey}`;

const CACHE_TTL_MS = 24 * 3600 * 1000;

interface CacheEntry {
  cachedAt: number;
  profile: SurfDayProfile;
}

function readCache(dateKey: string, spot: SurfSpotConfig): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(dateKey, spot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || !parsed.profile || !Array.isArray(parsed.profile.periods)) return null;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(dateKey: string, spot: SurfSpotConfig, profile: SurfDayProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      cacheKey(dateKey, spot),
      JSON.stringify({ cachedAt: Date.now(), profile } satisfies CacheEntry)
    );
  } catch { /* storage full / unavailable */ }
}

export type SurfLoadState = "loading" | "ready" | "error";

export interface SurfForecastResult {
  state: SurfLoadState;
  profile: SurfDayProfile | null;
  tideUnavailable: boolean; // 无 SG 潮汐数据（未配 key / 降级）
  refresh: () => void;
}

export function useSurfForecast(spot?: SurfSpotConfig): SurfForecastResult {
  const { server, token, userId } = useSessionSnapshot();
  const [profile, setProfile] = useState<SurfDayProfile | null>(null);
  const [state, setState] = useState<SurfLoadState>("loading");
  const [tideUnavailable, setTideUnavailable] = useState(false);
  const [tick, setTick] = useState(0);

  // 生效的浪点配置：组件传入优先，缺省用当前用户已存配置（未存则默认双月湾）。
  const activeSpot = spot ?? useStoredSurfSpot(userId);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!activeSpot) return;
    let cancelled = false;
    (async () => {
      const dateKey = tomorrowDateKey(Date.now());
      const cached = readCache(dateKey, activeSpot);
      if (cached) {
        if (!cancelled) {
          setProfile(cached.profile);
          setState("ready");
        }
        return;
      }
      if (!cancelled) setState("loading");
      // 独立数据源降级（M1.1d-a）：marine / wind 任一失败不再整卡 error。
      // 分别捕获，缺失源用空 RawHourly 兜底（profile 允许空对象，字段显示「—/数据不足」）。
      // 只有两个 OM 核心源都「实际抛错失败」且无缓存 profile 才进入 error；
      // 空但成功的响应（HTTP 200 但无数据）视为降级成功，不触发 error。
      let marineFailed = false;
      let windFailed = false;
      const [marine, wind, extremes] = await Promise.all([
        fetchMarine(activeSpot.latitude, activeSpot.longitude).catch(() => {
          marineFailed = true;
          return {} as RawHourly;
        }),
        fetchWind(activeSpot.latitude, activeSpot.longitude).catch(() => {
          windFailed = true;
          return {} as RawHourly;
        }),
        fetchTideViaProxy({ server, token }, activeSpot, dateKey).catch(() => null),
      ]);
      if (marineFailed && windFailed) {
        if (!cancelled) setState("error");
        return;
      }
      const next = buildDayProfile({
        dateKey,
        marine,
        wind,
        extremes: extremes ?? [],
        spotName: activeSpot.name,
        beachOrientation: activeSpot.beachOrientation,
      });
      writeCache(dateKey, activeSpot, next);
      if (!cancelled) {
        setProfile(next);
        setTideUnavailable(extremes === null || extremes.length === 0);
        setState("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
    // server/token/refresh/activeSpot 变化时重新拉取（缓存仍优先）。
  }, [server, token, tick, activeSpot]);

  return { state, profile, tideUnavailable, refresh };
}

/** 读取当前用户已存的浪点配置（未配置回退默认双月湾）；userId 变化时重新读取。 */
function useStoredSurfSpot(userId: string | null | undefined): SurfSpotConfig {
  return useMemo(() => readSurfSpotConfig(userId), [userId]);
}
