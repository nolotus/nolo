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
    expect(usageWidgetSource).toContain("selectCurrentUserBalance");
    expect(usageWidgetSource).toContain("useUserId");
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
    expect(homeSource).toContain("home-authed-widgets-section");
    expect(homeSource).toContain("<WidgetsSection");
    expect(homeSource).not.toContain('id: "usage"');
  });

  it("Appearance settings page no longer shows a widgets experimental toggle", () => {
    expect(appearanceSource).not.toContain("selectWidgetsEnabled");
    expect(appearanceSource).not.toContain("settings.appearance.experimental");
    expect(appearanceSource).not.toContain("ToggleSwitch");
  });
});
