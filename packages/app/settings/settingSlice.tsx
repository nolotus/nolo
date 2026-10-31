// packages/app/settings/settingSlice.tsx
//
// 公共 entry point for the settings slice.
//
// 单一职责:声明 settings slice(reducer + 3 reducers) 并把按职责拆出去的
// 内部模块(类型 / 初始 state / 归一化 / 持久化 / 选择器 / thunks)重新导出。
// 调用方统一 `import { ... } from "app/settings/settingSlice"`,API 表面零变动。
//
// 各模块职责见各自文件顶部注释。

import {
  asyncThunkCreator,
  buildCreateSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import { initialState } from "./settingInitialState";
import { normalizeSettingChanges } from "./settingPersistence";
import type { SettingState, SettingsWriteFailure } from "./settingTypes";

// ---------------------------------------------------------------------------
// Slice 创建
// ---------------------------------------------------------------------------

const createSliceWithThunks = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
});

const settingSlice = createSliceWithThunks({
  name: "settings",
  initialState,
  reducers: {
    _updateSettingsState: (
      state,
      action: PayloadAction<Partial<SettingState>>,
    ) => {
      Object.assign(state, normalizeSettingChanges(action.payload));
    },
    // 单调推进本地用户意图世代：只有 setSettings 的乐观发布走这里（hydrate 不走）。
    _bumpLocalIntentEpoch: (state) => {
      state.localIntentEpoch = (state.localIntentEpoch ?? 0) + 1;
    },
    // 记录设置写失败状态。专用 reducer：`_updateSettingsState` 会走
    // normalizeSettingChanges 把该字段剥掉（防止写进云端 record）。
    _recordSettingsWriteFailure: (
      state,
      action: PayloadAction<SettingsWriteFailure | null>,
    ) => {
      state.lastWriteFailure = action.payload ?? null;
    },
    // 服务端权威回显：原子地写权威值 + 推进权威回显世代。
    // 专用 reducer：`_updateSettingsState` 会走 normalizeSettingChanges 把
    // serverAuthorityEchoSeq 剥掉，既写不进值也推不动世代。
    _recordServerAuthorityEcho: (state, action: PayloadAction<number>) => {
      const next = action.payload;
      if (typeof next !== "number" || !Number.isFinite(next)) return;
      state.autoApproveCredits = next;
      state.serverAuthorityEchoSeq = (state.serverAuthorityEchoSeq ?? 0) + 1;
    },
    addHostToCurrentServer: (state, action: PayloadAction<string>) => {
      const rawValue = action.payload;
      if (typeof rawValue !== "string" || rawValue.trim() === "") return;

      const trimmed = rawValue.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        try {
          state.currentServer = new URL(trimmed).origin;
          return;
        } catch {
          return;
        }
      }

      const host = trimmed.replace(/^\/+|\/+$/g, "");
      const [hostname] = host.split(":");
      if (!hostname) return;
      const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      const isLocal =
        ["nolotus.local", "localhost"].includes(hostname) || isIpAddress;
      const protocol = isLocal ? "http" : "https";
      state.currentServer = `${protocol}://${host}`;
    },
  },
});

export const { addHostToCurrentServer } = settingSlice.actions;

// ---------------------------------------------------------------------------
// Re-export 公共 API 表面(保持调用方 import 路径不变)
// ---------------------------------------------------------------------------

// 常量 + 类型
export { SYSTEM_DEFAULT_AGENT_ID, type SettingState } from "./settingTypes";

// 本地 state 写入 action（服务端独占字段保存成功后回写本地状态用）
export { updateSettingsState } from "./settingActions";
// 写失败状态的记录 action（由 setSettings 的重试/对账路径 dispatch）
export { recordSettingsWriteFailure } from "./settingActions";
// 服务端权威回显 action（原子写权威值 + 推进权威回显世代）
export { recordServerAuthorityEcho } from "./settingActions";
// 写失败状态 selector（本轮只备好状态与选择器，UI 组件后续接入）
export { selectLastWriteFailure, selectHasUnsyncedSettingsWrite } from "./fieldSelectors";

// server selectors
export {
  selectSettings,
  selectCurrentServer,
  selectSyncServers,
  selectRemoteServer,
  selectRemoteSyncServers,
  selectRemoteServers,
} from "./serverSelectors";

// 简单字段 selectors
export {
  selectPreferredAnimationSet,
  selectMaxCost,
  selectMaxExecutionTime,
  selectAutoApproveCredits,
  selectHeaderHeight,
  selectSidebarWidth,
  selectEnableReadCurrentSpace,
  selectGlobalPrompt,
  selectUserTonePreset,
  selectKnowledgeCaptureLevel,
  selectSpaceContextLevel,
  selectAutoApproveSelfUpdateFields,
  selectAiRecentContentLimit,
  selectEnabledPromptSkills,
  selectDefaultAgentPreference,
  selectDefaultAgentId,
  selectOcrModel,
  selectCreateMenuOpenCount,
  selectDesktopChromeConnectorEnabled,
  selectDeveloperModeEnabled,
  selectDiagnosticModeEnabled,
  selectCopyDiagnosticsEnabled,
  selectEditorDefaultMode,
  selectEditorLightCodeTheme,
  selectEditorDarkCodeTheme,
  selectEditorWordCountEnabled,
  selectEditorShortcuts,
  selectDeleteShortcut,
  selectEditorFontSize,
  selectEditorAutoSave,
  selectEditorAutoSaveInterval,
  selectSystemBuiltinSkills,
} from "./fieldSelectors";

// 复合 selectors
export {
  selectEditorConfig,
} from "./editorConfigSelectors";

// 持久化 / hydrate 工具
export {
  normalizeSettingChanges,
  hydrateStoredSettings,
  buildSettingsPersistencePlan,
  persistDefaultAgentRegister,
  getCachedDefaultAgentRegisterRecord,
  LOCAL_FIRST_APPEARANCE_KEYS,
  LOCAL_ONLY_SETTINGS_KEYS,
  isLocalFirstAppearanceChange,
  stripRegisterBackedFieldsFromSettingsWrite,
  sanitizeStoredSettingsRecord,
} from "./settingPersistence";

// thunks
export {
  getSettings,
  setSettings,
  setAccountChatDisplayPreferences,
  setSidebarWidth,
  toggleEnableReadCurrentSpace,
  setEditorDefaultMode,
  setEditorLightCodeTheme,
  setEditorDarkCodeTheme,
  setEditorCodeTheme,
  toggleEditorWordCount,
  toggleEditorShortcut,
  setEditorFontSize,
  toggleEditorAutoSave,
  setEditorAutoSaveInterval,
  setGlobalPrompt,
  setUserTonePreset,
  setKnowledgeCaptureLevel,
  setSpaceContextLevel,
  setAiRecentContentLimit,
  setMaxExecutionTime,
  setDefaultAgentId,
} from "./settingThunks";

export default settingSlice.reducer;
