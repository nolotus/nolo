/**
 * Agent「429 限流可用性」的**唯一事实来源**：判据、复位时刻解析、状态决策。
 *
 * 消费方（全部只 import 本文件，禁止再各自实现）：
 * - `packages/server/agentAvailability/agentAvailability.ts` — server 侧落 DB
 * - `packages/cli/client/localRuntimeAdapter.ts` — CLI 本地 runtime 落本地记录
 * - `packages/ai/tools/noloWorkspaceReadTools.ts` / `packages/cli/agentListCommands.ts` — 列表过滤
 *
 * 本模块纯逻辑、零 I/O、不读系统时钟（`now` 一律由入参传入），因此 server / CLI /
 * web / desktop 都能直接 import；持久化由各端适配层负责。
 *
 * 「周额度耗尽」修复只落在 CLI 一侧，server 侧同一个 bug continued to ship。
 */
import { parseResetsInMs } from "../tools/agent/quotaCircuitBreaker";

/** 无法从上游响应解析出复位时刻时使用的保守冷却窗口。 */
export const DEFAULT_PROVIDER_RETRY_MS = 5 * 60 * 1000;

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
export function isAgentUnavailableNow(
  agent:
    | ({ nextAvailableAt?: number } & Record<string, unknown>)
    | null
    | undefined,
  now = Date.now(),
): boolean {
  const at = agent?.nextAvailableAt;
  return typeof at === "number" && Number.isFinite(at) && at > now;
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
  return /weekly usage limit|monthly usage limit/i.test(text);
}

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
  // 周期性硬配额文案必须先于 parseResetsInMs 判定：后者对整个 body 文本做全局
  // 「数字+单位」扫描，provider 可控内容（用户名 "star_2sun"、ref "12m-9"）会被
  // 误读成相对时长，把本该 24h 的冷却短路成秒级，原 bug 复活。绝对 "reset at"
  // 是精确信号，仍优先于该启发式。
  const parsed =
    absoluteFromText ??
    (matchesPeriodicUsageLimitText(text)
      ? now + MAX_COOLDOWN_MS
      : now + (parseResetsInMs(text) ?? DEFAULT_PROVIDER_RETRY_MS));
  return clampCooldownDeadline(parsed, now);
}

export type AvailabilityAction =
  | { kind: "clear" }
  | { kind: "mark"; nextAvailableAt: number }
  | { kind: "noop" };

/**
 * 纯决策：把一次上游 status + body 映射成可用性动作。
 * 2xx → clear（恢复）；429 → mark（解析复位时刻）；
 * 5xx → mark（短默认窗口，避免反复打挂掉的 provider）；其余（1xx/3xx/4xx）→ noop。
 * 执行（读写记录）由各端适配层负责。
 */
export function resolveAvailabilityAction(
  status: number,
  body: unknown,
  now: number,
  headers?: Headers | Record<string, string> | null,
): AvailabilityAction {
  if (status >= 200 && status < 300) return { kind: "clear" };
  if (status === 429) {
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
