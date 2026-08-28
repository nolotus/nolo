// packages/ai/agent/utils/agentRecordIdentity.ts
// 通用 agent 记录身份/时间工具：跨"自建 + 公开 + 收藏"三源复用。
// 解决 AddAgentDialog / useAgentPickerCandidates / PageAssistantPanel 各自重复
// 实现 agent id 提取、多候选标识匹配、时间戳解析的问题。
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { getPublicAgentId } from "../publicAgentIdentity";

type AgentRecord = Record<string, any> | null | undefined;

/**
 * 从任意 agent 记录提取一个稳定主 key（dbKey 优先，其次 id，公开 agent 走规范化）。
 * 与 useAgentPickerCandidates.toAgentKey 同源逻辑，现统一在此。
 */
export function getAgentRecordKey(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, any>;
  const dbKey = typeof record.dbKey === "string" ? record.dbKey : null;
  if (dbKey) return dbKey;
  const rawId = typeof record.id === "string" ? record.id : null;
  if (rawId) return getPublicAgentId(record) ?? rawId;
  return null;
}

/**
 * 收集 agent 记录的所有可能标识（dbKey/id/agentKey/cybotKey/publicKey/privateKey）。
 * 用于与 favoriteStore / activeAgentId 多候选匹配，避免 id 格式不一致漏匹配。
 * 与 AddAgentDialog.getAgentIdentifiers 同源逻辑，现统一在此。
 */
export function getAgentRecordIdentifiers(item: unknown): string[] {
  if (!item || typeof item !== "object") return [];
  const record = item as Record<string, any>;
  const candidates = [
    record.dbKey,
    record.id,
    record.agentKey,
    record.cybotKey,
    record.publicKey,
    record.privateKey,
  ];
  return candidates
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map(String);
}

/**
 * 解析 agent 记录的时间戳：优先 updatedAt → createdAt → created，
 * 数字直接返回，字符串走 Date.parse，均失败返回 0。
 * 与 AddAgentDialog.getAgentTimestamp 同源逻辑（它额外用 asOptionalFiniteNumber，
 * 这里合并两种解析路径以兼容历史数据），现统一在此。
 */
export function getAgentRecordTimestamp(item: unknown): number {
  if (!item || typeof item !== "object") return 0;
  const record = item as Record<string, any>;
  const value = record.updatedAt ?? record.createdAt ?? record.created;
  const asNumber = asOptionalFiniteNumber(value);
  if (asNumber !== undefined) return asNumber;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * 判断 agent 记录是否由指定用户创建。
 * source="owned" 时直接为 true；否则按记录 userId 与 currentUserId 比对。
 */
export function isAgentRecordOwned(
  item: unknown,
  source: "owned" | "public",
  currentUserId?: string | null
): boolean {
  if (source === "owned") return true;
  if (!item || typeof item !== "object") return false;
  return !!currentUserId && (item as Record<string, any>).userId === currentUserId;
}