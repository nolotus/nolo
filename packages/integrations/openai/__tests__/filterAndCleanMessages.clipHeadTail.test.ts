import { describe, expect, it } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, unlinkSync } from "node:fs";

import { filterAndCleanMessages } from "../filterAndCleanMessages";

/**
 * 命题3+4 集成验证：model-facing 路径（filterAndCleanMessages → clipHeadAndTail）
 * 对超长 tool 输出做 Head+Tail：头部保留、尾部报错保留、中间删除、marker + 落盘路径就位。
 *
 * 这条测试直接证明"旧 head-only slice(0,N) 会丢掉尾部报错导致 agent 死循环"的失败模式
 * 已被消除——agent 现在能看到 build 错误。
 */
describe("filterAndCleanMessages head+tail preserves build-error tail", () => {
  it("keeps the head, the tail error line, the truncation marker, and a saved-log path", () => {
    const header = "Running npm test...\n".repeat(50);
    const middle = "passing spec line noise 0123456789\n".repeat(300);
    const tailError =
      "\nFAIL src/build.test.ts\n  ● build > errored at line 42\n\n1 test failed\n";
    const bigOutput = header + middle + tailError;

    const messages = filterAndCleanMessages([
      {
        role: "assistant",
        content: "",
        tool_calls: [
          { id: "call-be", type: "function", function: { name: "bash", arguments: "{}" } },
        ],
      },
      { role: "tool", toolCallId: "call-be", toolName: "bash", content: bigOutput },
    ]);

    const toolContent = messages[1].content as string;

    // Head preserved
    expect(toolContent).toContain("Running npm test");
    // Tail error preserved — the whole point of head+tail over the old head-only slice
    expect(toolContent).toContain("FAIL src/build.test.ts");
    expect(toolContent).toContain("1 test failed");
    // Middle elided
    expect(toolContent).toContain("[... truncated");
    // 命题4: full output offloaded, path surfaced in the marker
    expect(toolContent).toMatch(/Full output saved to .+\.log/);

    // cleanup the offloaded log
    const logPath = join(tmpdir(), "nolo-tool-logs", "call-be.log");
    if (existsSync(logPath)) unlinkSync(logPath);
  });
});
