// packages/app/settings/settingActions.ts
//
// 单一职责:跨 settingSlice 与 settingThunks 共享的 action creator 工厂。
// 抽出来以避免 settingThunks → settingSlice 的循环依赖。

import { createAction } from "@reduxjs/toolkit";

import type { SettingState, SettingsWriteFailure } from "./settingTypes";

/**
 * Apply a normalized settings change payload to the local state. Dispatched by
 * thunks (e.g. setSettings / getSettings) after the payload has been normalized
 * and the persistence plan built.
 */
export const updateSettingsState = createAction<Partial<SettingState>>(
  "settings/_updateSettingsState",
);

/**
 * Advance the local user-intent generation. Dispatched only when a user settings
 * change is published locally (setSettings), so an in-flight hydrate can tell
 * that its cloud read predates newer local intent and must be discarded.
 */
export const bumpLocalIntentEpoch = createAction("settings/_bumpLocalIntentEpoch");

/**
 * 记录（或清除，传 null）最近一次设置写云端失败的状态。由 setSettings 在
 * 重试仍失败、完成对账后 dispatch；`_updateSettingsState` 会剥掉该字段，
 * 所以必须走这个专用 action，不能混进 updateSettingsState 的 payload。
 */
export const recordSettingsWriteFailure = createAction<SettingsWriteFailure | null>(
  "settings/_recordSettingsWriteFailure",
);

/**
 * 记录一次服务端权威回显（当前只有媒体额度 `autoApproveCredits`）。
 *
 * 与 `updateSettingsState` 分开的理由：权威回显必须**原子地**写值并推进
 * `serverAuthorityEchoSeq`（hydrate 的分治守卫靠它判断「远端读期间是否发生过
 * 一次更新的回显」）。而 `updateSettingsState` 会走 normalizeSettingChanges 剥掉
 * 世代字段，既写不了值也推不动世代，因此必须走这个专用 action。
 */
export const recordServerAuthorityEcho = createAction<number>(
  "settings/_recordServerAuthorityEcho",
);
