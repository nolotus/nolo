/**
 * 统一平台 Agent 代码目录覆盖层（Single Source of Truth）。
 *
 * 彻底根治「数据库历史脏数据 / 旧模型残留」问题：
 * 任何地方（服务端 read 路由、前端执行 runtime、工具查询）拿到一条平台/内置 agent 记录后，
 * 无论其持久化数据是历史的哪个版本（如陈旧的 kimi-k2.6），出库和执行前一律以此处为准，
 * 强制纠偏为当前代码目录（BUILTIN_AGENT_CATALOG / PUBLIC_AGENT_DEFS）中声明的真实运行时与内容字段。
 *
 * 覆盖规则：
 * 1. 平台内置 6 个 Agent（BUILTIN_PLATFORM_AGENT_KEYS，如 @nolo）：走 applyBuiltinAgentRuntimeOverride
 * 2. 广场公开 Agent（PUBLIC_AGENT_DEFS）：走 applyPublicAgentCatalogOverride
 * 3. 用户自建 Agent（非平台条目）：原样返回（引用相等），绝不修改用户资产
 */

import { applyBuiltinAgentRuntimeOverride } from "./builtinPlatformAgentConfigs";
import { applyPublicAgentCatalogOverride } from "./publicAgentCatalogOverride";

export function applyPlatformAgentOverrides<T extends object>(
  record: T,
  agentKey?: string,
): T {
  if (!record || typeof record !== "object") return record;

  const raw = record as Record<string, unknown>;
  const effectiveKey =
    agentKey ??
    (typeof raw.dbKey === "string" ? raw.dbKey : undefined) ??
    (typeof raw.key === "string" ? raw.key : undefined) ??
    (typeof raw.id === "string" ? raw.id : undefined);

  // 1. 内置 6 个平台 Agent 覆盖（provider/model/rawRecord）
  const builtinApplied = effectiveKey
    ? applyBuiltinAgentRuntimeOverride(effectiveKey, record)
    : record;

  // 2. 广场公开 Agent 覆盖（catalog 运行时字段 + seed 内容字段）
  return applyPublicAgentCatalogOverride(builtinApplied, effectiveKey);
}
