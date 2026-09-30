import type { LogSink } from "../types";

/**
 * stderr sink：agent/ci 模式专用。底层 writer 由调用方捕获传入
 * （consoleBridge 安装前拿到的 process.stderr.write 绑定），
 * 绝不经过 console —— bridge 拦截后 console.* 全被改道，用了就递归。
 */
export class StderrSink implements LogSink {
  private readonly writer: (text: string) => void;

  constructor(writer?: (text: string) => void) {
    if (writer) {
      this.writer = writer;
    } else {
      // 默认绑定 stderr 原始 write（不经过 console）
      const bound = process.stderr.write.bind(process.stderr);
      this.writer = (t) => {
        try {
          bound(t);
        } catch { /* EPIPE 等静默 */ }
      };
    }
  }

  write(_event: unknown, line: string): void {
    try {
      this.writer(`${line}\n`);
    } catch { /* */ }
  }
}
