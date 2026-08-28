import { describe, expect, test } from "bun:test";

import {
  DEFAULT_PROVIDER_RETRY_MS,
  MAX_COOLDOWN_MS,
  PROBE_INTERVAL_MS,
  isAgentUnavailableNow,
  mergeAvailabilityDeadline,
  resolveAvailabilityAction,
  resolveCooldownGate,
  resolveNextAvailableAt,
} from "./agentAvailabilityShared";

const NOW = Date.parse("2026-08-24T03:00:00.000Z");

describe("isAgentUnavailableNow", () => {
  test("is true only while nextAvailableAt is in the future", () => {
    expect(isAgentUnavailableNow({ nextAvailableAt: NOW + 1000 }, NOW)).toBe(true);
    expect(isAgentUnavailableNow({ nextAvailableAt: NOW }, NOW)).toBe(false);
    expect(isAgentUnavailableNow({ nextAvailableAt: NOW - 1000 }, NOW)).toBe(false);
    expect(isAgentUnavailableNow({}, NOW)).toBe(false);
    expect(isAgentUnavailableNow(null, NOW)).toBe(false);
    expect(isAgentUnavailableNow({ nextAvailableAt: Number.NaN }, NOW)).toBe(false);
  });
});

describe("resolveNextAvailableAt", () => {
  test("prefers a Retry-After header over the body", () => {
    const headers = new Headers({ "retry-after": "120" });
    const body = { error: { resets_at: NOW + 999_000 } };
    expect(resolveNextAvailableAt(body, NOW, headers)).toBe(NOW + 120_000);
  });

  test("accepts a plain-object header bag", () => {
    expect(resolveNextAvailableAt({}, NOW, { "retry-after": "30" })).toBe(NOW + 30_000);
  });

  test("uses an explicit retry-after offset from the body", () => {
    expect(resolveNextAvailableAt({ retryAfter: 90 }, NOW)).toBe(NOW + 90_000);
  });

  test("uses an upstream absolute resets_at timestamp", () => {
    const reset = Date.parse("2026-08-25T00:00:00Z");
    expect(resolveNextAvailableAt({ error: { resets_at: "2026-08-25T00:00:00Z" } }, NOW)).toBe(reset);
  });

  test("parses an absolute 'will reset at <timestamp>' message (z.ai weekly quota)", () => {
    const body = {
      error: {
        code: "1310",
        message: "Weekly/Monthly Limit Exhausted. Your limit will reset at 2026-08-27 12:05:49",
      },
    };
    // 该复位时刻距 NOW（2026-08-24 03:00Z）约 3 天 > 24h 上限 → 被 clamp 到 24h。
    // 这是刻意的取舍：宁可在 24h 后重试撞 429 再续冷却，也不让周额度复位时刻锁死数天。
    expect(resolveNextAvailableAt(body, NOW)).toBe(NOW + MAX_COOLDOWN_MS);
  });

  test("ignores an already-past reset timestamp and falls back to the default", () => {
    const body = { error: { message: "limit will reset at 2026-08-20 10:00:00" } };
    expect(resolveNextAvailableAt(body, NOW)).toBe(NOW + DEFAULT_PROVIDER_RETRY_MS);
  });

  test("parses relative reset text, including day-scale windows", () => {
    // 17h51m 在 24h 上限内，原样保留。
    expect(resolveNextAvailableAt({ message: "Resets in 17hr 51min" }, NOW)).toBe(
      NOW + (17 * 60 + 51) * 60 * 1000,
    );
  });

  test("clamps a >24h window (e.g. 27h) to the hard cap MAX_COOLDOWN_MS", () => {
    // 1 天 3 小时 = 27h > 24h 上限 → 被压到 24h。这是刻意取舍：宁可在 24h 后重试
    // 一次撞 429 再续冷却，也不要被上游错误/过长的复位时刻锁死。
    expect(resolveNextAvailableAt({ message: "try again in 1 day 3 hours" }, NOW)).toBe(
      NOW + MAX_COOLDOWN_MS,
    );
  });

  test("clamps an absurd far-future absolute deadline (e.g. 2051) to 24h", () => {
    const absurd = Date.parse("2051-01-01T00:00:00Z");
    expect(
      resolveNextAvailableAt({ error: { resets_at: "2051-01-01T00:00:00Z" } }, NOW),
    ).toBe(NOW + MAX_COOLDOWN_MS);
  });

  test("clamps a far-future absolute reset message to 24h", () => {
    const absurd = Date.parse("2051-01-01T00:00:00Z");
    expect(
      resolveNextAvailableAt(
        { error: { message: "limit will reset at 2051-01-01 00:00:00" } },
        NOW,
      ),
    ).toBe(NOW + MAX_COOLDOWN_MS);
  });

  test("clamps an absurd Retry-After header to 24h", () => {
    const headers = new Headers({ "retry-after": "999999999" });
    expect(resolveNextAvailableAt({}, NOW, headers)).toBe(NOW + MAX_COOLDOWN_MS);
  });

  test("a sub-cap relative window stays within the cap", () => {
    // 90s 在 24h 内 → 原样保留；确保 clamp 不把正常短冷却压到超过本身。
    expect(resolveNextAvailableAt({ retryAfter: 90 }, NOW)).toBe(NOW + 90_000);
  });

  test("falls back to the default retry window for opaque bodies", () => {
    expect(resolveNextAvailableAt({ error: { message: "too many requests" } }, NOW)).toBe(
      NOW + DEFAULT_PROVIDER_RETRY_MS,
    );
  });
});

describe("resolveAvailabilityAction", () => {
  test("clears on any 2xx", () => {
    expect(resolveAvailabilityAction(200, null, NOW)).toEqual({ kind: "clear" });
    expect(resolveAvailabilityAction(204, null, NOW)).toEqual({ kind: "clear" });
  });

  test("marks a 429 with the parsed deadline", () => {
    expect(resolveAvailabilityAction(429, { retryAfter: 60 }, NOW)).toEqual({
      kind: "mark",
      nextAvailableAt: NOW + 60_000,
    });
  });

  test("marks 5xx with the default window", () => {
    expect(resolveAvailabilityAction(503, null, NOW)).toEqual({
      kind: "mark",
      nextAvailableAt: NOW + DEFAULT_PROVIDER_RETRY_MS,
    });
  });

  test("ignores client errors that are not rate limits", () => {
    expect(resolveAvailabilityAction(401, null, NOW)).toEqual({ kind: "noop" });
    expect(resolveAvailabilityAction(400, null, NOW)).toEqual({ kind: "noop" });
  });
});

describe("mergeAvailabilityDeadline", () => {
  test("keeps the later deadline so a short cooldown cannot erase a long one", () => {
    expect(mergeAvailabilityDeadline(NOW + 3_000_000, NOW + 1000)).toBe(NOW + 3_000_000);
    expect(mergeAvailabilityDeadline(NOW + 1000, NOW + 3_000_000)).toBe(NOW + 3_000_000);
  });

  test("accepts a missing or invalid current deadline", () => {
    expect(mergeAvailabilityDeadline(undefined, NOW + 1000)).toBe(NOW + 1000);
    expect(mergeAvailabilityDeadline("nope", NOW + 1000)).toBe(NOW + 1000);
    expect(mergeAvailabilityDeadline(Number.NaN, NOW + 1000)).toBe(NOW + 1000);
  });
});

describe("gRPC-style array details", () => {
  const now = 1_000_000;

  // Google/Antigravity 把冷却时长放在 details 数组的 RetryInfo 项里。此前这里
  // 只按对象取 details.resets_at，数组上必然取不到，只能靠把整个 body 字符串化
  // 后做 (\d+)\s*[smhd] 文本扫描去撞 —— message 里任何无关时长都会干扰结果。
  test("reads retryDelay from the RetryInfo entry", () => {
    const action = resolveAvailabilityAction(
      429,
      {
        error: {
          code: 429,
          message: "Resource exhausted",
          details: [
            { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "42s" },
          ],
        },
      },
      now,
    ) as any;
    expect(action.kind).toBe("mark");
    expect((action.nextAvailableAt - now) / 1000).toBe(42);
  });

  // 关键收益：结构化字段必须压过文本扫描，否则 message 里的无关时长会赢。
  test("prefers structured retryDelay over an unrelated duration in the message", () => {
    const action = resolveAvailabilityAction(
      429,
      {
        error: {
          message: "Resource exhausted (previous attempt hit timeout after 300s)",
          details: [
            { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "42s" },
          ],
        },
      },
      now,
    ) as any;
    expect((action.nextAvailableAt - now) / 1000).toBe(42);
  });

  test("ignores malformed detail entries without throwing", () => {
    expect(() =>
      resolveAvailabilityAction(
        429,
        { error: { details: [null, "str", 42, { retryDelay: 99 }] } },
        now,
      ),
    ).not.toThrow();
  });

  // 对象形态的 details 仍按原路径工作，不因数组分支而回归。
  test("still reads object-shaped details.resets_at", () => {
    const action = resolveAvailabilityAction(
      429,
      { error: { details: { resets_at: 2_000 } } },
      now,
    ) as any;
    expect(action.nextAvailableAt).toBe(2_000_000);
  });
});

describe("resolveCooldownGate", () => {
  const now = 1_000_000;

  test("is open when the deadline has passed or is missing", () => {
    expect(resolveCooldownGate({ nextAvailableAt: now }, now)).toBe("open");
    expect(resolveCooldownGate({ nextAvailableAt: now - 1000 }, now)).toBe("open");
    expect(resolveCooldownGate({}, now)).toBe("open");
    expect(resolveCooldownGate({ nextAvailableAt: Number.NaN }, now)).toBe("open");
  });

  test("is blocked when cooling and just probed (within interval)", () => {
    expect(
      resolveCooldownGate(
        { nextAvailableAt: now + 60_000, lastProbeAt: now - 1000 },
        now,
      ),
    ).toBe("blocked");
  });

  test("is probe when cooling and last probe is exactly at the interval", () => {
    expect(
      resolveCooldownGate(
        { nextAvailableAt: now + 60_000, lastProbeAt: now - PROBE_INTERVAL_MS },
        now,
      ),
    ).toBe("probe");
  });

  test("is probe when cooling and last probe was longer ago than the interval", () => {
    expect(
      resolveCooldownGate(
        { nextAvailableAt: now + 60_000, lastProbeAt: now - PROBE_INTERVAL_MS - 1 },
        now,
      ),
    ).toBe("probe");
  });

  // 关键：旧格式文件没有 lastProbeAt → 视为从未探测 → 立即 probe。
  // 这既兼容旧数据，也确保旧坏条目不会被永远锁死（第一次请求就能试探）。
  test("is probe when cooling but lastProbeAt is missing (legacy file)", () => {
    expect(resolveCooldownGate({ nextAvailableAt: now + 60_000 }, now)).toBe("probe");
  });

  test("a probe resets the gate back to blocked until the interval elapses again", () => {
    const decision = resolveCooldownGate({ nextAvailableAt: now + 60_000 }, now);
    expect(decision).toBe("probe");
    // 探测被记录后（lastProbeAt = now），同一时刻再次查询应被 blocked。
    expect(
      resolveCooldownGate({ nextAvailableAt: now + 60_000, lastProbeAt: now }, now),
    ).toBe("blocked");
  });
});
