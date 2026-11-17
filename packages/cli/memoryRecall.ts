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
import { recallWorkContextBlock } from "../ai/memory/vnext/workContextRecall";
import { isMemoryVNextShadowReadEnabled } from "../ai/memory/vnext/shadowRead";
import { getDefaultCliLocalRuntimeDb } from "./localRuntimeDb";
import { resolveLocalUserId } from "./client/cliAgentConfigHelpers";
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
  signal?: AbortSignal;
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
  signal?: AbortSignal,
): Promise<string | null> => {
  try {
    if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
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
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(5_000)])
        : AbortSignal.timeout(5_000),
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
    // 用户取消不属于网络降级；向上传递以禁止 fallback。
    if (signal?.aborted) throw error;
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
  // 取消必须贯穿远程请求；避免将 AbortError 当普通网络故障触发本地 fallback。
  if (input.signal?.aborted) throw input.signal.reason ?? new DOMException("Aborted", "AbortError");

  // 1. 远程优先（有认证时）
  if (input.authToken && input.serverUrl) {
    const remoteBlock = await queryRemoteMemory(
      input.serverUrl,
      input.authToken,
      input.agentKey,
      input.userInput,
      input.spaceId,
      input.signal,
    );
    if (remoteBlock) return remoteBlock;
  }

  // 2. 本地 fallback（无认证 / 远程失败 / 远程返回空）
  if (input.signal?.aborted) throw input.signal.reason ?? new DOMException("Aborted", "AbortError");
  try {
    if (input.signal?.aborted) throw input.signal.reason ?? new DOMException("Aborted", "AbortError");
    return await queryLocalMemory(
      input.env,
      input.agentKey,
      input.userInput,
      input.spaceId,
    );
  } catch (error) {
    if (input.signal?.aborted) throw error;
    logDeduped(
      "warn",
      fingerprintFor("local-failed", error instanceof Error ? error.name : undefined),
      "local recall failed, omitting memory layer",
      normalizeError(error),
    );
    return null;
  }
};

export interface CliWorkContextRecallInput {
  env: Record<string, string | undefined>;
  /** 宿主已确定的对话 id（TUI: state.dialogId；一次性 run: --continue 的 dialogId）。 */
  dialogId?: string | null;
  spaceId?: string | null;
  signal?: AbortSignal;
  /** 本轮真实用户输入（只截断后作为 relatedQuery，不做意图解析）。 */
  userInput?: string;
  /**
   * 测试注入用：给定 db 就跳过打开 CLI 本地 runtime db（生产调用方不传）。
   */
  db?: any;
}

/**
 * 工作接续块（CLI 本地 DB 优先）。
 *
 * 与上面的语义召回不同：**只读本地 LevelDB，不发网络请求**。CLI 的本地运行
 * 库里已经有本机写入的工作接续，因此这条召回不依赖登录态，也不会因为远端
 * 抖动退化成「必须联网才有记忆」。远端语义块与本地工作接续块互不影响。
 *
 * 每轮调用、不缓存：写完下一轮就该看见，不能拿旧快照当最新。
 * 读取失败返回 null（只省略该块），不影响对话。
 */
export const resolveCliWorkContext = async (
  input: CliWorkContextRecallInput,
): Promise<string | null> => {
  const dialogId = input.dialogId ?? null;
  if (!dialogId) return null;
  if (input.signal?.aborted) {
    throw input.signal.reason ?? new DOMException("Aborted", "AbortError");
  }
  try {
    const localDb = input.db ?? (await getDefaultCliLocalRuntimeDb({ env: input.env }));
    const trimmedUserInput = input.userInput?.trim().slice(0, 200);
    const result = await recallWorkContextBlock({
      db: localDb,
      // owner 必须与写入侧（工具经 resolveLocalUserId 校验并写个人 owner）一致，
      // 否则工具成功写入后这里按机器 id 去查，永远召回不到。
      owner: { ownerType: "user", ownerId: resolveLocalUserId(input.env) },
      spaceId: input.spaceId ?? null,
      dialogId,
      ...(trimmedUserInput ? { relatedQuery: trimmedUserInput } : {}),
    });
    if (result.status === "error") {
      logDeduped(
        "warn",
        fingerprintFor("work-context-failed", result.error ? "read" : undefined),
        "work context recall failed, omitting work context block",
        normalizeError(result.error ?? "unknown"),
      );
      return null;
    }
    return result.block;
  } catch (error) {
    if (input.signal?.aborted) throw error;
    logDeduped(
      "warn",
      fingerprintFor("work-context-failed", error instanceof Error ? error.name : undefined),
      "work context recall failed, omitting work context block",
      normalizeError(error),
    );
    return null;
  }
};
