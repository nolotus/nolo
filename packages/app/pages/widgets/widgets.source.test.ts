import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const widgetsDir = join(import.meta.dir);
const usageWidgetSource = readFileSync(join(widgetsDir, "UsageWidget.tsx"), "utf8");
const usageWidgetCss = readFileSync(join(widgetsDir, "UsageWidget.css"), "utf8");
const widgetsSectionSource = readFileSync(join(widgetsDir, "WidgetsSection.tsx"), "utf8");
const widgetsSectionCss = readFileSync(join(widgetsDir, "WidgetsSection.css"), "utf8");
const homeSource = readFileSync(join(widgetsDir, "..", "Home.tsx"), "utf8");
const settingSliceSource = readFileSync(
  join(widgetsDir, "..", "..", "settings", "settingSlice.tsx"),
  "utf8"
);
const appearanceSource = readFileSync(
  join(widgetsDir, "..", "..", "settings", "web", "Appearance.tsx"),
  "utf8"
);

describe("Widgets source contract", () => {
  it("UsageWidget shows balance and today's cost and links to the usage page", () => {
    expect(usageWidgetSource).toContain("useSessionSnapshot");
    expect(usageWidgetSource).toContain("useRecords");
    expect(usageWidgetSource).toContain('to="/life/usage"');
    expect(usageWidgetSource).toContain("formatCredits");
    expect(usageWidgetSource).toContain('className="usage-widget"');
    expect(usageWidgetSource).toContain('className="usage-widget__balance"');
    expect(usageWidgetSource).toContain("LuWallet");
  });

  it("UsageWidget aggregates today's cost from records", () => {
    expect(usageWidgetSource).toContain("records.reduce((sum, r) => sum + (r.cost ?? 0), 0)");
  });

  it("UsageWidget.css provides the card layout and hover state", () => {
    expect(usageWidgetCss).toContain(".usage-widget");
    expect(usageWidgetCss).toContain(".usage-widget:hover");
    expect(usageWidgetCss).toContain(".usage-widget__icon");
    expect(usageWidgetCss).toContain(".usage-widget__balance");
  });

  it("WidgetsSection renders CalendarWidget alongside shortcuts and usage widget", () => {
    expect(widgetsSectionSource).toContain("CalendarWidget");
    expect(widgetsSectionSource).toContain('import "./actionCards.css";');
    expect(widgetsSectionSource).toContain("UsageWidget");
    expect(widgetsSectionSource).toContain("SurfWidget");
    expect(widgetsSectionSource).toContain('id === "surf"');
    expect(widgetsSectionSource).toContain('"homeTabs.custom"');
    expect(widgetsSectionSource).toContain("home-widgets");
    expect(widgetsSectionCss).toContain(".home-widgets");
    expect(widgetsSectionCss).toContain("grid-template-columns");
  });

  it("lays out the calendar as a two-row featured widget with stacked action cards", () => {
    expect(widgetsSectionSource).toContain('"home-custom-widgets-v3"');
    expect(widgetsSectionSource).not.toContain('"home-custom-widgets-v2"');
    expect(widgetsSectionSource).toContain("home-widgets__item--featured");
    expect(widgetsSectionCss).toContain(".home-widgets__item--featured");
    expect(widgetsSectionCss).toContain("grid-row: span 2");
  });

  it("supports pointer-drag resizing and drops the duplicate done button", () => {
    expect(widgetsSectionSource).toContain("home-widgets__resize-handle");
    expect(widgetsSectionSource).toContain("onPointerDown");
    expect(widgetsSectionSource).toContain("resizingId");
    expect(widgetsSectionSource).not.toContain("onDone");
    expect(widgetsSectionCss).toContain(".home-widgets__resize-handle");
    expect(widgetsSectionSource).not.toContain("cycleSize");
    expect(widgetsSectionSource).not.toContain("cycleHeight");
    expect(widgetsSectionSource).not.toContain("LuMaximize2");
  });

  it("CalendarWidget uses react-aria-components Calendar with navigation and grid", () => {
    const calendarSource = readFileSync(join(widgetsDir, "CalendarWidget.tsx"), "utf8");
    expect(calendarSource).toContain("Calendar");
    expect(calendarSource).toContain("CalendarGrid");
    expect(calendarSource).toContain("CalendarCell");
    expect(calendarSource).toContain('Button slot="previous"');
    expect(calendarSource).toContain('Button slot="next"');
    expect(calendarSource).toContain("<Heading");
  });

  it("Home lazily loads WidgetsSection and renders it as the top section for authenticated users", () => {
    expect(homeSource).toContain(
      'const WidgetsSection = lazy(() => import("./widgets/WidgetsSection"))'
    );
    expect(homeSource).toContain("homeStyles.homeAuthedWidgetsSection");
    expect(homeSource).toContain("<WidgetsSection");
    expect(homeSource).not.toContain('id: "usage"');
  });

  it("Appearance settings page no longer shows a widgets experimental toggle", () => {
    expect(appearanceSource).not.toContain("selectWidgetsEnabled");
    expect(appearanceSource).not.toContain("settings.appearance.experimental");
    expect(appearanceSource).not.toContain("ToggleSwitch");
  });

  it("keeps surf in ALL_WIDGETS (editable catalog) but out of default layout", () => {
    // 编辑态 Catalog 的可添加列表基于 ALL_WIDGETS，surf 必须仍可添加。
    expect(widgetsSectionSource).toContain('"surf",');
    expect(widgetsSectionSource).toContain("const ALL_WIDGETS: WidgetId[]");
    // 默认布局来自 DEFAULT_VISIBLE_WIDGETS，且该常量定义内不含 surf。
    const start = widgetsSectionSource.indexOf("const DEFAULT_VISIBLE_WIDGETS");
    const end = widgetsSectionSource.indexOf("];", start);
    const defaultBlock = widgetsSectionSource.slice(start, end);
    expect(defaultBlock).toContain("const DEFAULT_VISIBLE_WIDGETS: WidgetId[]");
    expect(defaultBlock).not.toContain("surf");
  });

  it("defaultState builds visible/order from DEFAULT_VISIBLE_WIDGETS, not ALL_WIDGETS", () => {
    // defaultState 的 visible/order 必须来自不含 surf 的默认列表。
    const block = widgetsSectionSource.slice(
      widgetsSectionSource.indexOf("function defaultState"),
      widgetsSectionSource.indexOf("function loadState")
    );
    expect(block).toContain("visible: [...DEFAULT_VISIBLE_WIDGETS]");
    expect(block).toContain("order: [...DEFAULT_VISIBLE_WIDGETS]");
    // 默认布局的 visible/order 不应再直接展开 ALL_WIDGETS（否则 surf 会被带入）。
    expect(block).not.toContain("visible: [...ALL_WIDGETS]");
    expect(block).not.toContain("order: [...ALL_WIDGETS]");
  });

  it("loadState does not backfill surf into old persisted layouts", () => {
    // 旧 persisted state 无 surf 时，loadState 只对 DEFAULT_VISIBLE_WIDGETS 里的
    // 缺失项补齐；surf 不会自动出现。
    const block = widgetsSectionSource.slice(
      widgetsSectionSource.indexOf("function loadState"),
      widgetsSectionSource.indexOf("function saveState")
    );
    expect(block).toContain("parsed.visible ?? DEFAULT_VISIBLE_WIDGETS");
    expect(block).toContain("parsed.order ?? DEFAULT_VISIBLE_WIDGETS");
    expect(block).toContain("const missingVisible = DEFAULT_VISIBLE_WIDGETS.filter");
    expect(block).toContain("const missingOrder = DEFAULT_VISIBLE_WIDGETS.filter");
    // 若 persisted visible/order 已明确含 surf，仍会被 ALL_WIDGETS 过滤保留。
    expect(block).toContain("ALL_WIDGETS.includes(id)");
  });

  it("add-module catalog is gated by isEditing and lists hidden widgets from ALL_WIDGETS/state", () => {
    // 添加区域只在编辑态渲染。
    expect(widgetsSectionSource).toContain('isEditing && hiddenWidgets.length > 0');
    expect(widgetsSectionSource).toContain('home-widgets__add-catalog');
    expect(widgetsSectionSource).toContain('t("homeWidgets.addModules", "添加模块")');
    // 隐藏列表 = ALL_WIDGETS 中不在 state.visible 的 widget。
    const addBlock = widgetsSectionSource.slice(
      widgetsSectionSource.indexOf("const hiddenWidgets = useMemo"),
      widgetsSectionSource.indexOf("const handleReset")
    );
    expect(addBlock).toContain("ALL_WIDGETS.filter((id) => !state.visible.includes(id))");
    expect(widgetsSectionSource).toContain('className="home-widgets__add-item"');
  });

  it("addWidget writes hidden widget into visible and appends to order when missing", () => {
    const addBlock = widgetsSectionSource.slice(
      widgetsSectionSource.indexOf("const addWidget = useCallback"),
      widgetsSectionSource.indexOf("const hiddenWidgets = useMemo")
    );
    // 已在 visible 时不做重复添加。
    expect(addBlock).toContain("if (state.visible.includes(id)) return;");
    // 加入 visible，并在 order 缺失时追加到末尾（保留既有 order）。
    expect(addBlock).toContain("const visible = [...state.visible, id];");
    expect(addBlock).toContain(
      "state.order.includes(id) ? state.order : [...state.order, id]"
    );
    // 持久化走既有 persist（写 visible/order 到 STORAGE_KEY）。
    expect(addBlock).toContain("persist({ ...state, visible, order });");
    expect(widgetsSectionSource).toContain("onClick={() => addWidget(id)}");
  });

  it("delete button reuses toggleVisible so removed widgets re-enter the add catalog", () => {
    // 删除走 toggleVisible（从 visible 移除），添加区域基于 state.visible 计算，
    // 因此删除后隐藏 widget 自动在添加区域重新出现。
    const toggleBlock = widgetsSectionSource.slice(
      widgetsSectionSource.indexOf("const toggleVisible = useCallback"),
      widgetsSectionSource.indexOf("const addWidget = useCallback")
    );
    expect(toggleBlock).toContain("visible.splice(idx, 1)");
    expect(toggleBlock).toContain("persist({ ...state, visible });");
    expect(widgetsSectionSource).toContain('onClick={() => addWidget(id)}');
    expect(widgetsSectionSource).toContain("onClick={(e) => { e.stopPropagation(); toggleVisible(id); }}");
  });
});
