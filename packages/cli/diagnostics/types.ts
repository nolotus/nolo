/**
 * diagnostics/types.ts — 诊断管线核心类型。
 *
 * 阶段 0 边界（见 docs/plans/2026-09-29-tui-diagnostics-pipeline.md）：
 * - TUI active 期间诊断不得写 stdout/stderr（同一终端都是画布）。
 * - 诊断只去 ring buffer / 滚动日志文件 /（非 TUI）stderr。
 */

export type CliMode = "tui" | "agent" | "ci";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export interface DiagnosticEvent {
  /** epoch ms */
  ts: number;
  level: LogLevel;
  /** dot-separated component, e.g. "cli.memoryRecall" */
  component: string;
  /** single-line human message（normalizeError 保证单行） */
  message: string;
  /** normalized error fields（单行字符串，来自 normalizeError） */
  error?: string;
  /** dedup/聚合指纹 */
  fingerprint?: string;
  /** structured extras（值会被 sanitize 成单行） */
  fields?: Record<string, unknown>;
}

/**
 * LogSink：接收已格式化的单行文本 + 原始事件。
 * sink 实现必须同步、永不抛出（init 失败安全降级在 sink 内自行处理）。
 */
export interface LogSink {
  write(event: DiagnosticEvent, line: string): void;
  flush?(): void;
  close?(): void;
}

export interface Logger {
  trace(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  fatal(msg: string, ...args: unknown[]): void;
  child(bindings: { component?: string; fields?: Record<string, unknown> }): Logger;
}
