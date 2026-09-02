// packages/ai/llm/runinfraPauseCircuit.ts
//
// RunInfra `hosted_model_paused` 的**进程内**熔断记录。
//
// 背景：429 `hosted_model_paused` 的 `error.paused_until` 是上游给出的计划恢复
// 时刻。没有这层记录时，暂停窗口内每一个新请求都要各自撞一次上游才知道在暂停
// ——白白消耗 admission 配额、也让用户多等一个 RTT。
//
// 刻意**不**做分布式共享：
// - 跨 worker 共享要引入 Redis/KV 依赖与一致性问题，成本远高于收益；
// - 熔断判断错了最坏后果只是「多打一次上游」或「少打一次上游」，不影响正确性
//   与计费，因此进程内近似完全够用（每个 worker 各自撞一次即可自愈）。
//
// 因此这里只保留一个有 TTL 的内存 Map：key 是模型，value 是恢复时刻。

/** 单个模型的暂停记录。 */
type PauseEntry = {
  /** 上游声明的恢复时刻（epoch ms）。 */
  readonly resumeAtMs: number;
};

/**
 * 兜底最长熔断时长。防御上游给出异常久远的 `paused_until`
 * （例如时钟漂移或错误的 ISO 串）把模型长期锁死。
 */
export const MAX_PAUSE_MS = 60_000;

const pauseByModel = new Map<string, PauseEntry>();

const normalizeModel = (model?: string | null): string | null => {
  const trimmed = typeof model === "string" ? model.trim().toLowerCase() : "";
  return trimmed ? trimmed : null;
};

/**
 * 记录一次 `hosted_model_paused`。
 *
 * @param pausedUntil 上游 `error.paused_until`（ISO 串）；不可解析时回退到
 *                    `retryAfterMs`，两者都没有则忽略本次记录。
 * @returns 实际生效的恢复时刻（epoch ms），未记录时返回 null。
 */
export function recordRuninfraPause(opts: {
  model?: string | null;
  pausedUntil?: string | null;
  retryAfterMs?: number | null;
  nowMs?: number;
}): number | null {
  const key = normalizeModel(opts.model);
  if (!key) return null;

  const nowMs = opts.nowMs ?? Date.now();

  let resumeAtMs: number | null = null;
  const parsed = opts.pausedUntil ? Date.parse(opts.pausedUntil) : Number.NaN;
  if (Number.isFinite(parsed)) {
    resumeAtMs = parsed;
  } else if (
    typeof opts.retryAfterMs === "number" &&
    Number.isFinite(opts.retryAfterMs) &&
    opts.retryAfterMs > 0
  ) {
    resumeAtMs = nowMs + opts.retryAfterMs;
  }

  if (resumeAtMs == null) return null;

  // 已经过去的恢复时刻没有记录价值；同时限制最长熔断时长。
  if (resumeAtMs <= nowMs) return null;
  const capped = Math.min(resumeAtMs, nowMs + MAX_PAUSE_MS);

  pauseByModel.set(key, { resumeAtMs: capped });
  return capped;
}

/**
 * 查询模型当前是否处于已知的暂停窗口内。
 *
 * @returns 仍需等待的毫秒数；未暂停或已过期时返回 null（并顺带清理过期条目）。
 */
export function getRuninfraPauseRemainingMs(
  model?: string | null,
  nowMs: number = Date.now(),
): number | null {
  const key = normalizeModel(model);
  if (!key) return null;

  const entry = pauseByModel.get(key);
  if (!entry) return null;

  const remaining = entry.resumeAtMs - nowMs;
  if (remaining <= 0) {
    // TTL 到期：惰性清理，避免长期驻留。
    pauseByModel.delete(key);
    return null;
  }
  return remaining;
}

/** 上游恢复正常（2xx）时主动解除熔断，不必干等到 paused_until。 */
export function clearRuninfraPause(model?: string | null): void {
  const key = normalizeModel(model);
  if (key) pauseByModel.delete(key);
}

/** 仅供测试：清空全部记录。 */
export function resetRuninfraPauseCircuit(): void {
  pauseByModel.clear();
}
