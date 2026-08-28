/**
 * displayWidth 单项 micro-bench：测量 ASCII / 中文 / emoji 三类行优化前后的耗时。
 * 用于验证优化对慢路径（非 ASCII）的实际收益。
 *
 * 用法：bun packages/cli/tui/__bench__/displayWidthMicro.ts
 */
import { displayWidth } from "../tuiAnsi";

const asciiLine = "Short 12: what is the fastest way to parse this file?";
const chineseLine = "中文“测试”加全角引号与中文内容，长度足够覆盖整行宽度范围。";
const emojiLine = "✅ 完成 ❌ 失败 ⚠️ 警告 👨‍👩‍👧 家庭 🚀🚀 进度条 100%";

function bench(label: string, line: string, n: number): void {
  // warm
  for (let i = 0; i < 100; i++) displayWidth(line);
  const t0 = performance.now();
  let acc = 0;
  for (let i = 0; i < n; i++) acc += displayWidth(line);
  const ms = performance.now() - t0;
  console.log(`  ${label.padEnd(12)} ${ms.toFixed(1)}ms / ${n} 次  →  ${(ms / n * 1e6).toFixed(1)}ns/次  (acc=${acc})`);
}

// 刻意不打印时间戳：bench 输出常被贴进文档或对话上下文，时间戳会让本该稳定的
// 文本每次运行都不同（本仓库要求进入 LLM 上下文的文本跨轮次逐字节可复现）。
console.log("displayWidth micro-bench");
console.log("  ASCII 行:");
bench("ascii", asciiLine, 200000);
console.log("  中文行:");
bench("chinese", chineseLine, 20000);
console.log("  emoji行:");
bench("emoji", emojiLine, 20000);
console.log("DONE");
