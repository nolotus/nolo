// packages/app/settings/fieldSelectors.ts
//
// 单一职责:settings state 的简单字段选择器(无业务派生)。
// 复合 selector(selectTheme / selectEditorConfig / selectEditorCodeTheme)放到
// themeSelectors / editorConfigSelectors。

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "app/store";
import { DEFAULT_USER_PREFERENCE_PROFILE } from "ai/policy/types";
import {
  DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS,
  normalizeAgentUpdateFieldList,
} from "ai/policy/selfUpdateFields";
import { MEDIA_ALLOWANCE_MAX } from "./mediaAllowanceClient";

import {
  normalizePolicyLevelSetting,
  normalizeTonePresetSetting,
  resolveDefaultAgentIdSetting,
  selectResolvedDefaultAgentId,
  normalizeSystemBuiltinSkills,
} from "./settingNormalizers";
import { DEFAULT_SYSTEM_AGENT_CAPABILITIES as DEFAULT_SYSTEM_BUILTIN_SKILLS } from "ai/tools/agentCapabilities";
import type { SettingState, SettingsWriteFailure } from "./settingTypes";

// --- 通用 / 主题字段 ---

/** Retired animation preference: retain selector for legacy callers. */
export const selectPreferredAnimationSet = (_state: RootState): number => 0;

export const selectMaxCost = (state: RootState): number =>
  state.settings.maxCost;

/**
 * 最近一次设置写云端失败的状态（null = 没有未消解的失败）。只读展示面：
 * 本轮只备好状态与 selector，不接任何 UI。`keys` 是**仍未确认落地**的设置键，
 * `reconciliation`/`unresolvedKeys` 是对账结论（见 SettingsWriteFailure）。
 *
 * 生命周期：
 *  - 设置：setSettings 写「首次失败 + 退避后重试一次仍失败」时记录；
 *      被更新的本地意图取代而放弃重试的情形**不记录**（新意图的写决定结果）。
 *  - 清除：同一账号的写**成功**且覆盖了状态里剩下的全部 keys → 清空；
 *      只覆盖一部分 → 从 keys/unresolvedKeys 剔除已覆盖的键，剩余继续可见。
 *  - 跨账号：`accountId` 不同的一律不动（B 账号写成功不清 A 账号的失败状态）。
 *
 * 语义要点：失败**不回滚**乐观值——本 selector 反映的本地状态就是用户的最新编辑，
 * 服务端可能仍是旧值，差异由 unresolvedKeys 表达。
 */
export const selectLastWriteFailure = (
  state: RootState,
): SettingsWriteFailure | null => state.settings.lastWriteFailure ?? null;

/** 是否存在未消解的设置写失败（布尔短路用，避免 UI 每次解构整个对象）。 */
export const selectHasUnsyncedSettingsWrite = (state: RootState): boolean =>
  selectLastWriteFailure(state) !== null;

export const selectMaxExecutionTime = (state: RootState): number =>
  state.settings.maxExecutionTime;

/**
 * 媒体自动执行额度（积分）。服务端独占字段：本地值来自 settings hydrate，
 * 写入只能走 /api/user-settings/media-allowance（见 mediaAllowanceClient）。
 * 非法值按 0（=每次都问）显示，越界的历史值按上限显示（与服务端读取口径一致）。
 */
export const selectAutoApproveCredits = (state: RootState): number => {
  const value = state.settings.autoApproveCredits;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, MEDIA_ALLOWANCE_MAX);
};

export const selectHeaderHeight = (state: RootState): number => state.settings.headerHeight;
export const selectSidebarWidth = (state: RootState): number => state.settings.sidebarWidth;

// --- AI / 上下文策略 ---

export const selectEnableReadCurrentSpace = (state: RootState): boolean =>
  state.settings.enableReadCurrentSpace;

export const selectGlobalPrompt = (state: RootState): string =>
  state.settings.globalPrompt;

export const selectUserTonePreset = (state: RootState) =>
  normalizeTonePresetSetting(state.settings.userTonePreset);

export const selectKnowledgeCaptureLevel = (state: RootState) =>
  normalizePolicyLevelSetting(
    state.settings.knowledgeCaptureLevel,
    DEFAULT_USER_PREFERENCE_PROFILE.knowledgeCaptureLevel,
  ) as SettingState["knowledgeCaptureLevel"];

export const selectSpaceContextLevel = (state: RootState) =>
  state.settings.enableReadCurrentSpace === false
    ? 1
    : (normalizePolicyLevelSetting(
        state.settings.spaceContextLevel,
        DEFAULT_USER_PREFERENCE_PROFILE.spaceContextLevel,
      ) as SettingState["spaceContextLevel"]);

export const selectAutoApproveSelfUpdateFields = createSelector(
  [(state: RootState) => state.settings.autoApproveSelfUpdateFields],
  (fields) =>
    normalizeAgentUpdateFieldList(
      fields,
      DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS,
    ),
);

export const selectAiRecentContentLimit = (state: RootState): number =>
  state.settings.aiRecentContentLimit ?? 50;

// --- 默认启动智能体(preference 是 raw stored,sentinel 留原值;id 是运行时回退后的 nolo agent) ---

export const selectDefaultAgentPreference = (state: RootState): string =>
  resolveDefaultAgentIdSetting(state.settings.defaultAgentId);
export const selectDefaultAgentId = (state: RootState): string =>
  selectResolvedDefaultAgentId(state.settings.defaultAgentId);


// --- 杂项 UI 偏好 ---

export const selectOcrModel = (
  state: RootState,
): "none" | "google_document_ocr" | "olm_ocr" => {
  if (state.settings.ocrModel === "none") return "none";
  if (state.settings.ocrModel === "olm_ocr") return "olm_ocr";
  return "google_document_ocr";
};

/** Legacy selector compatibility: the live device owner is outside Redux. */
export const selectCreateMenuOpenCount = (_state: RootState): number => 0;

export const selectDesktopChromeConnectorEnabled = (
  state: RootState,
): boolean => state.settings.desktopChromeConnectorEnabled === true;

export const selectDeveloperModeEnabled = (state: RootState): boolean =>
  state.settings.developerModeEnabled === true;

export const selectDiagnosticModeEnabled = (state: RootState): boolean =>
  state.settings.diagnosticModeEnabled === true;

/** True only when both developer mode and diagnostic mode are on. */
export const selectCopyDiagnosticsEnabled = (state: RootState): boolean =>
  selectDeveloperModeEnabled(state) && selectDiagnosticModeEnabled(state);

// --- 编辑器原始字段(不含 selectEditorConfig / selectEditorCodeTheme,见 editorConfigSelectors) ---

export const selectEditorDefaultMode = (
  state: RootState,
): "markdown" | "block" => state.settings.editorDefaultMode;

export const selectEditorLightCodeTheme = (state: RootState): string =>
  state.settings.editorLightCodeTheme;

export const selectEditorDarkCodeTheme = (state: RootState): string =>
  state.settings.editorDarkCodeTheme;

export const selectEditorWordCountEnabled = (state: RootState): boolean =>
  state.settings.editorWordCountEnabled;

export const selectEditorShortcuts = (state: RootState) =>
  state.settings.editorShortcuts;

const PLATFORM_MAC_REGEX = /Mac|iPod|iPhone|iPad/;

const isMacPlatform = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.navigator !== "undefined" &&
  PLATFORM_MAC_REGEX.test(window.navigator.platform);

export const selectDeleteShortcut = (state: RootState): string => {
  const shortcut = state.settings.deleteShortcut;
  if (shortcut === undefined || shortcut === null) {
    return isMacPlatform() ? "meta+backspace" : "ctrl+backspace";
  }
  return shortcut;
};

export const selectEditorFontSize = (state: RootState): number =>
  state.settings.editorFontSize;

export const selectEditorAutoSave = (state: RootState): boolean =>
  state.settings.editorAutoSave;

export const selectEditorAutoSaveInterval = (state: RootState): number =>
  state.settings.editorAutoSaveInterval;

// --- 系统内置 Skill ---

/**
 * Select the resolved `systemBuiltinSkills` map (missing keys filled from
 * defaults). Memoized so unrelated Redux updates keep a stable reference.
 */
export const selectSystemBuiltinSkills = createSelector(
  [(state: RootState) => state.settings.systemBuiltinSkills],
  (systemBuiltinSkills): Record<string, boolean> =>
    normalizeSystemBuiltinSkills(
      systemBuiltinSkills,
      DEFAULT_SYSTEM_BUILTIN_SKILLS,
    ),
);
