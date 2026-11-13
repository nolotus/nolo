/**
 * 每次 provider 调用的缓存/成本遥测（只记数字与哈希，绝不含对话内容）。
 *
 * divergeAt 把「前缀字节漂移」与「provider 路由 miss」分开：
 * 与同一 dialog 上一次请求逐条比较消息哈希，第一个不同的下标；
 * 纯追加 = -1；无上一次（进程内首次）= null。
 * 全程 fail-open：任何异常返回 undefined，不影响对话。
 */
import { createHash } from "node:crypto";
import { contentCharCount } from "./providerMessageProjection";

export type ProviderCallTelemetry = {
  /** Provider adapter invocation only; does not establish network delivery. */
  requestState?: "completed" | "failed" | "cancelled";
  round?: number;
  endTs?: number;
  durationMs?: number;
  toolsHash?: string;
  msgCount?: number;
  contentChars?: number;
  toolResultChars?: number;
  toolResultCount?: number;
  divergeAt?: number | null;
  prevMsgCount?: number;
  toolCalls?: string[];
  provenance?: ContextProvenance;
};

/** Content-free evidence only. Hash equality does not prove model visibility or comprehension.
 * Counts describe individual phases; droppedCount must be measured, never inferred.
 * IDs are bounded source message identifiers, never user text or arrays of all IDs.
 */
export type ContextProvenance = {
  schemaVersion: 1;
  transport: "unknown" | "local-cli" | "direct-openai-compatible" | "codex-oauth" | "codex-responses" | "owner-oauth-proxy" | "server-proxy";
  phases?: Array<{
    phase: "history-loaded" | "summary-projected" | "budget-trim" | "final-request";
    source?: "local" | "remote" | "partial" | "none" | "unknown";
    count?: number;
    hash?: string;
    firstId?: string;
    lastId?: string;
    idsHash?: string;
    droppedCount?: number;
  }>;
  summary?: {
    outcome: "absent" | "loaded" | "generated" | "invalid" | "skipped" | "failed" | "unknown";
    summaryId?: string;
    hash?: string;
    anchorId?: string;
    sourceHash?: string;
    sourceCount?: number;
  };
};

const isCount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isDigest = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const isMessageId = (v: unknown): v is string => typeof v === "string" && /^(?:[0-9]{13}-[0-9]{3,6}|[0-9A-HJKMNP-TV-Z]{26}|local-[0-9]{1,12})$/.test(v);
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Single allowlist shared by collection and disk projection; no object spreads from callers. */
export function projectContextProvenance(value: unknown): ContextProvenance | undefined {
  if (!isRecord(value) || value.schemaVersion !== 1) return undefined;
  const transports = ["unknown", "local-cli", "direct-openai-compatible", "codex-oauth", "codex-responses", "owner-oauth-proxy", "server-proxy"];
  const result: ContextProvenance = { schemaVersion: 1, transport: transports.includes(value.transport as string) ? value.transport as ContextProvenance["transport"] : "unknown" };
  if (Array.isArray(value.phases)) {
    result.phases = [];
    for (const item of value.phases.slice(0, 8)) {
      if (!isRecord(item) || !["history-loaded", "summary-projected", "budget-trim", "final-request"].includes(item.phase as string)) continue;
      const phase: NonNullable<ContextProvenance["phases"]>[number] = { phase: item.phase as NonNullable<ContextProvenance["phases"]>[number]["phase"] };
      if (["local", "remote", "partial", "none", "unknown"].includes(item.source as string)) phase.source = item.source as typeof phase.source;
      for (const key of ["count", "droppedCount"] as const) if (isCount(item[key])) phase[key] = item[key];
      for (const key of ["hash", "idsHash"] as const) if (isDigest(item[key])) phase[key] = item[key];
      for (const key of ["firstId", "lastId"] as const) if (isMessageId(item[key])) phase[key] = item[key];
      result.phases.push(phase);
    }
  }
  if (isRecord(value.summary)) {
    const input = value.summary;
    const outcomes = ["absent", "loaded", "generated", "invalid", "skipped", "failed", "unknown"];
    const summary: NonNullable<ContextProvenance["summary"]> = { outcome: outcomes.includes(input.outcome as string) ? input.outcome as NonNullable<ContextProvenance["summary"]>["outcome"] : "unknown" };
    for (const key of ["summaryId", "hash", "sourceHash"] as const) if (isDigest(input[key])) summary[key] = input[key];
    if (isMessageId(input.anchorId)) summary.anchorId = input.anchorId;
    if (isCount(input.sourceCount)) summary.sourceCount = input.sourceCount;
    result.summary = summary;
  }
  return result;
}

/** Hashes are one-way fingerprints, not proof that particular facts reached the model. */
export function contextPhase(
  phase: NonNullable<ContextProvenance["phases"]>[number]["phase"],
  messages: readonly unknown[],
  options: { source?: NonNullable<ContextProvenance["phases"]>[number]["source"]; droppedCount?: number } = {},
): NonNullable<ContextProvenance["phases"]>[number] {
  const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value) ?? "null").digest("hex");
  const ids = messages.map(m => isRecord(m) && isMessageId(m.cliMessageId) ? m.cliMessageId : null);
  return {
    phase, count: messages.length, hash: digest(messages), idsHash: digest(ids),
    ...(ids[0] ? { firstId: ids[0] } : {}),
    ...(ids.at(-1) ? { lastId: ids.at(-1)! } : {}),
    ...(options.source ? { source: options.source } : {}),
    ...(isCount(options.droppedCount) ? { droppedCount: options.droppedCount } : {}),
  };
}

/** Match source IDs (or role/content/result identity) across one actual trim, including pairing cleanup. */
export function countRemovedMessages(before: readonly unknown[], after: readonly unknown[]): number {
  const identity = (message: unknown): string => {
    if (isRecord(message) && isMessageId(message.cliMessageId)) return "id:" + message.cliMessageId;
    const m = isRecord(message) ? message : {};
    // Pairing cleanup can clone assistants while editing tool_calls, without removing them.
    return createHash("sha256").update(JSON.stringify([m.role, m.content, m.tool_call_id ?? m.toolCallId])).digest("hex");
  };
  const remaining = new Map<string, number>();
  for (const message of after) { const key = identity(message); remaining.set(key, (remaining.get(key) ?? 0) + 1); }
  let removed = 0;
  for (const message of before) {
    const key = identity(message);
    const count = remaining.get(key) ?? 0;
    if (count) remaining.set(key, count - 1); else removed++;
  }
  return removed;
}

export const shortHash = (value: string): string =>
  createHash("sha1").update(value).digest("hex").slice(0, 12);

export const hashMessage = (message: unknown): string => {
  let text: string;
  try {
    text = JSON.stringify(message) ?? "";
  } catch {
    text = String(message);
  }
  return shortHash(text);
};

/** 第一个不同下标；纯追加（prev 是 cur 的前缀）= -1；cur 比 prev 短也算在 min 长度内的漂移。 */
export function computeDivergeAt(prev: string[], cur: string[]): number {
  const n = Math.min(prev.length, cur.length);
  for (let i = 0; i < n; i += 1) {
    if (prev[i] !== cur[i]) return i;
  }
  return cur.length >= prev.length ? -1 : n;
}

export const DIVERGE_TRACKER_MAX_DIALOGS = 50;

export type DivergeTracker = {
  /** 记录本次请求哈希并返回相对上一次的 divergeAt / prevMsgCount。 */
  observe(dialogKey: string, hashes: string[]): { divergeAt: number | null; prevMsgCount?: number };
  size(): number;
};

export function createDivergeTracker(max = DIVERGE_TRACKER_MAX_DIALOGS): DivergeTracker {
  const map = new Map<string, string[]>();
  return {
    observe(dialogKey, hashes) {
      const prev = map.get(dialogKey);
      map.delete(dialogKey);
      map.set(dialogKey, hashes); // 重新插入 = 最近使用
      while (map.size > max) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        map.delete(oldest);
      }
      if (!prev) return { divergeAt: null };
      return { divergeAt: computeDivergeAt(prev, hashes), prevMsgCount: prev.length };
    },
    size: () => map.size,
  };
}

/** 进程级 tracker（按 dialogId，LRU 50）。 */
export const processDivergeTracker = createDivergeTracker();

export function buildRequestTelemetry(args: {
  dialogKey: string;
  messages: Array<{ role?: string; content?: any }>;
  toolsHash?: string;
  tracker?: DivergeTracker;
  provenance?: ContextProvenance;
}): Partial<ProviderCallTelemetry> | undefined {
  try {
    const provenance = projectContextProvenance(args.provenance);
    const hashes = args.messages.map(hashMessage);
    let toolResultChars = 0;
    let toolResultCount = 0;
    let contentChars = 0;
    for (const m of args.messages) {
      const chars = contentCharCount(m.content);
      contentChars += chars;
      if (m.role === "tool") {
        toolResultChars += chars;
        toolResultCount += 1;
      }
    }
    const diverge = (args.tracker ?? processDivergeTracker).observe(args.dialogKey, hashes);
    return {
      ...(args.toolsHash ? { toolsHash: args.toolsHash } : {}),
      ...(provenance ? { provenance } : {}),
      msgCount: args.messages.length,
      contentChars,
      toolResultChars,
      toolResultCount,
      ...diverge,
    };
  } catch {
    return undefined;
  }
}

/** 工具定义（name+schema）的短哈希；失败返回 undefined。 */
export function hashToolDefinitions(tools: unknown[]): string | undefined {
  try {
    return shortHash(JSON.stringify(tools));
  } catch {
    return undefined;
  }
}
