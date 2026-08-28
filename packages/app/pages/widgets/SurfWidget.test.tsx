import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import React, { useSyncExternalStore } from "react";
import { flushDomUpdates, renderInDom } from "../../../testing/domRender";
import type { SurfSpotConfig } from "./surfForecast";
import { surfSpotConfigKey } from "./surfSpotConfig";
import type { SurfForecastResult } from "./useSurfForecast";

// ---- 可控的 session 快照（模拟 userId 账号切换） ----
let currentSnapshot: { userId: string | null } = { userId: null };
const sessionListeners = new Set<() => void>();

function setUserId(next: string | null): void {
  currentSnapshot = { userId: next };
  sessionListeners.forEach((fn) => fn());
}
function subscribe(fn: () => void): () => void {
  sessionListeners.add(fn);
  return () => {
    sessionListeners.delete(fn);
  };
}
function getSnapshot(): { userId: string | null } {
  return currentSnapshot;
}

mock.module("app/sessionSnapshot", () => ({
  useSessionSnapshot: () =>
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
}));

// ---- 可控的 useSurfForecast（不碰真实网络） ----
let forecastResult: SurfForecastResult = {
  state: "loading",
  profile: null,
  tideUnavailable: false,
  refresh: () => {},
};
let forecastSpot: SurfSpotConfig | undefined;

mock.module("./useSurfForecast", () => ({
  useSurfForecast: (spot?: SurfSpotConfig) => {
    forecastSpot = spot;
    return forecastResult;
  },
}));

// ---- react-i18next：t 直接返回 fallback ----
const actualReactI18Next = await import("react-i18next");
mock.module("react-i18next", () => ({
  ...actualReactI18Next,
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      typeof fallback === "string" ? fallback : key,
  }),
}));

// ---- 图标组件轻量化 ----
mock.module("react-icons/lu", () => ({
  LuWaves: () => <span data-icon="waves" />,
  LuWind: () => <span data-icon="wind" />,
  LuRefreshCw: () => <span data-icon="refresh" />,
  LuSettings: () => <span data-icon="settings" />,
  LuX: () => <span data-icon="x" />,
  LuCheck: () => <span data-icon="check" />,
}));

type View = Awaited<ReturnType<typeof renderInDom>>;

const ALICE: SurfSpotConfig = { name: "日月湾", latitude: 18.37, longitude: 110.2, beachOrientation: 90 };
const BOB: SurfSpotConfig = { name: "后海", latitude: 18.29, longitude: 109.5, beachOrientation: 0 };

function seedStorage(view: View, userId: string | null, cfg: SurfSpotConfig): void {
  const ls = view.document.defaultView!.localStorage;
  ls.setItem(surfSpotConfigKey(userId), JSON.stringify(cfg));
}
function readStored(view: View, userId: string | null): SurfSpotConfig | null {
  const ls = view.document.defaultView!.localStorage;
  const raw = ls.getItem(surfSpotConfigKey(userId));
  return raw ? JSON.parse(raw) : null;
}

let SurfWidget: React.ComponentType<{ isEditing?: boolean }>;
let moduleVersion = 0;
async function loadSurfWidget(): Promise<React.ComponentType<{ isEditing?: boolean }>> {
  const mod = await import(`./SurfWidget?test=${moduleVersion++}`);
  return mod.default;
}

function getInput(view: View, type: string): HTMLInputElement {
  return view.container.querySelector(
    `.surf-widget__settings input[${type === "text" ? "type=\"text\"" : "type=\"number\""}]`
  ) as HTMLInputElement;
}

async function setInputValue(view: View, input: HTMLInputElement, value: string): Promise<void> {
  const win = view.document.defaultView as any;
  await React.act(async () => {
    // 复刻仓库内已验证的受控 input 模拟（AppendInstructionControl.test.tsx）：
    // 非匹配哨兵复位 value tracker + 原生 setter 写值 + input 事件触发。
    const tracker = (input as any)._valueTracker;
    if (tracker) {
      tracker.setValue("___force_diff___");
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      win.HTMLInputElement.prototype,
      "value",
    );
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new win.Event("input", { bubbles: true, cancelable: true }));
  });
  await flushDomUpdates(2);
}

beforeEach(() => {
  currentSnapshot = { userId: null };
  forecastSpot = undefined;
  forecastResult = {
    state: "loading",
    profile: null,
    tideUnavailable: false,
    refresh: () => {},
  };
});

afterEach(() => {
  sessionListeners.clear();
});

describe("SurfWidget 账号切换隔离 (HIGH-1)", () => {
  it("userId 变化时重载 spot、重置表单草稿，写回新账号 key", async () => {
    SurfWidget = await loadSurfWidget();

    const view = await renderInDom(<SurfWidget isEditing />);
    try {
      seedStorage(view, "alice", ALICE);
      seedStorage(view, "bob", BOB);

      await React.act(async () => {
        setUserId("alice");
      });
      await flushDomUpdates(1);

      // 打开表单：草稿应来自 alice（日月湾）。
      await view.click(view.getByRole("button", { name: /设置浪点/ }));
      await flushDomUpdates(1);
      expect(getInput(view, "text").value).toBe("日月湾");

      // 切换到 bob：草稿重置、表单关闭、齿轮重新出现。
      await React.act(async () => {
        setUserId("bob");
      });
      await flushDomUpdates(1);
      expect(view.queryByRole("button", { name: /设置浪点/ })).not.toBeNull();
      expect(view.container.querySelector(".surf-widget__settings")).toBeNull();

      // 重新打开表单：应展示 bob 的后海。
      await view.click(view.getByRole("button", { name: /设置浪点/ }));
      await flushDomUpdates(1);
      expect(getInput(view, "text").value).toBe("后海");
    } finally {
      await view.cleanup();
    }
  });

  it("保存写入当前 userId 的 owner key，与旧账号 key 隔离", async () => {
    SurfWidget = await loadSurfWidget();

    const view = await renderInDom(<SurfWidget isEditing />);
    try {
      seedStorage(view, "alice", ALICE);
      seedStorage(view, "bob", BOB);

      await React.act(async () => {
        setUserId("alice");
      });
      await flushDomUpdates(1);

      // alice 打开表单，把名称改成「后海改名」并保存。
      await view.click(view.getByRole("button", { name: /设置浪点/ }));
      await flushDomUpdates(1);
      await setInputValue(view, getInput(view, "text"), "后海改名");
      await view.click(view.container.querySelector(".surf-widget__settings-save")!);
      await flushDomUpdates(1);

      // alice 的 key 被更新，bob 的 key 不受影响。
      expect(readStored(view, "alice")!.name).toBe("后海改名");
      expect(readStored(view, "bob")).toEqual(BOB);
    } finally {
      await view.cleanup();
    }
  });
});

describe("SurfWidget 错误态可修复 (HIGH-2)", () => {
  it("离线/请求失败且 profile=null 时仍可打开设置表单并保存", async () => {
    SurfWidget = await loadSurfWidget();
    forecastResult = { state: "error", profile: null, tideUnavailable: false, refresh: () => {} };

    const view = await renderInDom(<SurfWidget isEditing />);
    try {
      seedStorage(view, "alice", ALICE);
      await React.act(async () => {
        setUserId("alice");
      });
      await flushDomUpdates(1);

      expect(view.queryByText(/浪况获取失败/)).not.toBeNull();

      // 仍能打开设置表单（不被 early return 挡住）。
      await view.click(view.getByRole("button", { name: /设置浪点/ }));
      await flushDomUpdates(1);
      expect(view.container.querySelector(".surf-widget__settings")).not.toBeNull();

      // 修改名称并保存，写入 alice key。
      await setInputValue(view, getInput(view, "text"), "日月湾修改版");
      await view.click(view.container.querySelector(".surf-widget__settings-save")!);
      await flushDomUpdates(1);
      expect(readStored(view, "alice")!.name).toBe("日月湾修改版");
    } finally {
      await view.cleanup();
    }
  });

  it("load 态且 profile=null 也能打开设置表单", async () => {
    SurfWidget = await loadSurfWidget();
    forecastResult = { state: "loading", profile: null, tideUnavailable: false, refresh: () => {} };

    const view = await renderInDom(<SurfWidget isEditing />);
    try {
      await view.click(view.getByRole("button", { name: /设置浪点/ }));
      await flushDomUpdates(1);
      expect(view.container.querySelector(".surf-widget__settings")).not.toBeNull();
    } finally {
      await view.cleanup();
    }
  });
});

describe("SurfWidget 表单草稿保护 (WARNING) 与名称 trim (NIT)", () => {
  it("formOpen 打开时隐藏设置齿轮", async () => {
    SurfWidget = await loadSurfWidget();
    forecastResult = { state: "error", profile: null, tideUnavailable: false, refresh: () => {} };

    const view = await renderInDom(<SurfWidget isEditing />);
    try {
      await view.click(view.getByRole("button", { name: /设置浪点/ }));
      await flushDomUpdates(1);
      expect(view.queryByRole("button", { name: /设置浪点/ })).toBeNull();
      expect(view.container.querySelector(".surf-widget__settings")).not.toBeNull();
    } finally {
      await view.cleanup();
    }
  });

  it("保存前 trim 名称，空白名称不进入配置/cache key", async () => {
    SurfWidget = await loadSurfWidget();
    forecastResult = { state: "error", profile: null, tideUnavailable: false, refresh: () => {} };

    const view = await renderInDom(<SurfWidget isEditing />);
    try {
      await view.click(view.getByRole("button", { name: /设置浪点/ }));
      await flushDomUpdates(1);
      await setInputValue(view, getInput(view, "text"), "  后海  ");
      await view.click(view.container.querySelector(".surf-widget__settings-save")!);
      await flushDomUpdates(1);

      expect(readStored(view, null)!.name).toBe("后海");
    } finally {
      await view.cleanup();
    }
  });
});

describe("SurfWidget 海滩朝向 (M1.1c)", () => {
  it("设置表单展示海滩朝向输入 + 方向提示，保存后写入配置", async () => {
    SurfWidget = await loadSurfWidget();
    forecastResult = { state: "error", profile: null, tideUnavailable: false, refresh: () => {} };

    const view = await renderInDom(<SurfWidget isEditing />);
    try {
      // 首次配置默认双月湾：朝向默认 90。
      await view.click(view.getByRole("button", { name: /设置浪点/ }));
      await flushDomUpdates(1);

      // 表单里有朝向输入框（type=number，第 3 个 number 输入，前面 lat/lng）。
      const nums = view.container.querySelectorAll<HTMLInputElement>(
        ".surf-widget__settings input[type=\"number\"]"
      );
      const orientationInput = nums[nums.length - 1];
      expect(orientationInput).not.toBeNull();
      expect(orientationInput.value).toBe("90");

      // 保存时把朝向改成 180（南向）。
      await setInputValue(view, orientationInput, "180");
      await view.click(view.container.querySelector(".surf-widget__settings-save")!);
      await flushDomUpdates(1);

      const stored = readStored(view, null)!;
      expect(stored.name).toBe("双月湾");
      expect(stored.beachOrientation).toBe(180);
    } finally {
      await view.cleanup();
    }
  });

  it("保存时损坏的朝向回退为默认 90，但不丢 name/coords", async () => {
    SurfWidget = await loadSurfWidget();
    forecastResult = { state: "error", profile: null, tideUnavailable: false, refresh: () => {} };

    const view = await renderInDom(<SurfWidget isEditing />);
    try {
      // 预置一条旧 v1 风格配置（无 beachOrientation 字段），再切换 userId 触发重载，
      // 让组件从 storage 读到该 v1 配置（parse 时缺字段朝向应回退 90）。
      seedStorage(view, "alice", { name: "日月湾", latitude: 18.37, longitude: 110.2 } as unknown as SurfSpotConfig);
      await React.act(async () => {
        setUserId("alice");
      });
      await flushDomUpdates(1);

      await view.click(view.getByRole("button", { name: /设置浪点/ }));
      await flushDomUpdates(1);

      // 把朝向改成损坏值 999 并保存 → 归一化回退默认 90，name/coords 保留。
      const nums = view.container.querySelectorAll<HTMLInputElement>(
        ".surf-widget__settings input[type=\"number\"]"
      );
      const orientationInput = nums[nums.length - 1];
      await setInputValue(view, orientationInput, "999");
      await view.click(view.container.querySelector(".surf-widget__settings-save")!);
      await flushDomUpdates(1);

      const stored = readStored(view, "alice")!;
      expect(stored.beachOrientation).toBe(90); // 损坏回退默认
      expect(stored.name).toBe("日月湾"); // name/coords 保留
      expect(stored.latitude).toBe(18.37);
    } finally {
      await view.cleanup();
    }
  });

  it("windRelation 文案随风向-朝向关系渲染（东向北风 → 左侧风）", async () => {
    SurfWidget = await loadSurfWidget();
    // 双月湾面东(90) + 北风 → 左侧风。构造 profile 并交给 widget 渲染。
    forecastResult = {
      state: "ready",
      profile: {
        dateKey: "2026-08-28",
        spotName: "双月湾",
        fetchedAt: Date.parse("2026-08-27T23:00:00+08:00"),
        periods: [
          {
            periodKey: "morning",
            waveHeight: 1.2,
            swellPeriod: 6,
            swellDirection: "南",
            windSpeed: 15,
            windGust: 25,
            windDirection: "北",
            windRelation: {
              kind: "cross-shore-left",
              labelKey: "widgets.surf.wind.relation.crossLeft",
              angleDifference: 90,
            },
            tideState: "rising",
          },
        ],
        tideExtremes: [],
      },
      tideUnavailable: false,
      refresh: () => {},
    };

    const view = await renderInDom(<SurfWidget />);
    try {
      // 风行应同时展示方位（北风）与相对关系（左侧风）。
      // 注意：浪高/涌期行也有 .surf-widget__sub，需限定在「风」行内查找。
      const windRow = Array.from(view.container.querySelectorAll<HTMLElement>(".surf-widget__row")).find(
        (row) => row.textContent?.includes("风")
      );
      const sub = windRow?.querySelector(".surf-widget__sub");
      expect(sub?.textContent).toContain("北风");
      expect(sub?.textContent).toContain("左侧风");
      // 涌向仍显示原方位，不误标成风的相对关系。
      const swellSubs = Array.from(view.container.querySelectorAll<HTMLElement>(".surf-widget__sub"));
      expect(swellSubs.some((s) => s.textContent === "南")).toBe(true);
    } finally {
      await view.cleanup();
    }
  });

  it("footer 显示数据更新时间（HH:mm），推荐时段按规则渲染", async () => {
    SurfWidget = await loadSurfWidget();
    forecastResult = {
      state: "ready",
      profile: {
        dateKey: "2026-08-28",
        spotName: "双月湾",
        fetchedAt: Date.parse("2026-08-27T23:00:00+08:00"),
        periods: [
          {
            periodKey: "morning",
            waveHeight: 1.0,
            swellPeriod: 6,
            swellDirection: "南",
            windSpeed: 15,
            windGust: 25,
            windDirection: "北",
            windRelation: {
              kind: "onshore",
              labelKey: "widgets.surf.wind.relation.onshore",
              angleDifference: 0,
            },
            tideState: "rising",
          },
          {
            periodKey: "midday",
            waveHeight: 1.4,
            swellPeriod: 8,
            swellDirection: "南",
            windSpeed: 10,
            windGust: 18,
            windDirection: "西",
            windRelation: {
              kind: "offshore",
              labelKey: "widgets.surf.wind.relation.offshore",
              angleDifference: 180,
            },
            tideState: "falling",
          },
          {
            periodKey: "dusk",
            waveHeight: 1.2,
            swellPeriod: 7,
            swellDirection: "南",
            windSpeed: 12,
            windGust: 20,
            windDirection: "北",
            windRelation: {
              kind: "cross-shore-left",
              labelKey: "widgets.surf.wind.relation.crossLeft",
              angleDifference: 90,
            },
            tideState: "slack",
          },
        ],
        tideExtremes: [],
      },
      tideUnavailable: false,
      refresh: () => {},
    };

    const view = await renderInDom(<SurfWidget />);
    try {
      // 数据更新时间：23:00（Asia/Shanghai）。
      const updated = view.container.querySelector(".surf-widget__updated");
      expect(updated?.textContent).toContain("23:00");
      // 推荐：midday 离岸风胜出（periodLabel fallback 默认「晨」，故断言时段小时 11-17）。
      const recommend = view.container.querySelector(".surf-widget__recommend-value");
      expect(recommend?.textContent).toContain("11-17");
    } finally {
      await view.cleanup();
    }
  });

  it("无可靠推荐时显示「暂无可靠推荐」", async () => {
    SurfWidget = await loadSurfWidget();
    forecastResult = {
      state: "ready",
      profile: {
        dateKey: "2026-08-28",
        spotName: "双月湾",
        fetchedAt: Date.parse("2026-08-27T23:00:00+08:00"),
        periods: [
          {
            periodKey: "morning",
            waveHeight: null,
            swellPeriod: null,
            swellDirection: null,
            windSpeed: null,
            windGust: null,
            windDirection: null,
            windRelation: {
              kind: "unknown",
              labelKey: "widgets.surf.wind.relation.unknown",
              angleDifference: null,
            },
            tideState: null,
          },
        ],
        tideExtremes: [],
      },
      tideUnavailable: false,
      refresh: () => {},
    };

    const view = await renderInDom(<SurfWidget />);
    try {
      const na = view.container.querySelector(".surf-widget__recommend--na");
      expect(na?.textContent).toContain("暂无可靠推荐");
    } finally {
      await view.cleanup();
    }
  });
});
