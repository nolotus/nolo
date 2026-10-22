// packages/app/settings/editorConfigSelectors.ts
//
// 仅聚合账号级编辑器配置；外观明暗状态由 Device Appearance Owner 决定。

import { createSelector } from "@reduxjs/toolkit";

import {
  selectEditorAutoSave,
  selectEditorAutoSaveInterval,
  selectEditorDarkCodeTheme,
  selectEditorDefaultMode,
  selectEditorFontSize,
  selectEditorLightCodeTheme,
  selectEditorShortcuts,
  selectEditorWordCountEnabled,
} from "./fieldSelectors";

export const selectEditorConfig = createSelector(
  [
    selectEditorDefaultMode,
    selectEditorLightCodeTheme,
    selectEditorDarkCodeTheme,
    selectEditorWordCountEnabled,
    selectEditorShortcuts,
    selectEditorFontSize,
    selectEditorAutoSave,
    selectEditorAutoSaveInterval,
  ],
  (
    defaultMode,
    lightCodeTheme,
    darkCodeTheme,
    wordCountEnabled,
    shortcuts,
    fontSize,
    autoSave,
    autoSaveInterval,
  ) => {
    return {
      defaultMode,
      lightCodeTheme,
      darkCodeTheme,
      wordCountEnabled,
      shortcuts,
      fontSize,
      autoSave,
      autoSaveInterval,
    };
  },
);
