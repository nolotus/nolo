import { BUILTIN_NOLO_AGENT_KEY } from "core/builtinAgents";
import type { AgentRuntimeAgentConfig } from "./hostAdapter";

/**
 * 图片档已移除：有图时统一走 flash 档（纯文本模型收到图片时仅剥离为占位文本，
 * 见 packages/ai/agent/imagePreprocessing.ts），不再自动切 Kimi。
 * 保留 "image" 在类型里以兼容旧持久化 dialog（resolveDialogAutoTier
 * 会把 "image" 映射为 "flash"）。
 */
export type AutoExecutionTier = "flash" | "balanced" | "quality" | "image";

export type AutoExecutionProfile = AgentRuntimeAgentConfig & {
  id: string;
  tier: AutoExecutionTier;
  /** Compatibility identifier for runtime APIs that still accept an agent key. */
  legacyAgentKey: string;
};

const createProfile = (input: {
  id: string;
  tier: AutoExecutionTier;
  legacyAgentKey: string;
  name: string;
  model: string;
}): AutoExecutionProfile => ({
  id: input.id,
  tier: input.tier,
  legacyAgentKey: input.legacyAgentKey,
  key: input.legacyAgentKey,
  name: input.name,
  provider: "nolo",
  model: input.model,
  apiSource: "platform",
  useServerProxy: true,
  rawRecord: {
    dbKey: input.legacyAgentKey,
    isPublic: true,
    provider: "nolo",
    model: input.model,
    apiSource: "platform",
    useServerProxy: true,
  },
});

const FLASH_PROFILE = createProfile({
  id: "builtin:auto:nolo",
  tier: "flash",
  legacyAgentKey: BUILTIN_NOLO_AGENT_KEY,
  name: "nolo",
  model: "glm-5-3-flash",
});

/**
 * Code-owned execution truth for dialogs in auto mode. These profiles do not
 * require a persisted Agent entity. Balanced/quality intentionally share the
 * current Flash runtime profile until product routing changes.
 *
 * 2026-09-02: flash 档从旧广场档 DeepSeek V4 Flash 对齐到内置 nolo 本体（与
 * settings/quickChatTierDefaults.ts 的默认档一致）。修复：QuickChat 首条消息
 * 按默认档由 nolo 应答，而 auto 对话续聊仍走旧广场档——同一对话首问 nolo、
 * 续聊 DeepSeek，消息头名字漂移（两半各一个脑子）。运行时 provider/model
 * 最终由 builtinPlatformAgentConfigs 按 catalog 托管，此处只作兜底声明。
 *
 * "image" tier maps to flash — image input is now handled by the vision
 * preprocessing pipeline, not by switching to a vision model. The key
 * remains in the Record for backward compat with persisted dialogs that
 * have stickyTier="image".
 */
export const AUTO_EXECUTION_PROFILES: Readonly<
  Record<AutoExecutionTier, AutoExecutionProfile>
> = {
  flash: FLASH_PROFILE,
  balanced: { ...FLASH_PROFILE, tier: "balanced" },
  quality: { ...FLASH_PROFILE, tier: "quality" },
  image: { ...FLASH_PROFILE, tier: "image" },
};

export const DEFAULT_AUTO_EXECUTION_TIER: AutoExecutionTier = "flash";
export const DEFAULT_AUTO_EXECUTION_PROFILE =
  AUTO_EXECUTION_PROFILES[DEFAULT_AUTO_EXECUTION_TIER];

export const resolveAutoExecutionProfile = (
  tier: AutoExecutionTier | null | undefined,
): AutoExecutionProfile =>
  AUTO_EXECUTION_PROFILES[tier ?? DEFAULT_AUTO_EXECUTION_TIER] ??
  DEFAULT_AUTO_EXECUTION_PROFILE;
