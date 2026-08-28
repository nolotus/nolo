import { describe, expect, it } from "bun:test";
import { zonedTimeToUtc } from "date-fns-tz";
import {
  SURF_PERIODS,
  SURF_SPOT,
  SURF_TIMEZONE,
  addDaysDateKey,
  buildDayProfile,
  classifyWindRelation,
  dateKeyInZone,
  dateKeyToUtcIso,
  directionLabel,
  fetchMarine,
  fetchWind,
  formatFetchedAt,
  normalizeBeachOrientation,
  parseSurfSpotConfig,
  recommendPeriod,
  tideStateAt,
  tideWindowFor,
  tomorrowDateKey,
  validateSurfSpotConfig,
  type RawHourly,
  type SurfPeriodAggregate,
  type TideExtreme,
} from "./surfForecast";

describe("surf directionLabel (16 方位中文)", () => {
  it("maps angles to Chinese 16-point labels", () => {
    expect(directionLabel(0)).toBe("北");
    expect(directionLabel(180)).toBe("南");
    expect(directionLabel(90)).toBe("东");
    expect(directionLabel(270)).toBe("西");
    expect(directionLabel(202.5)).toBe("西南偏南");
    expect(directionLabel(350)).toBe("北");
  });

  it("handles null/NaN", () => {
    expect(directionLabel(null)).toBeNull();
    expect(directionLabel(undefined)).toBeNull();
    expect(directionLabel(Number.NaN)).toBeNull();
  });
});

describe("surf wind-relation classification (M1.1c)", () => {
  // 双月湾面东，beachOrientation=90。风向按「风从哪里来」。
  it("east-facing (90°) maps cardinal winds: E=onshore W=offshore N=left S=right", () => {
    expect(classifyWindRelation(90, 90).kind).toBe("onshore"); // 东风 → 向岸
    expect(classifyWindRelation(90, 270).kind).toBe("offshore"); // 西风 → 离岸
    expect(classifyWindRelation(90, 0).kind).toBe("cross-shore-left"); // 北风 → 左侧
    expect(classifyWindRelation(90, 180).kind).toBe("cross-shore-right"); // 南风 → 右侧
  });

  it("exposes the i18n labelKey for each kind", () => {
    expect(classifyWindRelation(90, 90).labelKey).toBe("widgets.surf.wind.relation.onshore");
    expect(classifyWindRelation(90, 270).labelKey).toBe("widgets.surf.wind.relation.offshore");
    expect(classifyWindRelation(90, 0).labelKey).toBe("widgets.surf.wind.relation.crossLeft");
    expect(classifyWindRelation(90, 180).labelKey).toBe("widgets.surf.wind.relation.crossRight");
    expect(classifyWindRelation(90, null).labelKey).toBe("widgets.surf.wind.relation.unknown");
  });

  it("uses ±45° onshore/offshore thresholds with side-wind between", () => {
    // 0° = 正东轴向；44° 仍在向岸带内。
    expect(classifyWindRelation(90, 90 + 44).kind).toBe("onshore");
    // 46° 已出向岸带，落在右侧（南侧）。
    expect(classifyWindRelation(90, 90 + 46).kind).toBe("cross-shore-right");
    // 反轴向(西=270)偏左 46° = 316° → 左侧近离岸。
    expect(classifyWindRelation(90, 270 + 46).kind).toBe("cross-shore-left");
    // 接近反轴向 → offshore。
    expect(classifyWindRelation(90, 270 + 1).kind).toBe("offshore");
  });

  it("reports angleDifference as |wind - facing| in 0..180", () => {
    expect(classifyWindRelation(90, 90).angleDifference).toBe(0);
    expect(classifyWindRelation(90, 0).angleDifference).toBe(90);
    expect(classifyWindRelation(90, 270).angleDifference).toBe(180);
    expect(classifyWindRelation(90, 135).angleDifference).toBe(45);
  });

  it("is orientation-agnostic (works for south-facing beaches too)", () => {
    // 南向海滩：南风=向岸、北风=离岸、东风=左侧、西风=右侧。
    expect(classifyWindRelation(180, 180).kind).toBe("onshore");
    expect(classifyWindRelation(180, 0).kind).toBe("offshore");
    expect(classifyWindRelation(180, 90).kind).toBe("cross-shore-left");
    expect(classifyWindRelation(180, 270).kind).toBe("cross-shore-right");
  });

  it("handles wrap-around across 0/360", () => {
    // 北向海滩（0）：345°（近北）应归 onshore（经 wrap 后夹角 15°）。
    expect(classifyWindRelation(0, 345).kind).toBe("onshore");
    expect(classifyWindRelation(0, 345).angleDifference).toBe(15);
    // 360 归一为 0。
    expect(classifyWindRelation(360, 360).kind).toBe("onshore");
  });

  it("classifies NaN/null/invalid as unknown with null angleDifference", () => {
    for (const wind of [null, undefined, Number.NaN, Infinity]) {
      const r = classifyWindRelation(90, wind as number);
      expect(r.kind).toBe("unknown");
      expect(r.angleDifference).toBeNull();
    }
    for (const orient of [null, undefined, Number.NaN, Infinity]) {
      const r = classifyWindRelation(orient as number, 90);
      expect(r.kind).toBe("unknown");
      expect(r.angleDifference).toBeNull();
    }
  });
});

describe("surf beachOrientation normalization (M1.1c)", () => {
  it("accepts 0..360 and normalizes 360→0", () => {
    expect(normalizeBeachOrientation(90)).toBe(90);
    expect(normalizeBeachOrientation(0)).toBe(0);
    expect(normalizeBeachOrientation(360)).toBe(0);
    expect(normalizeBeachOrientation(180)).toBe(180);
  });

  it("falls back to default 90 for invalid input", () => {
    for (const bad of [null, undefined, Number.NaN, Infinity, -30, 361, 999, "abc"]) {
      expect(normalizeBeachOrientation(bad)).toBe(SURF_SPOT.beachOrientation);
    }
  });
});

describe("surf date utilities (Asia/Shanghai)", () => {
  it("dateKeyInZone returns Shanghai-local date", () => {
    // 2026-08-28T15:00+08:00 = 2026-08-28T07:00Z
    expect(dateKeyInZone(Date.parse("2026-08-28T07:00:00Z"), SURF_TIMEZONE)).toBe(
      "2026-08-28"
    );
  });

  it("tomorrowDateKey shifts one Shanghai-local day", () => {
    // 上海无 DST，+24h 即下一自然日
    const now = Date.parse("2026-08-27T12:00:00Z"); // 20:00 +08
    expect(tomorrowDateKey(now)).toBe("2026-08-28");
  });

  it("addDaysDateKey handles month rollover", () => {
    expect(addDaysDateKey("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("dateKeyToUtcIso anchors to SURF_TIMEZONE start of day (reuses SURF_TIMEZONE, not hardcoded +08:00)", () => {
    // Asia/Shanghai 无 DST：2026-08-28 00:00 本地 = 2026-08-27T16:00:00Z。
    expect(dateKeyToUtcIso("2026-08-28")).toBe("2026-08-27T16:00:00.000Z");
    // 与 SURF_TIMEZONE 单一真值一致（若未来改时区，此断言随真值变化）。
    expect(dateKeyToUtcIso("2026-08-28")).toBe(
      zonedTimeToUtc("2026-08-28T00:00:00", SURF_TIMEZONE).toISOString()
    );
  });

  it("tideWindowFor covers the whole target day", () => {
    const w = tideWindowFor("2026-08-28");
    expect(w.start).toBe("2026-08-27T16:00:00.000Z");
    expect(w.end).toBe("2026-08-28T16:00:00.000Z");
  });
});

describe("surf tideStateAt", () => {
  const base = Date.parse("2026-08-28T00:00:00+08:00");
  const extremes: TideExtreme[] = [
    { time: base, type: "low", height: 0.4 }, // 08-28 00:00 low
    { time: base + 6 * 3600 * 1000, type: "high", height: 1.6 }, // 06:00 high
    { time: base + 12 * 3600 * 1000, type: "low", height: 0.3 }, // 12:00 low
  ];

  it("rising between a low and a following high", () => {
    expect(tideStateAt(base + 2 * 3600 * 1000, extremes)).toBe("rising");
  });

  it("falling between a high and a following low", () => {
    expect(tideStateAt(base + 9 * 3600 * 1000, extremes)).toBe("falling");
  });

  it("slack near an extreme", () => {
    expect(tideStateAt(base + 30 * 60 * 1000, extremes)).toBe("slack");
  });

  it("null with no data", () => {
    expect(tideStateAt(base, [])).toBeNull();
  });

  // 单极值边界：只有一个 high / 只有一个 low 时，极值之后按类型推导涨/落。
  it("single high extreme: falling after it, rising before it", () => {
    const onlyHigh: TideExtreme[] = [{ time: base + 6 * 3600 * 1000, type: "high", height: 1.6 }];
    // 极值之后（无后续极值）→ falling（高潮后落潮）。
    expect(tideStateAt(base + 9 * 3600 * 1000, onlyHigh)).toBe("falling");
    // 极值之前（无前置极值）→ rising（涨向高潮）。
    expect(tideStateAt(base + 2 * 3600 * 1000, onlyHigh)).toBe("rising");
  });

  it("single low extreme: rising after it, falling before it", () => {
    const onlyLow: TideExtreme[] = [{ time: base + 6 * 3600 * 1000, type: "low", height: 0.3 }];
    // 极值之后（无后续极值）→ rising（低潮后涨潮）。
    expect(tideStateAt(base + 9 * 3600 * 1000, onlyLow)).toBe("rising");
    // 极值之前（无前置极值）→ falling（落向低潮）。
    expect(tideStateAt(base + 2 * 3600 * 1000, onlyLow)).toBe("falling");
  });
});

describe("surf buildDayProfile aggregation", () => {
  // 构造 3 天 hourly（上海时区，每小时一个点），目标日期 2026-08-28。
  const start = Date.parse("2026-08-27T00:00:00+08:00");
  const times: string[] = [];
  for (let h = 0; h < 72; h += 1) {
    times.push(new Date(start + h * 3600 * 1000).toISOString());
  }
  const marine: RawHourly = {
    time: times,
    wave_height: times.map((_, i) => (i % 24 >= 6 && i % 24 < 11 ? 1.2 : 0.4)),
    swell_wave_height: times.map((_, i) => (i % 24 >= 6 && i % 24 < 11 ? 1.3 : 0.5)),
    swell_wave_period: times.map((_, i) => (i % 24 >= 6 && i % 24 < 11 ? 6 : 4)),
    swell_wave_direction: times.map(() => 180), // 南涌
  };
  const wind: RawHourly = {
    time: times,
    wind_speed_10m: times.map((_, i) => (i % 24 >= 6 && i % 24 < 11 ? 15 : 20)),
    wind_gusts_10m: times.map((_, i) => (i % 24 >= 6 && i % 24 < 11 ? 25 : 30)),
    wind_direction_10m: times.map(() => 360), // 北风
  };
  const extremes: TideExtreme[] = [
    { time: Date.parse("2026-08-28T00:00:00+08:00"), type: "low", height: 0.4 },
    { time: Date.parse("2026-08-28T12:00:00+08:00"), type: "high", height: 1.6 },
  ];

  const profile = buildDayProfile({
    dateKey: "2026-08-28",
    marine,
    wind,
    extremes,
  });

  it("has three periods in order", () => {
    expect(profile.periods.map((p) => p.periodKey)).toEqual([
      "morning",
      "midday",
      "dusk",
    ]);
  });

  it("aggregates wave/swell/wind for the morning window", () => {
    const morning = profile.periods[0];
    expect(morning.waveHeight).toBeCloseTo(1.3, 5);
    expect(morning.swellPeriod).toBeCloseTo(6, 5);
    expect(morning.swellDirection).toBe("南");
    expect(morning.windSpeed).toBeCloseTo(15, 5);
    expect(morning.windGust).toBeCloseTo(25, 5);
    expect(morning.windDirection).toBe("北");
    // 默认双月湾面东(90)：北风来自左侧 → 左侧风。
    expect(morning.windRelation.kind).toBe("cross-shore-left");
  });

  it("windRelation reflects a passed beachOrientation", () => {
    // 把朝向设为 0（北向）：北风(360) → 向岸风。
    const p = buildDayProfile({
      dateKey: "2026-08-28",
      marine,
      wind,
      extremes,
      beachOrientation: 0,
    });
    expect(p.periods[0].windRelation.kind).toBe("onshore");
  });

  it("aggregates the dusk window using non-morning values", () => {
    const dusk = profile.periods[2]; // 17-21
    expect(dusk.waveHeight).toBeCloseTo(0.5, 5);
    expect(dusk.swellPeriod).toBeCloseTo(4, 5);
    expect(dusk.windSpeed).toBeCloseTo(20, 5);
  });

  it("derives tide state per period from extremes", () => {
    // 晨 6-11 中位 ~8-9 点：在 00:00 low 之后、12:00 high 之前 → rising
    expect(profile.periods[0].tideState).toBe("rising");
    // 午 11-17 中位 ~14 点：在 12:00 high 之后 → falling
    expect(profile.periods[1].tideState).toBe("falling");
  });

  it("falls back to null tide state when no extremes provided", () => {
    const noTide = buildDayProfile({ dateKey: "2026-08-28", marine, wind, extremes: [] });
    for (const p of noTide.periods) expect(p.tideState).toBeNull();
  });
});

describe("surf spot constants", () => {
  it("spot matches the M1 plan coordinates", () => {
    expect(SURF_SPOT.name).toBe("双月湾");
    expect(SURF_SPOT.latitude).toBeCloseTo(22.635455, 6);
    expect(SURF_SPOT.longitude).toBeCloseTo(114.927943, 6);
  });

  it("periods are the planned morning/midday/dusk windows", () => {
    expect(SURF_PERIODS.map((p) => `${p.startHour}-${p.endHour}`)).toEqual([
      "6-11",
      "11-17",
      "17-21",
    ]);
  });
});

describe("surf Open-Meteo fetch URL encoding (M1 bug: timezone double-encoding)", () => {
  // 预编码字符串 "Asia%2FShanghai" 传给 URLSearchParams 会被二次编码成
  // "Asia%252FShanghai"，导致 Open-Meteo 返回 400。应传原始 "Asia/Shanghai"，
  // 由 URLSearchParams 自己编码成单次 "Asia%2FShanghai"。

  const captureUrl = (captured: { url?: string }) =>
    (async (input: RequestInfo | URL) => {
      captured.url = String(input);
      return new Response(JSON.stringify({ hourly: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

  it("fetchMarine encodes timezone as Asia%2FShanghai (single-encoded)", async () => {
    const captured: { url?: string } = {};
    await fetchMarine(SURF_SPOT.latitude, SURF_SPOT.longitude, captureUrl(captured));
    expect(captured.url).toContain("timezone=Asia%2FShanghai");
    expect(captured.url).not.toContain("Asia%252FShanghai");
  });

  it("fetchWind encodes timezone as Asia%2FShanghai (single-encoded)", async () => {
    const captured: { url?: string } = {};
    await fetchWind(SURF_SPOT.latitude, SURF_SPOT.longitude, captureUrl(captured));
    expect(captured.url).toContain("timezone=Asia%2FShanghai");
    expect(captured.url).not.toContain("Asia%252FShanghai");
  });
});

describe("surf spot config validation & corrupt fallback (M1.1b)", () => {
  it("accepts a valid non-default config", () => {
    expect(validateSurfSpotConfig({ name: "日月湾", latitude: 18.37, longitude: 110.2 })).toBe(true);
  });

  it("rejects empty/whitespace name", () => {
    expect(validateSurfSpotConfig({ name: "", latitude: 22.6, longitude: 114.9 })).toBe(false);
    expect(validateSurfSpotConfig({ name: "   ", latitude: 22.6, longitude: 114.9 })).toBe(false);
  });

  it("rejects out-of-range latitude/longitude and non-finite", () => {
    expect(validateSurfSpotConfig({ name: "x", latitude: 91, longitude: 114.9 })).toBe(false);
    expect(validateSurfSpotConfig({ name: "x", latitude: -90.01, longitude: 114.9 })).toBe(false);
    expect(validateSurfSpotConfig({ name: "x", latitude: 22.6, longitude: 181 })).toBe(false);
    expect(validateSurfSpotConfig({ name: "x", latitude: 22.6, longitude: -180.01 })).toBe(false);
    expect(validateSurfSpotConfig({ name: "x", latitude: Number.NaN, longitude: 114.9 })).toBe(false);
    expect(validateSurfSpotConfig({ name: "x", latitude: 22.6, longitude: Infinity })).toBe(false);
  });

  it("accepts range boundary values", () => {
    expect(validateSurfSpotConfig({ name: "n", latitude: -90, longitude: -180 })).toBe(true);
    expect(validateSurfSpotConfig({ name: "n", latitude: 90, longitude: 180 })).toBe(true);
  });

  it("parseSurfSpotConfig returns a valid config for good input", () => {
    const cfg = parseSurfSpotConfig({ name: "日月湾", latitude: "18.37", longitude: "110.2" });
    expect(cfg.name).toBe("日月湾");
    expect(cfg.latitude).toBe(18.37);
    expect(cfg.longitude).toBe(110.2);
    // 旧 v1 配置缺 beachOrientation → 兼容策略：保留 name/coords，朝向回退默认 90。
    expect(cfg.beachOrientation).toBe(90);
  });

  it("parseSurfSpotConfig keeps custom coords but defaults orientation for v1 configs", () => {
    const cfg = parseSurfSpotConfig({ name: "后海", latitude: 18.29, longitude: 109.5 });
    expect(cfg.name).toBe("后海");
    expect(cfg.latitude).toBe(18.29);
    expect(cfg.longitude).toBe(109.5);
    expect(cfg.beachOrientation).toBe(SURF_SPOT.beachOrientation); // 90
  });

  it("parseSurfSpotConfig preserves explicit valid orientation and normalizes 360→0", () => {
    expect(parseSurfSpotConfig({ name: "x", latitude: 22.6, longitude: 114.9, beachOrientation: 180 }).beachOrientation).toBe(180);
    expect(parseSurfSpotConfig({ name: "x", latitude: 22.6, longitude: 114.9, beachOrientation: 360 }).beachOrientation).toBe(0);
    expect(parseSurfSpotConfig({ name: "x", latitude: 22.6, longitude: 114.9, beachOrientation: 0 }).beachOrientation).toBe(0);
  });

  it("parseSurfSpotConfig recovers damaged orientation to default 90 but keeps coords", () => {
    for (const badOrientation of [Number.NaN, 999, -30, "abc", null]) {
      const cfg = parseSurfSpotConfig({ name: "x", latitude: 22.6, longitude: 114.9, beachOrientation: badOrientation });
      expect(cfg.beachOrientation).toBe(90);
      expect(cfg.name).toBe("x"); // name/coords 保留
      expect(cfg.latitude).toBe(22.6);
    }
  });

  it("parseSurfSpotConfig falls back to 双月湾 on null / corrupt / invalid", () => {
    for (const bad of [
      null,
      undefined,
      "garbage",
      42,
      { name: "", latitude: 22.6, longitude: 114.9 },
      { name: "x", latitude: 999, longitude: 114.9 },
      { name: "x" }, // 缺坐标
    ]) {
      const cfg = parseSurfSpotConfig(bad);
      expect(cfg).toEqual({
        name: SURF_SPOT.name,
        latitude: SURF_SPOT.latitude,
        longitude: SURF_SPOT.longitude,
        beachOrientation: SURF_SPOT.beachOrientation,
      });
    }
  });
});

// ---- M1.1d-a：fetchedAt 格式化 ----

describe("surf formatFetchedAt (M1.1d-a)", () => {
  it("formats epoch ms to HH:mm in SURF_TIMEZONE", () => {
    // 2026-08-27 23:00 Asia/Shanghai
    const ms = Date.parse("2026-08-27T23:00:00+08:00");
    expect(formatFetchedAt(ms)).toBe("23:00");
    expect(formatFetchedAt(Date.parse("2026-08-27T09:05:00+08:00"))).toBe("09:05");
  });

  it("returns null for missing / invalid input", () => {
    expect(formatFetchedAt(null)).toBeNull();
    expect(formatFetchedAt(undefined)).toBeNull();
    expect(formatFetchedAt(Number.NaN)).toBeNull();
  });
});

// ---- M1.1d-a：规则型推荐时段 ----

/** 构造一个带指定字段的时段聚合（其余字段置空）。 */
function period(
  key: SurfPeriodAggregate["periodKey"],
  overrides: Partial<SurfPeriodAggregate>
): SurfPeriodAggregate {
  return {
    periodKey: key,
    waveHeight: null,
    swellPeriod: null,
    swellDirection: null,
    windSpeed: null,
    windGust: null,
    windDirection: null,
    windRelation: { kind: "unknown", labelKey: "widgets.surf.wind.relation.unknown", angleDifference: null },
    tideState: null,
    ...overrides,
  };
}

describe("surf recommendPeriod (M1.1d-a, 规则型非 AI)", () => {
  it("returns null when all periods lack waveHeight or swellPeriod", () => {
    const profile = {
      periods: [
        period("morning", { waveHeight: null, swellPeriod: null }),
        period("midday", { waveHeight: 1.0, swellPeriod: null }),
        period("dusk", { waveHeight: null, swellPeriod: 6 }),
      ],
    };
    expect(recommendPeriod(profile)).toBeNull();
  });

  it("offshore wind wins outright (离岸优先)", () => {
    const profile = {
      periods: [
        period("morning", { waveHeight: 1.0, swellPeriod: 6, windRelation: { kind: "onshore", labelKey: "x", angleDifference: 0 } }),
        period("midday", { waveHeight: 1.2, swellPeriod: 7, windRelation: { kind: "offshore", labelKey: "x", angleDifference: 180 } }),
        period("dusk", { waveHeight: 1.5, swellPeriod: 8, windRelation: { kind: "cross-shore-left", labelKey: "x", angleDifference: 90 } }),
      ],
    };
    expect(recommendPeriod(profile)).toBe("midday");
  });

  it("among multiple offshore periods picks the higher waveHeight", () => {
    const profile = {
      periods: [
        period("morning", { waveHeight: 1.0, swellPeriod: 6, windRelation: { kind: "offshore", labelKey: "x", angleDifference: 180 } }),
        period("midday", { waveHeight: 1.4, swellPeriod: 7, windRelation: { kind: "offshore", labelKey: "x", angleDifference: 180 } }),
        period("dusk", { waveHeight: 1.2, swellPeriod: 8, windRelation: { kind: "cross-shore-right", labelKey: "x", angleDifference: 90 } }),
      ],
    };
    expect(recommendPeriod(profile)).toBe("midday");
  });

  it("onshore wind is penalized (向岸减分): excluded unless offshore exists", () => {
    const profile = {
      periods: [
        period("morning", { waveHeight: 2.0, swellPeriod: 9, windRelation: { kind: "onshore", labelKey: "x", angleDifference: 0 } }),
        period("midday", { waveHeight: 1.0, swellPeriod: 6, windRelation: { kind: "cross-shore-left", labelKey: "x", angleDifference: 90 } }),
        period("dusk", { waveHeight: 0.8, swellPeriod: 5, windRelation: { kind: "unknown", labelKey: "x", angleDifference: null } }),
      ],
    };
    // 向岸的 morning 被排除，候选为 midday/dusk，取浪高×周期最大 → midday。
    expect(recommendPeriod(profile)).toBe("midday");
  });

  it("returns null when all viable periods are onshore", () => {
    const profile = {
      periods: [
        period("morning", { waveHeight: 1.0, swellPeriod: 6, windRelation: { kind: "onshore", labelKey: "x", angleDifference: 0 } }),
        period("midday", { waveHeight: 1.2, swellPeriod: 7, windRelation: { kind: "onshore", labelKey: "x", angleDifference: 0 } }),
        period("dusk", { waveHeight: 1.1, swellPeriod: 6, windRelation: { kind: "onshore", labelKey: "x", angleDifference: 0 } }),
      ],
    };
    expect(recommendPeriod(profile)).toBeNull();
  });

  it("falls back to max waveHeight×swellPeriod among viable candidates", () => {
    const profile = {
      periods: [
        period("morning", { waveHeight: 1.0, swellPeriod: 6, windRelation: { kind: "cross-shore-left", labelKey: "x", angleDifference: 90 } }),
        period("midday", { waveHeight: 1.5, swellPeriod: 8, windRelation: { kind: "cross-shore-right", labelKey: "x", angleDifference: 90 } }),
        period("dusk", { waveHeight: 1.2, swellPeriod: 7, windRelation: { kind: "unknown", labelKey: "x", angleDifference: null } }),
      ],
    };
    // 1.5×8=12 最大 → midday。
    expect(recommendPeriod(profile)).toBe("midday");
  });

  it("unknown wind relation neither adds nor penalizes (不加分不减分)", () => {
    const profile = {
      periods: [
        period("morning", { waveHeight: 1.0, swellPeriod: 6, windRelation: { kind: "unknown", labelKey: "x", angleDifference: null } }),
        period("midday", { waveHeight: 1.3, swellPeriod: 7, windRelation: { kind: "unknown", labelKey: "x", angleDifference: null } }),
        period("dusk", { waveHeight: 1.1, swellPeriod: 6, windRelation: { kind: "unknown", labelKey: "x", angleDifference: null } }),
      ],
    };
    expect(recommendPeriod(profile)).toBe("midday");
  });

  // 极小浪高边界：当前实现没有「可靠浪高阈值」——只要核心浪数据（waveHeight +
  // swellPeriod）齐全，即使浪高极小（如 0.1m）也会照常给出推荐；只有核心浪数据
  // 缺失（waveHeight 或 swellPeriod 为 null）的时段才被排除，全部缺失才返回 null。
  // 若未来要引入「低于可靠阈值 → 暂无可靠推荐」，需在此处新增阈值常量并更新本测试。
  it("still recommends when all wave heights are tiny but data is present (no low-wave threshold yet)", () => {
    const profile = {
      periods: [
        period("morning", { waveHeight: 0.1, swellPeriod: 3, windRelation: { kind: "unknown", labelKey: "x", angleDifference: null } }),
        period("midday", { waveHeight: 0.2, swellPeriod: 4, windRelation: { kind: "unknown", labelKey: "x", angleDifference: null } }),
        period("dusk", { waveHeight: 0.15, swellPeriod: 3, windRelation: { kind: "unknown", labelKey: "x", angleDifference: null } }),
      ],
    };
    // 数据齐全 → 仍返回推荐（取浪高×周期最大者 = midday）。
    expect(recommendPeriod(profile)).toBe("midday");
  });

  it("returns null when core wave data is missing for every period (暂无可靠推荐)", () => {
    const profile = {
      periods: [
        period("morning", { waveHeight: null, swellPeriod: null }),
        period("midday", { waveHeight: null, swellPeriod: null }),
        period("dusk", { waveHeight: null, swellPeriod: null }),
      ],
    };
    expect(recommendPeriod(profile)).toBeNull();
  });
});

// ---- M1.1d-a：buildDayProfile 记录 fetchedAt ----

describe("surf buildDayProfile fetchedAt (M1.1d-a)", () => {
  const start = Date.parse("2026-08-27T00:00:00+08:00");
  const times: string[] = [];
  for (let h = 0; h < 72; h += 1) times.push(new Date(start + h * 3600 * 1000).toISOString());
  const marine: RawHourly = { time: times, wave_height: times.map(() => 1.0) };
  const wind: RawHourly = { time: times, wind_speed_10m: times.map(() => 10) };

  it("records the passed fetchedAt", () => {
    const p = buildDayProfile({ dateKey: "2026-08-28", marine, wind, extremes: [], fetchedAt: 1234567890 });
    expect(p.fetchedAt).toBe(1234567890);
  });

  it("defaults fetchedAt to now when omitted", () => {
    const before = Date.now();
    const p = buildDayProfile({ dateKey: "2026-08-28", marine, wind, extremes: [] });
    expect(p.fetchedAt).toBeGreaterThanOrEqual(before);
    expect(p.fetchedAt).toBeLessThanOrEqual(Date.now());
  });
});
