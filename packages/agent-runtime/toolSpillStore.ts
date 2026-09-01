import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { resolveNoloStateDir } from "./noloStateDir";

export interface ToolSpillResult {
  spillPath: string;
  displayPath: string;
  totalChars: number;
  totalLines: number;
  byteLength: number;
  hash: string;
}

export interface SpillToolOutputOptions {
  content: string;
  toolName?: string;
  workspaceRoot?: string;
  baseDir?: string;
  /** Maximum bytes for all spills in the directory before LRU cleanup triggers (default 50MB) */
  maxRetentionBytes?: number;
  /** Maximum age of spill files before cleanup (default 24 hours) */
  ttlMs?: number;
}

export const DEFAULT_MAX_SPILL_DIR_BYTES = 50 * 1024 * 1024; // 50MB
export const DEFAULT_SPILL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// 清理节流：spillToolOutput 每次调用都会触发 cleanupExpiredSpills（全量
// readdirSync + 逐文件 statSync），真实 spill 目录数千文件时单次 ~100ms，
// 且 buildMessages 中每条历史 tool 消息都触发一次，主导了本地 agent loop 的
// 非 LLM 开销。节流后最多每 SPILL_CLEANUP_THROTTLE_MS 清理一次，到期文件
// 最多晚一个节流窗口被清，清理语义不变。
export const SPILL_CLEANUP_THROTTLE_MS = 60 * 1000;
// 按目录分别节流：单一全局时间戳会让多 spill 目录（~/.nolo/spills 与
// <workspace>/.nolo/spills 等）互相饿死——先到者独占节流窗口，其余目录的
// LRU/配额清理永不执行。Map 有界（超过上限整体清空，等价于全员立即清一次，
// 可接受：目录数正常为个位数）。
const SPILL_THROTTLE_MAX_DIRS = 64;
const lastSpillCleanupAtMsByDir = new Map<string, number>();

/** 测试隔离钩子：重置进程内节流状态（bun test 同进程跑多个用例时防泄漏）。 */
export function resetSpillCleanupThrottle(): void {
  lastSpillCleanupAtMsByDir.clear();
}

export function resolveSpillDirectory(options?: {
  workspaceRoot?: string;
  baseDir?: string;
}): string {
  if (options?.baseDir) {
    return options.baseDir;
  }
  if (options?.workspaceRoot) {
    return join(options.workspaceRoot, ".nolo", "spills");
  }
  return resolveNoloStateDir("spills");
}

export function countLines(text: string): number {
  if (!text) return 0;
  let lines = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      // '\n'
      lines++;
    }
  }
  return lines;
}

export function cleanupExpiredSpills(
  spillDir: string,
  options?: { maxAgeMs?: number; maxTotalBytes?: number; throttleMs?: number },
): void {
  if (!existsSync(spillDir)) return;
  // 节流：距上次清理不足 throttleMs 直接跳过（默认 0 = 不节流，保持原语义，
  // 直接调用方/测试不受影响；仅 spillToolOutput 内部传 60s 节流）。
  const throttleMs = options?.throttleMs ?? 0;
  if (throttleMs > 0) {
    const now = Date.now();
    const last = lastSpillCleanupAtMsByDir.get(spillDir);
    if (last !== undefined && now - last < throttleMs) return;
    if (lastSpillCleanupAtMsByDir.size >= SPILL_THROTTLE_MAX_DIRS) {
      lastSpillCleanupAtMsByDir.clear();
    }
    lastSpillCleanupAtMsByDir.set(spillDir, now);
  }
  const maxAge = options?.maxAgeMs ?? DEFAULT_SPILL_TTL_MS;
  const maxBytes = options?.maxTotalBytes ?? DEFAULT_MAX_SPILL_DIR_BYTES;
  const now = Date.now();

  try {
    const entries = readdirSync(spillDir, { withFileTypes: true });
    const spillFiles: Array<{ name: string; fullPath: string; mtimeMs: number; size: number }> = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const isSpillLog = entry.name.startsWith("spill-") && entry.name.endsWith(".log");
      const isOrphanTmp = entry.name.startsWith(".spill-") && entry.name.endsWith(".tmp");
      if (!isSpillLog && !isOrphanTmp) continue;

      const fullPath = join(spillDir, entry.name);
      try {
        const stats = statSync(fullPath);
        if (now - stats.mtimeMs > maxAge || isOrphanTmp) {
          unlinkSync(fullPath);
        } else {
          spillFiles.push({
            name: entry.name,
            fullPath,
            mtimeMs: stats.mtimeMs,
            size: stats.size,
          });
        }
      } catch {
        // Ignore stat or unlink failures
      }
    }

    // LRU eviction if directory exceeds quota
    let totalSize = spillFiles.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > maxBytes) {
      // Sort oldest first
      spillFiles.sort((a, b) => a.mtimeMs - b.mtimeMs);
      for (const file of spillFiles) {
        if (totalSize <= maxBytes) break;
        try {
          unlinkSync(file.fullPath);
          totalSize -= file.size;
        } catch {
          // Ignore unlink failures
        }
      }
    }
  } catch {
    // Ignore directory traversal errors
  }
}

/**
 * Spills oversized tool output to a durable log file on disk and returns metadata.
 * Uses atomic writes (temp file + rename) to avoid concurrent reader issues.
 */
export function spillToolOutput(options: SpillToolOutputOptions): ToolSpillResult {
  const { content, workspaceRoot } = options;
  const spillDir = resolveSpillDirectory({ workspaceRoot, baseDir: options.baseDir });

  if (!existsSync(spillDir)) {
    mkdirSync(spillDir, { recursive: true });
  }

  // Pre-cleanup periodically/on write（节流：最多每 60s 一次全量扫描）
  cleanupExpiredSpills(spillDir, {
    maxAgeMs: options.ttlMs,
    maxTotalBytes: options.maxRetentionBytes,
    throttleMs: SPILL_CLEANUP_THROTTLE_MS,
  });

  const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
  const safeToolName = (options.toolName || "tool")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 24);
  // Content-addressed filename: identical content MUST yield an identical path.
  //
  // The returned displayPath is embedded in the projected tool message sent to
  // the provider. A timestamp here made that projection time-varying, so every
  // turn re-projected the same historical tool result under a new name, moving
  // the prefix and destroying provider prefix caching for the whole history
  // that followed it. Keep this a pure function of (toolName, content).
  const fileName = `spill-${safeToolName}-${hash}.log`;
  const spillPath = join(spillDir, fileName);
  const tmpPath = join(spillDir, `.${fileName}.${Math.random().toString(36).slice(2, 8)}.tmp`);

  const byteLength = Buffer.byteLength(content, "utf-8");
  const totalChars = content.length;
  const totalLines = countLines(content);

  if (existsSync(spillPath)) {
    // Same content already spilled. Skip the rewrite but refresh mtime so the
    // LRU quota sweep treats a still-referenced spill as recently used.
    try {
      const now = new Date();
      utimesSync(spillPath, now, now);
    } catch {
      // Ignore utimes failures; a stale mtime only affects eviction ordering.
    }
  } else {
    writeFileSync(tmpPath, content, "utf-8");
    renameSync(tmpPath, spillPath);
  }

  let displayPath = spillPath;
  if (workspaceRoot && isAbsolute(workspaceRoot)) {
    const rel = relative(workspaceRoot, spillPath);
    if (!rel.startsWith("..") && !isAbsolute(rel)) {
      displayPath = rel;
    }
  }

  return {
    spillPath,
    displayPath,
    totalChars,
    totalLines,
    byteLength,
    hash,
  };
}

export function formatToolOverflowMarker(args: {
  spillRef: string;
  totalChars: number;
  totalLines: number;
  omittedChars?: number;
  toolName?: string;
}): string {
  const { spillRef, totalChars, totalLines, omittedChars } = args;
  const omittedNote = omittedChars !== undefined && omittedChars > 0
    ? ` omitted: ${omittedChars} chars;`
    : "";
  return (
    `\n\n[TOOL-OVERFLOW: full output spilled to ${spillRef} (total: ${totalChars} chars, ${totalLines} lines;${omittedNote} inspect via readFile or grep)]\n\n`
  );
}
