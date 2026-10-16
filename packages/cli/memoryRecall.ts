/**
 * CLI memory recall：远程优先，本地 fallback。
 *
 * 从 agentRunCommand.ts 抽取，避免 60+ 行嵌套在 if 块里。
 * 写入已经走远程（/api/memory/remember），读取也优先走远程（/api/memory/query），
 * 这样 local/auto 模式能访问到网页端积累的记忆。
 *
 * 失败时（无认证 / 网络错误 / 远程非 ok）fallback 到本地 LevelDB。
 * 全部失败时返回 null——不阻塞对话，只省略记忆层。
 *
 * Slice 1：console.* → diagnostics logger。
 * 远端失败+本地成功 = info（降级非错误，用户不感知）；同 fingerprint 进程内去重 +
 * 每 5 分钟一条聚合摘要，避免远端抖动刷屏。
 */
import { resolveMemoryRuntime } from "../ai/memory/runtime";
import { isMemoryVNextShadowReadEnabled } from "../ai/memory/vnext/shadowRead";
import { getDefaultCliLocalRuntimeDb } from "./localRuntimeDb";
import { resolveMachineId } from "../connector-experimental/machineInfo";
import { getLogger, normalizeError } from "./diagnostics";

const logger = getLogger("cli.memoryRecall");

// —— 进程内去重 + 聚合 ————————————————————————————————————————————

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 分钟
const DEDUP_MAX_KEYS = 100; // 容量上限：超过时淘汰最久未记录的 entry
type DedupEntry = { count: number; suppressed: number; lastLog: number };
const dedupMap = new Map<string, DedupEntry>();

/** 到达容量上限时淘汰 lastLog 最旧的 entry（dedupMap 很小，线性扫描足够） */
function evictDedupIfNeeded(): void {
  if (dedupMap.size < DEDUP_MAX_KEYS) return;
  let oldestKey: string | null = null;
  let oldestTs = Infinity;
  for (const [k, v] of dedupMap) {
    if (v.lastLog < oldestTs) {
      oldestTs = v.lastLog;
      oldestKey = k;
    }
  }
  if (oldestKey !== null) dedupMap.delete(oldestKey);
}

/**
 * 同 fingerprint 首次记录，之后进程内计数；
 * 距上次记录 ≥5min 时发一条聚合摘要并重置计数。
 */
function logDeduped(
  level: "info" | "warn",
  fingerprint: string,
  message: string,
  error?: unknown,
): void {
  const now = Date.now();
  const entry = dedupMap.get(fingerprint);
  if (!entry) {
    evictDedupIfNeeded();
    dedupMap.set(fingerprint, { count: 1, suppressed: 0, lastLog: now });
    if (error !== undefined) logger[level](message, error);
    else logger[level](message);
    return;
  }
  entry.count += 1;
  if (now - entry.lastLog >= DEDUP_WINDOW_MS) {
    // suppressed 自上次摘要以来被静默吞掉的次数；count-1 = 本窗口内未单独输出的重复数
    const suppressed = entry.suppressed;
    const summary = `${message} (deduplicated: ${entry.count} occurrences, ${suppressed} suppressed over ${Math.round((now - entry.lastLog) / 1000)}s)`;
    if (error !== undefined) logger[level](summary, error);
    else logger[level](summary);
    entry.count = 1;
    entry.suppressed = 0;
    entry.lastLog = now;
  } else {
    entry.suppressed += 1;
  }
}

function fingerprintFor(kind: string, detail?: unknown): string {
  const d = detail === undefined ? "" : sanitizeFp(String(detail));
  return `mem-${kind}:${d}`;
}
function sanitizeFp(s: string): string {
  return s.replace(/\s+/g, " ").slice(0, 80);
}

export interface MemoryRecallInput {
  serverUrl: string | null;
  authToken: string | null;
  agentKey: string;
  userInput: string;
  spaceId?: string;
  /** 本地运行时环境（用于获取本地 db） */
  env: Record<string, string | undefined>;
}

/**
 * 远程查询 /api/memory/query，成功返回 promptBlock，失败返回 null。
 * 独立 try/catch 保证网络错误不会跳过外层的 local fallback。
 */
const queryRemoteMemory = async (
  serverUrl: string,
  authToken: string,
  agentKey: string,
  userInput: string,
  spaceId?: string,
): Promise<string | null> => {
  try {
    const response = await fetch(`${serverUrl}/api/memory/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        agentKey,
        userInput,
        ...(spaceId ? { spaceId } : {}),
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      logDeduped(
        "warn",
        fingerprintFor("remote-nonok", response.status),
        `remote query returned non-ok status ${response.status} — falling back to local`,
      );
      return null;
    }
    const payload = (await response.json().catch(() => null)) as
      | { promptBlock?: unknown }
      | null;
    const block =
      typeof payload?.promptBlock === "string" ? payload.promptBlock.trim() : "";
    return block || null;
  } catch (error) {
    // 远端超时/网络错误 → 本地 fallback 是预期降级路径，记 info 而非 warn。
    logDeduped(
      "info",
      fingerprintFor("remote-failed", error instanceof Error ? error.name : undefined),
      "remote query failed, falling back to local",
      normalizeError(error),
    );
    return null;
  }
};

const queryLocalMemory = async (
  env: Record<string, string | undefined>,
  agentKey: string,
  userInput: string,
  spaceId?: string,
): Promise<string | null> => {
  const localDb = await getDefaultCliLocalRuntimeDb({ env });
  const machineId = resolveMachineId();
  // Slice 5: CLI local fallback has no RunInfra credentials — provider stays
  // undefined, so the flag alone cannot start shadow LLM calls here. Remote
  // queries already run shadow server-side.
  const resolution = await resolveMemoryRuntime({
    db: localDb,
    userId: machineId,
    agentKey,
    userInput,
    ...(spaceId ? { spaceId } : {}),
    ...(isMemoryVNextShadowReadEnabled(env)
      ? { vNextShadowProvider: undefined }
      : {}),
  });
  return resolution.promptBlock;
};

export const resolveCliMemory = async (
  input: MemoryRecallInput,
): Promise<string | null> => {
  // 1. 远程优先（有认证时）
  if (input.authToken && input.serverUrl) {
    const remoteBlock = await queryRemoteMemory(
      input.serverUrl,
      input.authToken,
      input.agentKey,
      input.userInput,
      input.spaceId,
    );
    if (remoteBlock) return remoteBlock;
  }

  // 2. 本地 fallback（无认证 / 远程失败 / 远程返回空）
  try {
    return await queryLocalMemory(
      input.env,
      input.agentKey,
      input.userInput,
      input.spaceId,
    );
  } catch (error) {
    logDeduped(
      "warn",
      fingerprintFor("local-failed", error instanceof Error ? error.name : undefined),
      "local recall failed, omitting memory layer",
      normalizeError(error),
    );
    return null;
  }
};
