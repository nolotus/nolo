import { expect, test } from "bun:test";
import { isColdResume, COLD_RESUME_IDLE_MS } from "./localAutoCompaction";

// 隔了很久再继续的对话，provider 前缀缓存必然已过期，这一轮无论如何都要
// 全量重发。那是压缩最划算的时刻：反正要付全量未命中的钱，不如重发一个小的。
//
// 但方向必须保守——若缓存其实还热却误触发，新摘要会改变前缀、毁掉热缓存。

const NOW = Date.parse("2026-08-02T12:00:00Z");
const msg = (ageMs: number) => ({
  role: "user" as const,
  content: "x",
  createdAt: NOW - ageMs,
});

test("昨天的对话今天继续 → 判定为冷启动", () => {
  const yesterday = 20 * 60 * 60 * 1000; // 20 小时前
  expect(isColdResume([msg(yesterday)] as any, NOW)).toBe(true);
});

test("刚刚还在聊 → 不触发（绝不能毁掉热缓存）", () => {
  expect(isColdResume([msg(30_000)] as any, NOW)).toBe(false);
  expect(isColdResume([msg(10 * 60_000)] as any, NOW)).toBe(false);
});

test("阈值边界：略低于不触发，略高于触发", () => {
  expect(isColdResume([msg(COLD_RESUME_IDLE_MS - 1000)] as any, NOW)).toBe(false);
  expect(isColdResume([msg(COLD_RESUME_IDLE_MS + 1000)] as any, NOW)).toBe(true);
});

test("以最后一条带时间戳的消息为准，忽略更早的", () => {
  const history = [msg(20 * 60 * 60 * 1000), msg(60_000)];
  expect(isColdResume(history as any, NOW)).toBe(false);
});

test("历史不带时间戳 → 不触发，保持既有行为", () => {
  expect(isColdResume([{ role: "user", content: "x" }] as any, NOW)).toBe(false);
  expect(isColdResume([] as any, NOW)).toBe(false);
});

test("非法时间戳被跳过，回退到更早的有效值", () => {
  const history = [
    msg(20 * 60 * 60 * 1000),
    { role: "user", content: "x", createdAt: NaN },
  ];
  expect(isColdResume(history as any, NOW)).toBe(true);
});
