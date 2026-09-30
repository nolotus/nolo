import { openSync, mkdirSync, statSync, renameSync, writeSync, closeSync, constants } from "node:fs";
import { dirname, join } from "node:path";
import type { LogSink } from "../types";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_BACKUPS = 5; // tui-diag.log, .1 … .5

/**
 * rotatingFile sink：`~/.nolo/logs/tui-diag.log`（NOLO_HOME/logs 覆盖），
 * 10MB × 5 备份，文件权限 0o600。
 * 同步写——诊断日志必须能在 crash 前落盘；文件 I/O 异常一律静默降级（sink 永不可抛出）。
 */
export class RotatingFileSink implements LogSink {
  private readonly filePath: string;
  private readonly maxBytes: number;
  private readonly maxBackups: number;
  private fd: number | null = null;
  private written = 0;
  private disabled = false;

  constructor(opts?: {
    filePath?: string;
    maxBytes?: number;
    maxBackups?: number;
    /** 显式传入环境（测试/隔离场景覆盖 NOLO_HOME 落盘路径） */
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  }) {
    this.filePath =
      opts?.filePath ?? resolveDefaultLogPath(opts?.env ?? process.env);
    this.maxBytes = opts?.maxBytes ?? MAX_FILE_BYTES;
    this.maxBackups = opts?.maxBackups ?? MAX_BACKUPS;
  }

  write(_event: unknown, line: string): void {
    if (this.disabled) return;
    try {
      this.ensureOpen();
      if (this.fd === null) return;
      const payload = `${line}\n`;
      writeSync(this.fd, payload);
      this.written += Buffer.byteLength(payload);
      if (this.written >= this.maxBytes) this.rotate();
    } catch {
      this.disabled = true; // 写盘持续失败 → 永久降级，避免每次重试的开销与递归风险
      try { if (this.fd !== null) closeSync(this.fd); } catch { /* */ }
      this.fd = null;
    }
  }

  flush(): void {
    try {
      if (this.fd !== null) {
        // writeSync 直写 fd，无内部 buffer；fsync 留给 OS（诊断日志不保证 fsync 持久性）
      }
    } catch { /* */ }
  }

  close(): void {
    try {
      if (this.fd !== null) closeSync(this.fd);
    } catch { /* */ }
    this.fd = null;
  }

  private ensureOpen(): void {
    if (this.fd !== null) return;
    mkdirSync(dirname(this.filePath), { recursive: true, mode: 0o700 });
    this.fd = openSync(this.filePath, constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND, 0o600);
    try {
      const st = statSync(this.filePath);
      this.written = st.size;
    } catch {
      this.written = 0;
    }
  }

  private rotate(): void {
    try {
      if (this.fd !== null) {
        closeSync(this.fd);
        this.fd = null;
      }
      // .4 → .5, .3 → .4, …, log → .1（最旧 .5 被覆盖丢弃）
      for (let i = this.maxBackups - 1; i >= 1; i -= 1) {
        try {
          renameSync(`${this.filePath}.${i}`, `${this.filePath}.${i + 1}`);
        } catch { /* 文件不存在则跳过 */ }
      }
      try {
        renameSync(this.filePath, `${this.filePath}.1`);
      } catch { /* */ }
      this.written = 0;
      this.ensureOpen();
    } catch {
      this.disabled = true;
    }
  }
}

export function resolveDefaultLogPath(env: NodeJS.ProcessEnv | Record<string, string | undefined>): string {
  const noloHome = env.NOLO_HOME;
  if (noloHome) return join(noloHome, "logs", "tui-diag.log");
  const home = env.HOME ?? env.USERPROFILE ?? ".";
  return join(home, ".nolo", "logs", "tui-diag.log");
}
