import { describe, expect, test } from "bun:test";
import { hashPasswordV1 } from "./password";

// 防退化：子路径导入改写后，hashPasswordV1 输出必须与改前全量导入实现
// 字节级一致。golden 值由改前实现（import CryptoJS from "crypto-js"）对固定
// 输入跑出，写入此测试锁死。
describe("hashPasswordV1", () => {
  test("matches golden value from legacy full crypto-js import", async () => {
    const golden = "Tfq1ch2dh4JCvrW+wmYv2qqSp8S5QALDZNHNcIZa9PQ=";
    const out = await hashPasswordV1("correct horse battery staple");
    expect(out).toBe(golden);
  });

  test("is deterministic for the same input", async () => {
    const a = await hashPasswordV1("hello");
    const b = await hashPasswordV1("hello");
    expect(a).toBe(b);
    expect(a).not.toBe(await hashPasswordV1("world"));
  });
});
