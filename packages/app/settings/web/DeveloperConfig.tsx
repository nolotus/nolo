import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  selectDeveloperModeEnabled,
  selectDiagnosticModeEnabled,
  setSettings,
} from "app/settings/settingSlice";
import ToggleSwitch from "render/web/ui/ToggleSwitch";

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

const DeveloperConfig: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const developerMode = useAppSelector(selectDeveloperModeEnabled);
  const diagnosticMode = useAppSelector(selectDiagnosticModeEnabled);

  const handleDeveloperModeChange = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        void dispatch(setSettings({ developerModeEnabled: true }));
        return;
      }
      // Turning off developer mode also clears diagnostic mode.
      void dispatch(
        setSettings({
          developerModeEnabled: false,
          diagnosticModeEnabled: false,
        }),
      );
    },
    [dispatch],
  );

  const handleDiagnosticModeChange = useCallback(
    (enabled: boolean) => {
      if (!developerMode) return;
      void dispatch(setSettings({ diagnosticModeEnabled: enabled }));
    },
    [dispatch, developerMode],
  );

  return (
    <div className="productivity-page developer-config-page">
      <h1 className="page-title">
        {t("settings.developer.title", "开发者")}
      </h1>

      <SettingSection
        title={t("settings.developer.developerMode.title", "开发者模式")}
        description={t(
          "settings.developer.developerMode.description",
          "开启后可使用诊断等面向开发者的功能。关闭时会同时关闭诊断模式。",
        )}
      >
        <ToggleSwitch
          checked={developerMode}
          onChange={handleDeveloperModeChange}
          label={t("settings.developer.developerMode.label", "开发者模式")}
        />
      </SettingSection>

      <SettingSection
        title={t("settings.developer.diagnosticMode.title", "诊断模式")}
        description={t(
          "settings.developer.diagnosticMode.description",
          "开启后可在对话菜单中复制诊断信息。",
        )}
      >
        <ToggleSwitch
          checked={developerMode && diagnosticMode}
          disabled={!developerMode}
          onChange={handleDiagnosticModeChange}
          label={t("settings.developer.diagnosticMode.label", "诊断模式")}
        />
      </SettingSection>
    </div>
  );
};

export default DeveloperConfig;
