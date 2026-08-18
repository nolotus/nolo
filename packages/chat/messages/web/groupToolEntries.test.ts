import { describe, expect, it } from "bun:test";
import { groupConsecutiveToolEntries } from "./groupToolEntries";

describe("groupConsecutiveToolEntries", () => {
  it("recovers missing toolName from assistant tool_calls without overriding existing names", () => {
    // CLI / 旧数据 / 漏带的写库链会让 tool 行只有 tool_call_id 而无 toolName，
    // 桌面端折叠头因此兜底成「工具」。分组时用 assistant.tool_calls 反查补齐，
    // 且不得覆盖已存在的 toolName（即使它与 call 名不一致，也以显式值为准）。
    const assistant = {
      id: "assistant-1",
      role: "assistant",
      tool_calls: [
        { id: "call-1", type: "function", function: { name: "readFile", arguments: "{}" } },
        { id: "call-2", type: "function", function: { name: "searchFiles", arguments: "{}" } },
      ],
    };
    const toolMissing = { id: "tool-1", role: "tool", toolCallId: "call-1" };
    const toolPresent = {
      id: "tool-2",
      role: "tool",
      toolName: "execShell",
      toolCallId: "call-2",
    };
    const result = groupConsecutiveToolEntries([
      { type: "single", key: "assistant-1", message: assistant },
      { type: "single", key: "tool-1", message: toolMissing },
      { type: "single", key: "tool-2", message: toolPresent },
    ]);
    const group = result.find((entry) => entry.type === "tool-group") as
      | { type: "tool-group"; messages: any[] }
      | undefined;
    expect(group?.messages[0].toolName).toBe("readFile");
    expect(group?.messages[1].toolName).toBe("execShell");
  });

  it("recovers toolName when the owning assistant appears after the tool row", () => {
    // 索引必须在分组前对全量 entries 预建，否则 assistant 排在 tool 之后时
    // 反查不到名字——这是本次兜底最关键也最易回归的不变量。
    const tool = { id: "tool-1", role: "tool", toolCallId: "call-1" };
    const assistant = {
      id: "assistant-1",
      role: "assistant",
      tool_calls: [
        { id: "call-1", type: "function", function: { name: "readFile", arguments: "{}" } },
      ],
    };
    const result = groupConsecutiveToolEntries([
      { type: "single", key: "tool-1", message: tool },
      { type: "single", key: "assistant-1", message: assistant },
    ]);
    const group = result.find((entry) => entry.type === "tool-group") as
      | { type: "tool-group"; messages: any[] }
      | undefined;
    expect(group?.messages[0].toolName).toBe("readFile");
  });

  it("leaves toolName undefined when tool_call_id matches no assistant tool_call", () => {
    // 不匹配的 callId 必须原样返回、不误补成别的工具名、不抛错。
    const assistant = {
      id: "assistant-1",
      role: "assistant",
      tool_calls: [
        { id: "call-other", type: "function", function: { name: "writeFile", arguments: "{}" } },
      ],
    };
    const tool = { id: "tool-1", role: "tool", toolCallId: "call-x" };
    const result = groupConsecutiveToolEntries([
      { type: "single", key: "assistant-1", message: assistant },
      { type: "single", key: "tool-1", message: tool },
    ]);
    const group = result.find((entry) => entry.type === "tool-group") as
      | { type: "tool-group"; messages: any[] }
      | undefined;
    expect(group?.messages[0].toolName).toBeUndefined();
  });

  it("coalesces consecutive tool entries into a tool group", () => {
    const first = { id: "tool-1", role: "tool", toolName: "exa_search" };
    const second = { id: "tool-2", role: "tool", toolName: "read_file" };
    const assistant = { id: "assistant-1", role: "assistant" };

    const entries: any[] = [
      { type: "single", key: "tool-1", message: first },
      { type: "single", key: "tool-2", message: second },
      { type: "single", key: "assistant-1", message: assistant },
    ];

    expect(groupConsecutiveToolEntries(entries)).toEqual([
      {
        type: "tool-group",
        key: "tool-group-tool-1",
        messages: [first, second],
      },
      { type: "single", key: "assistant-1", message: assistant },
    ]);
  });

  it("keeps a stable group key when a consecutive run grows", () => {
    const first = { id: "tool-1", role: "tool", toolName: "readFile" };
    const second = { id: "tool-2", role: "tool", toolName: "searchFiles" };
    const third = { id: "tool-3", role: "tool", toolName: "execShell" };

    const one = groupConsecutiveToolEntries([
      { type: "single", key: "tool-1", message: first },
    ]);
    const two = groupConsecutiveToolEntries([
      { type: "single", key: "tool-1", message: first },
      { type: "single", key: "tool-2", message: second },
    ]);
    const three = groupConsecutiveToolEntries([
      { type: "single", key: "tool-1", message: first },
      { type: "single", key: "tool-2", message: second },
      { type: "single", key: "tool-3", message: third },
    ]);

    expect(one[0]).toMatchObject({ type: "tool-group", key: "tool-group-tool-1" });
    expect(two[0]).toMatchObject({ type: "tool-group", key: "tool-group-tool-1" });
    expect(three[0]).toMatchObject({ type: "tool-group", key: "tool-group-tool-1" });
    expect((three[0] as { messages: unknown[] }).messages).toHaveLength(3);
  });

  it("renders a standalone tool as a tool group (stable component type)", () => {
    const tool = { dbKey: "tool-db-key", role: "tool", toolName: "exa_search" };
    const assistant = { id: "assistant-1", role: "assistant" };

    expect(
      groupConsecutiveToolEntries([
        { type: "single", key: "tool-original", message: tool },
        { type: "single", key: "assistant-1", message: assistant },
      ])
    ).toEqual([
      {
        type: "tool-group",
        key: "tool-group-tool-db-key",
        messages: [tool],
      },
      { type: "single", key: "assistant-1", message: assistant },
    ]);
  });

  it("renders a standalone activity tool as a readable tool group", () => {
    const tool = {
      id: "tool-activity-1",
      role: "tool",
      toolName: "execShell",
      metadata: {
        activity: {
          phase: { id: "verify", title: "验证结果" },
          action: { title: "运行测试" },
        },
      },
    };

    expect(
      groupConsecutiveToolEntries([
        { type: "single", key: "tool-activity-1", message: tool },
      ])
    ).toEqual([
      {
        type: "tool-group",
        key: "tool-group-tool-activity-1",
        messages: [tool],
        activityMessages: [tool],
      },
    ]);
  });

  it("uses the final assistant activity signal for the timeline without swallowing the answer", () => {
    const tool = {
      id: "tool-1",
      role: "tool",
      toolName: "execShell",
      metadata: {
        activity: {
          plan: {
            phases: [
              { id: "analyze", title: "分析数据" },
              { id: "report", title: "汇报结果" },
            ],
          },
          phase: { id: "analyze", title: "分析数据" },
          action: { title: "计算增长率" },
        },
      },
    };
    const finalAssistant = {
      id: "assistant-final",
      role: "assistant",
      content: "结果已经完成。",
      metadata: {
        activity: {
          phase: { id: "report", title: "汇报结果", status: "success" },
        },
      },
    };

    expect(
      groupConsecutiveToolEntries([
        { type: "single", key: "tool-1", message: tool },
        { type: "single", key: "assistant-final", message: finalAssistant },
      ])
    ).toEqual([
      {
        type: "tool-group",
        key: "tool-group-tool-1",
        messages: [tool],
        activityMessages: [tool, finalAssistant],
      },
      { type: "single", key: "assistant-final", message: finalAssistant },
    ]);
  });

  it("preserves tool → narration → tool → final reply order", () => {
    const tool1 = { id: "tool-1", role: "tool", toolName: "readFile" };
    const tool2 = { id: "tool-2", role: "tool", toolName: "readFile" };
    const progressAssistant = {
      id: "assistant-progress",
      role: "assistant",
      content: "先检查相关文件，再继续。",
    };
    const tool3 = { id: "tool-3", role: "tool", toolName: "searchFiles" };
    const finalAssistant = {
      id: "assistant-final",
      role: "assistant",
      content: "已完成，下面是结果。",
    };

    expect(
      groupConsecutiveToolEntries([
        { type: "single", key: "tool-1", message: tool1 },
        { type: "single", key: "tool-2", message: tool2 },
        { type: "single", key: "assistant-progress", message: progressAssistant },
        { type: "single", key: "tool-3", message: tool3 },
        { type: "single", key: "assistant-final", message: finalAssistant },
      ])
    ).toEqual([
      {
        type: "tool-group",
        key: "tool-group-tool-1",
        messages: [tool1, tool2],
      },
      { type: "single", key: "assistant-progress", message: progressAssistant },
      {
        type: "tool-group",
        key: "tool-group-tool-3",
        messages: [tool3],
      },
      { type: "single", key: "assistant-final", message: finalAssistant },
    ]);
  });

  it("stops coalescing at a user message", () => {
    const tool1 = { id: "tool-1", role: "tool", toolName: "readFile" };
    const bridge = {
      id: "a1",
      role: "assistant",
      content: "稍等。",
    };
    const user = { id: "user-1", role: "user", content: "hello" };
    const tool2 = { id: "tool-2", role: "tool", toolName: "searchFiles" };

    expect(
      groupConsecutiveToolEntries([
        { type: "single", key: "tool-1", message: tool1 },
        { type: "single", key: "a1", message: bridge },
        { type: "single", key: "user-1", message: user },
        { type: "single", key: "tool-2", message: tool2 },
      ])
    ).toEqual([
      {
        type: "tool-group",
        key: "tool-group-tool-1",
        messages: [tool1],
      },
      { type: "single", key: "a1", message: bridge },
      { type: "single", key: "user-1", message: user },
      {
        type: "tool-group",
        key: "tool-group-tool-2",
        messages: [tool2],
      },
    ]);
  });

  it("keeps multiple assistant narrations visible between tool batches", () => {
    const tool1 = { id: "tool-1", role: "tool", toolName: "readFile" };
    const bridge1 = { id: "a1", role: "assistant", content: "第一步完成。" };
    const bridge2 = { id: "a2", role: "assistant", content: "继续下一步。" };
    const tool2 = { id: "tool-2", role: "tool", toolName: "searchFiles" };

    expect(
      groupConsecutiveToolEntries([
        { type: "single", key: "tool-1", message: tool1 },
        { type: "single", key: "a1", message: bridge1 },
        { type: "single", key: "a2", message: bridge2 },
        { type: "single", key: "tool-2", message: tool2 },
      ])
    ).toEqual([
      {
        type: "tool-group",
        key: "tool-group-tool-1",
        messages: [tool1],
      },
      { type: "single", key: "a1", message: bridge1 },
      { type: "single", key: "a2", message: bridge2 },
      {
        type: "tool-group",
        key: "tool-group-tool-2",
        messages: [tool2],
      },
    ]);
  });

  it("does not absorb a final assistant answer even with an activity signal", () => {
    const tool = { id: "tool-1", role: "tool", toolName: "execShell" };
    const finalAnswer = {
      id: "assistant-final",
      role: "assistant",
      content: "结果已经完成。",
      metadata: {
        activity: {
          phase: { id: "report", title: "汇报结果", status: "success" },
        },
      },
    };

    const result = groupConsecutiveToolEntries([
      { type: "single", key: "tool-1", message: tool },
      { type: "single", key: "assistant-final", message: finalAnswer },
    ]);

    expect(result).toEqual([
      {
        type: "tool-group",
        key: "tool-group-tool-1",
        messages: [tool],
        activityMessages: [finalAnswer],
      },
      { type: "single", key: "assistant-final", message: finalAnswer },
    ]);
  });

  it("does not coalesce assistant rows that carry tool_calls", () => {
    const tool1 = { id: "tool-1", role: "tool", toolName: "readFile" };
    const stub = {
      id: "assistant-stub",
      role: "assistant",
      content: "",
      tool_calls: [{ id: "tc1" }],
    };
    const tool2 = { id: "tool-2", role: "tool", toolName: "searchFiles" };

    expect(
      groupConsecutiveToolEntries([
        { type: "single", key: "tool-1", message: tool1 },
        { type: "single", key: "assistant-stub", message: stub },
        { type: "single", key: "tool-2", message: tool2 },
      ])
    ).toEqual([
      {
        type: "tool-group",
        key: "tool-group-tool-1",
        messages: [tool1],
      },
      { type: "single", key: "assistant-stub", message: stub },
      {
        type: "tool-group",
        key: "tool-group-tool-2",
        messages: [tool2],
      },
    ]);
  });

  it("starts a new stable group when tools append after narration", () => {
    const tool1 = { id: "tool-1", role: "tool", toolName: "readFile" };
    const bridge = { id: "a1", role: "assistant", content: "继续。" };
    const tool2 = { id: "tool-2", role: "tool", toolName: "searchFiles" };

    const first = groupConsecutiveToolEntries([
      { type: "single", key: "tool-1", message: tool1 },
      { type: "single", key: "a1", message: bridge },
    ]);
    const second = groupConsecutiveToolEntries([
      { type: "single", key: "tool-1", message: tool1 },
      { type: "single", key: "a1", message: bridge },
      { type: "single", key: "tool-2", message: tool2 },
    ]);

    expect(first[0]).toMatchObject({
      type: "tool-group",
      key: "tool-group-tool-1",
    });
    expect(second[0]).toMatchObject({
      type: "tool-group",
      key: "tool-group-tool-1",
    });
    expect(second[1]).toEqual({
      type: "single",
      key: "a1",
      message: bridge,
    });
    expect(second[2]).toMatchObject({
      type: "tool-group",
      key: "tool-group-tool-2",
    });
    expect((second[0] as { messages: unknown[] }).messages).toHaveLength(1);
    expect((second[2] as { messages: unknown[] }).messages).toHaveLength(1);
  });

  it("keeps ask_user as a single entry (not folded into a tool-group)", () => {
    // ask_user 必须走 ToolMessageItem 的 AskChoicePanelWeb 渲染；
    // 折进 tool-group 会退化为 ToolMessageContent 的 JSON dump，交互卡片丢失。
    const assistant = {
      id: "assistant-1",
      role: "assistant",
      tool_calls: [
        { id: "call-ask", type: "function", function: { name: "ask_user", arguments: "{}" } },
      ],
    };
    const askChoiceTool = {
      id: "tool-ask",
      role: "tool",
      toolName: "ask_user",
      toolCallId: "call-ask",
      content: JSON.stringify({ type: "ask_user", question: "q", choices: [{ id: "a", label: "A" }] }),
    };
    const result = groupConsecutiveToolEntries([
      { type: "single", key: "assistant-1", message: assistant },
      { type: "single", key: "tool-ask", message: askChoiceTool },
    ]);

    expect(result.some((e) => e.type === "tool-group")).toBe(false);
    const single = result.find(
      (e) => e.type === "single" && e.message?.role === "tool",
    ) as { type: "single"; key: string; message: any } | undefined;
    expect(single).toBeDefined();
    expect(single?.message.toolName).toBe("ask_user");
  });

  it("does not fold a preceding tool batch together with a following ask_user", () => {
    const assistant = {
      id: "assistant-1",
      role: "assistant",
      tool_calls: [
        { id: "call-rf", type: "function", function: { name: "readFile", arguments: "{}" } },
        { id: "call-ask", type: "function", function: { name: "ask_user", arguments: "{}" } },
      ],
    };
    const readFileTool = { id: "tool-rf", role: "tool", toolName: "readFile", toolCallId: "call-rf", content: "{}" };
    const askChoiceTool = {
      id: "tool-ask",
      role: "tool",
      toolName: "ask_user",
      toolCallId: "call-ask",
      content: JSON.stringify({ type: "ask_user", question: "q", choices: [{ id: "a", label: "A" }] }),
    };
    const result = groupConsecutiveToolEntries([
      { type: "single", key: "assistant-1", message: assistant },
      { type: "single", key: "tool-rf", message: readFileTool },
      { type: "single", key: "tool-ask", message: askChoiceTool },
    ]);

    const groups = result.filter((e) => e.type === "tool-group");
    expect(groups).toHaveLength(1);
    expect((groups[0] as { messages: any[] }).messages).toHaveLength(1);
    expect((groups[0] as { messages: any[] }).messages[0].toolName).toBe("readFile");

    const askSingle = result.find(
      (e) => e.type === "single" && e.message?.toolName === "ask_user",
    );
    expect(askSingle).toBeDefined();
  });

  it("keeps runStreamingAgent as a single entry (handoff card must not degrade to JSON dump)", () => {
    // runStreamingAgent 在 ToolMessageItem 有独立 handoff 卡片（含"打开子对话"链接），
    // ToolMessageContent.RENDERERS 无此条目，折进 group 会丢失跳转能力。
    const assistant = {
      id: "assistant-1",
      role: "assistant",
      tool_calls: [
        { id: "call-handoff", type: "function", function: { name: "runStreamingAgent", arguments: "{}" } },
      ],
    };
    const handoffTool = {
      id: "tool-handoff",
      role: "tool",
      toolName: "runStreamingAgent",
      toolCallId: "call-handoff",
      content: JSON.stringify({ targetDialogKey: "dialog-x" }),
    };
    const result = groupConsecutiveToolEntries([
      { type: "single", key: "assistant-1", message: assistant },
      { type: "single", key: "tool-handoff", message: handoffTool },
    ]);

    expect(result.some((e) => e.type === "tool-group")).toBe(false);
    const single = result.find(
      (e) => e.type === "single" && e.message?.role === "tool",
    ) as { type: "single"; message: any } | undefined;
    expect(single).toBeDefined();
    expect(single?.message.toolName).toBe("runStreamingAgent");
  });
});