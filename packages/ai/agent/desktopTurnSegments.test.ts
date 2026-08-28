import { describe, expect, it } from "bun:test";
import {
  attachToolCallIdToSegment,
  buildMinimalToolCallsFromIds,
  type DesktopAssistantSegment,
  resolveSegmentToolCalls,
  selectPersistableFinalizedSegments,
} from "./desktopTurnSegments";

// Local helper to build a segment literal (replaces the deleted
// mkSegment factory — kept out of production per YAGNI).
const mkSegment = (
  key: string,
  messageId: string,
  content = "",
  finalized = false,
  toolCallIds: string[] = []
): DesktopAssistantSegment => ({ key, messageId, content, finalized, toolCallIds });

describe("desktopTurnSegments pure helpers", () => {
  it("attaches callId to the last segment in list", () => {
    const segments: DesktopAssistantSegment[] = [
      mkSegment("k1", "m1", "hello", false),
    ];
    attachToolCallIdToSegment(segments, "call_01");
    expect(segments[0].toolCallIds).toEqual(["call_01"]);

    attachToolCallIdToSegment(segments, "call_02");
    expect(segments[0].toolCallIds).toEqual(["call_01", "call_02"]);
  });

  it("resolves tool call objects by id in requested order while skipping missing ones", () => {
    const turnMessages = [
      {
        role: "assistant",
        tool_calls: [
          { id: "call_01", type: "function", function: { name: "readFile", arguments: "{}" } },
          { id: "call_02", type: "function", function: { name: "writeFile", arguments: "{}" } },
        ],
      },
      {
        role: "assistant",
        tool_calls: [
          { id: "call_03", type: "function", function: { name: "execShell", arguments: "{}" } },
        ],
      },
    ];

    const resolved = resolveSegmentToolCalls(["call_02", "call_999", "call_01"], turnMessages);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].id).toBe("call_02");
    expect(resolved[1].id).toBe("call_01");
  });

  it("selects earlier finalized segments with content OR toolCallIds", () => {
    const segments: DesktopAssistantSegment[] = [
      mkSegment("k1", "m1", "Text segment", true, []),
      mkSegment("k2", "m2", "", true, ["call_01"]),
      mkSegment("k3", "m3", "", true, []), // empty & no tool calls -> skip
      mkSegment("k4", "m4", "Unfinalized active segment", false, []),
    ];

    const persistable = selectPersistableFinalizedSegments(segments);
    expect(persistable.map((s) => s.messageId)).toEqual(["m1", "m2"]);
  });
});

describe("desktop turn segments turn scenarios", () => {
  it("scenario 1: text -> 3 tools -> text (tool_calls attach to earlier segment, last segment is empty)", () => {
    const segments: DesktopAssistantSegment[] = [];
    const desktopTurnMessages = [
      {
        role: "assistant",
        tool_calls: [
          { id: "call_01", type: "function", function: { name: "t1" } },
          { id: "call_02", type: "function", function: { name: "t2" } },
          { id: "call_03", type: "function", function: { name: "t3" } },
        ],
      },
    ];

    // Helper simulating stream execution
    let currentContent = "";
    let assistantMessageKeys: { key: string; messageId: string } | null = null;
    let nextId = 1;

    const ensureAssistantMessageKeys = () => {
      if (!assistantMessageKeys) {
        const idStr = `m${nextId++}`;
        assistantMessageKeys = { key: `k_${idStr}`, messageId: idStr };
        segments.push(mkSegment(assistantMessageKeys.key, assistantMessageKeys.messageId, "", false));
      }
      return assistantMessageKeys;
    };

    const finalizeSegment = () => {
      const seg = segments[segments.length - 1];
      if (seg) {
        seg.content = currentContent;
        seg.finalized = true;
      }
      assistantMessageKeys = null;
      currentContent = "";
    };

    // 1. First text delta
    ensureAssistantMessageKeys();
    currentContent += "先让我了解一下项目";

    // 2. 3 tool calls arrive
    for (const callId of ["call_01", "call_02", "call_03"]) {
      ensureAssistantMessageKeys();
      attachToolCallIdToSegment(segments, callId);
      finalizeSegment();
    }

    // 3. Final text delta after tools
    ensureAssistantMessageKeys();
    currentContent += "基于已有信息...";
    const lastSeg = segments[segments.length - 1];
    lastSeg.content = currentContent;

    // Earlier finalized segments selection
    const earlierPersistable = selectPersistableFinalizedSegments(segments);
    expect(earlierPersistable).toHaveLength(3);

    const allResolvedTools = earlierPersistable.flatMap((seg) =>
      resolveSegmentToolCalls(seg.toolCallIds, desktopTurnMessages)
    );
    expect(allResolvedTools.map((t) => t.id)).toEqual(["call_01", "call_02", "call_03"]);

    // Key regression assertion: last segment must NOT have tool_calls!
    const lastSegmentResolvedTools = resolveSegmentToolCalls(
      lastSeg.toolCallIds,
      desktopTurnMessages
    );
    expect(lastSegmentResolvedTools).toEqual([]);
  });

  it("scenario 2: tool call right away with no preceding text (creates empty text segment with tool_calls)", () => {
    const segments: DesktopAssistantSegment[] = [];
    const desktopTurnMessages = [
      {
        role: "assistant",
        tool_calls: [{ id: "call_01", type: "function", function: { name: "t1" } }],
      },
    ];

    let currentContent = "";
    let assistantMessageKeys: { key: string; messageId: string } | null = null;

    const ensureAssistantMessageKeys = () => {
      if (!assistantMessageKeys) {
        assistantMessageKeys = { key: "k_m1", messageId: "m1" };
        segments.push(mkSegment(assistantMessageKeys.key, assistantMessageKeys.messageId, "", false));
      }
      return assistantMessageKeys;
    };

    const finalizeSegment = () => {
      const seg = segments[segments.length - 1];
      if (seg) {
        seg.content = currentContent;
        seg.finalized = true;
      }
      assistantMessageKeys = null;
      currentContent = "";
    };

    // Tool call right away
    ensureAssistantMessageKeys();
    attachToolCallIdToSegment(segments, "call_01");
    finalizeSegment();

    // Verify selectPersistableFinalizedSegments includes this empty content segment because it has toolCallIds
    const persistable = selectPersistableFinalizedSegments(segments);
    expect(persistable).toHaveLength(1);
    expect(persistable[0].content).toBe("");
    expect(persistable[0].toolCallIds).toEqual(["call_01"]);

    const resolved = resolveSegmentToolCalls(persistable[0].toolCallIds, desktopTurnMessages);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe("call_01");
  });

  it("scenario 3: multi-turn tools (text -> tool -> text -> tool -> text)", () => {
    const segments: DesktopAssistantSegment[] = [
      mkSegment("k1", "m1", "Step 1", true, ["call_01"]),
      mkSegment("k2", "m2", "Step 2", true, ["call_02"]),
      mkSegment("k3", "m3", "Step 3 final", false, []),
    ];

    const desktopTurnMessages = [
      { role: "assistant", tool_calls: [{ id: "call_01" }] },
      { role: "assistant", tool_calls: [{ id: "call_02" }] },
    ];

    const persistable = selectPersistableFinalizedSegments(segments);
    expect(persistable).toHaveLength(2);

    expect(resolveSegmentToolCalls(persistable[0].toolCallIds, desktopTurnMessages)[0].id).toBe("call_01");
    expect(resolveSegmentToolCalls(persistable[1].toolCallIds, desktopTurnMessages)[0].id).toBe("call_02");

    const lastSeg = segments[2];
    expect(resolveSegmentToolCalls(lastSeg.toolCallIds, desktopTurnMessages)).toEqual([]);
  });

  it("scenario 4: turn without any tool calls", () => {
    const segments: DesktopAssistantSegment[] = [
      mkSegment("k1", "m1", "Just text", false, []),
    ];

    const desktopTurnMessages = [{ role: "assistant", content: "Just text" }];

    const lastSeg = segments[0];
    expect(resolveSegmentToolCalls(lastSeg.toolCallIds, desktopTurnMessages)).toEqual([]);
  });

  // stop / error 路径拿不到 streamResult.turnMessages（流在 done 之前就断了），
  // 只能用已知 callId + toolName 组最小合法 tool_call。这些用例锁住降级路径。
  describe("buildMinimalToolCallsFromIds (stop/error degraded path)", () => {
    it("builds legal tool_call objects from callIds and the toolName map", () => {
      const names = new Map([
        ["call_01", "readFile"],
        ["call_02", "execShell"],
      ]);
      expect(buildMinimalToolCallsFromIds(["call_01", "call_02"], names)).toEqual([
        { id: "call_01", type: "function", function: { name: "readFile", arguments: "{}" } },
        { id: "call_02", type: "function", function: { name: "execShell", arguments: "{}" } },
      ]);
    });

    it("emits arguments as valid JSON, not an empty string", () => {
      // function.arguments 在 OpenAI schema 里是 JSON 字符串；"" 解析不了，
      // 下一轮把这段历史发回 provider 会被拒或被误读。
      const built = buildMinimalToolCallsFromIds(["call_01"], new Map([["call_01", "readFile"]]));
      expect(built[0].function.arguments).toBe("{}");
      expect(() => JSON.parse(built[0].function.arguments)).not.toThrow();
    });

    it("skips callIds whose tool row is not being persisted", () => {
      // 调用方只把「确实会落库的 tool 行」放进 map。声明一个结果行已被丢弃的
      // callId，就会造出悬空 tool_calls——正是本路径要避免的问题的反面。
      const built = buildMinimalToolCallsFromIds(
        ["call_kept", "call_dropped"],
        new Map([["call_kept", "readFile"]]),
      );
      expect(built.map((t) => t.id)).toEqual(["call_kept"]);
    });

    it("preserves the order of toolCallIds", () => {
      const names = new Map([["a", "t1"], ["b", "t2"], ["c", "t3"]]);
      expect(buildMinimalToolCallsFromIds(["c", "a", "b"], names).map((t) => t.id)).toEqual([
        "c",
        "a",
        "b",
      ]);
    });

    it("returns an empty array for empty/undefined ids", () => {
      expect(buildMinimalToolCallsFromIds([], new Map())).toEqual([]);
      expect(buildMinimalToolCallsFromIds(undefined, new Map())).toEqual([]);
    });
  });
});
