import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanupExpiredSpills,
  countLines,
  formatToolOverflowMarker,
  resetSpillCleanupThrottle,
  resolveSpillDirectory,
  spillToolOutput,
} from "./toolSpillStore";

const TEST_DIR = join(import.meta.dir, ".tmp-spill-test");

describe("toolSpillStore", () => {
  beforeEach(() => {
    // 重置节流状态，防止同进程跨用例泄漏（spillToolOutput 走 60s 节流路径）。
    resetSpillCleanupThrottle();
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test("countLines accurately counts single-line, multi-line and empty strings", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("hello")).toBe(1);
    expect(countLines("hello\nworld")).toBe(2);
    expect(countLines("line1\nline2\nline3\n")).toBe(4);
  });

  test("spillToolOutput atomically writes content and returns metadata", () => {
    const content = "Line 1: error\nLine 2: stack trace\nLine 3: details\n";
    const result = spillToolOutput({
      content,
      toolName: "execShell",
      baseDir: TEST_DIR,
    });

    expect(existsSync(result.spillPath)).toBe(true);
    expect(readFileSync(result.spillPath, "utf-8")).toBe(content);
    expect(result.totalChars).toBe(content.length);
    expect(result.totalLines).toBe(4);
    expect(result.byteLength).toBe(Buffer.byteLength(content, "utf-8"));
    expect(result.spillPath).toContain("execShell");
  });

  test("spillToolOutput is content-addressed: same content yields the same path across calls", () => {
    // Regression: a Date.now() segment in the filename made the returned path
    // time-varying. That path is embedded in the projected tool message, so
    // re-projecting an unchanged historical tool result produced different
    // text every turn and invalidated provider prefix caching for the rest of
    // the conversation. The path must be a pure function of the content.
    const content = "identical tool output\nsecond line\n";

    const first = spillToolOutput({ content, toolName: "execShell", baseDir: TEST_DIR });
    // Advance the wall clock past a millisecond boundary. Two back-to-back
    // calls can land in the same millisecond, which would let a timestamped
    // filename pass this assertion by luck -- that is exactly how the original
    // regression slipped through review.
    const spinUntil = Date.now() + 2;
    while (Date.now() < spinUntil) {
      /* busy-wait */
    }
    const second = spillToolOutput({ content, toolName: "execShell", baseDir: TEST_DIR });

    expect(second.spillPath).toBe(first.spillPath);
    expect(second.displayPath).toBe(first.displayPath);
    expect(second.totalLines).toBe(first.totalLines);
    expect(readFileSync(first.spillPath, "utf-8")).toBe(content);

    // Distinct content must still land in a distinct file.
    const other = spillToolOutput({
      content: content + "extra",
      toolName: "execShell",
      baseDir: TEST_DIR,
    });
    expect(other.spillPath).not.toBe(first.spillPath);

    // Same content under a different tool name stays separated.
    const otherTool = spillToolOutput({ content, toolName: "readFile", baseDir: TEST_DIR });
    expect(otherTool.spillPath).not.toBe(first.spillPath);
  });

  test("spillToolOutput produces relative displayPath when workspaceRoot is provided", () => {
    const content = "some output";
    const result = spillToolOutput({
      content,
      workspaceRoot: TEST_DIR,
    });

    expect(result.displayPath).toBe(join(".nolo", "spills", result.spillPath.split(/[/\\]/).pop()!));
    expect(existsSync(result.spillPath)).toBe(true);
  });

  test("cleanupExpiredSpills removes expired files by TTL and cleans orphaned tmp files", async () => {
    const file1 = join(TEST_DIR, "spill-old.log");
    const tmp1 = join(TEST_DIR, ".spill-hanging-crash.tmp");
    writeFileSync(file1, "old data");
    writeFileSync(tmp1, "partial crash data");

    // Cleanup with ttlMs = 0 should remove old spill log and remove orphaned tmp files
    cleanupExpiredSpills(TEST_DIR, { maxAgeMs: -1 });
    expect(existsSync(file1)).toBe(false);
    expect(existsSync(tmp1)).toBe(false);
  });

  test("cleanupExpiredSpills enforces maxRetentionBytes LRU quota", () => {
    const file1 = join(TEST_DIR, "spill-1-a.log");
    const file2 = join(TEST_DIR, "spill-2-b.log");
    writeFileSync(file1, "x".repeat(1000));
    writeFileSync(file2, "y".repeat(1000));

    // Cap total size to 1500 bytes -> oldest file1 should be deleted, newer file2 kept
    cleanupExpiredSpills(TEST_DIR, { maxTotalBytes: 1500 });
    expect(existsSync(file1)).toBe(false);
    expect(existsSync(file2)).toBe(true);
  });

  test("formatToolOverflowMarker generates structured recovery marker", () => {
    const marker = formatToolOverflowMarker({
      spillRef: ".nolo/spills/spill-123.log",
      totalChars: 50000,
      totalLines: 1200,
      omittedChars: 46000,
      toolName: "execShell",
    });

    expect(marker).toContain("[TOOL-OVERFLOW: full output spilled to .nolo/spills/spill-123.log");
    expect(marker).toContain("total: 50000 chars, 1200 lines;");
    expect(marker).toContain("omitted: 46000 chars;");
    expect(marker).toContain("inspect via readFile or grep");
  });
});
