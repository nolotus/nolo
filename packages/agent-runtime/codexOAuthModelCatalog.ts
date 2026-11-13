// packages/agent-runtime/codexOAuthModelCatalog.ts
//
// Codex OAuth（ChatGPT 订阅）通道的 context window **真值来源**：上游模型目录
//   GET https://chatgpt.com/backend-api/codex/models?client_version=<version>
//
// 为什么要按账号问上游：2026-11-03 本机实测（client 0.162.1，token 直连）
//   gpt-6.1-sol / gpt-6.1-terra                    context_window = 500000
//   gpt-6-astra / gpt-6-sol / gpt-6-luna / gpt-5.6-sol = 272000
//   全部 max_context_window = 872000，effective_context_window_percent = 95
//   同 token 用 0.162.1 与 0.163.0 请求返回完全一致 → 差异来自账号档位而非
//   客户端版本（plan=plus 时这几个模型 supports_experimental_context=false，
//   plan=prolite 时 true）。
// 结论：窗口真值属于「账号 × 模型」，写死在代码里必然随账号漂移；静态 pin
// （packages/ai/llm/getModelContextWindow.ts）只作拿不到目录时的兜底。
//
// 契约（fail-open，绝不阻断请求）：
//   - 进程内缓存，按 accountId 分桶（无 accountId → "__default__"），TTL 1 小时；
//   - 同账号并发 in-flight 去重（同一时刻只打一次上游）；
//   - 网络错误 / 非 200 / JSON 解析失败一律吞掉，只记一条**不含 token**的诊断，
//     并设 5 分钟重试下限，避免每个请求都紧循环重试；
//   - 永远不抛异常，也永远不把 access token 写进日志 / 错误信息。
//
// 分层：窗口存储与查询在 codexOAuthModelCatalogWindow.ts（纯模块，浏览器可引用），
// 本文件只负责抓取与播种。

import { CODEX_CLIENT_VERSION, CODEX_ORIGINATOR } from "./codexResponsesProvider";
import {
  CODEX_OAUTH_CATALOG_RETRY_FLOOR_MS,
  CODEX_OAUTH_CATALOG_TTL_MS,
  codexOAuthCatalogAccountKey,
  codexOAuthCatalogSnapshot,
  commitCodexOAuthCatalogWindows,
  markCodexOAuthCatalogFailure,
} from "./codexOAuthModelCatalogWindow";

export {
  CODEX_OAUTH_CATALOG_DEFAULT_ACCOUNT_KEY,
  CODEX_OAUTH_CATALOG_RETRY_FLOOR_MS,
  CODEX_OAUTH_CATALOG_TTL_MS,
  codexOAuthCatalogAccountKey,
  codexOAuthCatalogSnapshot,
  codexOAuthCatalogWindow,
  resetCodexOAuthCatalogWindows,
  seedCodexOAuthCatalogWindows,
} from "./codexOAuthModelCatalogWindow";
export type { CodexOAuthCatalogSnapshot } from "./codexOAuthModelCatalogWindow";

/** 上游模型目录端点（client_version 由 ensure 拼在 query 上）。 */
export const CODEX_OAUTH_MODELS_URL =
  "https://chatgpt.com/backend-api/codex/models";

/** 单次目录请求的硬超时：目录不是请求前置条件，绝不允许它把调用方拖住。 */
export const CODEX_OAUTH_CATALOG_REQUEST_TIMEOUT_MS = 4_000;

/** 同账号并发去重：accountKey → 正在进行的播种任务。 */
const inFlightCatalogFetches = new Map<string, Promise<void>>();

const catalogRequestUrl = (): string =>
  `${CODEX_OAUTH_MODELS_URL}?client_version=${encodeURIComponent(CODEX_CLIENT_VERSION)}`;

/**
 * 目录响应 → { slug: context_window }。
 *
 * 只认 context_window（正整数）；缺字段 / 0 / 负数 / 字符串 / 非整数一律跳过
 * （跳过而非报错：单条脏数据不该废掉整份目录）。max_context_window 与
 * effective_context_window_percent 不参与——nolo 没有实现 experimental context
 * 的请求侧开关，按 872000 反推会把窗口放大到上游实际不接受的量。
 * payload 形状不对（没有 models 数组）返回 null，由调用方按失败处理。
 */
const parseCodexOAuthModelCatalog = (
  payload: unknown,
): Record<string, number> | null => {
  const models = (payload as { models?: unknown } | null | undefined)?.models;
  if (!Array.isArray(models)) return null;
  const windows: Record<string, number> = {};
  for (const entry of models) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const slug =
      typeof record.slug === "string" ? record.slug.trim().toLowerCase() : "";
    if (!slug) continue;
    const contextWindow = record.context_window;
    if (
      typeof contextWindow !== "number" ||
      !Number.isInteger(contextWindow) ||
      contextWindow <= 0
    ) {
      continue;
    }
    windows[slug] = contextWindow;
  }
  return windows;
};

/**
 * 一条不含 token 的诊断：只带阶段与（可选）accountId 截断前缀。
 * 目录失败是预期内事件（离线、token 过期、上游抖动），走 debug 不吵用户。
 */
const reportCodexOAuthCatalogFailure = (
  stage: string,
  accountId?: string,
): void => {
  try {
    const account = accountId ? accountId.slice(0, 6) : null;
    console.debug(
      `[codexOAuthModelCatalog] ${stage}${account ? ` account=${account}…` : ""}`,
    );
  } catch {
    // best effort：诊断失败不影响请求语义
  }
};

export type EnsureCodexOAuthModelCatalogArgs = {
  /** ChatGPT OAuth access token（只用于本次请求的 Authorization header）。 */
  accessToken: string;
  /** chatgpt_account_id；缺省落 "__default__" 桶。 */
  accountId?: string | null;
  fetchImpl?: typeof fetch;
  /** 可注入时钟（测试用），默认 Date.now。 */
  now?: () => number;
  /** 覆盖默认 TTL（测试用）。 */
  ttlMs?: number;
  /** 覆盖单次请求超时。 */
  timeoutMs?: number;
};

/**
 * 确保当前账号的模型目录新鲜（命中 TTL 立即返回，不发请求）。
 *
 * 永不抛：所有失败都被吞掉并记诊断 + 设 5 分钟重试下限。调用点照常
 * `await`，拿不到目录时窗口解析回落到静态 pin。
 */
export async function ensureCodexOAuthModelCatalog(
  args: EnsureCodexOAuthModelCatalogArgs,
): Promise<void> {
  const accessToken = args.accessToken?.trim();
  if (!accessToken) return;
  const accountId = args.accountId?.trim() || undefined;
  const nowMs = (): number => (args.now ? args.now() : Date.now());
  const ttlMs = args.ttlMs ?? CODEX_OAUTH_CATALOG_TTL_MS;
  const accountKey = codexOAuthCatalogAccountKey(accountId);

  const snapshot = codexOAuthCatalogSnapshot(accountId);
  const now = nowMs();
  if (snapshot.fetchedAt !== null && now - snapshot.fetchedAt < ttlMs) return;
  if (
    snapshot.lastFailureAt !== null &&
    now - snapshot.lastFailureAt < CODEX_OAUTH_CATALOG_RETRY_FLOOR_MS
  ) {
    return;
  }

  const pending = inFlightCatalogFetches.get(accountKey);
  if (pending) {
    // 同账号并发：等同一个任务，不重复打上游；同一份 fail-open，不会抛。
    await pending;
    return;
  }

  const fetchImpl = args.fetchImpl ?? fetch;
  const timeoutMs = args.timeoutMs ?? CODEX_OAUTH_CATALOG_REQUEST_TIMEOUT_MS;
  const job = (async (): Promise<void> => {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        originator: CODEX_ORIGINATOR,
        version: CODEX_CLIENT_VERSION,
        Accept: "application/json",
      };
      if (accountId) headers["chatgpt-account-id"] = accountId;

      const response = await fetchImpl(catalogRequestUrl(), {
        method: "GET",
        headers,
        signal:
          typeof AbortSignal !== "undefined" &&
          typeof AbortSignal.timeout === "function" &&
          timeoutMs > 0
            ? AbortSignal.timeout(timeoutMs)
            : undefined,
      });
      if (!response.ok) {
        markCodexOAuthCatalogFailure({ accountId, now: nowMs() });
        reportCodexOAuthCatalogFailure(`http ${response.status}`, accountId);
        return;
      }
      const payload: unknown = await response.json();
      const windows = parseCodexOAuthModelCatalog(payload);
      if (!windows) {
        markCodexOAuthCatalogFailure({ accountId, now: nowMs() });
        reportCodexOAuthCatalogFailure("malformed payload", accountId);
        return;
      }
      commitCodexOAuthCatalogWindows({ accountId, models: windows, now: nowMs() });
    } catch {
      // 网络错误 / abort / JSON 解析失败：一律 fail-open，诊断里不带任何 token。
      markCodexOAuthCatalogFailure({ accountId, now: nowMs() });
      reportCodexOAuthCatalogFailure("request failed", accountId);
    }
  })();

  inFlightCatalogFetches.set(accountKey, job);
  try {
    await job;
  } finally {
    inFlightCatalogFetches.delete(accountKey);
  }
}
