import { expect, test } from "bun:test";
import { planContextUsage } from "../ai/context/retention";
import { getModelContextWindow } from "../ai/llm/getModelContextWindow";

// 这些断言锁住 localLoop 上下文预算兜底所依赖的两个前提。
// 背景：localLoop 此前无条件发送完整历史，实测有末轮上下文 10.2M token 的
// 本地会话，而 deepseek-v4-flash 窗口是 100 万——请求要么失败、要么被 provider
// 静默截断。

test("deepseek-v4-flash 的窗口是 100 万 token", () => {
  expect(getModelContextWindow("deepseek-v4-flash")).toBe(1_000_000);
});

test("1M 窗口下历史预算接近满窗——裁剪只在撞窗口时生效，不破坏正常会话的前缀缓存", () => {
  const plan = planContextUsage({
    contextWindow: 1_000_000,
    summaryTokens: 0,
    recentLoad: "medium",
  });
  // cache-first：预算应 >= 90 万，否则正常长会话会被过早裁剪、前缀缓存被打断
  expect(plan.rawMessageBudget).toBeGreaterThanOrEqual(900_000);
  expect(plan.rawMessageBudget).toBeLessThanOrEqual(1_000_000);
});

test("实测中最大的会话（10.2M tok）确实超出预算，会被裁剪", () => {
  const plan = planContextUsage({
    contextWindow: 1_000_000,
    summaryTokens: 0,
    recentLoad: "medium",
  });
  expect(10_200_000).toBeGreaterThan(plan.rawMessageBudget);
});

import { trimHistoryToContextBudget } from "./localLoop";

const bigMsg = (role: "user" | "assistant", n: number) => ({
  role,
  content: "x".repeat(n),
});

test("未超预算时历史原样返回——正常会话不受影响，前缀缓存不被破坏", () => {
  const history = [bigMsg("user", 400), bigMsg("assistant", 400)];
  const out = trimHistoryToContextBudget(history as any, "deepseek-v4-flash");
  expect(out.droppedCount).toBe(0);
  expect(out.history).toBe(history);
});

test("超预算时丢弃最老的消息", () => {
  // 每条 2M 字符 = 50 万 tok，三条 = 150 万 > 94 万预算
  const history = [
    bigMsg("user", 2_000_000),
    bigMsg("assistant", 2_000_000),
    bigMsg("user", 2_000_000),
  ];
  const out = trimHistoryToContextBudget(history as any, "deepseek-v4-flash");
  expect(out.droppedCount).toBeGreaterThan(0);
  expect(out.history.length).toBeLessThan(history.length);
  // 保留的是尾部
  expect(out.history[out.history.length - 1]).toBe(history[history.length - 1] as any);
});

test("预算极小也至少保留最后一条，不会裁成空历史", () => {
  const history = [bigMsg("user", 8_000_000), bigMsg("assistant", 8_000_000)];
  const out = trimHistoryToContextBudget(history as any, "deepseek-v4-flash");
  expect(out.history.length).toBeGreaterThanOrEqual(1);
});

test("裁剪后不留下没有对应 assistant 声明的孤儿 tool 结果", () => {
  const history = [
    { role: "assistant", content: "x".repeat(4_000_000), tool_calls: [{ id: "c1", type: "function", function: { name: "execShell", arguments: "{}" } }] },
    { role: "tool", toolCallId: "c1", tool_call_id: "c1", content: "y".repeat(100) },
    { role: "user", content: "z".repeat(100) },
  ];
  const out = trimHistoryToContextBudget(history as any, "deepseek-v4-flash");
  const orphanTools = out.history.filter(
    (m: any) =>
      m.role === "tool" &&
      !out.history.some(
        (a: any) =>
          a.role === "assistant" &&
          Array.isArray(a.tool_calls) &&
          a.tool_calls.some((c: any) => c.id === m.tool_call_id)
      )
  );
  expect(orphanTools).toEqual([]);
});

test("中文历史按中文感知估算，不会因低估而漏裁", () => {
  // 中文 1.5 tok/字 vs 平铺 chars/4 的 0.25 tok/字 —— 相差 6 倍。
  // 用 /4 估算时这段历史看起来只有 ~15 万 tok（不触发裁剪），
  // 实际接近 90 万，逼近 94 万预算。再叠一条就必须裁。
  const cn = (n: number) => ({ role: "user" as const, content: "中".repeat(n) });
  const history = [cn(600_000), cn(600_000)];

  const flatEstimate = (600_000 * 2) / 4; // 平铺 /4 的看法
  expect(flatEstimate).toBeLessThan(900_000); // /4 会认为没超预算

  const out = trimHistoryToContextBudget(history as any, "deepseek-v4-flash");
  // 中文感知下 2×60 万字 ≈ 180 万 tok，远超预算，必须裁
  expect(out.droppedCount).toBeGreaterThan(0);
});
