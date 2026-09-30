import type { DiagnosticEvent, LogSink } from "../types";

export const RING_BUFFER_CAPACITY = 2000;

/**
 * 内存 ring buffer：固定容量，覆盖最旧。
 * 永远存活（TUI 日志面板 / 事后 dump / crash 报告共用）。
 * push 同步 O(1)，永不分配超过 capacity 的数组。
 */
export class RingBufferSink implements LogSink {
  private readonly capacity: number;
  private buf: DiagnosticEvent[];
  private head = 0; // 下一次写入位置
  private count = 0;

  constructor(capacity = RING_BUFFER_CAPACITY) {
    this.capacity = Math.max(1, capacity);
    this.buf = new Array<DiagnosticEvent>(this.capacity);
  }

  write(event: DiagnosticEvent, _line?: string): void {
    try {
      this.buf[this.head] = event;
      this.head = (this.head + 1) % this.capacity;
      if (this.count < this.capacity) this.count += 1;
    } catch {
      /* 永不抛出 */
    }
  }

  /** 按时间序 dump（最旧 → 最新） */
  drain(): DiagnosticEvent[] {
    if (this.count === 0) return [];
    const out = new Array<DiagnosticEvent>(this.count);
    const start = this.count < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.count; i += 1) {
      out[i] = this.buf[(start + i) % this.capacity];
    }
    return out;
  }

  get size(): number {
    return this.count;
  }
}

/** 进程内单例（initializeDiagnostics 安装后挂在 globalThis，供 UI 面板等读取） */
const GLOBAL_KEY = "__nolo_diag_ring__";

export function getProcessRingBuffer(): RingBufferSink | undefined {
  try {
    return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as
      | RingBufferSink
      | undefined;
  } catch {
    return undefined;
  }
}

export function installProcessRingBuffer(sink: RingBufferSink): RingBufferSink {
  try {
    (globalThis as Record<string, unknown>)[GLOBAL_KEY] = sink;
  } catch {
    /* */
  }
  return sink;
}
