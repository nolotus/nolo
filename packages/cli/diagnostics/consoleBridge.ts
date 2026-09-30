import { sanitizeText } from "./normalizeError";
import type { DiagnosticEvent, LogLevel, LogSink } from "./types";

/**
 * consoleBridge.ts — 启动期拦截全部 console 方法，改道到诊断 sink。
 *
 * 约束（plan Slice 1）：
 * - 保存原始 descriptor，可完整恢复（uninstall / restore）。
 * - sink 写入走**捕获的底层 writer**（安装前绑定的 process.stderr.write 或直接 fd write），
 *   bridge 内严禁再调 console.*——否则递归。
 * - 保持 console 契约：所有拦截方法返回 undefined。
 * - 初始化失败安全降级：sink 抛 / 格式化抛 → 静默吞掉（诊断绝不能把应用带崩）。
 * - **重入守卫**：sink / formatArg / toJSON 间接调回 console.* 时，
 *   重入调用被静默丢弃（不递归、不爆栈）。
 * - **passthrough 模式**（非 TUI）：< warn 级别的事件调用**原始 console 方法**
 *   直写 stdout——保留原生 util.format 语义（%s/%d/%j 占位符、inspect 深度、
 *   不截断大 JSON），同时仍落一份进 ring/file 诊断 sink。
 *
 * 行为：
 * - console.log/info/debug/trace → sink("info"/"debug"/"trace")
 * - console.warn → sink("warn")
 * - console.error → sink("error")
 * - console.assert(cond, …)：cond truthy → 完全静默（符合 Console 规范）；
 *   falsy → emit("warn", ["Assertion failed:", …rest])
 * - 多参数：字符串拼接，Error 单行化，对象 JSON.stringify（诊断侧截断 400 字符；
 *   passthrough 时 stdout 输出不受影响）
 */

const PATCHED_METHODS = [
  "log", "info", "debug", "trace", "warn", "error",
  "dir", "table", "group", "groupEnd", "groupCollapsed",
  "assert", "count", "countReset", "time", "timeEnd", "timeLog", "timeStamp",
] as const;

const LEVEL_BY_METHOD: Record<string, LogLevel> = {
  log: "info",
  info: "info",
  debug: "debug",
  trace: "trace",
  warn: "warn",
  error: "error",
  dir: "info",
  table: "info",
  group: "info",
  groupEnd: "info",
  groupCollapsed: "info",
  assert: "warn",
  count: "debug",
  countReset: "debug",
  time: "debug",
  timeEnd: "debug",
  timeLog: "debug",
  timeStamp: "debug",
};

export interface ConsoleBridgeOptions {
  sink: LogSink;
  component?: string;
  /** 测试用：注入时间源 */
  now?: () => number;
  /**
   * 非 TUI 直通：< warn 级别的事件先调原始 console 方法（原生格式/不截断），
   * 再写诊断 sink。TUI 模式不要开（stdout 是画布）。
   */
  passthrough?: boolean;
}

export interface ConsoleBridgeHandle {
  uninstall(): void;
  readonly installed: boolean;
  /** 被重入守卫丢弃的 console 调用数（诊断自观测/测试断言用） */
  readonly reentrantDropped: number;
}

const DIAG_MAX_ARG_CHARS = 400;

function formatArg(a: unknown): string {
  if (typeof a === "string") return a;
  if (a instanceof Error) {
    // 走 normalizeError 单行化（延迟 require 避免循环：直接 inline 简化版）
    try {
      return `${a.name}: ${a.message}`;
    } catch {
      return "[error]";
    }
  }
  try {
    const j = JSON.stringify(a);
    if (j === undefined) return String(a);
    return j.length > DIAG_MAX_ARG_CHARS ? `${j.slice(0, DIAG_MAX_ARG_CHARS)}…` : j;
  } catch {
    try {
      return String(a);
    } catch {
      return "[unprintable]";
    }
  }
}

/**
 * 安装 console 拦截。返回 uninstall handle。
 * `emit` 为可选旁路：真实场景由 initializeDiagnostics 组装 sink 链。
 */
export function installConsoleBridge(opts: ConsoleBridgeOptions): ConsoleBridgeHandle {
  const originals = new Map<string, PropertyDescriptor>();
  /** 捕获的原始方法（安装前），供 passthrough 直调——原生语义、不经过 sink。 */
  const originalFns = new Map<string, (...args: unknown[]) => unknown>();
  let installed = true;
  /** 重入守卫：sink.write / formatArg / toJSON 间接触发 console.* 时丢弃，防同步递归爆栈 */
  let inBridge = false;
  /** 重入丢弃计数（诊断自观测：守卫触发过几次） */
  let reentrantDropped = 0;

  const emit = (level: LogLevel, args: unknown[]): void => {
    // 永不抛出；重入直接丢弃
    if (inBridge) {
      reentrantDropped += 1;
      return;
    }
    inBridge = true;
    try {
      const raw = args.map(formatArg).join(" ");
      const event: DiagnosticEvent = {
        ts: opts.now?.() ?? Date.now(),
        level,
        component: opts.component ?? "console",
        message: raw,
      };
      opts.sink.write(event, `[${event.level}] [${event.component}] ${sanitizeText(raw)}`);
    } catch {
      /* sink 失败静默 */
    } finally {
      inBridge = false;
    }
  };

  for (const name of PATCHED_METHODS) {
    try {
      const desc = Object.getOwnPropertyDescriptor(console, name) ?? {
        value: (console as unknown as Record<string, unknown>)[name],
        writable: true,
        configurable: true,
        enumerable: true,
      };
      originals.set(name, desc);
      const origFn = desc.value;
      if (typeof origFn === "function") {
        originalFns.set(name, origFn.bind(console) as (...args: unknown[]) => unknown);
      }
      const level = LEVEL_BY_METHOD[name] ?? "info";
      const patched = function patchedConsole(this: unknown, ...args: unknown[]): undefined {
        // console.assert 语义：仅在断言 falsy 时才产生诊断
        if (name === "assert") {
          const [assertion, ...rest] = args;
          if (assertion) return undefined;
          emit("warn", ["Assertion failed:", ...rest]);
          return undefined;
        }
        // 非 TUI 直通：< warn 走原始方法（原生 util.format、不截断、%s 生效）。
        // 诊断侧仍记一份（截断版进 ring/file）。原始方法若抛/间接递归由 emit 守卫兜住。
        if (opts.passthrough && LOG_LEVEL_ORDER_VALUE[level] < LOG_LEVEL_ORDER_VALUE.warn) {
          const orig = originalFns.get(name);
          if (orig) {
            try {
              orig(...args);
            } catch {
              /* 原生 console 方法抛出 → 吞掉，bridge 契约是不抛出 */
            }
          }
        }
        emit(level, args);
        return undefined;
      };
      Object.defineProperty(console, name, {
        value: patched,
        writable: true,
        configurable: true,
        enumerable: desc.enumerable ?? true,
      });
    } catch {
      /* 单方法失败不影响其它 */
    }
  }

  return {
    get installed() {
      return installed;
    },
    /** 测试/诊断自观测：被重入守卫丢弃的调用数 */
    get reentrantDropped() {
      return reentrantDropped;
    },
    uninstall() {
      if (!installed) return;
      installed = false;
      for (const name of PATCHED_METHODS) {
        const orig = originals.get(name);
        if (!orig) continue;
        try {
          Object.defineProperty(console, name, orig);
        } catch {
          try {
            (console as unknown as Record<string, unknown>)[name] = orig.value;
          } catch { /* */ }
        }
      }
    },
  };
}

const LOG_LEVEL_ORDER_VALUE: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};
