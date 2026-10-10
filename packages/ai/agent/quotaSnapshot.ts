/**
 * Agent 配额快照（quota snapshot）的**唯一事实来源**：从上游响应头/body 里
 * 抽取所有 rate-limit 窗口（不只最紧张的那个），供持久化与展示消费。
 *
 * 对标 sub2api 等中转网关的「剩余 X / Y 重置于 Z」，但覆盖更全：
 * - OpenAI 兼容 `x-ratelimit-{limit,remaining,reset}-{requests,tokens}`
 * - Claude OAuth/Pro/Max `anthropic-ratelimit-unified-{5h,7d}-{utilization,reset,status}`
 * - Google `x-goog-quota-*`（Gemini / Antigravity）
 * - body `quota` / `retryInfo` / gRPC quotaFailure 字段（Gemini、部分 OpenAI 兼容）
 * - `x-sub2api-*`（上游本身是 sub2api 时的自省字段）
 *
 * `resets_at`/`retry_after` 的 429 冷却判定在 `agentAvailabilityShared.ts` 已有
 * 唯一实现，本模块不重复——它只负责「把上游主动给的窗口数据收进来」。
 *
 * 硬性约束（与 agentAvailabilityShared/quotaCircuitBreaker 同一纪律）：
 * - 纯逻辑、零 I/O、不读系统时钟：`observedAt` 一律用入参 `now`。
 * - 只记上游真的给了的数据；解析不到就静默跳过，绝不 throw、绝不补默认值。
 */

/** 单个配额窗口。scope 是窗口身份（合并键），其余字段只有上游给过才存在。 */
export type QuotaWindow = {
  /**
   * 窗口标识，约定命名：
   * `"requests"`/`"tokens"`/`"1m-requests"`/`"1m-tokens"`/`"5h"`/`"7d"`/
   * `"daily"`/`"model:<name>"`/`"user"`/`"project"`/`<自定义 scope>`。
   */
  scope: string;
  /** 剩余量（与 limit 同单位）。 */
  remaining?: number;
  /** 上限（与 remaining 同单位）。 */
  limit?: number;
  /** 已用比例，归一化为 0..1。上游给百分数（>1）会除以 100。 */
  utilization?: number;
  /** 计量单位提示（如 "requests"/"tokens"/"credits"），可选。 */
  unit?: string;
  /** 复位时刻 epoch ms。 */
  resetAt?: number;
  /** 信号来源标记（哪个头/body 字段出的这条窗口），便于排障。 */
  source: string;
};

/** 一次观测到的完整配额快照：全部窗口 + 观测时刻（入参 now）。 */
export type AgentQuota = {
  windows: QuotaWindow[];
  observedAt: number;
};

type HeaderBag = Record<string, string>;

function normalizeHeaders(
  headers: Headers | HeaderBag | null | undefined,
): HeaderBag {
  const out: HeaderBag = {};
  if (!headers) return out;
  if (typeof (headers as Headers).get === "function") {
    (headers as Headers).forEach((value, key) => {
      out[key.toLowerCase()] = value;
    });
    return out;
  }
  for (const [key, value] of Object.entries(headers as HeaderBag)) {
    if (typeof value === "string") out[key.toLowerCase()] = value;
  }
  return out;
}

/** 解析数值字段：有限且 >= 0 才收，NaN/负数/非数字一律丢弃。 */
function readNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw >= 0 ? raw : undefined;
  if (typeof raw === "string") {
    const n = Number(raw.trim());
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return undefined;
}

/**
 * 解析复位时刻到 epoch ms。支持：
 * - epoch 秒（>1e9 且 <1e12）→ ×1000
 * - epoch 毫秒（>=1e12）→ 直接用
 * - ISO/RFC 日期字符串 → Date.parse
 * - 相对时长（"120"、"120s"、"1m30s"、"6m0s"）→ now + 秒数×1000
 * - "0.123"（秒）→ now + 123ms
 */
function readResetAt(raw: unknown, now: number): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw >= 1e12) return raw; // epoch ms
    if (raw >= 1e9) return raw * 1000; // epoch s
    return raw > 0 ? now + raw * 1000 : now; // 相对秒
  }
  if (typeof raw !== "string") return undefined;
  const text = raw.trim();
  if (!text) return undefined;

  // Go/Prometheus 风格相对时长："20ms"、"1m30s"、"6m0s"、"1h2m3s"、"45s"。
  const msMatch = /^(\d+(?:\.\d+)?)ms$/i.exec(text);
  let dur: number;
  if (msMatch) {
    dur = Number(msMatch[1]) / 1000;
  } else {
    const m = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/i.exec(text);
    dur =
      m && (m[1] || m[2] || m[3])
        ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
        : NaN;
  }
  if (Number.isFinite(dur)) return now + dur * 1000;

  const n = Number(text);
  if (Number.isFinite(n)) {
    if (n >= 1e12) return n;
    if (n >= 1e9) return n * 1000;
    return n > 0 ? now + n * 1000 : now;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** 把 utilization 归一化到 0..1：>1 视为百分数除以 100。 */
function readUtilization(raw: unknown): number | undefined {
  const n = readNumber(raw);
  if (n === undefined) return undefined;
  return n > 1 ? n / 100 : n;
}

function mergeWindow(into: Map<string, QuotaWindow>, win: QuotaWindow) {
  const existing = into.get(win.scope);
  if (!existing) {
    into.set(win.scope, { ...win });
    return;
  }
  // 同 scope 合并：resetAt 取更晚（窗口边界后移为准）、remaining 取更紧（更小）、
  // limit 取更紧（更小，上限收紧才算紧张）、utilization 取更高。
  if (win.resetAt !== undefined) {
    existing.resetAt =
      existing.resetAt === undefined
        ? win.resetAt
        : Math.max(existing.resetAt, win.resetAt);
  }
  if (win.remaining !== undefined) {
    existing.remaining =
      existing.remaining === undefined
        ? win.remaining
        : Math.min(existing.remaining, win.remaining);
  }
  if (win.limit !== undefined) {
    existing.limit =
      existing.limit === undefined ? win.limit : Math.min(existing.limit, win.limit);
  }
  if (win.utilization !== undefined) {
    existing.utilization =
      existing.utilization === undefined
        ? win.utilization
        : Math.max(existing.utilization, win.utilization);
  }
  if (win.unit !== undefined && existing.unit === undefined) existing.unit = win.unit;
  // source 以最新观测为准。
  existing.source = win.source;
}

/** 供持久层把两次观测的窗口按 scope 合并（与 mergeWindow 同规则，批量版）。 */
export function mergeQuotaWindows(
  existing: QuotaWindow[] | undefined,
  incoming: QuotaWindow[],
): QuotaWindow[] {
  const map = new Map<string, QuotaWindow>();
  for (const win of existing ?? []) {
    if (win && typeof win.scope === "string" && win.scope) {
      map.set(win.scope, { ...win });
    }
  }
  for (const win of incoming) {
    if (win && typeof win.scope === "string" && win.scope) mergeWindow(map, win);
  }
  return [...map.values()];
}

/** x-ratelimit-{limit,remaining,reset}-{requests,tokens}（OpenAI 兼容全家桶）。 */
function scanOpenAiRateLimitHeaders(
  headers: HeaderBag,
  now: number,
  out: Map<string, QuotaWindow>,
) {
  for (const kind of ["requests", "tokens"] as const) {
    const remaining = readNumber(headers[`x-ratelimit-remaining-${kind}`]);
    const limit = readNumber(headers[`x-ratelimit-limit-${kind}`]);
    const resetAt = readResetAt(headers[`x-ratelimit-reset-${kind}`], now);
    if (remaining === undefined && limit === undefined && resetAt === undefined) continue;
    mergeWindow(out, {
      scope: kind,
      ...(remaining !== undefined ? { remaining } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(resetAt !== undefined ? { resetAt } : {}),
      unit: kind,
      source: `x-ratelimit-*-${kind}`,
    });
  }
  // 不带 kind 后缀的通用形式（部分中转只发 x-ratelimit-remaining 等）。
  const genericRemaining = readNumber(headers["x-ratelimit-remaining"]);
  const genericLimit = readNumber(headers["x-ratelimit-limit"]);
  const genericReset = readResetAt(headers["x-ratelimit-reset"], now);
  if (
    genericRemaining !== undefined ||
    genericLimit !== undefined ||
    genericReset !== undefined
  ) {
    mergeWindow(out, {
      scope: "requests",
      ...(genericRemaining !== undefined ? { remaining: genericRemaining } : {}),
      ...(genericLimit !== undefined ? { limit: genericLimit } : {}),
      ...(genericReset !== undefined ? { resetAt: genericReset } : {}),
      unit: "requests",
      source: "x-ratelimit",
    });
  }
}

/** Claude OAuth/Pro/Max：`anthropic-ratelimit-unified-{5h,7d}-{utilization,reset,status}`。 */
function scanAnthropicUnifiedHeaders(
  headers: HeaderBag,
  now: number,
  out: Map<string, QuotaWindow>,
) {
  for (const scope of ["5h", "7d"] as const) {
    const utilization = readUtilization(
      headers[`anthropic-ratelimit-unified-${scope}-utilization`],
    );
    const resetAt = readResetAt(
      headers[`anthropic-ratelimit-unified-${scope}-reset`],
      now,
    );
    // status 头（如 "allowed"/"limited"）本身不是窗口数据，忽略。
    if (utilization === undefined && resetAt === undefined) continue;
    mergeWindow(out, {
      scope,
      ...(utilization !== undefined ? { utilization } : {}),
      ...(resetAt !== undefined ? { resetAt } : {}),
      source: `anthropic-ratelimit-unified-${scope}`,
    });
  }
}

/** Google `x-goog-quota-*`：remaining/limit/reset（+可选 user/project 维度前缀）。 */
function scanGoogleQuotaHeaders(
  headers: HeaderBag,
  now: number,
  out: Map<string, QuotaWindow>,
) {
  const genericReset = readResetAt(headers["x-goog-quota-reset"], now);
  const dims: Array<{ prefix: string; scope: string }> = [
    { prefix: "x-goog-quota-user-", scope: "user" },
    { prefix: "x-goog-quota-project-", scope: "project" },
  ];
  for (const { prefix, scope } of dims) {
    const remaining = readNumber(headers[`${prefix}remaining`]);
    const limit = readNumber(headers[`${prefix}limit`]);
    const resetAt =
      readResetAt(headers[`${prefix}reset`], now) ?? genericReset;
    if (remaining === undefined && limit === undefined && resetAt === undefined) continue;
    mergeWindow(out, {
      scope,
      ...(remaining !== undefined ? { remaining } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(resetAt !== undefined ? { resetAt } : {}),
      source: `${prefix}*`,
    });
  }
}

/**
 * sub2api 自省头：上游本身也是 sub2api 时透出的 `x-sub2api-*` 字段。
 * 格式约定 `x-sub2api-quota-{remaining,limit,reset}`（scope=sub2api），以及
 * `x-sub2api-quota-{scope}-{remaining,limit,reset}`（自定义 scope）。
 */
function scanSub2ApiHeaders(
  headers: HeaderBag,
  now: number,
  out: Map<string, QuotaWindow>,
) {
  const FIELD_RE = /^x-sub2api-quota(?:-([a-z0-9][a-z0-9._:-]*))?-(remaining|limit|reset)$/;
  const groups = new Map<string, { remaining?: number; limit?: number; resetAt?: number }>();
  for (const [name, value] of Object.entries(headers)) {
    const m = FIELD_RE.exec(name);
    if (!m) continue;
    const scope = m[1] ?? "sub2api";
    const group = groups.get(scope) ?? {};
    if (m[2] === "reset") {
      const at = readResetAt(value, now);
      if (at !== undefined) group.resetAt = at;
    } else if (m[2] === "remaining") {
      const n = readNumber(value);
      if (n !== undefined) group.remaining = n;
    } else if (m[2] === "limit") {
      const n = readNumber(value);
      if (n !== undefined) group.limit = n;
    }
    groups.set(scope, group);
  }
  for (const [scope, g] of groups) {
    mergeWindow(out, {
      scope,
      ...(g.remaining !== undefined ? { remaining: g.remaining } : {}),
      ...(g.limit !== undefined ? { limit: g.limit } : {}),
      ...(g.resetAt !== undefined ? { resetAt: g.resetAt } : {}),
      source: "x-sub2api-quota",
    });
  }
}

/** body 里的 `quota` 对象 / gRPC `details[]` 的 QuotaFailure+RetryInfo。 */
function scanBody(body: unknown, now: number, out: Map<string, QuotaWindow>) {
  if (!body || typeof body !== "object") return;
  const root = body as Record<string, unknown>;
  const error =
    root.error && typeof root.error === "object"
      ? (root.error as Record<string, unknown>)
      : undefined;

  // 顶层或 error 下的 quota 对象：{quota:{remaining,limit,reset_at/resets_at/resetTime,unit}}
  for (const holder of [root, error] as const) {
    const quota = holder?.quota;
    if (!quota || typeof quota !== "object") continue;
    const q = quota as Record<string, unknown>;
    const remaining = readNumber(q.remaining ?? q.remaining_amount);
    const limit = readNumber(q.limit ?? q.total ?? q.quota);
    const resetAt = readResetAt(
      q.reset_at ?? q.resets_at ?? q.resetAt ?? q.resetTime ?? q.reset_time,
      now,
    );
    const unit =
      typeof q.unit === "string" && q.unit ? q.unit : undefined;
    if (remaining === undefined && limit === undefined && resetAt === undefined) continue;
    const scope =
      typeof q.scope === "string" && q.scope ? (q.scope as string) : "daily";
    mergeWindow(out, {
      scope,
      ...(remaining !== undefined ? { remaining } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(resetAt !== undefined ? { resetAt } : {}),
      ...(unit ? { unit } : {}),
      source: "body.quota",
    });
  }

  // gRPC/Google details[] 数组：RetryInfo.retryDelay 给复位偏移；
  // QuotaFailure.violations[] 里的 quotaMetric 可当 scope 粒度。
  const details = (error?.details ?? root.details) as unknown;
  if (!Array.isArray(details)) return;
  let retryResetAt: number | undefined;
  const quotaScopes = new Set<string>();
  for (const item of details) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const type = typeof record["@type"] === "string" ? record["@type"] : "";
    if (type.includes("RetryInfo")) {
      const at = readResetAt(record.retryDelay ?? record.retry_delay, now);
      if (at !== undefined) retryResetAt = retryResetAt === undefined ? at : Math.max(retryResetAt, at);
    }
    if (type.includes("QuotaFailure") && Array.isArray(record.violations)) {
      for (const v of record.violations) {
        const metric =
          v && typeof v === "object" && typeof (v as Record<string, unknown>).quotaMetric === "string"
            ? ((v as Record<string, unknown>).quotaMetric as string)
            : undefined;
        if (metric) quotaScopes.add(`model:${metric}`);
      }
    }
  }
  if (retryResetAt !== undefined || quotaScopes.size > 0) {
    if (quotaScopes.size === 0) {
      mergeWindow(out, {
        scope: "user",
        ...(retryResetAt !== undefined ? { resetAt: retryResetAt } : {}),
        source: "body.details.RetryInfo",
      });
    }
    for (const scope of quotaScopes) {
      mergeWindow(out, {
        scope,
        ...(retryResetAt !== undefined ? { resetAt: retryResetAt } : {}),
        source: "body.details.QuotaFailure",
      });
    }
  }
}

/**
 * 从一次上游响应抽取配额快照。
 *
 * @param provider 上游标识（当前未用于分流——所有信号统一扫描；保留入参供
 *                 后续按 provider 关闭误报源）。
 * @param status   HTTP 状态码。429 的冷却判定归 agentAvailabilityShared；
 *                 本函数只扫「上游给了什么窗口数据」，任何 status 都可能带。
 * @param headers  响应头（Headers 实例或普通对象），大小写不敏感。
 * @param body     已解析的响应 body（可为 undefined）。
 * @param now      观测时刻 epoch ms（唯一时间来源，不读 Date.now()）。
 * @returns 扫到至少一个窗口则返回快照，否则 undefined；解析异常静默返回 undefined。
 */
export function extractQuotaSnapshot(
  provider: string | null | undefined,
  status: number,
  headers: Headers | HeaderBag | null | undefined,
  body: unknown,
  now: number,
): AgentQuota | undefined {
  try {
    if (!Number.isFinite(now)) return undefined;
    void provider;
    void status;
    const bag = normalizeHeaders(headers);
    const windows = new Map<string, QuotaWindow>();
    scanOpenAiRateLimitHeaders(bag, now, windows);
    scanAnthropicUnifiedHeaders(bag, now, windows);
    scanGoogleQuotaHeaders(bag, now, windows);
    scanSub2ApiHeaders(bag, now, windows);
    scanBody(body, now, windows);
    if (windows.size === 0) return undefined;
    return { windows: [...windows.values()], observedAt: now };
  } catch {
    return undefined;
  }
}

/**
 * 找出最紧张/最值得展示的一个配额窗口：
 * 1. 优先选已用比例 utilization 最高且 > 0 的窗口
 * 2. 其次选 remaining / limit 比例最低的窗口
 * 3. 再次选有 resetAt 且在未来的窗口中距离最近的
 * 4. 兜底返回第一个窗口
 */
export function findTightestQuotaWindow(
  quota: AgentQuota | undefined,
  now = Date.now(),
): QuotaWindow | undefined {
  if (!quota || !Array.isArray(quota.windows) || quota.windows.length === 0) {
    return undefined;
  }
  let best: QuotaWindow | undefined;
  let bestScore = -Infinity;

  for (const w of quota.windows) {
    let score = 0;
    if (typeof w.utilization === "number" && w.utilization >= 0) {
      // 0..1 归一化值，utilization 越高 score 越大
      score = 500 + Math.min(w.utilization, 1) * 500;
    } else if (typeof w.remaining === "number" && typeof w.limit === "number" && w.limit > 0) {
      const util = Math.max(0, 1 - w.remaining / w.limit);
      score = 500 + util * 500;
    } else if (typeof w.resetAt === "number" && w.resetAt > now) {
      score = 200;
    } else if (typeof w.remaining === "number") {
      score = 100;
    }

    if (score > bestScore) {
      bestScore = score;
      best = w;
    }
  }
  return best ?? quota.windows[0];
}

/**
 * 格式化简要配额文案供 CLI / UI 展示（如 "73%已用 · 5h · 2.5h后重置"）。
 * 无数据返回 undefined（展示端可显示 "-"）。
 *
 * `compact` 只保留容量段（"73%已用" / "45000/50000 tokens"），去掉窗口名与
 * 重置时间——供行宽敏感的窄容器（如 TUI picker 的 detail）使用，避免把一行
 * 撑到终端物理换行、破坏按 logical line 清屏的 anchored 帧。
 */
export function formatQuotaSummary(
  quota: AgentQuota | undefined,
  now = Date.now(),
  options?: { compact?: boolean },
): string | undefined {
  const tightest = findTightestQuotaWindow(quota, now);
  if (!tightest) return undefined;
  const compact = options?.compact === true;

  const parts: string[] = [];

  // 1. 容量/剩余量
  if (typeof tightest.utilization === "number") {
    const pct = Math.round(tightest.utilization * 100);
    parts.push(`${pct}%已用`);
  } else if (typeof tightest.remaining === "number") {
    if (typeof tightest.limit === "number") {
      parts.push(`${tightest.remaining}/${tightest.limit}${tightest.unit ? ` ${tightest.unit}` : ""}`);
    } else {
      parts.push(`余${tightest.remaining}${tightest.unit ? ` ${tightest.unit}` : ""}`);
    }
  }
  if (compact) return parts.length > 0 ? parts[0] : undefined;

  // 2. 窗口范围（若与 unit 相同，如 tokens，不重复拼接）
  if (
    tightest.scope &&
    tightest.scope !== "user" &&
    tightest.scope !== "project" &&
    tightest.scope !== tightest.unit
  ) {
    parts.push(tightest.scope);
  }

  // 3. 重置时间
  if (typeof tightest.resetAt === "number" && tightest.resetAt > now) {
    const diffSec = Math.round((tightest.resetAt - now) / 1000);
    if (diffSec < 60) {
      parts.push(`${diffSec}s后重置`);
    } else if (diffSec < 3600) {
      parts.push(`${Math.round(diffSec / 60)}m后重置`);
    } else if (diffSec < 86400) {
      const hours = (diffSec / 3600).toFixed(1).replace(/\.0$/, "");
      parts.push(`${hours}h后重置`);
    } else {
      const days = (diffSec / 86400).toFixed(1).replace(/\.0$/, "");
      parts.push(`${days}d后重置`);
    }
  }

  // 4. 收尾：只剩 scope（如上游只发了 resetAt 且已过期的窗口）时不返回——
  //    那样的 `5h` 没有任何信息量，还会把展示端本可显示的 description 挤掉。
  //    与 formatQuotaTooltip 的空壳跳过口径保持一致。
  if (parts.length === 0) return undefined;
  if (parts.length === 1 && parts[0] === tightest.scope) return undefined;
  return parts.join(" · ");
}

/**
 * 格式化完整的配额窗口详情（多行文本，供 Tooltip / 详情卡消费）。
 */
export function formatQuotaTooltip(
  quota: AgentQuota | undefined,
  now = Date.now(),
): string | undefined {
  if (!quota || !Array.isArray(quota.windows) || quota.windows.length === 0) {
    return undefined;
  }
  const lines: string[] = [];
  for (const w of quota.windows) {
    const parts: string[] = [];
    if (typeof w.utilization === "number") {
      parts.push(`${Math.round(w.utilization * 100)}%已用`);
    } else if (typeof w.remaining === "number") {
      if (typeof w.limit === "number") {
        parts.push(`${w.remaining}/${w.limit}${w.unit ? ` ${w.unit}` : ""}`);
      } else {
        parts.push(`余${w.remaining}${w.unit ? ` ${w.unit}` : ""}`);
      }
    }
    if (typeof w.resetAt === "number" && w.resetAt > now) {
      const diffSec = Math.round((w.resetAt - now) / 1000);
      if (diffSec < 60) parts.push(`${diffSec}s后重置`);
      else if (diffSec < 3600) parts.push(`${Math.round(diffSec / 60)}m后重置`);
      else if (diffSec < 86400) parts.push(`${(diffSec / 3600).toFixed(1).replace(/\.0$/, "")}h后重置`);
      else parts.push(`${(diffSec / 86400).toFixed(1).replace(/\.0$/, "")}d后重置`);
    }
    // 跳过完全没有数据的窗口（无 utilization/remaining/resetAt 的空壳）
    if (parts.length === 0) continue;
    lines.push(`• ${w.scope}: ${parts.join(" · ")}`);
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
}
