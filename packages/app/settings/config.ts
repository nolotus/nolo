// setting/config.tsx

/**
 * 定义设置页面的路由路径。
 * 这里的路径是相对于 /settings 的基础路径。
 * 例如，SETTING_APPEARANCE 的完整路径是 /settings/appearance
 */
export const SettingRoutePaths = {
  // --- 建议的分组页面 ---

  // 1. 外观设置 (合并了主题、夜间模式、界面定制)
  SETTING_APPEARANCE: "appearance",

  // 2. 账户设置 (保持独立)
  SETTING_ACCOUNT: "user-profile",

  // 3. 安全设置
  SETTING_SECURITY: "security",

  // 4. 编辑器设置 (独立页面)
  SETTING_EDITOR: "editor-config",

  // 5. 聊天设置 (独立页面)
  SETTING_CHAT: "chat-config",

  // 6. 效率工具 (合并了变量和快捷键)
  SETTING_PRODUCTIVITY: "productivity",

  // 密钥管理
  SETTING_SECRETS: "secrets",

  // 本地模型 Runtime
  SETTING_RUNTIME: "runtime",

  // 桌面更新
  SETTING_UPDATES: "updates",

  // 记忆管理
  SETTING_MEMORY: "memory",

  // 本机/远程电脑
  SETTING_MACHINES: "machines",

  // 开发者 / 诊断
  SETTING_DEVELOPER: "developer",

  // 系统内置 Skill 开关
  SETTING_SYSTEM_SKILLS: "system-skills",

  // SETTING 是基础路径，可以重定向到第一个设置页面，例如 'appearance'
  SETTING: "settings",

  // 旧版入口保留为重定向，避免历史链接失效。
  SETTING_LEGACY: "setting",
};

// 可以在设置的侧边栏导航中这样组织：
export const settingNavItems = [
  { path: SettingRoutePaths.SETTING_APPEARANCE, label: "外观" },
  { path: SettingRoutePaths.SETTING_ACCOUNT, label: "账户" },
  { path: SettingRoutePaths.SETTING_SECURITY, label: "安全" },
  { path: SettingRoutePaths.SETTING_EDITOR, label: "编辑器" },
  { path: SettingRoutePaths.SETTING_CHAT, label: "聊天" },
  { path: SettingRoutePaths.SETTING_PRODUCTIVITY, label: "效率" },
  { path: SettingRoutePaths.SETTING_UPDATES, label: "更新" },
];
