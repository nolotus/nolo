// packages/app/settings/settingInitialState.ts
//
// 单一职责:计算 settings slice 的 initialState。
// 包含主题预加载(_preloadedTheme)以匹配内联 bootstrap 脚本,避免 GlobalThemeController
// 在 paint 前用过期默认值覆盖正确主题。

import { DEFAULT_USER_PREFERENCE_PROFILE } from "ai/policy/types";
import { DEFAULT_SYSTEM_AGENT_CAPABILITIES } from "ai/tools/agentCapabilities";
import { DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS } from "ai/policy/selfUpdateFields";
import { SERVERS } from "database/config";
import { isProduction } from "app/utils/env";
import { DEFAULT_FONT_PRESET } from "app/theme/fontPreference";
import { DEFAULT_THEME_NAME } from "app/theme/theme.config";
import {
  resolveThemeModePreload,
  SYSTEM_DARK_MEDIA_QUERY,
} from "app/theme/themeModeBootstrap";

import { SYSTEM_DEFAULT_AGENT_ID, type SettingState } from "./settingTypes";
import { resolveCloudBootstrapServer } from "./serverBootstrap";

/**
 * Resolve themeMode + isDark from localStorage + system preference at load time,
 * matching the inline bootstrap script so GlobalThemeController never overwrites
 * the correct pre-paint theme with a stale hardcoded default.
 */
const safeLocalStorage = (): Storage | undefined => {
  try {
    return typeof localStorage !== "undefined" ? localStorage : undefined;
  } catch {
    // sandbox iframe（opaque origin）访问 localStorage 会抛 SecurityError
    return undefined;
  }
};

const _preloadedTheme =
  typeof window !== "undefined"
    ? resolveThemeModePreload({
        storage: safeLocalStorage(),
        systemPrefersDark:
          typeof window.matchMedia === "function"
            ? window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches
            : false,
      })
    : { themeMode: "system" as const, isDark: false };

// Web 首帧 currentServer 用运行时 origin（见 serverBootstrap.ts，判定与旧
// App.tsx mount effect 等价：date/crm/desktop 除外，其余 host 都指回自己）。
// SSR 端 window 为 undefined → 这里返回 undefined，服务端 store 落到默认
// MAIN/US；有 SSR 时该 module-load 值会被序列化下来的 preloadedState 覆盖
// （白名单站点由 render.tsx 注入运行时 origin，非白名单站点保持默认；客户端
// entry.tsx 走同一闸门 resolveClientHydrateServer），因此 hydrate 帧与 SSR 一致。
// 本模块的浏览器取值只对「无 SSR HTML 的纯 CSR 启动」生效；非白名单 host 的挂载后
// 纠正仍由 App.tsx 的 mount effect（dispatch(addHostToCurrentServer)）负责。
const _runtimeBootstrapServer =
  typeof window !== "undefined"
    ? resolveCloudBootstrapServer({
        hostname: window.location?.hostname,
        origin: window.location?.origin,
      })
    : undefined;

export const initialState: SettingState = {
  isAutoSync: false,
  currentServer:
    _runtimeBootstrapServer ?? (isProduction ? SERVERS.MAIN : SERVERS.US),
  syncServers: Object.values(SERVERS),
  showThinking: true,
  preferredAnimationSet: 0,
  maxExecutionTime: 600_000,
  maxCost: 1,
  themeName: DEFAULT_THEME_NAME,
  themeMode: _preloadedTheme.themeMode,
  isDark: _preloadedTheme.isDark,
  sidebarWidth: 280,
  headerHeight: 56,
  density: "compact",
  fontPreset: DEFAULT_FONT_PRESET,
  editorDefaultMode: "markdown",
  editorLightCodeTheme: "default",
  editorDarkCodeTheme: "okaidia",
  editorWordCountEnabled: true,
  editorShortcuts: {
    heading: true,
    ulist: true,
    olist: true,
    quote: true,
    code: true,
    tasklist: true,
  },
  editorFontSize: 14,
  editorAutoSave: true,
  editorAutoSaveInterval: 30,
  editorLineNumbers: false,
  editorWordWrap: true,
  editorSpellCheck: true,
  editorTabSize: 2,
  editorFontFamily: "SF Mono, Monaco, Cascadia Code, Roboto Mono, monospace",
  enableReadCurrentSpace: true,
  globalPrompt: "",
  userTonePreset: "default",
  knowledgeCaptureLevel: DEFAULT_USER_PREFERENCE_PROFILE.knowledgeCaptureLevel,
  spaceContextLevel: DEFAULT_USER_PREFERENCE_PROFILE.spaceContextLevel,
  autoApproveSelfUpdateFields: [...DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS],
  aiRecentContentLimit: 50,
  defaultAgentId: SYSTEM_DEFAULT_AGENT_ID,
  quickChatAutoAgentId: "",
  ocrModel: "google_document_ocr",
  showScrollToTopButton: false,
  showScrollToBottomButton: false,
  createMenuOpenCount: 0,
  desktopChromeConnectorEnabled: false,
  developerModeEnabled: false,
  diagnosticModeEnabled: false,
  deleteShortcut:
    typeof window !== "undefined" &&
    typeof window.navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)
      ? "meta+backspace"
      : "ctrl+backspace",
  // 系统内置 Skill 默认全开；用户可在设置页单关。目前只有 web-search。
  systemBuiltinSkills: { ...DEFAULT_SYSTEM_AGENT_CAPABILITIES },
};

/**
 * Default enabled state for each system built-in skill. Used as the fallback
 * when hydrating a partial/persisted `systemBuiltinSkills` map, so newly
 * added built-in skills are on by default for existing users. Must stay in
 * sync with `initialState.systemBuiltinSkills`.
 */
export const DEFAULT_SYSTEM_BUILTIN_SKILLS = DEFAULT_SYSTEM_AGENT_CAPABILITIES;
