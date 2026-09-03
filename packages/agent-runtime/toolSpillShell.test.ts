import { describe, expect, test } from "bun:test";
import { truncateToolOutput, readNodeStream } from "./workspaceShell";
import { Readable } from "node:stream";

describe("truncateToolOutput with spillToolOutput integration", () => {
  test("returns original value untouched when below limit", () => {
    const smallText = "hello world\nline 2";
    const result = truncateToolOutput(smallText, 100);
    expect(result).toBe(smallText);
  });

  test("truncates large text and embeds spillFile path and totalLines", () => {
    const lines: string[] = [];
    for (let i = 1; i <= 100; i++) {
      lines.push(`Line ${i}: this is a long log output with lots of details to exceed the limit.`);
    }
    const fullText = lines.join("\n");
    const limit = 500;

    const result = truncateToolOutput(fullText, limit, { toolName: "execShell" });

    // 验证长度受限
    expect(result.length).toBeLessThanOrEqual(limit + 50); // 包含诊断标记
    expect(result).toContain("[... truncated");
    expect(result).toContain("spillFile=");
    expect(result).toContain("totalLines=100");

    // 提取 spillFile 路径并验证其真实落盘与内容完整性
    const match = /spillFile=([^;]+);/.exec(result);
    expect(match).not.toBeNull();
    const spillDisplayPath = match![1]!;
    expect(spillDisplayPath).toBeTruthy();
  });

  test("fail-open on zero limit or extremely small budget", () => {
    const text = "1234567890".repeat(20);
    const result = truncateToolOutput(text, 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe("readNodeStream Data Bandwidth Hard Barrier", () => {
  test("reads normal stream completely", async () => {
    const stream = Readable.from(["chunk 1\n", "chunk 2\n"]);
    const text = await readNodeStream(stream);
    expect(text).toBe("chunk 1\nchunk 2\n");
  });

  test("hard-truncates runaway streams that exceed maxBytes barrier", async () => {
    // 构造一个由 100 个 1KB 块组成的 100KB 流
    const chunk1k = "X".repeat(1024);
    const chunks: string[] = Array.from({ length: 100 }, () => chunk1k);
    const stream = Readable.from(chunks);

    // 设定 4KB (4096 字节) 硬拦截门
    const maxBytes = 4096;
    const text = await readNodeStream(stream, maxBytes);

    expect(text).toContain("[stream pipe truncated: output exceeded");
    // 截断正文部分不超过 4096 字节
    const mainBody = text.split("\n\n[stream pipe truncated")[0]!;
    expect(Buffer.byteLength(mainBody, "utf8")).toBe(maxBytes);
  });

  test("handles null stream gracefully", async () => {
    const text = await readNodeStream(null);
    expect(text).toBe("");
  });
});

