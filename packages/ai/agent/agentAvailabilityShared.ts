/**
 * Agent「429 限流可用性」的**唯一事实来源**：判据、复位时刻解析、状态决策。
 *
 * 消费方（全部只 import 本文件，禁止再各自实现）：
 * - `packages/server/agentAvailability/agentAvailability.ts` — server 侧落 DB
 * - `packages/cli/client/localRuntimeAdapter.ts` — CLI 本地 runtime 落本地记录
 * - `packages/ai/tools/noloWorkspaceReadTools.ts` / `packages/cli/agentListCommands.ts` — 列表过滤
 * - `packages/agent-runtime/credentialAvailability.ts` — credential 冷却读写（credential key 判据亦在此；`packages/cli/credentialAvailability.ts` 只 re-export）
 * - `packages/desktop-runtime/handlers/desktopAgentAvailability.ts` — 桌面宿主落 credential 冷却
 *
 * 本模块纯逻辑、零 I/O、不读系统时钟（`now` 一律由入参传入），因此 server / CLI /
 * web / desktop 都能直接 import；持久化由各端适配层负责。
 *
 * 「周额度耗尽」修复只落在 CLI 一侧，server 侧同一个 bug continued to ship。
 */
import { parseResetsInMs } from "../tools/agent/quotaCircuitBreaker";
import type { AgentQuota } from "./quotaSnapshot";

/** 无法从上游响应解析出复位时刻时使用的保守冷却窗口。 */
export const DEFAULT_PROVIDER_RETRY_MS = 5 * 60 * 1000;

/**
 * 薄 429 已有请求内重试兜底，凭证级只锁 60s；5 分钟是额度类信号的保守窗口。
 */
export const THIN_RATE_LIMIT_COOLDOWN_MS = 60 * 1000;

/**
 * 冷却时长的**硬上限**。上游解析出的复位时刻被 clamp 到
 * `[now, now + MAX_COOLDOWN_MS]`，防止荒谬 deadline（如 2051 年）把 agent 锁死数天/数十年。
 *
 * 选型理由：24h 足够覆盖绝大多数真实的 429/配额耗尽窗口，同时又不至于让一个错误值
 * 长期封禁某个 agent。刻意取舍：正常的周/月额度耗尽（如 "reset at 5 天后"）也会被压到
 * 24h——宁可 24h 后重试一次撞 429 再续冷却，也不要被错误值锁死数天/数十年。
 * 撞上 429 会按响应重新 mark（且 clamp 后仍 ≤ 24h），因此不会造成“假恢复后反复撞墙”以外的损失。
 */
export const MAX_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * 把解析出的可用时刻 clamp 到 `[now, now + MAX_COOLDOWN_MS]`。
 * 上游可能返回负数/过去（此时取 now，等于立即可用）或荒谬的未来（压到 24h）。
 */
function clampCooldownDeadline(at: number, now: number): number {
  const min = now;
  const max = now + MAX_COOLDOWN_MS;
  return Math.min(Math.max(at, min), max);
}

/**
 * 共享的「agent 当前是否临时不可用」判据（429 限流中）。
 *
 * 判据：agent 记录的 nextAvailableAt 是有限数值且 > now，视为 429 限流冷却中，
 * 此刻不可用。nextAvailableAt 等于 now 视为已恢复。
 */
export function shouldClearCooldownFromQuota(
  entry: { nextAvailableAt?: number; markedAt?: number },
  quota: AgentQuota | undefined,
  now: number,
): boolean {
  if (!(typeof entry.nextAvailableAt === "number" && entry.nextAvailableAt > now)) return false;
  if (typeof entry.markedAt !== "number" || !Number.isFinite(entry.markedAt)) return false;
  if (!quota || !(quota.observedAt > entry.markedAt)) return false;
  // 启发式恢复：仅在订阅额度窗口有余量且无其它窗口明确耗尽时提前解除。
  // 429 来自并发/模型级等未上报维度时仍可能误清；代价是下次请求再撞 429 并重新 mark。
  const subscriptionWindows = quota.windows.filter((window) => window.scope === "5h" || window.scope === "7d");
  if (subscriptionWindows.length === 0) return false;
  if (quota.windows.some((window) => window.scope !== "5h" && window.scope !== "7d" &&
    (window.remaining === 0 || (typeof window.utilization === "number" && window.utilization >= 0.95)))) return false;
  return subscriptionWindows.every((window) => {
    const hasUtilization = typeof window.utilization === "number";
    const hasRemaining = typeof window.remaining === "number";
    if (!hasUtilization && !hasRemaining) return false;
    return (!hasUtilization || window.utilization! < 0.95) &&
      (!hasRemaining || window.remaining! > 0);
  });
}

export function isAgentUnavailableNow(
  agent:
    | { nextAvailableAt?: number }
    | null
    | undefined,
  now = Date.now(),
): boolean {
  const at = agent?.nextAvailableAt;
  return typeof at === "number" && Number.isFinite(at) && at > now;
}

/** 配额快照陈旧阈值：2 小时无更新则视为未验证（缺证据就当未验证，不能默认可用） */
export const QUOTA_SNAPSHOT_STALE_MS = 2 * 60 * 60 * 1000;

/**
 * 额度快照是否可作为耗尽/可用性证据的唯一共享准入判据。
 * 要求 observedAt 必须是有限数字且在新鲜度阈值内（<= 2 小时）；
 * 缺少或非法 observedAt 一律不得作为证据。
 */
export function isAdmissibleQuotaSnapshot(
  quota: unknown,
  now = Date.now(),
): boolean {
  if (!quota || typeof quota !== "object") return false;
  const observedAt = (quota as Record<string, unknown>).observedAt;
  if (typeof observedAt !== "number" || !Number.isFinite(observedAt)) {
    return false;
  }
  return now - observedAt <= QUOTA_SNAPSHOT_STALE_MS;
}

export type AgentAvailabilityStatus =
  | "available"
  | "quota_exhausted"
  | "rate_limited"
  | "unverified";

export type AgentAvailabilityReason =
  | "quota_exhausted_response"
  | "quota_ok"
  | "quota_utilization_high"
  | "quota_remaining_zero"
  | "quota_window_reset"
  | "cooldown_active"
  | "no_quota_snapshot"
  | "stale_quota_snapshot";

export interface AgentAvailabilityDecision {
  status: AgentAvailabilityStatus;
  reason: AgentAvailabilityReason;
  resetAt?: number;
}

/**
 * Agent 可用性判定：四态（available / quota_exhausted / rate_limited / unverified）。
 * 优先级：
 * 1. 额度快照新鲜且出现未来未重置的耗尽窗口 (remaining === 0 或 utilization >= 0.95，且 resetAt > now) → quota_exhausted
 * 2. 窗口已 reset（resetAt <= now 或无法判定未来 resetAt）→ unverified (quota_window_reset)
 * 3. 存在本地 429 冷却记录 (nextAvailableAt > now) → rate_limited
 * 4. 缺少额度快照或无有效窗口 → unverified (no_quota_snapshot)
 * 5. 额度快照超过 2 小时未更新 → unverified (stale_quota_snapshot)
 * 6. 额度快照新鲜且余量充足 → available (quota_ok)
 */
export function resolveAgentAvailability(
  agent:
    | { nextAvailableAt?: number; quota?: AgentQuota; quotaExhaustion?: { observedAt: number } }
    | null
    | undefined,
  now = Date.now(),
): AgentAvailabilityDecision {
  // 错误响应也是额度证据，但不伪造窗口余量或重置时刻。
  const exhaustion = agent?.quotaExhaustion;
  if (isAdmissibleQuotaSnapshot(exhaustion, now)) {
    return { status: "quota_exhausted", reason: "quota_exhausted_response" };
  }
  const quota = agent?.quota;
  const isAdmissible = isAdmissibleQuotaSnapshot(quota, now);
  const hasObservedAt =
    Boolean(quota) &&
    typeof quota?.observedAt === "number" &&
    Number.isFinite(quota.observedAt);
  const hasWindows = Boolean(
    quota && Array.isArray(quota.windows) && quota.windows.length > 0,
  );
  const hasValidQuota = isAdmissible && hasWindows;

  // 1. 检查额度耗尽（新鲜快照）
  if (hasValidQuota) {
    let hasActiveRemainingZero = false;
    let hasActiveUtilizationHigh = false;
    let hasWindowResetPending = false;
    let maxResetAt: number | undefined;

    for (const w of quota!.windows) {
      const inspected = inspectQuotaWindowExhaustion(w, now);
      if (!inspected) continue;

      if (inspected.resetAt !== undefined && inspected.resetAt > now) {
        if (inspected.remainingZero) hasActiveRemainingZero = true;
        if (inspected.utilizationHigh) hasActiveUtilizationHigh = true;
        maxResetAt =
          maxResetAt !== undefined
            ? Math.max(maxResetAt, inspected.resetAt)
            : inspected.resetAt;
      } else {
        hasWindowResetPending = true;
      }
    }

    if (hasActiveRemainingZero || hasActiveUtilizationHigh) {
      return {
        status: "quota_exhausted",
        reason: hasActiveRemainingZero
          ? "quota_remaining_zero"
          : "quota_utilization_high",
        ...(maxResetAt !== undefined ? { resetAt: maxResetAt } : {}),
      };
    }

    if (hasWindowResetPending) {
      return {
        status: "unverified",
        reason: "quota_window_reset",
      };
    }
  }

  // 2. 本地 429 限流冷却
  const isRateLimited = typeof agent?.nextAvailableAt === "number" &&
    Number.isFinite(agent.nextAvailableAt) &&
    agent.nextAvailableAt > now;

  if (isRateLimited) {
    return {
      status: "rate_limited",
      reason: "cooldown_active",
    };
  }

  // 3. 证据不足：无快照 / 非法时间戳 / 无有效窗口
  if (!hasObservedAt || !hasWindows) {
    return {
      status: "unverified",
      reason: "no_quota_snapshot",
    };
  }

  // 4. 证据不足：快照陈旧
  if (!isAdmissible) {
    return {
      status: "unverified",
      reason: "stale_quota_snapshot",
    };
  }

  // 5. 证据充分且充足
  return {
    status: "available",
    reason: "quota_ok",
  };
}

function readRetryAfterTimestamp(body: unknown, now: number): number | undefined {
  if (!body || typeof body !== "object") return undefined;
  const root = body as Record<string, unknown>;
  const raw = root.retryAfter ?? root.retry_after ?? root["Retry-After"];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e12 ? raw : now + Math.max(0, raw) * 1000;
  }
  if (typeof raw === "string") {
    const seconds = Number(raw.trim());
    if (Number.isFinite(seconds)) return now + Math.max(0, seconds) * 1000;
    const date = Date.parse(raw);
    if (Number.isFinite(date)) return date;
  }
  return undefined;
}

function readResetTimestamp(body: unknown, now: number): number | undefined {
  if (!body || typeof body !== "object") return undefined;
  const root = body as Record<string, unknown>;
  const error =
    root.error && typeof root.error === "object"
      ? (root.error as Record<string, unknown>)
      : root;
  // gRPC/Google 风格：`details` 是**数组**，冷却时长在其中的 RetryInfo 项里
  // （`{"@type":"…google.rpc.RetryInfo","retryDelay":"30s"}`）。此前这里只按
  // 对象取 `details.resets_at`，数组上必然取不到，于是只能靠把整个 body
  // 字符串化后做 `(\d+)\s*[smhd]` 文本扫描去撞——那会连 message 里无关的
  // 时长（"timeout after 30s"）一起扫中，先命中谁取决于文本顺序。
  // 结构化字段是权威来源，优先按结构读。
  if (Array.isArray(error.details)) {
    for (const item of error.details) {
      if (!item || typeof item !== "object") continue;
      const retryDelay = (item as Record<string, unknown>).retryDelay;
      if (typeof retryDelay === "string") {
        const ms = parseResetsInMs(retryDelay);
        if (typeof ms === "number" && Number.isFinite(ms)) return now + ms;
      }
    }
  }
  const details =
    !Array.isArray(error.details) && error.details && typeof error.details === "object"
      ? (error.details as Record<string, unknown>)
      : undefined;
  const raw = error.resets_at ?? error.resetsAt ?? details?.resets_at ?? details?.resetsAt;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * `Weekly/Monthly Limit Exhausted. Your limit will reset at 2026-08-27 12:05:49`。
 *
 * 必须先于相对时长兜底：周/月额度耗尽只给绝对时刻，落到默认 5 分钟窗口的话
 * agent 很快又被放回可选列表并再次撞 429。
 *
 * 取舍：无时区后缀的串按**本地时区**解析（`Date.parse` 语义）。上游多为与用户
 * 同区的服务，异地部署最多偏几小时，仍远优于 5 分钟兜底；刻意不引时区库。
 */
function parseResetAtText(value: string, now: number): number | undefined {
  const m = value.match(
    /resets?\s+at\s+(\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?)/i,
  );
  if (!m?.[1]) return undefined;
  const parsed = Date.parse(m[1]);
  return Number.isFinite(parsed) && parsed > now ? parsed : undefined;
}

/**
 * 周期性硬配额耗尽的文案启发式。部分 provider（如 Ollama cloud 的
 * `you ... have reached your weekly usage limit, upgrade for higher limits ...`）
 * 的 429 body 既无 Retry-After 也无任何可解析的复位时刻，若落到默认 5 分钟窗口，
 * agent 很快又被放回派发并再次撞 429。这类配额按周/月重置，直接给到硬上限
 * `MAX_COOLDOWN_MS`，由 clamp 统一封顶、由 probe 机制负责到期重试。
 *
 * 调用方必须把它排在 `parseResetsInMs` 之前：后者对整个 body 文本做全局
 * 「数字+单位」扫描，provider 可控内容（用户名/ref 里的 "2sun"、"12m"）会被
 * 误读成相对时长并短路本判定。
 */
function matchesPeriodicUsageLimitText(text: string): boolean {
  return /(?:weekly|monthly)\s*(?:\([^)]*\)\s*)?usage\s+limit/i.test(text);
}

/**
 * Narrow quota predicate for HTTP 403 responses. A bare 403 remains an auth
 * failure; only provider text that explicitly describes exhausted quota is
 * allowed to enter the unavailable/cooldown path.
 */
export function isQuotaLimited403Body(body: unknown): boolean {
  const text = typeof body === "string" ? body : JSON.stringify(body ?? "");
  return (
    matchesPeriodicUsageLimitText(text) ||
    /access_terminated_error/i.test(text) ||
    /(?:quota|usage)\s+(?:is\s+)?(?:exhausted|depleted|used\s+up|reached)/i.test(text) ||
    /(?:quota|usage).{0,40}\b(?:reset|resets)\s+at\b/i.test(text)
  );
}
/**
 * 提取上游响应中的显式复位时刻信号（含 clamp 到 [now, now + MAX_COOLDOWN_MS]）。
 * 若不包含任何显式复位/限流/周期配额信号，返回 undefined。
 */
function parseExplicitAvailableAt(
  body: unknown,
  now: number,
  headers?: Headers | Record<string, string> | null,
): number | undefined {
  const headerRetryAfter =
    headers && typeof (headers as Headers).get === "function"
      ? (headers as Headers).get("retry-after")
      : ((headers as Record<string, string> | null | undefined)?.["retry-after"] ??
        (headers as Record<string, string> | null | undefined)?.["Retry-After"]);
  const retryAfter = headerRetryAfter
    ? readRetryAfterTimestamp({ retryAfter: headerRetryAfter }, now)
    : readRetryAfterTimestamp(body, now);
  if (retryAfter !== undefined && retryAfter > now) {
    // Retry-After 头/偏移若给到荒谬的未来（如 2051），同样 clamp 到 24h。
    return clampCooldownDeadline(retryAfter, now);
  }

  const absolute = readResetTimestamp(body, now);
  if (absolute !== undefined && absolute > now) {
    return clampCooldownDeadline(absolute, now);
  }

  const text = typeof body === "string" ? body : JSON.stringify(body ?? "");
  const absoluteFromText = parseResetAtText(text, now);
  if (absoluteFromText !== undefined) {
    return clampCooldownDeadline(absoluteFromText, now);
  }

  // 周期性硬配额文案必须先于 parseResetsInMs 判定：后者对整个 body 文本做全局
  // 「数字+单位」扫描，provider 可控内容（用户名 "star_2sun"、ref "12m-9"）会被
  // 误读成相对时长，把本该 24h 的冷却短路成秒级，原 bug 复活。绝对 "reset at"
  // 是精确信号，仍优先于该启发式。
  if (matchesPeriodicUsageLimitText(text)) {
    return clampCooldownDeadline(now + MAX_COOLDOWN_MS, now);
  }

  const relativeMs = parseResetsInMs(text);
  if (relativeMs !== undefined) {
    return clampCooldownDeadline(now + relativeMs, now);
  }

  return undefined;
}

/**
 * 仅明确是容量抖动、且无显式复位/配额信号的 429 才放行；默认从严。
 * 空 body、未知文案和额度耗尽均不视为薄限流，保留保守冷却且不重试。
 *
 * 真实案例：`local Codex OAuth provider failed: HTTP 429Codex is at capacity, please try again later`。
 * 上游明确表示容量饱和且没有复位信号时，才使用 60s 冷却及请求内重试。
 * 本函数只用于 429 分支，不得用于 5xx。
 */
/**
 * 额度耗尽类文案：命中即**否决**容量饱和判定。
 *
 * 为什么必须优先否决：额度问题重试无用（重试只会重复撞墙并放大配额压力），
 * 而部分上游会把 "please try again later" 这类通用提示和额度文案放在一起。
 * 中文文案没有 word boundary，故中文分支不套 \b。
 */
/**
 * 额度耗尽类文案：命中即**否决**容量饱和判定。
 *
 * 两个刻意的实现约束：
 * 1) 中间只允许**固定词表**（is|has|been|…），不用 `(?:\w+\s*){0,3}`。
 *    后者因为 `\s*` 可零宽，同一个长单词能被多种方式拆给多次 `\w+`，
 *    尾部词匹配失败时回溯爆炸（实测 2KB 文案卡 2.7 秒，等于给上游错误文案
 *    开了一条同步阻塞事件循环的口子）。
 * 2) 词表里**不含 not / isn't / hasn't**，于是 `quota not exhausted` 这种
 *    「明确说未耗尽」的文案天然不匹配——不会误否决容量分类。
 */
const QUOTA_EXHAUSTED_TEXT_RE =
  /insufficient[_ ]?quota|quota\s*(?:(?:is|has|been|was|now|fully|completely|already|entirely)\s+)*(?:limit\s+)?(?:exhausted|depleted|used\s*up|reached|exceeded)|usage\s*limit\s*(?:reached|exceeded|exhausted)|(?:\b(?:weekly|monthly|5-?hour|5h|7-?day|7d)\s*(?:\([^)]*\)\s*)?limit\s*(?:reached|exceeded|exhausted|depleted)\b)|(?:reached|exceeded)\s+your\s+.*?(?:usage\s+)?limit|exceeded\s*your\s*(?:current\s*)?quota|insufficient[_\s-]?(?:balance|credits?)|balance\s*(?:is\s*)?(?:insufficient|too\s*low)|(?:额度|配额|用量)(?:已|已经|也)?(?:用尽|耗尽|用完|超限|不足)|(?:已达到|已达|超出|超过)[^。;,\n]{0,40}(?:用量上限|配额上限|额度上限)|余额(?:不足|不够|已用尽|已耗尽)/i;

/**
 * 否定配额表述（`quota is not exhausted` / `limit not reached` 等），排除误判。
 */
const NEGATED_QUOTA_TEXT_RE =
  /\b(?:not|no\s+longer|never|haven't|hasn't|isn't|aren't)\s+(?:(?:currently|really|actually|yet)\s+)?(?:quota\s+exhausted|limit\s+exhausted|exhausted|depleted|used\s*up|reached|exceeded|out\s+of\s+quota)\b/i;

/**
 * 明确的容量饱和表述。
 *
 * 刻意**不含** "please try again later"：那条几乎出现在所有 429 文案里，
 * 单独出现不构成任何容量证据（否则 `quota exhausted, please try again later`
 * 会被误判为容量抖动）。
 */
const CAPACITY_SATURATED_TEXT_RE =
  /\b(?:is\s+at\s+capacity|at\s+capacity|capacity\s*(?:is\s*)?(?:saturated|exceeded|unavailable)|overloaded|over\s*capacity)\b/i;

/**
 * 否定表述（`not at capacity` / `not capacity saturated`）不算证据。
 *
 * 否定词必须**紧跟**容量短语（最多允许一个程度副词），不能用 `[^.]{0,40}?` 这种
 * 任意距离通配：否则 `quota not exhausted; server overloaded` 里的 `not` 会被
 * 算到后面的 `overloaded` 头上，把真正的容量饱和误判成否定。
 */
const NEGATED_CAPACITY_TEXT_RE =
  /\b(?:not|no\s+longer|never)\s+(?:(?:currently|really|actually|yet)\s+)?(?:at\s+capacity|capacity\s*(?:is\s*)?(?:saturated|exceeded|unavailable)|overloaded|over\s*capacity)\b/i;

/**
 * 纯判定：该响应/文案是否表示「额度已耗尽」（区别于短时限流与容量饱和）。
 *
 * 单一真值：CLI 的失败文案归类（agentRun.looksLikeQuotaExhaustedText）与冷却分级
 * 都走这里，避免各自维护一份词表而漏掉某种语言/厂商的写法。真实缺口案例：
 * MiniMax 的「已达到 Token Plan 用量上限」和英文 `usage limit reached` 曾都不被
 * 识别，于是被显示成「上游限流」而不是「额度已用尽」。
 */
export function isQuotaExhaustedText(body: unknown): boolean {
  const text = typeof body === "string" ? body : JSON.stringify(body ?? "");
  if (!text) return false;
  // MiniMax 业务错误可能包在 HTTP 200 或序列化的错误体内；只匹配码字段，
  // 不把消息里的任意数字 2056 当成配额事实。
  if (/"(?:code|status_code)"\s*:\s*"?2056"?(?=\s*[,}])/.test(text)) return true;
  if (NEGATED_QUOTA_TEXT_RE.test(text)) return false;
  return QUOTA_EXHAUSTED_TEXT_RE.test(text) || isQuotaLimited403Body(text);
}

/**
 * 仅「明确是容量抖动、且无显式复位/配额信号」的 429 才放行；默认从严。
 *
 * 判据顺序（每一项都是否决权，先命中先返回 false）：
 * 1) 有显式复位信号（Retry-After / resets_at / 周期额度文案 / 相对时长）→ 不是薄限流；
 * 2) 命中额度耗尽文案 → 否决（重试无用）；
 * 3) 命中否定表述（`not at capacity`）→ 否决；
 * 4) 命中明确的容量饱和表述 → 才算。
 *
 * 空 body、无法解析的 JSON、未知文案一律 false：宁可保守冷却 5 分钟，
 * 也不把未知情况当成容量抖动去高频重试。
 *
 * 真实案例：`local Codex OAuth provider failed: HTTP 429Codex is at capacity, please try again later`。
 * 本函数只用于 429 分支，不得用于 5xx。
 */
export function isCapacitySaturatedRateLimit(
  body: unknown,
  now: number,
  headers?: Headers | Record<string, string> | null,
): boolean {
  if (parseExplicitAvailableAt(body, now, headers) !== undefined) return false;
  const text = typeof body === "string" ? body : JSON.stringify(body ?? "");
  if (!text) return false;
  // 额度否决必须覆盖**完整**的额度判据（`isQuotaExhaustedText` 还包含
  // isQuotaLimited403Body 的 access_terminated_error / weekly usage limit 等）。
  // 只查共享正则会出现「额度=true 且 容量=true」并存，CLI 按容量优先渲染，
  // 把真正的额度耗尽显示成容量饱和（复审实测）。
  if (isQuotaExhaustedText(text)) return false;
  if (NEGATED_CAPACITY_TEXT_RE.test(text)) return false;
  return CAPACITY_SATURATED_TEXT_RE.test(text);
}

export type AvailabilityAction =
  | { kind: "clear" }
  | { kind: "mark"; nextAvailableAt: number }
  | { kind: "noop" };

/**
 * 把一次上游 429 响应解析成绝对的 epoch-ms 可用时刻。
 *
 * 优先级：Retry-After 头 → body 里的 retryAfter → resets_at/resetsAt →
 * 文案里的绝对 "reset at" → 周期性硬配额文案 → 文案里的相对时长 → 默认窗口。
 */
export function resolveNextAvailableAt(
  body: unknown,
  now: number,
  headers?: Headers | Record<string, string> | null,
): number {
  const parsed = parseExplicitAvailableAt(body, now, headers);
  return parsed ?? clampCooldownDeadline(now + DEFAULT_PROVIDER_RETRY_MS, now);
}

/**
 * 纯决策：把一次上游 status + body 映射成可用性动作。
 * 2xx → clear（非正常 completion 的结构化配额错误除外）；429 → mark；
 * 配额耗尽错误 → mark；5xx → mark；其余 → noop。
 * 执行（读写记录）由各端适配层负责。
 */
export function resolveAvailabilityAction(
  status: number,
  body: unknown,
  now: number,
  headers?: Headers | Record<string, string> | null,
): AvailabilityAction {
  if (status >= 200 && status < 300) {
    // Successful completions can quote quota errors. Never scan or serialize their
    // content; MiniMax's HTTP 200 business errors require an explicit error code.
    const b = body as {
      choices?: unknown;
      code?: unknown;
      error?: { code?: unknown } | null;
      base_resp?: { status_code?: unknown } | null;
    } | null;
    if (b && typeof b === "object" && !(Array.isArray(b.choices) && b.choices.length > 0)) {
      const isQuotaCode = (code: unknown) => code === 2056 || code === "2056";
      if (isQuotaCode(b.code) || isQuotaCode(b.error?.code) || isQuotaCode(b.base_resp?.status_code)) {
        return { kind: "mark", nextAvailableAt: resolveNextAvailableAt(body, now, headers) };
      }
    }
    return { kind: "clear" };
  }
  if (isQuotaExhaustedText(body)) {
    return { kind: "mark", nextAvailableAt: resolveNextAvailableAt(body, now, headers) };
  }
  if (status === 429) {
    if (isCapacitySaturatedRateLimit(body, now, headers)) {
      return { kind: "mark", nextAvailableAt: now + THIN_RATE_LIMIT_COOLDOWN_MS };
    }
    return { kind: "mark", nextAvailableAt: resolveNextAvailableAt(body, now, headers) };
  }
  if (status >= 500) {
    return { kind: "mark", nextAvailableAt: now + DEFAULT_PROVIDER_RETRY_MS };
  }
  return { kind: "noop" };
}

/**
 * 合并新旧冷却截止：取更晚者。
 *
 * 防的是「短冷却抹掉长冷却」——例如周额度耗尽已写入 3 天后的截止，随后一次 5xx
 * 只想标记 5 分钟，直接覆盖会让 agent 立刻被放回可选列表。
 */
export function mergeAvailabilityDeadline(
  currentDeadline: unknown,
  nextAvailableAt: number,
): number {
  return typeof currentDeadline === "number" && Number.isFinite(currentDeadline)
    ? Math.max(currentDeadline, nextAvailableAt)
    : nextAvailableAt;
}

/**
 * 冷却期内自动重试探针的间隔。到点后放行一次真实请求去试探上游是否已恢复，
 * 失败则按响应重新 mark，成功则 clear。太短会频繁打上游，太长会拉长自锁死窗口。
 */
export const PROBE_INTERVAL_MS = 10 * 60 * 1000;

export type CooldownGateDecision = "open" | "blocked" | "probe";

/**
 * 派发前的冷却门控决策（纯函数）。
 *
 * 打破「冷却自锁死」：旧逻辑冷却期内 gate 直接 throw、请求根本不发出，而冷却又只由
 * 200 响应清除 → 永远拿不到 200 → 永远被锁。这里在冷却期内周期性放行一次真实请求
 * （"probe"）去试探上游：
 * - deadline 已过（nextAvailableAt <= now）→ "open"（放行）。
 * - deadline 未过、距上次探测超过 PROBE_INTERVAL_MS → "probe"（放行一次真实请求，
 *   失败按响应重新 mark，成功则 clear）。
 * - deadline 未过、刚探测过（lastProbeAt 距今未到间隔）→ "blocked"（照旧 throw）。
 *
 * 不读系统时钟；`now` 由入参传入。`lastProbeAt` 缺省（undefined）时视为「从未探测」，
 * 立即进入 probe，这既兼容旧格式文件，也确保冷启动/旧坏条目不会因永远等不到探针而锁死。
 */
export function resolveCooldownGate(
  input: { nextAvailableAt?: number; lastProbeAt?: number },
  now: number,
): CooldownGateDecision {
  const nextAvailableAt = input.nextAvailableAt;
  if (
    typeof nextAvailableAt !== "number" ||
    !Number.isFinite(nextAvailableAt) ||
    nextAvailableAt <= now
  ) {
    return "open";
  }
  const lastProbeAt = input.lastProbeAt;
  if (typeof lastProbeAt !== "number" || !Number.isFinite(lastProbeAt)) {
    return "probe";
  }
  return now - lastProbeAt >= PROBE_INTERVAL_MS ? "probe" : "blocked";
}

/**
 * 从 agent 记录推导冷却应记在哪个 credential 上。
 *
 * `apiKeyRef` 是权威来源：OAuth agent 上是 `chatgpt` / `claude` / `antigravity`
 * 这类**跨 agent 共享**的标识；托管 API key 上是 `api-key:agent-<owner>-<id>`
 * 这类 agent 专属标识——后者天然退化成一 agent 一 key，语义仍然正确。
 *
 * 返回 undefined 表示这个 agent 没有可归属的凭证（例如未配置凭证的公共
 * agent），调用方应回退到 agent 级行为，不要臆造 key。
 *
 * 2026-09-30 从 `packages/cli/credentialAvailability.ts` 上移到本模块，2026-10-01
 * 随该存储模块一并下沉到 `packages/agent-runtime/credentialAvailability.ts`：
 * 写侧（CLI `recordLocalAvailabilityForAgent` / 桌面
 * `recordAgentAvailabilityFromResponse`）与读侧（CLI `agent list`、派发 gate、
 * server 准入）必须用同一把 key；而 cli / agent-runtime / desktop-runtime 都只向下依赖
 * ai，故真值放这里，CLI 侧只 re-export 保持既有调用点不变。
 */
/**
 * 判定 agent 记录是否为平台公开记录（agent-pub-）或系统记录（agent-system-）。
 * 这类记录无特定用户属主，且完全不关联本机凭据冷却。
 */
export function isPublicOrSystemAgentRecord(
  agent: Record<string, unknown> | null | undefined,
): boolean {
  if (!agent || typeof agent !== "object") return false;
  for (const keyField of ["agentKey", "key", "id", "dbKey", "privateKey"] as const) {
    const rawKey = agent[keyField];
    if (typeof rawKey === "string") {
      const trimmed = rawKey.trim();
      if (
        trimmed.startsWith("agent-pub-") ||
        trimmed.startsWith("agent-system-")
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 从 agent 记录解析 ownerUserId：
 * 优先显式字段（ownerUserId / userId），否则从 agentKey 前缀 `agent-<ownerUserId>-<id>` 解析。
 * 注意 `agent-pub-`（公开记录）与 `agent-system-`（系统记录）无特定用户属主，需另行处理或回退。
 */
export function resolveAgentOwnerUserId(
  agent: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!agent || typeof agent !== "object") return undefined;
  // agent-pub-（公开记录）与 agent-system-（系统记录）无特定用户属主，
  // 必须先于显式 owner 字段判定，避免公开/系统目录记录被错误关联本机凭证冷却。
  if (isPublicOrSystemAgentRecord(agent)) {
    return undefined;
  }
  for (const field of ["ownerUserId", "userId", "ownerId"] as const) {
    const value = agent[field];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "system" || trimmed === "pub") continue;
      if (trimmed) return trimmed;
    }
  }
  for (const keyField of ["agentKey", "key", "id", "dbKey", "privateKey"] as const) {
    const rawKey = agent[keyField];
    if (typeof rawKey === "string") {
      const trimmed = rawKey.trim();
      if (trimmed.startsWith("agent-")) {
        const m = /^agent-([^-]+)-.+$/.exec(trimmed);
        if (m?.[1] && m[1] !== "pub" && m[1] !== "system") {
          return m[1];
        }
      }
    }
  }
  return undefined;
}

/**
 * 候选读取 key：优先带 @owner 的精准 key，回退到无 @owner 的旧格式 key。
 * 确保升级前后已有冷却记录在读取时不失效。
 */
export function resolveCredentialCandidateKeys(key: string | undefined): string[] {
  if (!key) return [];
  const trimmed = key.trim();
  if (!trimmed) return [];
  const candidates = [trimmed];
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex > 0) {
    const legacyKey = trimmed.slice(0, atIndex).trim();
    if (legacyKey && legacyKey !== trimmed) candidates.push(legacyKey);
  }
  return candidates;
}

/**
 * 从 agent 记录推导冷却应记在哪个 credential 上。
 *
 * 凭证 key 带 owner 维度（`apiKeyRef@ownerUserId`）：
 * 自己的 OAuth agent（如 `agent-0e95801d90-gpt-6-1-sol`）与他人共享的 agent
 * （如 `agent-1c2b14b968-...-sshare`）即使同属一个 provider（如 `chatgpt`），
 * 也因属主不同而互不影响（`chatgpt@0e95801d90` vs `chatgpt@1c2b14b968`）。
 * 同一 owner 下的同 provider 仍共享同一份冷却；解析不出 owner 时回退到原格式。
 *
 * 返回 undefined 表示这个 agent 没有可归属的凭证（例如未配置凭证的公共
 * agent），调用方应回退到 agent 级行为，不要臆造 key。
 */
export function resolveCredentialKey(
  agent: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!agent || typeof agent !== "object") return undefined;
  // agent-pub-（公开记录）与 agent-system-（系统记录）完全不关联本机凭证冷却
  if (isPublicOrSystemAgentRecord(agent)) return undefined;
  let rawRef: string | undefined;
  for (const field of ["apiKeyRef", "credentialRef"] as const) {
    const value = agent[field];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        rawRef = trimmed;
        break;
      }
    }
  }
  if (!rawRef) return undefined;
  if (rawRef.includes("@")) return rawRef;
  const owner = resolveAgentOwnerUserId(agent);
  return owner ? `${rawRef}@${owner}` : rawRef;
}

/**
 * 与 `resolveCredentialKey` 相同的 credential 归属，但解析不出 ref 时派生**确定性
 * fallback key**，让无 `apiKeyRef`/`credentialRef` 的 custom-provider agent（例如
 * `customProviderUrl=https://ollama.com/v1` 直连 Ollama cloud）的 429 冷却也能落盘。
 * 此前这类 agent 的 mark 与 gate 都因拿不到 key 而空转，冷却结论被静默丢弃，
 * 每次派发都重新撞同一堵 429。
 *
 * 派生规则（只依赖 agent 配置本身，跨进程稳定）：
 * 1. 配置了可解析为 URL 的 `customProviderUrl`（直连 OpenAI-compatible 通道实际
 *    读取的 endpoint 字段，见 `providerResolution.ts` custom 分支的
 *    `agentConfig.customProviderUrl`）→ `custom-endpoint:<URL origin>`；
 * 2. 否则 → `custom-agent:<agentConfig.key>`。
 *
 * 已知误差（有意接受）：endpoint 级分组比 credential 粒度粗——同一 endpoint 下
 * 的不同账号共享同一份冷却。账号 A 耗尽会连带挡住同 endpoint 下正常的账号 B：
 * 冷却期内 B 只能等共享层 gate 每 `PROBE_INTERVAL_MS` 放行一次 probe，且要等
 * 某次 probe 拿到 2xx 才清除冷却——B 并非「延迟一个窗口就恢复」，而是退化成
 * 低频探测直到命中成功响应。刻意取舍：换取的是无 ref 的 agent 冷却必落盘、
 * 不再每次派发都撞 429，且 `MAX_COOLDOWN_MS` 保证最长 24h 自然过期。
 */
export function resolveCredentialKeyWithFallback(
  agent: Record<string, unknown> | null | undefined,
): string | undefined {
  if (isPublicOrSystemAgentRecord(agent)) return undefined;
  const byRef = resolveCredentialKey(agent);
  if (byRef) return byRef;
  if (!agent || typeof agent !== "object") return undefined;
  const endpoint = agent.customProviderUrl;
  if (typeof endpoint === "string") {
    const trimmed = endpoint.trim();
    if (trimmed) {
      try {
        const origin = new URL(trimmed).origin;
        // opaque origin（非 http(s) 形态）不做 endpoint 分组，落回 agent key。
        if (origin && origin !== "null") return `custom-endpoint:${origin}`;
      } catch {
        // 非 URL 形态的 endpoint 不臆造，落回 agent key。
      }
    }
  }
  const key = agent.key;
  if (typeof key === "string" && key.trim()) return `custom-agent:${key.trim()}`;
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 失败原因细分判定（全端共享，纯逻辑，零 I/O）
// ─────────────────────────────────────────────────────────────────────────────

export type AgentRunFailureSubclass =
  | "capacity"
  | "quota_5h"
  | "quota_weekly"
  | "quota_limit"
  | "rate_limit"
  | "auth"
  | "balance"
  | "unknown";

export type RunFailureSubclass = AgentRunFailureSubclass;

export type ClassifyFailureSubclassInput = {
  status?: number | null;
  message?: string | null;
  body?: unknown;
  headers?: Headers | Record<string, string> | null;
  quota?: AgentQuota | Record<string, unknown> | null;
};

const AUTH_ERROR_TEXT_RE =
  /\b(?:unauthorized|unauthenticated|authentication_error|invalid_api_key|invalid_token|bad_api_key|access_denied)\b/i;

const BALANCE_ERROR_TEXT_RE =
  /\b(?:insufficient_balance|wallet balance|coding_plan_exhausted|payment_required|arrears)\b|余额不足|额度已用尽且钱包|充值/i;

const TEXT_5H_WINDOW_RE = /\b(?:5h|5-hour|5\s*hours?|5\s*hrs?)\b/i;
const TEXT_WEEKLY_WINDOW_RE =
  /\b(?:weekly|monthly|7d|7-day|7\s*days?|30-day|month(?:ly)?|week(?:ly)?)\b/i;

export interface QuotaWindowExhaustionResult {
  isExhausted: boolean;
  isActive: boolean;
  isResetPending: boolean;
  scopeType: "5h" | "weekly" | "limit";
  resetAt?: number;
  remainingZero: boolean;
  utilizationHigh: boolean;
}

/**
 * 窗口耗尽判定的唯一共享实现。
 * 综合利用率/余量、resetAt 过期检查（resetAt <= now）与 scope 判定。
 */
export function inspectQuotaWindowExhaustion(
  window: unknown,
  now: number,
): QuotaWindowExhaustionResult | undefined {
  if (!window || typeof window !== "object") return undefined;
  const w = window as Record<string, unknown>;
  const scope = typeof w.scope === "string" ? w.scope.toLowerCase() : "";
  const windowSeconds =
    typeof w.limit_window_seconds === "number"
      ? w.limit_window_seconds
      : typeof w.window_seconds === "number"
        ? w.window_seconds
        : undefined;

  const usedPercent =
    typeof w.used_percent === "number"
      ? w.used_percent
      : typeof w.utilization === "number"
        ? w.utilization * 100
        : undefined;
  const remaining = typeof w.remaining === "number" ? w.remaining : undefined;
  const isZero = remaining === 0;
  const isHigh =
    typeof usedPercent === "number" &&
    Number.isFinite(usedPercent) &&
    usedPercent >= 95;

  if (!isZero && !isHigh) return undefined;

  let scopeType: "5h" | "weekly" | "limit" = "limit";
  if (
    scope === "5h" ||
    scope.includes("5h") ||
    scope.includes("5-hour") ||
    windowSeconds === 18000
  ) {
    scopeType = "5h";
  } else if (
    scope === "7d" ||
    scope === "weekly" ||
    scope === "monthly" ||
    scope.includes("7d") ||
    scope.includes("week") ||
    scope.includes("month") ||
    windowSeconds === 604800 ||
    windowSeconds === 2592000
  ) {
    scopeType = "weekly";
  }

  let resetAt: number | undefined;
  if (typeof w.resetAt === "number" && Number.isFinite(w.resetAt)) {
    resetAt = w.resetAt;
  } else if (typeof w.reset_at === "number" && Number.isFinite(w.reset_at)) {
    resetAt = w.reset_at >= 1e12 ? w.reset_at : w.reset_at * 1000;
  } else if (typeof w.resets_at === "number" && Number.isFinite(w.resets_at)) {
    resetAt = w.resets_at >= 1e12 ? w.resets_at : w.resets_at * 1000;
  }

  const hasResetAt = typeof resetAt === "number" && Number.isFinite(resetAt);
  if (hasResetAt && resetAt <= now) {
    return {
      isExhausted: true,
      isActive: false,
      isResetPending: true,
      scopeType,
      resetAt,
      remainingZero: isZero,
      utilizationHigh: isHigh,
    };
  }
  if (hasResetAt && resetAt > now) {
    return {
      isExhausted: true,
      isActive: true,
      isResetPending: false,
      scopeType,
      resetAt,
      remainingZero: isZero,
      utilizationHigh: isHigh,
    };
  }

  // 无法得出未来 resetAt：对即时分类有效，但可用性判定需转待验证
  return {
    isExhausted: true,
    isActive: true,
    isResetPending: true,
    scopeType,
    remainingZero: isZero,
    utilizationHigh: isHigh,
  };
}

export function resolveWindowFromQuotaSnapshot(
  quota: unknown,
  now = Date.now(),
): "5h" | "weekly" | "limit" | undefined {
  if (!isAdmissibleQuotaSnapshot(quota, now)) return undefined;
  const q = quota as Record<string, unknown>;

  // 1) 优先检查 primary_window / secondary_window（Codex / rate_limit 结构）
  const rateLimitRoot = (q.rate_limit && typeof q.rate_limit === "object"
    ? q.rate_limit
    : q) as Record<string, unknown>;
  for (const winKey of ["primary_window", "secondary_window"] as const) {
    const inspected = inspectQuotaWindowExhaustion(rateLimitRoot[winKey], now);
    if (inspected?.isActive && inspected.scopeType !== "limit") return inspected.scopeType;
  }

  // 2) 检查 windows 数组（AgentQuota 格式）
  if (Array.isArray(q.windows)) {
    let hasLimit = false;
    for (const win of q.windows) {
      const inspected = inspectQuotaWindowExhaustion(win, now);
      if (inspected?.isActive) {
        if (inspected.scopeType === "5h" || inspected.scopeType === "weekly") return inspected.scopeType;
        if (inspected.scopeType === "limit") hasLimit = true;
      }
    }
    if (hasLimit) return "limit";
  }

  // 3) 若 primary/secondary 存在但未命中已知窗口
  for (const winKey of ["primary_window", "secondary_window"] as const) {
    const inspected = inspectQuotaWindowExhaustion(rateLimitRoot[winKey], now);
    if (inspected?.isActive && inspected.scopeType === "limit") {
      return "limit";
    }
  }

  return undefined;
}

/**
 * 失败分类细分判定（纯逻辑，零 I/O，全端共享）。
 *
 * 判据顺序：
 * 1. 明确的凭证鉴权拒绝 (401 / 403 非额度) → auth
 * 2. 402 / 余额不足 / 充值 → balance
 * 3. 容量饱和 (Codex at capacity / server overloaded) → capacity
 * 4. 配额耗尽 (5h 窗口 / weekly 周期 / 未知窗口) → quota_5h / quota_weekly / quota_limit
 * 5. 纯限流 (429 抖动 / rate limit) → rate_limit
 * 6. 其余 → unknown
 */
export function classifyFailureSubclass(
  input: ClassifyFailureSubclassInput | unknown,
  now = Date.now(),
): AgentRunFailureSubclass {
  let status: number | undefined;
  let rawMessage = "";
  let body: unknown;
  let headers: Headers | Record<string, string> | null | undefined;
  let quota: unknown;

  if (typeof input === "string") {
    rawMessage = input;
  } else if (input && typeof input === "object") {
    const rec = input as Record<string, unknown>;
    status =
      typeof rec.status === "number"
        ? rec.status
        : typeof rec.statusCode === "number"
          ? rec.statusCode
          : undefined;
    rawMessage =
      typeof rec.message === "string"
        ? rec.message
        : typeof (rec as Error).message === "string"
          ? (rec as Error).message
          : "";
    body = rec.body ?? (("status" in rec || "message" in rec) ? undefined : input);
    headers = rec.headers as Headers | Record<string, string> | null | undefined;
    quota = rec.quota;
  }

  const bodyText = typeof body === "string" ? body : JSON.stringify(body ?? "");
  const fullText = `${rawMessage} ${bodyText}`.trim();

  // 1. Auth 检查（401，或非配额的 403，或明确的鉴权文案）
  if (status === 401) return "auth";
  // 显式 402 优先于鉴权文本判 balance（避免 402 携带鉴权错误文案时被抢先误判）
  if (status === 402) return "balance";
  if (status === 403 && !isQuotaLimited403Body(fullText)) return "auth";
  if (
    AUTH_ERROR_TEXT_RE.test(fullText) &&
    !isQuotaExhaustedText(fullText) &&
    !BALANCE_ERROR_TEXT_RE.test(fullText)
  ) {
    return "auth";
  }

  // 2. 余额检查
  if (BALANCE_ERROR_TEXT_RE.test(fullText)) {
    return "balance";
  }

  // 3. 容量饱和判定（Codex is at capacity, etc.）
  // M1: 严格复用共享判据 isCapacitySaturatedRateLimit，保留其否决语义（否定句、显式复位信号），不进行二次宽松匹配
  const targetForCapacity =
    typeof body === "object" && body !== null
      ? { ...(body as Record<string, unknown>), rawMessage, message: fullText }
      : fullText;
  if (isCapacitySaturatedRateLimit(targetForCapacity, now, headers)) {
    return "capacity";
  }

  // 4. 配额耗尽检查与窗口解析
  // M2: 先由 isQuotaExhaustedText 确认「确已耗尽」，窗口词只用于细分耗尽窗口；否定表述与未确认耗尽均不触发 quota_*
  const quotaWindowFromSnapshot =
    resolveWindowFromQuotaSnapshot(quota, now) ??
    resolveWindowFromQuotaSnapshot(body, now);

  const hasConfirmedQuotaExhaustion =
    quotaWindowFromSnapshot !== undefined ||
    (status === 403 && isQuotaLimited403Body(fullText) && !NEGATED_QUOTA_TEXT_RE.test(fullText)) ||
    isQuotaExhaustedText(fullText);

  if (hasConfirmedQuotaExhaustion) {
    if (
      quotaWindowFromSnapshot === "5h" ||
      (!NEGATED_QUOTA_TEXT_RE.test(fullText) && TEXT_5H_WINDOW_RE.test(fullText))
    ) {
      return "quota_5h";
    }
    if (
      quotaWindowFromSnapshot === "weekly" ||
      (!NEGATED_QUOTA_TEXT_RE.test(fullText) && TEXT_WEEKLY_WINDOW_RE.test(fullText))
    ) {
      return "quota_weekly";
    }
    return "quota_limit";
  }

  // 5. 限流（429 或限流文本）
  // M2: 未确认耗尽时窗口词不触发 quota_*，普通限流返回 rate_limit
  const isRateLimitLike =
    status === 429 ||
    /\b(?:rate.?limit|too many requests|throttl(?:ed|ing)|resource_exhausted)\b/i.test(
      fullText,
    );

  if (isRateLimitLike) {
    return "rate_limit";
  }

  return "unknown";
}

export const classifyRunFailureSubclass = classifyFailureSubclass;
