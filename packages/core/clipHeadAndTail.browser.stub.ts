// packages/core/clipHeadAndTail.browser.stub.ts
// Browser stub for core/clipHeadAndTail.
//
// 真实实现（clipHeadAndTail.ts）用 node:fs/path/os 把超长 tool 输出落盘到临时日志，
// 这些 node 内建无法进入 web esbuild（platform: browser）。web 构建经
// esbuild.config.js 的 onResolve 规则把 `core/clipHeadAndTail` 重定向到本 stub。
// 浏览器侧裁剪语义与真实实现一致（Head+Tail、UTF-8 边界安全），仅去掉临时落盘
// （logPath 恒为 undefined）；服务端 / CLI / 测试仍走真实模块（Bun 直跑，不经 esbuild）。

export type HeadTailClipResult = {
  content: string;
  clipped: boolean;
  logPath?: string;
  originalBytes: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: false });

export function clipHeadAndTail(
  rawContent: string,
  options: {
    maxHeadBytes?: number;
    maxTailBytes?: number;
    maxTotalBytes?: number;
    saveTempLog?: boolean;
    toolCallId?: string;
  } = {}
): HeadTailClipResult {
  const maxHeadBytes = options.maxHeadBytes ?? 1000;
  const maxTailBytes = options.maxTailBytes ?? 2500;
  const maxTotalBytes = options.maxTotalBytes ?? 4000;

  const bytes = encoder.encode(rawContent);
  const originalBytes = bytes.length;
  if (originalBytes <= maxTotalBytes) {
    return { content: rawContent, clipped: false, originalBytes };
  }

  // 与真实实现一致：按字节裁剪，回退到 UTF-8 字符边界，避免切断多字节字符。
  let headEnd = Math.min(maxHeadBytes, bytes.length);
  while (headEnd > 0 && (bytes[headEnd] & 0xc0) === 0x80) {
    headEnd--;
  }

  let tailStart = Math.max(0, bytes.length - maxTailBytes);
  while (tailStart < bytes.length && (bytes[tailStart] & 0xc0) === 0x80) {
    tailStart++;
  }

  if (tailStart < headEnd) {
    tailStart = headEnd;
  }

  const headStr = decoder.decode(bytes.subarray(0, headEnd));
  const tailStr = decoder.decode(bytes.subarray(tailStart));
  const elidedBytes = Math.max(0, originalBytes - headEnd - (bytes.length - tailStart));

  const notice = `\n\n[... truncated ${elidedBytes} bytes.]\n\n`;

  return {
    content: `${headStr}${notice}${tailStr}`,
    clipped: true,
    // 浏览器侧无临时落盘能力，也不需要（调用方只用 content）。
    logPath: undefined,
    originalBytes,
  };
}
