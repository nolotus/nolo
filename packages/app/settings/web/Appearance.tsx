import React from "react";
import { useTranslation } from "react-i18next";
import { ThemePicker } from "app/theme/web/ThemePicker";
import { DarkModeSwitch } from "app/theme/web/DarkModeSwitch";
import { DensitySwitch } from "app/theme/web/DensitySwitch";
import { FontPresetPicker } from "app/theme/web/FontPresetPicker";

const SettingSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="setting-section">
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      <p className="section-description">{description}</p>
    </div>
    <div className="section-content">{children}</div>
  </section>
);

const Appearance: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      
      <div className="appearance-page">
        <h1 className="page-title">{t("settings.appearance.title")}</h1>

        <SettingSection
          title={t("settings.appearance.theme.title")}
          description={t("settings.appearance.theme.description")}
        >
          <ThemePicker />
        </SettingSection>

        <SettingSection
          title={t("settings.appearance.mode.title")}
          description={t("settings.appearance.mode.description")}
        >
          <DarkModeSwitch />
        </SettingSection>

        <SettingSection
          title={t("settings.appearance.density.title", "布局密度")}
          description={t("settings.appearance.density.description", "紧凑模式让侧边栏更小，宽松模式更易点击")}
        >
          <DensitySwitch />
        </SettingSection>

        <SettingSection
          title={t("settings.appearance.font.title", "字体")}
          description={t(
            "settings.appearance.font.description",
            "选择你喜欢的界面字体。比如你喜欢宋体时，可以在这里切换。"
          )}
        >
          <FontPresetPicker />
        </SettingSection>

      </div>
    </>
  );
};

export default Appearance;
