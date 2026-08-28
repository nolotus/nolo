import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dir);
const hookSource = readFileSync(join(dir, "useSurfForecast.ts"), "utf8");
const widgetSource = readFileSync(join(dir, "SurfWidget.tsx"), "utf8");
const cfgSource = readFileSync(join(dir, "surfSpotConfig.ts"), "utf8");

describe("Surf config source contract (M1.1b)", () => {
  it("cache key isolates by spot coordinates and name", () => {
    expect(hookSource).toContain("surf-forecast-cache-");
    // key 里必须包含纬度/经度/名称，防止不同地点串缓存。
    expect(hookSource).toMatch(/spot\.latitude\.toFixed\(5\)/);
    expect(hookSource).toMatch(/spot\.longitude\.toFixed\(5\)/);
    expect(hookSource).toMatch(/spot\.name/);
  });

  it("useSurfForecast passes config coordinates to fetchers", () => {
    // 三路数据源（OM marine / OM wind / SG tide）都使用配置浪点坐标。
    expect(hookSource).toMatch(/fetchMarine\(activeSpot\.latitude, activeSpot\.longitude\)/);
    expect(hookSource).toMatch(/fetchWind\(activeSpot\.latitude, activeSpot\.longitude\)/);
    expect(hookSource).toMatch(/fetchTideViaProxy\(\{ server, token \}, activeSpot, dateKey\)/);
    // day profile 携带配置浪点名称 + 海滩朝向。
    expect(hookSource).toMatch(/spotName: activeSpot\.name/);
    expect(hookSource).toMatch(/beachOrientation: activeSpot\.beachOrientation/);
  });

  it("SurfWidget exposes a settings entry only in edit mode", () => {
    // 设置入口绑定 isEditing：非编辑态不渲染设置控件。
    expect(widgetSource).toContain("isEditing");
    expect(widgetSource).toContain("surf-widget__settings-btn");
    expect(widgetSource).toMatch(/renderSettingsEntry = isEditing &&/);
    // 表单校验走 validateSurfSpotConfig，保存走 writeSurfSpotConfig。
    expect(widgetSource).toContain("validateSurfSpotConfig");
    expect(widgetSource).toContain("writeSurfSpotConfig");
    // 保存/取消控件存在。
    expect(widgetSource).toContain("surf-widget__settings-save");
    expect(widgetSource).toContain("surf-widget__settings-cancel");
  });

  it("config storage key is versioned and owner-scoped when userId is available", () => {
    // key 前缀 + 版本号组合成版本化 key。
    expect(cfgSource).toContain('CONFIG_KEY_PREFIX = "surf-spot-config"');
    expect(cfgSource).toContain('CONFIG_KEY_VERSION = "v1"');
    expect(cfgSource).toContain("`${CONFIG_KEY_PREFIX}-${CONFIG_KEY_VERSION}`");
    // 优先以 userId 拼 owner 维度的 key。
    expect(cfgSource).toMatch(/surfSpotConfigKey\(userId/);
    expect(cfgSource).toContain('`${CONFIG_KEY_PREFIX}-${CONFIG_KEY_VERSION}-${safe}`');
  });

  it("config read falls back to 双月湾 on missing/corrupt data", () => {
    expect(cfgSource).toContain("parseSurfSpotConfig");
    expect(cfgSource).toContain("readStorageJSON");
    expect(cfgSource).toContain("writeStorageJSON");
  });
});
