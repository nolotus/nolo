// packages/app/settings/settingInitialState.ts
//
// 单一职责:计算 settings slice 的 initialState。

import { DEFAULT_USER_PREFERENCE_PROFILE } from "ai/policy/types";
import { DEFAULT_SYSTEM_AGENT_CAPABILITIES } from "ai/tools/agentCapabilities";
import { DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS } from "ai/policy/selfUpdateFields";
import { SERVERS } from "database/config";
import { isProduction } from "app/utils/env";

import { SYSTEM_DEFAULT_AGENT_ID, type SettingState } from "./settingTypes";
import { resolveCloudBootstrapServer } from "./serverBootstrap";

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
  maxExecutionTime: 600_000,
  maxCost: 1,
  autoApproveCredits: 0,
  sidebarWidth: 280,
  headerHeight: 56,
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
  enabledPromptSkills: [],
  globalPrompt: "",
  userTonePreset: "default",
  knowledgeCaptureLevel: DEFAULT_USER_PREFERENCE_PROFILE.knowledgeCaptureLevel,
  spaceContextLevel: DEFAULT_USER_PREFERENCE_PROFILE.spaceContextLevel,
  autoApproveSelfUpdateFields: [...DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS],
  aiRecentContentLimit: 50,
  defaultAgentId: SYSTEM_DEFAULT_AGENT_ID,
  // 本地用户意图世代：0 起步，由 setSettings 的乐观发布单调推进。
  localIntentEpoch: 0,
  // 服务端权威回显世代：0 起步，由权威回显写入（recordServerAuthorityEcho）单调推进。
  serverAuthorityEchoSeq: 0,
  // 设置写失败状态：null = 无未消解的写失败（见 SettingsWriteFailure）。
  lastWriteFailure: null,
  quickChatAutoAgentId: "",
  ocrModel: "google_document_ocr",
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
