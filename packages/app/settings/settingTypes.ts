// packages/app/settings/settingTypes.ts
//
// 单一职责：声明 settings slice 的 Redux state 形状 + 共享常量。
// 不依赖任何业务模块,只 import 主题/字体/策略相关类型。

import type { FontPreset } from "app/theme/fontPreference";
import type { THEME_COLORS } from "app/theme/theme.config";
import type {
  KnowledgeCaptureLevel,
  SpaceContextLevel,
  TonePreset,
} from "ai/policy/types";
import type { AgentUpdateField } from "ai/policy/selfUpdateFields";

/**
 * 写失败后「对账」的结论：
 *  - not-attempted：本次失败已被更新的本地意图取代（或尚未对账），没有结论可给；
 *  - unavailable  ：重读服务端 settings record 失败，无法判定；
 *  - matched      ：服务端已包含本次意图（例如写已落地但响应失败）；
 *  - mismatched   ：服务端仍是别的值，差异键见 unresolvedKeys（本地乐观值保留，
 *                   绝不自动回滚）。
 */
export type SettingsWriteReconciliation =
  | "not-attempted"
  | "unavailable"
  | "matched"
  | "mismatched";

/**
 * 一次「设置写云端失败」的最小可读状态。只活在本地：`normalizeSettingChanges`
 * 会剥掉它，因此既不会写进云端 settings record，也不会从 record 回灌。
 * null = 当前没有未消解的写失败。
 *
 * 只有「重试仍失败」这一条路径才会构造它（此时必然已尝试两次），因此不额外
 * 携带 attempts 之类恒量字段。生命周期见 selectLastWriteFailure 的注释：
 * 设置写成功后按「覆盖了哪些键」清除或收窄。
 */
export interface SettingsWriteFailure {
  /** 失败写入所属账号（跨账号互不影响：其它账号的成功写不清它）。 */
  accountId: string;
  /** 仍未确认落地到云端的设置键（已排序；成功写会剔除已覆盖的键）。 */
  keys: string[];
  /** 首次失败的时间戳（epoch ms）。 */
  at: number;
  /** 对账结论，见 SettingsWriteReconciliation。 */
  reconciliation: SettingsWriteReconciliation;
  /** 对账后仍与服务端不一致的键（matched 时为空）。 */
  unresolvedKeys: string[];
}

export interface SettingState {
  isAutoSync: boolean;
  currentServer: string;
  syncServers: string[];

  maxExecutionTime: number;
  maxCost: number;
  autoApproveCredits: number;

  themeName: keyof typeof THEME_COLORS;
  themeMode: "system" | "light" | "dark";
  isDark: boolean; // resolved value: managed by setThemeMode + useSystemTheme
  sidebarWidth: number;
  headerHeight: number;
  density: "compact" | "spacious";
  fontPreset: FontPreset;

  // 编辑器配置
  editorDefaultMode: "markdown" | "block";
  editorLightCodeTheme: string;
  editorDarkCodeTheme: string;
  editorWordCountEnabled: boolean;
  editorShortcuts: {
    heading: boolean;
    ulist: boolean;
    olist: boolean;
    quote: boolean;
    code: boolean;
    tasklist: boolean;
  };
  editorFontSize: number;
  editorAutoSave: boolean;
  editorAutoSaveInterval: number;
  editorLineNumbers: boolean;
  editorWordWrap: boolean;
  editorSpellCheck: boolean;
  editorTabSize: number;
  editorFontFamily: string;

  // 是否允许读取当前空间内容作为上下文
  enableReadCurrentSpace: boolean;

  // 通用提示词
  globalPrompt: string;

  // 用户偏好的语气 preset(尽量通用,不覆盖 agent 自身人格)
  userTonePreset: TonePreset;

  // AI 对知识沉淀(doc/table)的主动程度
  knowledgeCaptureLevel: KnowledgeCaptureLevel;

  // AI 使用当前空间作为上下文的积极程度
  spaceContextLevel: SpaceContextLevel;

  // updateSelf 默认哪些字段不再询问
  autoApproveSelfUpdateFields: AgentUpdateField[];

  // AI Recent Content Limit
  aiRecentContentLimit: number;

  // 默认启动的智能体 ID
  defaultAgentId?: string;

  // quick-chat 自动模式的「模型层覆盖」agent：分类路由落到通用档时，
  // 用该收藏 agent 的 model 配置替换内置档位 model 层，并合并其技能。
  // 空字符串 = 不覆盖（使用内置档位 agent）。
  quickChatAutoAgentId: string;

  // PDF OCR 模型选择("none" 表示不使用 OCR,用 pdf.js 提取文本)
  ocrModel: "none" | "google_document_ocr" | "olm_ocr";

  desktopChromeConnectorEnabled: boolean;
  /** Master switch for developer-facing settings. Default false. */
  developerModeEnabled: boolean;
  /** When true (and developer mode on), show copy-diagnostics in dialog menus. */
  diagnosticModeEnabled: boolean;
  deleteShortcut: string;

  /**
   * 系统内置 Skill 全局开关映射。key 是内置 skill 的 pack id（与
   * `CAPABILITY_PACKS` 中的 id 对齐），value 为是否启用。默认
   * `{ "web-search": true }`——即「联网搜索」默认开启，用户可在设置页关闭。
   * 关闭后三端运行时（Web/CLI/桌面）统一从工具面过滤掉该 skill 包的工具。
   */
  systemBuiltinSkills: Record<string, boolean>;

  /**
   * 单调递增的「本地用户意图」世代，只由 setSettings 的乐观发布推进
   * （hydrate 分支绝不推进）。getSettings 在入口记下起始值、应用前比对：
   * 远端读期间用户已改过设置 → 本次 hydrate 整体丢弃，避免同一账号内
   * 迟到的云端旧值把 Owner / Redux 回滚成旧值。只活在本地状态里，
   * 不入设置 record（normalizeSettingChanges 会剥掉它）。
   */
  localIntentEpoch: number;

  /**
   * 单调递增的「服务端权威回显」世代，只由权威回显写入推进（当前只有媒体额度
   * `autoApproveCredits` 的服务端回显，见 `recordServerAuthorityEcho`）。
   *
   * 它与 `localIntentEpoch`（用户意图世代）**互相独立**：用户意图永不推进它，
   * 权威回显也永不推进用户意图世代。理由是二者的失效方向不同——用户意图要防
   * 「迟到的云端旧值回滚用户编辑」，权威回显要防「迟到的 record 旧值覆盖更新的
   * 服务端回显」。
   *
   * 用途：getSettings 在入口记下起始值，应用 hydrate 前比对——远端读期间若发生过
   * 权威回显，则本次 hydrate **跳过** `autoApproveCredits`（不覆盖更新的回显值）；
   * `userAuthorityRegistry` 由同一次读派生，不受此守卫影响。
   *
   * 只活在本地状态里，不入设置 record（normalizeSettingChanges 会剥掉它）。
   */
  serverAuthorityEchoSeq: number;

  /**
   * 最近一次设置写云端失败的最小状态（见 SettingsWriteFailure）。
   * 只供 UI 读取与后续显式重试使用；不入 settings record。
   */
  lastWriteFailure: SettingsWriteFailure | null;

  // 用户-服务 authority 映射(仅在 hydrateStoredSettings 时填入;不入设置 record)
  userAuthorityRegistry?: Record<string, string>;

  [key: string]: unknown;
}

export const SYSTEM_DEFAULT_AGENT_ID = "system-default";
