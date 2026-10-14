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
};

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
}): Partial<ProviderCallTelemetry> | undefined {
  try {
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
