// 文件路径: app/pages/widgets/surfForecast.ts
// 冲浪 widget 的纯数据逻辑（无 DOM / 无组件）：数据源 A（Open-Meteo，前端直连）
// 的拉取与解析、明日三个时段的聚合、潮汐状态推导（由 SG 潮汐极值推导）、16 方位中文。
// 设计为纯函数 + 可注入依赖，便于独立单测；组件只负责调用与渲染。

import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";

/** 默认浪点（双月湾）。这是用户本地首次配置的默认值，不是全局数据真值。 */
export const SURF_SPOT = {
  name: "双月湾",
  latitude: 22.635455,
  longitude: 114.927943,
  /** 海滩法线方向（站在沙滩面向海面的朝向，度）。双月湾面东，可看日出 = 90°。 */
  beachOrientation: 90,
} as const;

/**
 * 单个浪点配置（名称 + 坐标 + 海滩朝向）。M1.1b 每个用户维护一个实例。
 * `beachOrientation`：海滩法线方向（0–360，面向海面看出去的方向，北=0/东=90/南=180/西=270）。
 */
export interface SurfSpotConfig {
  name: string;
  latitude: number;
  longitude: number;
  /** 0–360（360 归一为 0）。双月湾默认 90。 */
  beachOrientation: number;
}

/**
 * 归一化海滩朝向（0–360，360→0；NaN/null/空串/越界 → 回退双月湾默认 90，绝不抛错）。
 * 用于旧配置缺字段 / 损坏字段的安全回退。注意 Number(null)=0、Number("")=0，
 * 必须显式拒绝空值，避免把「缺省」误归一为 0。
 */
export function normalizeBeachOrientation(value: unknown): number {
  if (value === null || value === undefined || value === "") return SURF_SPOT.beachOrientation;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 360) return SURF_SPOT.beachOrientation;
  return ((n % 360) + 360) % 360; // 360 → 0
}

/** 名称非空、lat ∈ [-90,90]、lng ∈ [-180,180]、beachOrientation ∈ [0,360]。 */
export function validateSurfSpotConfig(cfg: {
  name: string;
  latitude: number;
  longitude: number;
  beachOrientation?: number;
}): boolean {
  const name = typeof cfg.name === "string" ? cfg.name.trim() : "";
  if (!name) return false;
  if (!Number.isFinite(cfg.latitude) || cfg.latitude < -90 || cfg.latitude > 90) return false;
  if (!Number.isFinite(cfg.longitude) || cfg.longitude < -180 || cfg.longitude > 180) return false;
  if (
    cfg.beachOrientation != null &&
    (!Number.isFinite(cfg.beachOrientation) || cfg.beachOrientation < 0 || cfg.beachOrientation > 360)
  ) {
    return false;
  }
  return true;
}

/**
 * 把任意未知来源（localStorage 解析结果）安全归一化为合法 SurfSpotConfig。
 * 形状错误 / 校验不过 / 无法解析一律回退默认双月湾，绝不抛错。
 * 兼容策略（v1 配置缺字段）：旧 v1 配置没有 beachOrientation → 保留 name/coords，
 * 仅把朝向回退为默认 90（双月湾）；损坏的朝向字段同样回退 90 但保留其余字段。
 */
export function parseSurfSpotConfig(raw: unknown): SurfSpotConfig {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const candidate: SurfSpotConfig = {
      name: typeof o.name === "string" ? o.name : "",
      latitude: Number(o.latitude),
      longitude: Number(o.longitude),
      // 旧 v1 配置缺字段 / 损坏字段 → 归一化为合法朝向（默认 90）。
      beachOrientation: normalizeBeachOrientation(o.beachOrientation),
    };
    if (validateSurfSpotConfig(candidate)) return candidate;
  }
  return {
    name: SURF_SPOT.name,
    latitude: SURF_SPOT.latitude,
    longitude: SURF_SPOT.longitude,
    beachOrientation: SURF_SPOT.beachOrientation,
  };
}

/** 展示与时区聚合统一用 Asia/Shanghai。 */
export const SURF_TIMEZONE = "Asia/Shanghai";

/** 明日三时段（Asia/Shanghai 本地时）。 */
export interface SurfPeriod {
  key: "morning" | "midday" | "dusk";
  labelKey: string;
  startHour: number; // 含
  endHour: number; // 不含
}

export const SURF_PERIODS: SurfPeriod[] = [
  { key: "morning", labelKey: "widgets.surf.period.morning", startHour: 6, endHour: 11 },
  { key: "midday", labelKey: "widgets.surf.period.midday", startHour: 11, endHour: 17 },
  { key: "dusk", labelKey: "widgets.surf.period.dusk", startHour: 17, endHour: 21 },
];

/** 16 方位中文（中国气象口径：北/东北偏北/东北/东北偏东/…）。 */
const DIRECTION_16 = [
  "北",
  "东北偏北",
  "东北",
  "东北偏东",
  "东",
  "东南偏东",
  "东南",
  "东南偏南",
  "南",
  "西南偏南",
  "西南",
  "西南偏西",
  "西",
  "西北偏西",
  "西北",
  "西北偏北",
] as const;

/** 角度 → 16 方位中文；非法输入返回 null。 */
export function directionLabel(deg: number | null | undefined): string | null {
  if (deg == null || Number.isNaN(deg)) return null;
  const normalized = ((deg % 360) + 360) % 360;
  return DIRECTION_16[Math.round(normalized / 22.5) % 16];
}

// ---- 风向-海滩朝向相对关系（M1.1c） ----

/** 结构化风向关系。labelKey 供 i18n（无资源时组件用中文 fallback）。 */
export interface WindRelation {
  kind: "onshore" | "offshore" | "cross-shore-left" | "cross-shore-right" | "unknown";
  labelKey: string;
  /** 风向与海滩法线的夹角（0–180 度，越小越接近向岸/离岸轴向）。 */
  angleDifference: number | null;
}

/** 风向-朝向夹角（0–180）的向岸/离岸分类阈值（±45°）。 */
export const WIND_ONSHORE_OFFSHORE_HALF_ANGLE = 45;

/**
 * 由「海滩朝向 + 气象风向（风从哪里来）」推导结构化相对关系。
 * 方向语义：`beachOrientation` 是海滩法线/面向海方向；`windFromDegrees` 是风的来向。
 * - 风向接近朝向（≤±45°）→ onshore / 向岸风；
 * - 接近朝向反方向 → offshore / 离岸风；
 * - 其余按面向海的左右半平面：来向在朝向左侧 → cross-shore-left，右侧 → cross-shore-right。
 *   （对东向海滩：北风来自左侧 → left；南风来自右侧 → right。）
 * NaN / null / 非法角度 → unknown（不伪造事实）。
 */
export function classifyWindRelation(
  beachOrientation: number | null | undefined,
  windFromDegrees: number | null | undefined
): WindRelation {
  if (
    beachOrientation == null ||
    windFromDegrees == null ||
    Number.isNaN(beachOrientation) ||
    Number.isNaN(windFromDegrees) ||
    !Number.isFinite(beachOrientation) ||
    !Number.isFinite(windFromDegrees)
  ) {
    return {
      kind: "unknown",
      labelKey: "widgets.surf.wind.relation.unknown",
      angleDifference: null,
    };
  }

  const orient = ((beachOrientation % 360) + 360) % 360;
  const wind = ((windFromDegrees % 360) + 360) % 360;
  // 风向绕朝向的相对角位移，映射到 [-180, 180)：
  // 0 = 正对向岸轴向，+90 = 风从朝向右侧来，-90 = 风从朝向左侧来。
  let delta = ((wind - orient + 540) % 360) - 180;
  const angleDifference = Math.abs(delta); // 0–180

  const half = WIND_ONSHORE_OFFSHORE_HALF_ANGLE;
  if (angleDifference <= half) {
    return { kind: "onshore", labelKey: "widgets.surf.wind.relation.onshore", angleDifference };
  }
  if (angleDifference >= 180 - half) {
    return { kind: "offshore", labelKey: "widgets.surf.wind.relation.offshore", angleDifference };
  }
  // 侧风：delta 符号决定左/右半平面。
  if (delta < 0) {
    return { kind: "cross-shore-left", labelKey: "widgets.surf.wind.relation.crossLeft", angleDifference };
  }
  return { kind: "cross-shore-right", labelKey: "widgets.surf.wind.relation.crossRight", angleDifference };
}

/** Open-Meteo hourly 原始载荷（两套 API 共用形状）。 */
export interface RawHourly {
  time?: string[];
  wave_height?: number[];
  wave_period?: number[];
  wave_direction?: number[];
  swell_wave_height?: number[];
  swell_wave_period?: number[];
  swell_wave_direction?: number[];
  wind_speed_10m?: number[];
  wind_gusts_10m?: number[];
  wind_direction_10m?: number[];
}

/** SG 潮汐极值（服务端代理已归一化）。 */
export interface TideExtreme {
  time: number; // epoch ms
  type: "high" | "low";
  height: number; // m
}

export type TideState = "rising" | "falling" | "slack" | null; // null = 暂无数据

export interface SurfPeriodAggregate {
  periodKey: SurfPeriod["key"];
  waveHeight: number | null; // m（该时段均值）
  swellPeriod: number | null; // s（涌浪周期均值）
  swellDirection: string | null; // 16 方位中文（涌向）
  windSpeed: number | null; // km/h（均值，OM 默认单位）
  windGust: number | null; // km/h（阵风均值）
  windDirection: string | null; // 16 方位中文（风向）
  /** 风向与海滩朝向的相对关系（结构化，M1.1c）。 */
  windRelation: WindRelation;
  tideState: TideState;
}

export interface SurfDayProfile {
  dateKey: string; // yyyy-MM-dd（Asia/Shanghai）
  spotName: string;
  /** 本次数据获取时间（epoch ms）。缓存恢复时保留，用于展示「数据更新于 HH:mm」。 */
  fetchedAt: number;
  periods: SurfPeriodAggregate[];
  tideExtremes: TideExtreme[];
}

// ---- 日期 / 时区工具 ----

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 将 epoch ms 格式化为指定时区的日期键 yyyy-MM-dd。 */
export function dateKeyInZone(ms: number, timeZone = SURF_TIMEZONE): string {
  return formatInTimeZone(ms, timeZone, "yyyy-MM-dd");
}

/** Asia/Shanghai 的「明天」日期键。上海无 DST，+24h 即下一自然日。 */
export function tomorrowDateKey(nowMs: number): string {
  return dateKeyInZone(nowMs + 24 * 3600 * 1000, SURF_TIMEZONE);
}

/** 指定时区的小时（0-23）。 */
export function hourInZone(ms: number, timeZone = SURF_TIMEZONE): number {
  return Number(formatInTimeZone(ms, timeZone, "H"));
}

/** 日期键加 N 天。 */
export function addDaysDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/**
 * 日期键（SURF_TIMEZONE 的 yyyy-MM-dd）→ 该日 00:00 的 UTC ISO。
 * 复用 SURF_TIMEZONE 单一真值（不再硬编码 +08:00）；Asia/Shanghai 无 DST，
 * 用 date-fns-tz 的 zonedTimeToUtc 正确构造该时区日期起点。
 */
export function dateKeyToUtcIso(dateKey: string): string {
  return zonedTimeToUtc(`${dateKey}T00:00:00`, SURF_TIMEZONE).toISOString();
}

/** SG 潮汐代理窗口：覆盖目标日期全天（含前后边界极值），1 次请求。 */
export function tideWindowFor(dateKey: string): { start: string; end: string } {
  return {
    start: dateKeyToUtcIso(dateKey),
    end: dateKeyToUtcIso(addDaysDateKey(dateKey, 1)),
  };
}

// ---- 聚合 ----

function average(values: number[]): number | null {
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (v != null && Number.isFinite(v)) {
      sum += v;
      n += 1;
    }
  }
  return n ? sum / n : null;
}

function circularMeanDeg(values: number[]): number | null {
  const finite = values.filter((v) => v != null && Number.isFinite(v));
  if (!finite.length) return null;
  let s = 0;
  let c = 0;
  for (const v of finite) {
    const r = (v * Math.PI) / 180;
    s += Math.sin(r);
    c += Math.cos(r);
  }
  const mean = (Math.atan2(s / finite.length, c / finite.length) * 180) / Math.PI;
  return (mean + 360) % 360;
}

function pickByIndex<T>(arr: T[] | undefined, indices: number[]): T[] {
  if (!arr) return [];
  const out: T[] = [];
  for (const i of indices) {
    if (i >= 0 && i < arr.length) out.push(arr[i]);
  }
  return out;
}

/** 收集落在「目标日期 + 时段」内的 hourly 下标。 */
function collectIndices(
  timeArr: string[] | undefined,
  dateKey: string,
  startHour: number,
  endHour: number
): number[] {
  if (!timeArr) return [];
  const idx: number[] = [];
  for (let i = 0; i < timeArr.length; i += 1) {
    const ms = Date.parse(timeArr[i]);
    if (Number.isNaN(ms)) continue;
    if (dateKeyInZone(ms, SURF_TIMEZONE) !== dateKey) continue;
    const h = hourInZone(ms, SURF_TIMEZONE);
    if (h >= startHour && h < endHour) idx.push(i);
  }
  return idx;
}

/** 取时段内中位时间点（用于推导该时段潮汐状态）。 */
function medianTimeMs(timeArr: string[] | undefined, indices: number[]): number | null {
  if (!timeArr || !indices.length) return null;
  const times = pickByIndex(timeArr, indices)
    .map((s) => Date.parse(s))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  if (!times.length) return null;
  return times[Math.floor(times.length / 2)];
}

/** 由 SG 潮汐极值推导某时刻的潮汐状态（涨/落/平潮）。 */
const SLACK_MS = 45 * 60 * 1000; // 距极值 45 分钟内视为平潮
export function tideStateAt(targetMs: number, extremes: TideExtreme[]): TideState {
  if (!extremes.length) return null;
  const sorted = [...extremes].sort((a, b) => a.time - b.time);
  let prev: TideExtreme | null = null;
  let next: TideExtreme | null = null;
  for (const e of sorted) {
    if (e.time <= targetMs) prev = e;
    if (e.time > targetMs) {
      next = e;
      break;
    }
  }
  if (prev && Math.abs(targetMs - prev.time) <= SLACK_MS) return "slack";
  if (next && Math.abs(next.time - targetMs) <= SLACK_MS) return "slack";
  if (prev && next) return prev.type === "low" ? "rising" : "falling";
  if (prev) return prev.type === "high" ? "falling" : "rising";
  if (next) return next.type === "high" ? "rising" : "falling";
  return null;
}

function aggregatePeriod(
  period: SurfPeriod,
  dateKey: string,
  marine: RawHourly,
  wind: RawHourly,
  beachOrientation: number
): SurfPeriodAggregate {
  const idx = collectIndices(marine.time, dateKey, period.startHour, period.endHour);
  const windIdx = collectIndices(wind.time, dateKey, period.startHour, period.endHour);

  // 涌向优先用 swell_wave_direction，缺失时退回 wave_direction。
  const swellDirDeg =
    circularMeanDeg(pickByIndex(marine.swell_wave_direction, idx)) ??
    circularMeanDeg(pickByIndex(marine.wave_direction, idx));

  const waveHeight = average(pickByIndex(marine.swell_wave_height, idx).map(Number)) ??
    average(pickByIndex(marine.wave_height, idx).map(Number));
  const swellPeriod =
    average(pickByIndex(marine.swell_wave_period, idx).map(Number)) ??
    average(pickByIndex(marine.wave_period, idx).map(Number));
  const windSpeed = average(pickByIndex(wind.wind_speed_10m, windIdx).map(Number));
  const windGust = average(pickByIndex(wind.wind_gusts_10m, windIdx).map(Number));
  const windDirDeg = circularMeanDeg(pickByIndex(wind.wind_direction_10m, windIdx).map(Number));

  return {
    periodKey: period.key,
    waveHeight,
    swellPeriod,
    swellDirection: directionLabel(swellDirDeg),
    windSpeed,
    windGust,
    windDirection: directionLabel(windDirDeg),
    windRelation: classifyWindRelation(beachOrientation, windDirDeg),
    tideState: null, // 由 buildDayProfile 统一填
  };
}

/** 组合 marine + wind + 潮汐极值 → 明日 day profile。 */
export function buildDayProfile(params: {
  dateKey: string;
  marine: RawHourly;
  wind: RawHourly;
  extremes: TideExtreme[];
  /** 浪点名称，缺省用默认双月湾。 */
  spotName?: string;
  /** 海滩朝向（度），缺省用默认双月湾 90。传入配置时由调用方从 spot 取。 */
  beachOrientation?: number;
  /** 本次数据获取时间（epoch ms），缺省用当前时间。 */
  fetchedAt?: number;
}): SurfDayProfile {
  const orientation = params.beachOrientation ?? SURF_SPOT.beachOrientation;
  const periods = SURF_PERIODS.map((p) =>
    aggregatePeriod(p, params.dateKey, params.marine, params.wind, orientation)
  );
  // 潮汐状态：每个时段取其中位时刻推导。
  for (const p of periods) {
    const periodDef = SURF_PERIODS.find((sp) => sp.key === p.periodKey)!;
    const idx = collectIndices(params.marine.time, params.dateKey, periodDef.startHour, periodDef.endHour);
    const midMs = medianTimeMs(params.marine.time, idx);
    p.tideState = midMs == null ? null : tideStateAt(midMs, params.extremes);
  }
  return {
    dateKey: params.dateKey,
    spotName: params.spotName ?? SURF_SPOT.name,
    fetchedAt: params.fetchedAt ?? Date.now(),
    periods,
    tideExtremes: params.extremes,
  };
}

// ---- 数据源 A：Open-Meteo 前端直连（免费无 key） ----

const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function fetchMarine(lat: number, lng: number, fetchImpl: typeof fetch = fetch): Promise<RawHourly> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly:
      "wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction",
    timezone: "Asia/Shanghai",
    forecast_days: "3",
  });
  const res = await fetchImpl(`${MARINE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`marine http ${res.status}`);
  const payload = await res.json();
  return (payload?.hourly ?? {}) as RawHourly;
}

export async function fetchWind(lat: number, lng: number, fetchImpl: typeof fetch = fetch): Promise<RawHourly> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: "wind_speed_10m,wind_gusts_10m,wind_direction_10m",
    timezone: "Asia/Shanghai",
    forecast_days: "3",
  });
  const res = await fetchImpl(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`wind http ${res.status}`);
  const payload = await res.json();
  return (payload?.hourly ?? {}) as RawHourly;
}

// ---- 数据源 B：SG 潮汐，经服务端代理（key 不进前端） ----

export interface TideProxyDeps {
  server: string;
  token: string | null;
}

/** 调服务端代理拉 SG 潮汐极值；失败 / 无 key 降级时返回 null。 */
export async function fetchTideViaProxy(
  deps: TideProxyDeps,
  spot: { latitude: number; longitude: number },
  dateKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<TideExtreme[] | null> {
  if (!deps.server) return null;
  const base = deps.server.replace(/\/+$/, "");
  const window = tideWindowFor(dateKey);
  const query = new URLSearchParams({
    lat: String(spot.latitude),
    lng: String(spot.longitude),
    start: window.start,
    end: window.end,
    date: dateKey,
  });
  const res = await fetchImpl(`${base}/api/v1/surf/tide?${query.toString()}`, {
    method: "GET",
    headers: deps.token ? { Authorization: `Bearer ${deps.token}` } : {},
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  if (!payload || payload.ok !== true || payload.degraded === true || !Array.isArray(payload.data)) {
    return null;
  }
  return payload.data
    .map((d: { time: string; type: string; height: number }) => ({
      time: Date.parse(d.time),
      type: d.type === "low" ? ("low" as const) : ("high" as const),
      height: d.height,
    }))
    .filter((d: TideExtreme) => !Number.isNaN(d.time));
}

/** 潮汐状态的 i18n key。 */
export function tideStateLabelKey(state: TideState): string {
  switch (state) {
    case "rising":
      return "widgets.surf.tide.rising";
    case "falling":
      return "widgets.surf.tide.falling";
    case "slack":
      return "widgets.surf.tide.slack";
    default:
      return "widgets.surf.tide.na";
  }
}

// ---- M1.1d-a：数据更新时间展示 ----

/**
 * 把数据获取时间格式化为 SURF_TIMEZONE 的 HH:mm（用于「数据更新于 HH:mm」）。
 * 非法/缺失输入返回 null（UI 显示「—」），绝不抛错。
 */
export function formatFetchedAt(ms: number | null | undefined): string | null {
  if (ms == null || Number.isNaN(ms)) return null;
  return formatInTimeZone(ms, SURF_TIMEZONE, "HH:mm");
}

// ---- M1.1d-a：规则型推荐时段（纯函数，非 AI / 非评分模型） ----

/**
 * 推荐时段（晨/午/暮）。规则透明、可解释，仅基于已有三时段 profile 的
 * 浪高 / 涌浪周期 / 风向关系 / 风速 / 阵风，不引入任何 AI 或个性化偏好。
 *
 * 规则（按优先级，命中即返回）：
 *  1. 数据不足：若某时段缺 waveHeight 或 swellPeriod（任一为 null），该时段
 *     不参与推荐；若所有时段都缺 → 返回 null（「暂无可靠推荐」）。
 *  2. 离岸风加分：windRelation.kind === "offshore" 的时段直接胜出（离岸风最利于
 *     浪面平整）。多个离岸时段取浪高更高者。
 *  3. 向岸风减分：windRelation.kind === "onshore" 的时段被排除（向岸风破坏浪面）。
 *     unknown / cross-shore 不加分也不减分。
 *  4. 兜底：在剩余候选里选「浪高 × 涌浪周期」乘积最大者（兼顾浪高与能量）。
 *     若候选为空（全部向岸或全部数据不足）→ 返回 null。
 *
 * 说明：windSpeed / windGust 作为参考，仅在候选间浪高×周期接近时用于打破平局
 * （风速/阵风更小者更优）；不单独作为否决条件。
 */
export function recommendPeriod(profile: Pick<SurfDayProfile, "periods">): SurfPeriod["key"] | null {
  const candidates = profile.periods.filter(
    (p) => p.waveHeight != null && p.swellPeriod != null
  );
  if (!candidates.length) return null;

  // 规则 2：离岸风直接胜出（多个取浪高更高者）。
  const offshore = candidates.filter((p) => p.windRelation.kind === "offshore");
  if (offshore.length) {
    return offshore.sort((a, b) => (b.waveHeight ?? 0) - (a.waveHeight ?? 0))[0].periodKey;
  }

  // 规则 3：排除向岸风。
  const viable = candidates.filter((p) => p.windRelation.kind !== "onshore");
  if (!viable.length) return null;

  // 规则 4：浪高 × 涌浪周期 最大者；接近时风速/阵风更小者更优。
  const scored = viable.map((p) => {
    const energy = (p.waveHeight ?? 0) * (p.swellPeriod ?? 0);
    const windPenalty = (p.windSpeed ?? 0) + (p.windGust ?? 0) * 0.5;
    return { p, energy, windPenalty };
  });
  scored.sort((a, b) => {
    const d = b.energy - a.energy;
    if (Math.abs(d) > 1e-9) return d;
    return a.windPenalty - b.windPenalty;
  });
  return scored[0].p.periodKey;
}
