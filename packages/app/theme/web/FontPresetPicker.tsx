import "../theme-ui.css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  changeFontPreset,
  selectFontPreset,
} from "app/settings/settingSlice";
import {
  FONT_PRESET_VALUES,
  type FontPreset,
} from "app/theme/fontPreference";
import { Select, SelectItem } from "render/web/ui/Select";

const FONT_PRESET_OPTIONS = FONT_PRESET_VALUES.map((value) => ({
  value,
  labelKey: `settings.font.${value}`,
}));

export const FontPresetPicker: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectFontPreset);

  return (
    <Select
      style={{ width: "220px" }}
      selectedKey={current}
      onSelectionChange={(key) => {
        if (key == null) return;
        dispatch(changeFontPreset(String(key) as FontPreset));
      }}
      aria-label={t("settings.appearance.font.title", "字体")}
    >
      {FONT_PRESET_OPTIONS.map((option) => (
        <SelectItem
          key={option.value}
          id={option.value}
          textValue={t(option.labelKey)}
        >
          {t(option.labelKey)}
        </SelectItem>
      ))}
    </Select>
  );
};

