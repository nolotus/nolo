import "../theme-ui.css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useStoreDeviceAppearance } from "../storeDeviceAppearance";
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
  const { controller, snapshot } = useStoreDeviceAppearance();
  const current = snapshot.fontPreset;

  return (
    <Select
      style={{ width: "220px" }}
      selectedKey={current}
      onSelectionChange={(key) => {
        if (key == null) return;
        controller.updateAndPersist({ fontPreset: String(key) as FontPreset });
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

