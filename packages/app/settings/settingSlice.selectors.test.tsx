import { describe, expect, test } from "bun:test";
import { noloAgentId } from "core/init";

let moduleVersion = 0;

const loadSettingSlice = () => import(`./settingSlice.tsx?test=${moduleVersion++}`);

const expectedLocalRuntimeOrigin =
  typeof window !== "undefined" &&
  typeof window.location?.origin === "string" &&
  /^https?:\/\//.test(window.location.origin)
    ? window.location.origin.replace(/\/+$/, "")
    : undefined;

describe("settingSlice selectors", () => {

  test("resolves missing and legacy system-default agent values to the current nolo", async () => {
    const {
      default: settingReducer,
      SYSTEM_DEFAULT_AGENT_ID,
      selectDefaultAgentId,
      selectDefaultAgentPreference,
    } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });
    const legacyState = settingReducer(baseState, {
      type: "settings/_updateSettingsState",
      payload: {
        defaultAgentId: noloAgentId,
      },
    } as any);

    expect(selectDefaultAgentPreference({ settings: baseState } as any)).toBe(
      SYSTEM_DEFAULT_AGENT_ID
    );
    expect(selectDefaultAgentId({ settings: baseState } as any)).toBe(
      noloAgentId
    );
    expect(selectDefaultAgentPreference({ settings: legacyState } as any)).toBe(
      SYSTEM_DEFAULT_AGENT_ID
    );
    expect(selectDefaultAgentId({ settings: legacyState } as any)).toBe(
      noloAgentId
    );
  });

  test("provides stable defaults for user policy selectors", async () => {
    const {
      default: settingReducer,
      selectKnowledgeCaptureLevel,
      selectSpaceContextLevel,
      selectUserTonePreset,
    } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });

    expect(selectUserTonePreset({ settings: baseState } as any)).toBe("default");
    expect(selectKnowledgeCaptureLevel({ settings: baseState } as any)).toBe(2);
    expect(selectSpaceContextLevel({ settings: baseState } as any)).toBe(3);
  });

  test("normalizes create-menu open count for compact sidebar preference", async () => {
    const { selectCreateMenuOpenCount } = await loadSettingSlice();

    expect(selectCreateMenuOpenCount({ settings: {} } as any)).toBe(0);
    expect(selectCreateMenuOpenCount({ settings: { createMenuOpenCount: 3.8 } } as any)).toBe(3);
    expect(selectCreateMenuOpenCount({ settings: { createMenuOpenCount: -1 } } as any)).toBe(0);
  });

  test("defaults desktop Chrome connector capability pack to disabled", async () => {
    const {
      default: settingReducer,
      selectDesktopChromeConnectorEnabled,
      buildSettingsPersistencePlan,
    } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });

    expect(selectDesktopChromeConnectorEnabled({ settings: baseState } as any)).toBe(false);

    const plan = buildSettingsPersistencePlan({
      userId: "user-1",
      currentSettings: baseState,
      changes: { desktopChromeConnectorEnabled: true },
      previousDefaultAgentRecord: null,
    });

    expect(plan.settingsPatch).toMatchObject({
      dbKey: "user-1-settings",
      changes: { desktopChromeConnectorEnabled: true },
    });
  });

  test("defaults developer and diagnostic modes to off; copy diagnostics requires both", async () => {
    const {
      default: settingReducer,
      selectDeveloperModeEnabled,
      selectDiagnosticModeEnabled,
      selectCopyDiagnosticsEnabled,
      buildSettingsPersistencePlan,
    } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });

    expect(selectDeveloperModeEnabled({ settings: baseState } as any)).toBe(false);
    expect(selectDiagnosticModeEnabled({ settings: baseState } as any)).toBe(false);
    expect(selectCopyDiagnosticsEnabled({ settings: baseState } as any)).toBe(false);

    const developerOnly = {
      ...baseState,
      developerModeEnabled: true,
      diagnosticModeEnabled: false,
    };
    expect(selectCopyDiagnosticsEnabled({ settings: developerOnly } as any)).toBe(false);

    const bothOn = {
      ...baseState,
      developerModeEnabled: true,
      diagnosticModeEnabled: true,
    };
    expect(selectCopyDiagnosticsEnabled({ settings: bothOn } as any)).toBe(true);

    const plan = buildSettingsPersistencePlan({
      userId: "user-1",
      currentSettings: baseState,
      changes: {
        developerModeEnabled: true,
        diagnosticModeEnabled: true,
      },
      previousDefaultAgentRecord: null,
    });

    expect(plan.settingsPatch).toMatchObject({
      dbKey: "user-1-settings",
      changes: {
        developerModeEnabled: true,
        diagnosticModeEnabled: true,
      },
    });
  });

  test("lets assistant message styling fall back to the layout defaults in both light and dark themes", async () => {
    const { default: settingReducer, selectTheme } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });

    const lightTheme = selectTheme({
      settings: {
        ...baseState,
        isDark: false,
      },
    } as any);
    const darkTheme = selectTheme({
      settings: {
        ...baseState,
        isDark: true,
      },
    } as any);

    expect(lightTheme).not.toHaveProperty("msgBotBg");
    expect(lightTheme).not.toHaveProperty("msgBotRadius");
    expect(lightTheme).not.toHaveProperty("msgBotPadding");
    expect(darkTheme).not.toHaveProperty("msgBotBg");
    expect(darkTheme).not.toHaveProperty("msgBotRadius");
    expect(darkTheme).not.toHaveProperty("msgBotPadding");
  });

  test("exposes the configured font preset through theme CSS variables", async () => {
    const { default: settingReducer, selectFontPreset, selectTheme } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });
    const nextState = settingReducer(baseState, {
      type: "settings/_updateSettingsState",
      payload: {
        fontPreset: "song",
      },
    } as any);

    expect(selectFontPreset({ settings: nextState } as any)).toBe("song");
    expect(selectTheme({ settings: nextState } as any).font).toEqual({
      ui: "var(--font-ui-song)",
      "sans-zh": "var(--font-sans-zh-song)",
      "sans-en": "var(--font-sans-en-song)",
      "sans-ja": "var(--font-sans-ja-system)",
      "sans-ko": "var(--font-sans-ko-system)",
    });
  });

  test("maps disabled read-current-space toggle to the most restrictive space context level", async () => {
    const { default: settingReducer, selectSpaceContextLevel } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });
    const nextState = settingReducer(baseState, {
      type: "settings/_updateSettingsState",
      payload: {
        enableReadCurrentSpace: false,
      },
    } as any);

    expect(selectSpaceContextLevel({ settings: nextState } as any)).toBe(1);
  });

  test("expands remote selector server lists for the nolo cluster", async () => {
    const { default: settingReducer, selectRemoteServers } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });
    const nextState = settingReducer(baseState, {
      type: "settings/_updateSettingsState",
      payload: {
        currentServer: "https://nolo.chat",
        syncServers: [],
      },
    } as any);

    expect(selectRemoteServers({ settings: nextState } as any)).toEqual(
      expectedLocalRuntimeOrigin
        ? ["https://nolo.chat", expectedLocalRuntimeOrigin, "https://us.nolo.chat"]
        : ["https://nolo.chat", "https://us.nolo.chat"]
    );
  });
});
