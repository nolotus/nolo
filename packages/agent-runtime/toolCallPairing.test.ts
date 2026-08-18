import { describe, expect, test } from "bun:test";

import { sanitizeToolCallPairing } from "./toolCallPairing";

type Msg =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }
  | { role: "tool"; content: string; tool_call_id?: string; toolCallId?: string };

const assistantWithToolCalls = (
  content: string | null,
  ids: string[],
): Extract<Msg, { role: "assistant" }> => ({
  role: "assistant",
  content,
  tool_calls: ids.map((id) => ({
    id,
    type: "function" as const,
    function: { name: "x", arguments: "{}" },
  })),
});

const toolMessage = (id: string, content = "r"): Extract<Msg, { role: "tool" }> => ({
  role: "tool",
  content,
  tool_call_id: id,
});

const roleOf = (m: Msg) => m.role;

describe("sanitizeToolCallPairing", () => {
  test("事故原型：孤儿 tool + 悬空 tool_calls → 重排为合法配对序列", () => {
    // 原始非法序列：
    //   user / assistant(无 tool_calls) / tool×3(孤儿，前面 assistant 没声明)
    //   / assistant(tool_calls×3，悬空，后面无结果) / user
    const input: Msg[] = [
      { role: "user", content: "u1" },
      { role: "assistant", content: "plain" },
      toolMessage("call_00"),
      toolMessage("call_01"),
      toolMessage("call_02"),
      assistantWithToolCalls(null, ["call_00", "call_01", "call_02"]),
      { role: "user", content: "u2" },
    ];

    const out = sanitizeToolCallPairing(input);

    // 期望：user / assistant(含 tool_calls×3) / tool×3(按声明顺序) / user
    //   无孤儿 tool（前一个 plain assistant 不带 tool_calls，原样保留在前）
    expect(out.map(roleOf)).toEqual([
      "user",
      "assistant",
      "assistant",
      "tool",
      "tool",
      "tool",
      "user",
    ]);
    // 第一个 assistant 是原 plain（无 tool_calls）
    const firstAssistant = out[1] as Extract<Msg, { role: "assistant" }>;
    expect(firstAssistant.content).toBe("plain");
    expect(firstAssistant.tool_calls).toBeUndefined();
    // 第二个 assistant 带 tool_calls×3，顺序保留
    const secondAssistant = out[2] as Extract<Msg, { role: "assistant" }>;
    expect(secondAssistant.tool_calls?.map((c) => c.id)).toEqual([
      "call_00",
      "call_01",
      "call_02",
    ]);
    // 紧接其后的 3 条 tool，id 顺序与声明一致
    expect(out[3]).toMatchObject({ role: "tool", tool_call_id: "call_00" });
    expect(out[4]).toMatchObject({ role: "tool", tool_call_id: "call_01" });
    expect(out[5]).toMatchObject({ role: "tool", tool_call_id: "call_02" });
    expect(out[6]).toMatchObject({ role: "user", content: "u2" });
  });

  test("已合法序列 → 语义不变（tool 紧跟声明它的 assistant）", () => {
    const input: Msg[] = [
      { role: "user", content: "u1" },
      assistantWithToolCalls("go", ["a", "b"]),
      toolMessage("a", "ra"),
      toolMessage("b", "rb"),
      { role: "user", content: "u2" },
    ];

    const out = sanitizeToolCallPairing(input);

    expect(out.map(roleOf)).toEqual([
      "user",
      "assistant",
      "tool",
      "tool",
      "user",
    ]);
    expect(out[1]).toMatchObject({ role: "assistant", content: "go" });
    expect((out[1] as any).tool_calls.map((c: any) => c.id)).toEqual(["a", "b"]);
    expect(out[2]).toMatchObject({ role: "tool", tool_call_id: "a", content: "ra" });
    expect(out[3]).toMatchObject({ role: "tool", tool_call_id: "b", content: "rb" });
    expect(out[4]).toMatchObject({ role: "user", content: "u2" });
  });

  test("部分匹配：3 个 tool_calls 只有 2 个有结果 → 剩 1 个被剔除", () => {
    const input: Msg[] = [
      { role: "user", content: "u" },
      assistantWithToolCalls("c", ["a", "b", "c"]),
      toolMessage("a", "ra"),
      toolMessage("c", "rc"), // 缺 b
    ];

    const out = sanitizeToolCallPairing(input);

    expect(out.map(roleOf)).toEqual(["user", "assistant", "tool", "tool"]);
    const asst = out[1] as Extract<Msg, { role: "assistant" }>;
    expect(asst.tool_calls?.map((c) => c.id)).toEqual(["a", "c"]);
    expect(out[2]).toMatchObject({ tool_call_id: "a" });
    expect(out[3]).toMatchObject({ tool_call_id: "c" });
  });

  test("全部匹配不上且 content 为空 → 整条 assistant 被丢弃", () => {
    const input: Msg[] = [
      { role: "user", content: "u" },
      assistantWithToolCalls("", ["missing1", "missing2"]),
      { role: "user", content: "u2" },
    ];

    const out = sanitizeToolCallPairing(input);

    expect(out.map(roleOf)).toEqual(["user", "user"]);
    expect(out[0]).toMatchObject({ content: "u" });
    expect(out[1]).toMatchObject({ content: "u2" });
  });

  test("全部匹配不上但 content 有文本 → 保留 assistant 并删掉 tool_calls 字段", () => {
    const input: Msg[] = [
      { role: "user", content: "u" },
      assistantWithToolCalls("still meaningful text", ["missing1"]),
      { role: "user", content: "u2" },
    ];

    const out = sanitizeToolCallPairing(input);

    expect(out.map(roleOf)).toEqual(["user", "assistant", "user"]);
    const asst = out[1] as Extract<Msg, { role: "assistant" }>;
    expect(asst.content).toBe("still meaningful text");
    expect(asst.tool_calls).toBeUndefined();
  });

  test("完全没有 tool 的普通对话 → 原样返回（语义不变）", () => {
    const input: Msg[] = [
      { role: "system", content: "s" },
      { role: "user", content: "u1" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "u2" },
      { role: "assistant", content: "a2" },
    ];

    const out = sanitizeToolCallPairing(input);

    expect(out).toEqual(input);
  });

  test("兼容驼峰 toolCallId 写法", () => {
    const input: Msg[] = [
      { role: "user", content: "u" },
      assistantWithToolCalls("c", ["camelId"]),
      { role: "tool", content: "rc", toolCallId: "camelId" } as Extract<Msg, { role: "tool" }>,
    ];

    const out = sanitizeToolCallPairing(input);

    expect(out.map(roleOf)).toEqual(["user", "assistant", "tool"]);
    expect(out[2]).toMatchObject({ content: "rc" });
    expect((out[2] as any).tool_call_id ?? (out[2] as any).toolCallId).toBe("camelId");
  });

  test("重复 id 的孤儿 tool 只取首条，且只配对给第一个声明的 assistant", () => {
    const input: Msg[] = [
      { role: "user", content: "u" },
      assistantWithToolCalls("c1", ["dup"]),
      toolMessage("dup", "first"),
      toolMessage("dup", "second"), // 重复 id 的孤儿
      { role: "assistant", content: "c2", tool_calls: undefined },
    ];

    const out = sanitizeToolCallPairing(input);

    // 第二个 dup 被丢弃；第一个 assistant 配对首条 dup
    expect(out.map(roleOf)).toEqual(["user", "assistant", "tool", "assistant"]);
    expect(out[2]).toMatchObject({ tool_call_id: "dup", content: "first" });
  });

  test("未知 part 类型的多模态 assistant 在 tool_calls 全部匹配不上时不被丢弃（仅剥掉 tool_calls）", () => {
    // content 含未知类型 part（Anthropic 风格 {type:"image", source}），
    // tool_calls 全部匹配不上任何 tool 结果。isContentBlank 必须保守视为
    // 有内容 → 该 assistant 保留，仅 tool_calls 字段被剥掉，避免数据丢失。
    const input: any[] = [
      { role: "user", content: "u" },
      {
        role: "assistant",
        content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "abc" } }],
        tool_calls: [
          { id: "call_x", type: "function", function: { name: "t", arguments: "{}" } },
        ],
      },
    ];

    const out = sanitizeToolCallPairing(input);

    expect(out.map(roleOf)).toEqual(["user", "assistant"]);
    const kept = out[1] as any;
    expect(kept.role).toBe("assistant");
    // tool_calls 字段被剥掉
    expect(kept.tool_calls).toBeUndefined();
    // content（含未知 part）原样保留，未丢
    expect(kept.content).toEqual([
      { type: "image", source: { type: "base64", media_type: "image/png", data: "abc" } },
    ]);
  });
});