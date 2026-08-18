// packages/app/settings/config.ts
var SettingRoutePaths = {
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
  SETTING_LEGACY: "setting"
};
var settingNavItems = [
  { path: SettingRoutePaths.SETTING_APPEARANCE, label: "\u5916\u89C2" },
  { path: SettingRoutePaths.SETTING_ACCOUNT, label: "\u8D26\u6237" },
  { path: SettingRoutePaths.SETTING_SECURITY, label: "\u5B89\u5168" },
  { path: SettingRoutePaths.SETTING_EDITOR, label: "\u7F16\u8F91\u5668" },
  { path: SettingRoutePaths.SETTING_CHAT, label: "\u804A\u5929" },
  { path: SettingRoutePaths.SETTING_PRODUCTIVITY, label: "\u6548\u7387" },
  { path: SettingRoutePaths.SETTING_UPDATES, label: "\u66F4\u65B0" }
];

export {
  SettingRoutePaths
};
