import {
  LuBrain,
  LuBug,
  LuCode,
  LuDownload,
  LuGauge,
  LuKey,
  LuLaptop,
  LuMessageSquare,
  LuPalette,
  LuShield,
  LuSparkles,
  LuUser,
} from "react-icons/lu";
import { isDesktopApp } from "app/utils/env";
import { SettingRoutePaths } from "./config";

type TranslateFn = (key: string, fallback: string) => unknown;

export const buildSettingNavItems = (t: TranslateFn) => {
  const items = [
    {
      path: SettingRoutePaths.SETTING_APPEARANCE,
      label: String(t("settings.nav.appearance", "外观")),
      Icon: LuPalette,
    },
    {
      path: SettingRoutePaths.SETTING_ACCOUNT,
      label: String(t("settings.nav.account", "账户")),
      Icon: LuUser,
    },
    {
      path: SettingRoutePaths.SETTING_SECURITY,
      label: String(t("settings.nav.security", "安全")),
      Icon: LuShield,
    },
    {
      path: SettingRoutePaths.SETTING_EDITOR,
      label: String(t("settings.nav.editor", "编辑器")),
      Icon: LuCode,
    },
    {
      path: SettingRoutePaths.SETTING_CHAT,
      label: String(t("settings.nav.chat", "对话")),
      Icon: LuMessageSquare,
    },
    {
      path: SettingRoutePaths.SETTING_PRODUCTIVITY,
      label: String(t("settings.nav.productivity", "效率")),
      Icon: LuGauge,
    },
    {
      path: SettingRoutePaths.SETTING_SECRETS,
      label: String(t("settings.nav.secrets", "密钥")),
      Icon: LuKey,
    },
    {
      path: SettingRoutePaths.SETTING_MEMORY,
      label: String(t("settings.nav.memory", "个性化设置")),
      Icon: LuBrain,
    },
    {
      path: SettingRoutePaths.SETTING_DEVELOPER,
      label: String(t("settings.nav.developer", "开发者")),
      Icon: LuBug,
    },
    {
      path: SettingRoutePaths.SETTING_SYSTEM_SKILLS,
      label: String(t("settings.nav.systemSkills", "Agent 能力")),
      Icon: LuSparkles,
    },
    {
      path: SettingRoutePaths.SETTING_MACHINES,
      label: String(t("settings.nav.machines", "电脑")),
      Icon: LuLaptop,
    },
  ];
  if (isDesktopApp) {
    items.push({
      path: SettingRoutePaths.SETTING_RUNTIME,
      label: String(t("settings.nav.runtime", "Runtime")),
      Icon: LuLaptop,
    });
    items.push({
      path: SettingRoutePaths.SETTING_UPDATES,
      label: String(t("settings.nav.updates", "更新")),
      Icon: LuDownload,
    });
  }
  return items;
};
