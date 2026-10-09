// packages/agent-runtime/loopTiming.ts
// NOLO_LOOP_TIMING instrumentation — measurement-only, zero behavior change.
// Gated by env var; when off, each call site costs a single boolean check.
// Emits one JSONL row per phase: { phase, round, durationMs } to stderr or to
// the file given by NOLO_LOOP_TIMING_FILE. Never touches persisted data.
//
// 状态为 per-turn 实例（createLoopTiming()）：旧实现用模块级 rows/lastMark，
// 并发跑多个 turn 且开启门控时相位数据会交错污染；per-turn 实例彻底消除该
// 全局并发污染。env 门控常量仍在模块加载时求值（bench 依赖此语义：
// NOLO_LOOP_TIMING 必须在 import 前设置，见 __bench__/localLoopBench.ts）。

const LOOP_TIMING_ENABLED =
  typeof process !== "undefined" && process.env?.NOLO_LOOP_TIMING === "1";
const LOOP_TIMING_FILE =
  typeof process !== "undefined" ? process.env?.NOLO_LOOP_TIMING_FILE : undefined;

export type LocalLoopTiming = {
  /** 记录一个相位边界；相位时长为距上一次 mark 的间隔。 */
  readonly mark: (phase: string, round: number) => void;
  /** 落盘已收集的相位行并清空缓冲；未开启门控时为零开销 no-op。 */
  readonly flush: () => Promise<void>;
};

export function createLoopTiming(): LocalLoopTiming {
  let rows: Array<{ phase: string; round: number; durationMs: number }> = [];
  let lastMark: number | undefined;

  const mark = (phase: string, round: number): void => {
    if (!LOOP_TIMING_ENABLED) return;
    const now = performance.now();
    if (lastMark !== undefined) {
      rows.push({ phase, round, durationMs: now - lastMark });
    }
    lastMark = now;
  };

  const flush = async (): Promise<void> => {
    if (!LOOP_TIMING_ENABLED) return;
    const lines = rows.map((row) => JSON.stringify(row)).join("\n");
    rows = [];
    lastMark = undefined;
    if (!lines) return;
    if (LOOP_TIMING_FILE) {
      try {
        const { appendFileSync } = await import("node:fs");
        appendFileSync(LOOP_TIMING_FILE, lines + "\n");
      } catch {
        // measurement must never break the loop
      }
    } else {
      process.stderr.write(lines + "\n");
    }
  };

  return { mark, flush };
}
