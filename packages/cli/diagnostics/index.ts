import { installConsoleBridge, type ConsoleBridgeHandle } from "./consoleBridge";
import { normalizeError, sanitizeText } from "./normalizeError";
import { RingBufferSink, installProcessRingBuffer } from "./sinks/ringBuffer";
import { RotatingFileSink } from "./sinks/rotatingFile";
import { StderrSink } from "./sinks/stderr";
import {
  LOG_LEVEL_ORDER,
  type CliMode,
  type DiagnosticEvent,
  type Logger,
  type LogLevel,
  type LogSink,
} from "./types";

export type { CliMode, DiagnosticEvent, Logger, LogLevel, LogSink } from "./types";
export { LOG_LEVEL_ORDER } from "./types";
export { normalizeError, sanitizeText } from "./normalizeError";
export { RingBufferSink, getProcessRingBuffer } from "./sinks/ringBuffer";
export { RotatingFileSink, resolveDefaultLogPath } from "./sinks/rotatingFile";
export { StderrSink } from "./sinks/stderr";
export { installConsoleBridge } from "./consoleBridge";

export interface DiagnosticsHandle {
  logger: Logger;
  ringBuffer: RingBufferSink;
  bridge: ConsoleBridgeHandle;
  mode: CliMode;
  shutdown(): void;
}

/**
 * 从 argv 判定运行模式——只在入口调用一次（plan 阶段 0 规则 5）。
 * - tui: 无参数 TTY 启动，或 `chat`/`tui` 交互式启动（判定与 runtimeModeArgs.ts 对齐：
 *   `chat`/`tui` 仅在 args.length===1，或 args.length===2 且 args[1] 为
 *   --local/--server/--auto 时才启动 TUI；`nolo chat <agent> <prompt>` 是
 *   非交互 agent run，绝不能判成 tui——否则 stdout/stderr 被关闭、终端零输出）。
 * - ci:  CI=true / NOLO_CI=1
 * - agent: 其余（脚本化子命令、agent run …）
 *
 * 注意：此函数不 import runtimeModeArgs——它必须在 bridge 安装前就可用，
 * 而 runtimeModeArgs 属于应用侧代码。判定规则必须与 resolveTuiLaunchMode 保持一致。
 */
export function detectMode(args: string[], env: NodeJS.ProcessEnv): CliMode {
  const cmd = args[0];
  const isTuiCommand = cmd === "chat" || cmd === "tui";
  const tuiModeFlag = args[1] === "--local" || args[1] === "--server" || args[1] === "--auto";
  const wantsTui =
    (args.length === 0 && !!process.stdin.isTTY) ||
    (isTuiCommand && args.length === 1) ||
    (isTuiCommand && args.length === 2 && tuiModeFlag);
  if (wantsTui) return "tui";
  if (env.CI === "true" || env.CI === "1" || env.NOLO_CI === "1" || env.NOLO_CI === "true") {
    return "ci";
  }
  return "agent";
}

// —— sink 组合件 ————————————————————————————————————————————————

const noopSink: LogSink = { write() { /* */ } };

class FanoutSink implements LogSink {
  constructor(private readonly sinks: LogSink[]) {}
  write(event: DiagnosticEvent, line: string): void {
    for (const s of this.sinks) {
      try {
        s.write(event, line);
      } catch { /* 单 sink 失败不影响其它 */ }
    }
  }
  flush(): void {
    for (const s of this.sinks) {
      try { s.flush?.(); } catch { /* */ }
    }
  }
  close(): void {
    for (const s of this.sinks) {
      try { s.close?.(); } catch { /* */ }
    }
  }
}

/** 只放行指定级别区间的事件 */
class LevelGatedSink implements LogSink {
  constructor(
    private readonly inner: LogSink,
    private readonly min: LogLevel,
    private readonly maxExclusive?: LogLevel,
  ) {}
  write(event: DiagnosticEvent, line: string): void {
    const v = LOG_LEVEL_ORDER[event.level] ?? 0;
    if (v < LOG_LEVEL_ORDER[this.min]) return;
    if (this.maxExclusive && v >= LOG_LEVEL_ORDER[this.maxExclusive]) return;
    this.inner.write(event, line);
  }
  flush(): void { this.inner.flush?.(); }
  close(): void { this.inner.close?.(); }
}

// —— 行格式化 ————————————————————————————————————————————————————

function formatHumanLine(e: DiagnosticEvent): string {
  const ts = new Date(e.ts).toISOString();
  const errPart = e.error ? ` err=${e.error}` : "";
  const fp = e.fingerprint ? ` fp=${e.fingerprint}` : "";
  const fieldsPart = e.fields && Object.keys(e.fields).length > 0
    ? ` ${sanitizeText(JSON.stringify(e.fields))}`
    : "";
  return `${ts} [${e.level}] [${e.component}] ${sanitizeText(e.message)}${errPart}${fp}${fieldsPart}`;
}

function formatJsonLine(e: DiagnosticEvent): string {
  try {
    return sanitizeText(JSON.stringify({ ...e, message: sanitizeText(e.message) }));
  } catch {
    return `{"level":"${e.level}","component":"${e.component}","message":"${sanitizeText(e.message)}"}`;
  }
}

/** sink 包装：把 event 格式化为单行文本后再交给底层 sink */
class FormattingSink implements LogSink {
  constructor(
    private readonly inner: LogSink,
    private readonly format: (e: DiagnosticEvent) => string,
  ) {}
  write(event: DiagnosticEvent): void {
    let line: string;
    try {
      line = this.format(event);
    } catch {
      line = `[${event.level}] [${event.component}] ${sanitizeText(event.message)}`;
    }
    this.inner.write(event, line);
  }
  flush(): void { this.inner.flush?.(); }
  close(): void { this.inner.close?.(); }
}

// —— logger 实现 ————————————————————————————————————————————————

function extractError(args: unknown[]): { error?: string; rest: unknown[] } {
  const last = args[args.length - 1];
  if (last instanceof Error) {
    return { error: normalizeError(last), rest: args.slice(0, -1) };
  }
  if (args.some((a) => a instanceof Error)) {
    // Error 混在中间：全部 normalize 进 message
    const rest = args.map((a) => (a instanceof Error ? normalizeError(a) : a));
    return { rest };
  }
  return { rest: args };
}

function formatMsgArg(a: unknown): string {
  if (typeof a === "string") return a;
  if (a instanceof Error) return normalizeError(a);
  try {
    const j = JSON.stringify(a);
    if (j === undefined) return String(a);
    return j;
  } catch {
    try { return String(a); } catch { return "[unprintable]"; }
  }
}

class DiagLogger implements Logger {
  constructor(
    private readonly sink: LogSink,
    private readonly component: string,
    private readonly fields: Record<string, unknown> = {},
  ) {}

  private emit(level: LogLevel, msg: string, args: unknown[]): void {
    try {
      const { error, rest } = extractError(args);
      const extra = rest.map(formatMsgArg).join(" ");
      const message = extra ? `${msg} ${extra}` : msg;
      const fields = Object.keys(this.fields).length > 0 ? { ...this.fields } : undefined;
      const event: DiagnosticEvent = {
        ts: Date.now(),
        level,
        component: this.component,
        message,
        ...(error ? { error } : {}),
        ...(fields ? { fields } : {}),
      };
      this.sink.write(event, "");
    } catch { /* logger 永不抛出 */ }
  }

  trace(m: string, ...a: unknown[]): void { this.emit("trace", m, a); }
  debug(m: string, ...a: unknown[]): void { this.emit("debug", m, a); }
  info(m: string, ...a: unknown[]): void { this.emit("info", m, a); }
  warn(m: string, ...a: unknown[]): void { this.emit("warn", m, a); }
  error(m: string, ...a: unknown[]): void { this.emit("error", m, a); }
  fatal(m: string, ...a: unknown[]): void { this.emit("fatal", m, a); }

  child(bindings: { component?: string; fields?: Record<string, unknown> }): Logger {
    return new DiagLogger(
      this.sink,
      bindings.component ?? this.component,
      { ...this.fields, ...(bindings.fields ?? {}) },
    );
  }
}

// —— 初始化 ————————————————————————————————————————————————————

let current: DiagnosticsHandle | null = null;

/**
 * initializeDiagnostics(mode)：组装 sink + 安装 console bridge + 返回 logger。
 *
 * 两条路径的 sink 组合不同：
 * - **logger 路径**（diagSink）：ring + file +（非 tui）stderr 全级别。
 *   logger.* 的调用方已显式声明是诊断，全量可见。
 * - **console bridge 路径**（consoleSink）：ring + file 全级别；
 *   非 tui 时 console.warn/error → stderr（诊断语义），
 *   console.log/info/debug/trace → **原 stdout 直通**（用户输出契约，
 *   `nolo --help`/`version`/脚本文本不被吞、不被单行化）。
 *
 * 任何一步失败都降级继续：诊断初始化绝不能让 CLI 起不来。
 */
export function initializeDiagnostics(
  mode: CliMode,
  env: NodeJS.ProcessEnv = process.env,
): DiagnosticsHandle {
  if (current) return current;

  let ring: RingBufferSink | null = null;
  const sharedSinks: LogSink[] = [];
  try {
    ring = installProcessRingBuffer(new RingBufferSink());
    sharedSinks.push(new FormattingSink(ring, formatHumanLine));
  } catch { /* */ }
  try {
    sharedSinks.push(new FormattingSink(new RotatingFileSink({ env }), formatHumanLine));
  } catch { /* */ }

  const diagSinks: LogSink[] = [...sharedSinks];
  const consoleSinks: LogSink[] = [...sharedSinks];

  if (mode !== "tui") {
    try {
      // 关键：在 bridge 安装前捕获 stderr 原始 write 绑定，
      // sink 走原始 fd，不经过被拦截的 console（防递归）。
      // stdout 直通由 bridge passthrough 调原始 console 方法完成。
      const stderrWriter = process.stderr.write.bind(process.stderr);
      const useJson = env.NOLO_LOG_FORMAT === "json";
      const fmt = useJson ? formatJsonLine : formatHumanLine;
      const stderrRaw = new StderrSink((t) => {
        try { stderrWriter(t); } catch { /* EPIPE */ }
      });

      // logger 诊断 → stderr（全级别）
      diagSinks.push(new FormattingSink(stderrRaw, fmt));
      // console.warn/error → stderr（诊断语义）
      consoleSinks.push(new LevelGatedSink(new FormattingSink(stderrRaw, fmt), "warn"));
      // console.log/info/debug/trace → 由 bridge 的 passthrough 调原始 console
      // 方法直写 stdout（原生 util.format、不截断），见下方 passthrough 选项。
    } catch { /* */ }
  }

  const diagSink = new FanoutSink(diagSinks.length > 0 ? diagSinks : [noopSink]);
  const consoleSink = new FanoutSink(consoleSinks.length > 0 ? consoleSinks : [noopSink]);

  let bridge: ConsoleBridgeHandle;
  try {
    bridge = installConsoleBridge({
      sink: consoleSink,
      component: "console",
      // 非 TUI：< warn 调原始 console 方法直通 stdout，保 CLI 输出契约
      // （大 JSON 不截断、%s 占位符生效）；诊断侧仍记 ring/file。
      passthrough: mode !== "tui",
    });
  } catch {
    bridge = { uninstall() { /* */ }, installed: false, reentrantDropped: 0 };
  }

  const logger = new DiagLogger(diagSink, "cli");

  current = {
    logger,
    ringBuffer: ring ?? new RingBufferSink(),
    bridge,
    mode,
    shutdown() {
      try { bridge.uninstall(); } catch { /* */ }
      try { diagSink.close(); } catch { /* */ }
      try { consoleSink.close(); } catch { /* */ }
      current = null;
    },
  };
  return current;
}

/** 已初始化则返回 handle（供库层拿 logger，不重复安装） */
export function getDiagnostics(): DiagnosticsHandle | null {
  return current;
}

/**
 * 库层入口：未初始化时返回降级 logger（直写原始 stderr，绕开 console——
 * console 可能已被 bridge 拦截，依赖它会丢日志或递归）。
 * 已初始化则返回 component-scoped logger。
 * memoryRecall 等库模块只应调用这个，不应自己初始化。
 */
export function getLogger(component: string): Logger {
  if (current) return current.logger.child({ component });
  const bound = process.stderr.write.bind(process.stderr);
  const fallbackSink: LogSink = {
    write(e, line) {
      try {
        bound(line || `[${e.level}] [${e.component}] ${sanitizeText(e.message)}`);
        bound("\n");
      } catch { /* */ }
    },
  };
  return new DiagLogger(fallbackSink, component);
}
