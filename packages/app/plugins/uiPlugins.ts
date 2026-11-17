// packages/app/plugins/uiPlugins.ts
//
// 单一职责：UI 插件启用契约（纯数据 + 纯函数，不依赖 settings slice，
// 以免 settings 类型与插件模块互相循环引用）。
//
// 启用状态本身存在既有 settings record 的 `uiPlugins` 字段里，随 setSettings /
// getSettings 的既有持久化与 hydrate 路径走，不新开 localStorage、端点或开关系统。
//
// 状态语义：
//  - absent  ：从未「创建并开启」过（默认值，新能力默认不启用；缺失/非法值一律归到此）；
//  - disabled：创建过又被关闭（关闭只隐藏/停止挂载面板，不删库、不删凭据）；
//  - enabled ：当前启用（这是唯一允许注册 rail 入口 / 直接路由进入的状态）。

export type UiPluginId = "music" | "calendar";

export type UiPluginState = "absent" | "disabled" | "enabled";

export interface UiPluginSpec {
  readonly id: UiPluginId;
  readonly title: string;
  /** 插件面板的路由路径；直接路由同样要以启用状态为准。 */
  readonly path: string;
}

/** 完整启用状态映射：每个已知插件 id 都必须有值。 */
export type UiPlugins = Record<UiPluginId, UiPluginState>;

/**
 * 只读规格表。新增插件只在这里加一行，normalize 会自动补上该 id 的 `absent`。
 */
export const UI_PLUGIN_SPECS: readonly UiPluginSpec[] = Object.freeze([
  { id: "music", title: "音乐", path: "/music" },
  { id: "calendar", title: "日历", path: "/calendar" },
] as const);

const isRecordLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toUiPluginState = (value: unknown): UiPluginState =>
  value === "enabled" || value === "disabled" || value === "absent"
    ? value
    : "absent";

/**
 * 把任意输入归一化为**完整**映射：缺失键与非法值一律 `absent`。
 * 返回值是新建的可变对象，调用方改动不会污染下一次读取。
 */
export const normalizeUiPlugins = (value: unknown): UiPlugins => {
  const record = isRecordLike(value) ? value : {};
  const result = {} as UiPlugins;
  for (const spec of UI_PLUGIN_SPECS) {
    result[spec.id] = toUiPluginState(record[spec.id]);
  }
  return result;
};

/** 只有 `enabled` 算启用；非法输入一律视为未启用。 */
export const isUiPluginEnabled = (
  value: unknown,
  id: UiPluginId,
): boolean => normalizeUiPlugins(value)[id] === "enabled";
