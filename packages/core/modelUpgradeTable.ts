/**
 * Model upgrade table — 长期维护的「旧模型 → 新模型」迁移表（单一真相源）。
 *
 * 背景：模型会不断更新、旧的会不断下线（如 2026-08-13 官方 DeepSeek provider
 * 移除；平台 GLM 5.2 曾下线、已于 2026-08-14 恢复上架，不再迁移）。
 * 存量 agent 记录可能仍引用已下线模型，导致
 * 对话失败。本表集中描述「遇到旧 provider/model 时迁移到什么」，配套脚本
 * `scripts/migrateAgentModels.ts` 扫描存量记录并按表更新。
 *
 * 原则：
 * - **尽量迁移到 nolo 平台托管**（provider: "nolo"），减少第三方 key 依赖。
 * - from 与 to 都是「provider + model」二元组，避免同名模型误迁。
 * - 只放「已下线/不可用 → 可用」的真实映射；模型换代（如 flash 微调）不进表。
 * - 下线动作必须同步在本表加条目（见 docs 下线 SOP），否则视为流程遗漏。
 * - **兜底规则**：显式条目未命中时，无兼容替代的已下架模型（DELISTED_MODELS）
 *   一律迁移到 nolo DeepSeek V4 Flash，保证存量记录不因模型下线而对话失败。
 *
 * 与 `scripts/updatePlazaModels.ts` 的关系：后者是 plaza 专用的一次性批量迁移
 * （改 model 字段）；本表是长期领域知识，覆盖所有 agent 记录（公开 + 私有）。
 */

export type ModelUpgradeKind = "migrate" | "upgrade";

export interface ModelUpgrade {
  /** 旧（已下线/不可用）的 provider + model */
  from: { provider: string; model: string };
  /** 新的 provider + model（尽量 nolo 平台托管） */
  to: { provider: string; model: string };
  /** 迁移原因（写进迁移日志，方便事后审计） */
  reason: string;
  /**
   * migrate=跨 provider 统一管理（目标尽量 nolo）；
   * upgrade=同 provider 内模型换代（to.provider 与 from 相同，如 grok-4.5 -> 4.6）。
   * 缺省 migrate。
   */
  kind?: ModelUpgradeKind;
}

export const MODEL_UPGRADE_TABLE: readonly ModelUpgrade[] = [  {
    from: { provider: "deepinfra", model: "deepseek-v4-flash" },
    to: { provider: "nolo", model: "deepseek-v4-flash" },
    reason: "deepinfra 不托管 deepseek-v4-flash 命名，统一走 nolo 平台托管",
  },
  {
    from: { provider: "deepseek", model: "deepseek-v4-flash" },
    to: { provider: "nolo", model: "deepseek-v4-flash" },
    reason: "deepseek provider 已下架（2026-08-13），统一走 nolo 平台托管",
  },
  {
    from: { provider: "deepseek", model: "deepseek-v4-pro" },
    to: { provider: "nolo", model: "deepseek-v4-pro" },
    reason: "deepseek provider 已下架（2026-08-13），统一走 nolo 平台托管",
  },
  {
    from: { provider: "deepinfra", model: "anthropic/claude-sonnet-5" },
    to: { provider: "nolo", model: "anthropic/claude-sonnet-5" },
    reason: "Claude 记录侧统一 nolo（实际上游仍 deepinfra），便于统一管理",
  },
  {
    from: { provider: "deepinfra", model: "anthropic/claude-opus-4-8" },
    to: { provider: "nolo", model: "anthropic/claude-opus-4-8" },
    reason: "Claude 记录侧统一 nolo（实际上游仍 deepinfra），便于统一管理",
  },
  {
    from: { provider: "fireworks", model: "accounts/fireworks/models/minimax-m3" },
    to: { provider: "nolo", model: "deepseek-v4-pro" },
    reason: "MiniMax M3 记录统一到 nolo DeepSeek V4 Pro（fireworks 通道收敛）",
  },
  {
    from: { provider: "xai", model: "grok-4.5" },
    to: { provider: "nolo", model: "grok-4.6" },
    reason: "xai provider 记录统一到 nolo（Grok 4.5 升级为 4.6），OAuth 订阅通道保留",
  },
  {
    from: { provider: "xai", model: "grok-4.6" },
    to: { provider: "nolo", model: "grok-4.6" },
    reason: "xai provider 记录统一到 nolo 平台托管（上游 xAI 官方 API）",
  },
] as const;

export interface ModelIdentity {
  provider?: string | null;
  model?: string | null;
}

/** DeepSeek 家族模型：第三方 provider 托管时一律迁到 nolo（规则级兜底，不维护 provider 列表）。 */
const DEEPSEEK_FAMILY_MODELS = new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);

/**
 * 已下架且无兼容替代的模型（跨 provider 判定，name 大小写不敏感）。
 * 表内无显式条目时兜底到 nolo DeepSeek V4 Flash。来源：git 下线记录 +
 * modelRegistry 移除清单（kimi-k2.7-code、kimi-k2.5、minimax-m2p7、
 * qwen3p6-plus、devstral、o3-pro 等）。
 * 注意：有显式兼容目标的（如 minimax-m3 → deepseek-v4-pro）不进本集合。
 */
const DELISTED_MODELS = new Set([
  "kimi-k2.7-code", // 2026-08 Kimi K2.7 Coding 支持移除
  "accounts/fireworks/models/kimi-k2p7-code", // Fireworks 平台 Kimi K2.7 Coding 真实 ID（历史 createSpaceAgents）
  "kimi-k2.5", // 2026-05-25 Kimi K2.5 下线
  "moonshotai/kimi-k2.5", // 同名 registry 路径写法
  "accounts/fireworks/models/kimi-k2p5", // Fireworks 平台 Kimi K2.5 真实 ID（历史 createSpaceAgents）
  "kimi-k2p5", // 短名变体
  "accounts/fireworks/models/minimax-m2p5", // MiniMax M2.5 移除
  "accounts/fireworks/models/minimax-m2p7", // MiniMax M2.7 移除
  "minimax-m2p5", // 短名变体
  "minimax-m2p7", // 短名变体
  "accounts/fireworks/models/qwen3p6-plus", // Qwen 3.6 Plus 移除
  "qwen3p6-plus", // 短名变体
  "devstral-2512", // devstral 移除
  "devstral", // 短名变体
  "grok-4.3",
  "grok-3", // 早期 Grok 3 移除
  "grok-3-beta", // 早期 Grok 3 Beta 移除
  "grok-3-fast-beta", // 早期 Grok 3 Fast Beta 移除
  "grok-2-vision", // 早期 Grok 2 Vision 移除
  "o3-pro", // o3-pro 移除
  "mimo-v2.5-pro", // Xiaomi MiMo provider 移除（2026-08）
]);

/**
 * 平台 nolo 已下架、但直连通道（deepinfra 等用户自有 key）仍可用的模型：
 * 仅 nolo provider 的存量记录兜底到 DeepSeek Flash，直连通道不受影响。
 */
const NOLO_ONLY_DELISTED_MODELS = new Set([
  "anthropic/claude-haiku-4-5", // nolo 平台下架（2026-08-14）；deepinfra 直连仍可用
  "claude-haiku-4-5", // 短名变体
]);

/** 无兼容替代的下架模型统一兜底目标。 */
export const DELISTED_MODEL_FALLBACK = {
  provider: "nolo",
  model: "deepseek-v4-flash",
} as const;

/** 查表：给定 provider + model，返回命中迁移（无则 undefined）。provider/model 大小写不敏感。 */
export function lookupModelUpgrade(
  provider?: string | null,
  model?: string | null,
): ModelUpgrade | undefined {
  if (!provider || !model) return undefined;
  const p = provider.trim().toLowerCase();
  const m = model.trim().toLowerCase();
  const exact = MODEL_UPGRADE_TABLE.find(
    (u) =>
      u.from.provider.toLowerCase() === p && u.from.model.toLowerCase() === m,
  );
  if (exact) return exact;
  // 规则级兜底：任何非 nolo provider 的 DeepSeek 系列模型（fireworks / deepinfra /
  // deepseek 等，含未来新增 provider）统一迁移到 nolo 平台托管。
  if (p !== "nolo" && DEEPSEEK_FAMILY_MODELS.has(m)) {
    return {
      from: { provider: p, model: m },
      to: { provider: "nolo", model: m },
      reason: "第三方 provider 的 DeepSeek 系列模型统一迁移到 nolo 平台托管",
    };
  }
  // 兜底规则：已下架且无显式兼容映射的模型，一律迁移到 nolo DeepSeek V4 Flash。
  if (DELISTED_MODELS.has(m)) {
    return {
      from: { provider: p, model: m },
      to: { ...DELISTED_MODEL_FALLBACK },
      reason: `模型 ${m} 已下架且无兼容替代，统一兜底到 nolo DeepSeek V4 Flash`,
    };
  }
  // 平台 nolo 专属下架：仅 nolo provider 的存量记录兜底，直连通道（deepinfra 等）不受影响。
  if (p === "nolo" && NOLO_ONLY_DELISTED_MODELS.has(m)) {
    return {
      from: { provider: p, model: m },
      to: { ...DELISTED_MODEL_FALLBACK },
      reason: `模型 ${m} 已从 nolo 平台下架，兜底到 nolo DeepSeek V4 Flash（直连通道不受影响）`,
    };
  }
  return undefined;
}

/** 给定 provider + model，返回应迁移到的目标（无命中返回原值）。 */
export function resolveModelUpgrade(
  provider?: string | null,
  model?: string | null,
): ModelIdentity {
  const hit = lookupModelUpgrade(provider, model);
  if (!hit) return { provider, model };
  return { provider: hit.to.provider, model: hit.to.model };
}
