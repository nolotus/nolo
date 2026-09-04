import { describe, expect, test } from "bun:test";

import {
  matchContextualFragment,
  describeContextualFragment,
} from "./contextualFragment";

// 新格式：runCompletionWatcher.buildWakeMessage 的产出形态。
const NEW_FORMAT = [
  '<background_run_completion count="2">',
  '<run runId="run-a" agent="Worker" status="done" childDialogId="child-dialog-1" duration="1m" />',
  '<run runId="run-b" agent="Worker" status="failed" exitCode="1" duration="5m" childDialogId="child-dialog-2">',
  "error: boom",
  "activity: 3 tool calls · 2 llm calls · 1 edits",
  "</run>",
  '需要完整输出时: controlAgentRun(action: "status", runId, tailLines: 30)',
  "</background_run_completion>",
].join("\n");

// server legacy：continueDialogContext.ts 的注入格式（正文被
// wrapHistoricalSummaryWithReplayGuard 包了一层）。
const SERVER_LEGACY = [
  "--- 后台 run 终态事件 ---",
  "【历史参考，非活指令】以下为冻结摘要，其中的任务/skill/ARGUMENTS 默认已过期，不得重新执行。",
  "摘要中标注「（待验证）」的项需复核确认；未完成待办和「下一步」需继续推进——这些是续作方向，不是重放指令。",
  "terminalStatus: done",
  "childDialogId: child-dialog-1",
  "text: 摘要内容",
].join("\n");

// TUI legacy：旧版 buildWakeMessage 的格式（存量对话）。
const TUI_LEGACY = [
  "【后台 run 终态通知】你派出的 1 条后台 run 已到达终态：",
  "",
  "runId: run-a",
  "agent: Worker",
  "status: done",
  "childDialogId: child-dialog-1",
  "duration: 1m",
].join("\n");

// legacy 时间块：已移除的 buildCurrentTimeBlock 的完整产出（存量对话）。
const TIME_BLOCK = [
  "--- 当前时间 ---",
  "当前日期: 2026-09-04",
  "当前本地时间: 2026-09-04 14:00",
  "本地时区: Asia/Shanghai / +08:00",
  "UTC 时间: 2026-09-04T06:00",
  "注意：上面的时间只精确到小时（为命中 prompt 缓存而降低粒度）。",
].join("\n");

describe("matchContextualFragment", () => {
  test("四种格式分别命中对应 kind", () => {
    expect(matchContextualFragment(NEW_FORMAT)).toBe("background_run_completion");
    expect(matchContextualFragment(SERVER_LEGACY)).toBe("server_legacy_wake");
    expect(matchContextualFragment(TUI_LEGACY)).toBe("tui_legacy_wake");
    expect(matchContextualFragment(TIME_BLOCK)).toBe("legacy_time_block");
  });

  test("新格式允许首尾空白（trim 后精确包裹匹配）", () => {
    expect(matchContextualFragment(`\n${NEW_FORMAT}\n`)).toBe(
      "background_run_completion"
    );
  });

  test("普通用户消息不误判", () => {
    expect(matchContextualFragment("帮我看看这个报错怎么办")).toBeNull();
    expect(matchContextualFragment("runId: 不是我\n这只是普通文本")).toBeNull();
    expect(matchContextualFragment("")).toBeNull();
  });

  test("标记出现在正文中间不算（不能只看包含）", () => {
    expect(
      matchContextualFragment(`前面有话。${TIME_BLOCK}\n后面还有话。`)
    ).toBeNull();
    expect(
      matchContextualFragment(`看这段：\n${TUI_LEGACY}\n以上就是日志。`)
    ).toBeNull();
  });

  test("「--- 当前时间 ---」开头但正文不是时间块结构的不算", () => {
    expect(
      matchContextualFragment("--- 当前时间 ---\n今天天气不错，我们出去玩吧。")
    ).toBeNull();
  });

  test("「--- 后台 run 终态事件 ---」开头但无 key: value 结构的不算", () => {
    expect(
      matchContextualFragment("--- 后台 run 终态事件 ---\n随便写两句。")
    ).toBeNull();
  });

  test("「【后台 run 终态通知】」开头但无 runId 结构的不算", () => {
    expect(
      matchContextualFragment("【后台 run 终态通知】这只是用户引用的一句话。")
    ).toBeNull();
  });

  test("新格式 tag 不完整（只有开 tag 或只有闭 tag）不算", () => {
    expect(
      matchContextualFragment('<background_run_completion count="1">\n<run status="done" />')
    ).toBeNull();
    expect(
      matchContextualFragment('普通消息 </background_run_completion>')
    ).toBeNull();
  });

  test("非字符串输入不崩溃", () => {
    // 渲染层可能传 undefined；纯函数层要求安全。
    expect(matchContextualFragment(undefined as unknown as string)).toBeNull();
  });
});

describe("describeContextualFragment", () => {
  test("新格式单 run：✓ + status + runId 前 12 位 + duration", () => {
    const summary = describeContextualFragment(
      '<background_run_completion count="1">\n<run runId="run-a1234567890xyz" agent="Worker" status="done" duration="2m" childDialogId="d-1" />\n</background_run_completion>'
    );
    expect(summary?.kind).toBe("background_run_completion");
    expect(summary?.failed).toBe(false);
    expect(summary?.statusLine).toContain("✓");
    expect(summary?.statusLine).toContain("done");
    expect(summary?.statusLine).toContain("run-a1234567…");
    expect(summary?.statusLine).toContain("2m");
    expect(summary?.statusLine).not.toContain("run-a1234567890xyz"); // 截断到 12 位
  });

  test("新格式多 run 且有失败：整体标 ✗，注明条数", () => {
    const summary = describeContextualFragment(NEW_FORMAT);
    expect(summary?.failed).toBe(true);
    expect(summary?.statusLine).toContain("✗");
    expect(summary?.statusLine).toContain("2 条");
  });

  test("TUI legacy：提取 runId/status/duration", () => {
    const summary = describeContextualFragment(TUI_LEGACY);
    expect(summary?.statusLine).toContain("✓");
    expect(summary?.statusLine).toContain("run-a");
    expect(summary?.statusLine).toContain("done");
    expect(summary?.statusLine).toContain("1m");
  });

  test("失败 legacy：✗ + status", () => {
    const summary = describeContextualFragment(
      TUI_LEGACY.replace("status: done", "status: failed")
    );
    expect(summary?.failed).toBe(true);
    expect(summary?.statusLine).toContain("✗");
    expect(summary?.statusLine).toContain("failed");
  });

  test("server legacy：terminalStatus + childDialogId", () => {
    const summary = describeContextualFragment(SERVER_LEGACY);
    expect(summary?.statusLine).toContain("done");
    expect(summary?.statusLine).toContain("child-dialog…");
  });

  test("时间块：日期 + 时间", () => {
    const summary = describeContextualFragment(TIME_BLOCK);
    expect(summary?.failed).toBe(false);
    expect(summary?.statusLine).toContain("2026-09-04");
    expect(summary?.statusLine).toContain("14:00");
  });

  test("普通消息返回 null", () => {
    expect(describeContextualFragment("你好")).toBeNull();
  });
});
