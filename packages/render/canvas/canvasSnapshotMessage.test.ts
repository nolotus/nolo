import { describe, expect, it } from "bun:test";
import {
  extractCanvasSnapshotText,
  parseCanvasSnapshotMessage,
} from "./canvasSnapshotParser";

describe("canvas snapshot message parser", () => {
  it("builds a canvas document from assistant NDJSON snapshot lines", () => {
    const parsed = parseCanvasSnapshotMessage([
      JSON.stringify({
        type: "canvas_snapshot",
        event: {
          type: "appendNode",
          parentId: "root",
          node: {
            id: "shell",
            type: "Stack",
            props: { part: "shell" },
          },
        },
      }),
      JSON.stringify({
        type: "canvas_snapshot",
        event: {
          type: "appendNode",
          parentId: "shell",
          node: {
            id: "metric-csat",
            type: "MetricCard",
            props: { part: "metric-csat", title: "客户满意度", value: "92%" },
          },
        },
      }),
    ].join("\n"));

    expect(parsed?.document.root.children?.[0]?.id).toBe("shell");
    expect(parsed?.document.root.children?.[0]?.children?.[0]?.props?.title).toBe("客户满意度");
    expect(parsed?.eventCount).toBe(2);
    expect(parsed?.events.map((event) => event.type)).toEqual(["appendNode", "appendNode"]);
  });

  it("ignores incomplete streaming lines and non-canvas text", () => {
    const parsed = parseCanvasSnapshotMessage([
      JSON.stringify({
        type: "canvas_snapshot",
        event: {
          type: "appendNode",
          parentId: "root",
          node: { id: "shell", type: "Stack", props: { part: "shell" } },
        },
      }),
      "{\"type\":\"canvas_snapshot\",\"event\":",
      "普通解释文本",
    ].join("\n"));

    expect(parsed?.eventCount).toBe(1);
    expect(parsed?.document.root.children?.[0]?.id).toBe("shell");
  });

  it("returns null when a message has no canvas snapshot events", () => {
    expect(parseCanvasSnapshotMessage("帮我做一个日报")).toBeNull();
  });

  it("extracts canvas snapshot text from structured assistant text content", () => {
    const line = JSON.stringify({
      type: "canvas_snapshot",
      event: {
        type: "appendNode",
        parentId: "root",
        node: { id: "shell", type: "Stack", props: { part: "shell" } },
      },
    });

    expect(extractCanvasSnapshotText([{ type: "text", text: line }])).toBe(line);
    expect(extractCanvasSnapshotText([{ type: "text", text: "普通消息" }])).toBeNull();
  });

  it("drops unsupported protocol fields before applying canvas events", () => {
    const parsed = parseCanvasSnapshotMessage([
      JSON.stringify({
        type: "canvas_snapshot",
        event: {
          type: "appendNode",
          parentId: "root",
          node: {
            id: "bad",
            type: "Script",
            props: { title: "不应该出现" },
          },
        },
      }),
      JSON.stringify({
        type: "canvas_snapshot",
        event: {
          type: "appendNode",
          parentId: "root",
          node: {
            id: "safe-card",
            type: "Card",
            props: {
              part: "safe-card",
              title: "安全卡片",
              onClick: "alert(1)",
            },
            style: {
              color: "#111827",
              position: "fixed",
              backgroundImage: "url(https://example.com/x.png)",
            },
          },
        },
      }),
    ].join("\n"));

    expect(parsed?.eventCount).toBe(1);
    expect(parsed?.document.root.children?.[0]).toEqual({
      id: "safe-card",
      type: "Card",
      props: {
        part: "safe-card",
        title: "安全卡片",
      },
      style: {
        color: "#111827",
      },
    });
  });

  it("ignores malformed update events without failing the stream", () => {
    const parsed = parseCanvasSnapshotMessage([
      JSON.stringify({
        type: "canvas_snapshot",
        event: {
          type: "appendNode",
          parentId: "root",
          node: {
            id: "safe-card",
            type: "Card",
            props: { title: "安全卡片" },
          },
        },
      }),
      JSON.stringify({
        type: "canvas_snapshot",
        event: {
          type: "updateNode",
          id: "safe-card",
        },
      }),
    ].join("\n"));

    expect(parsed?.eventCount).toBe(1);
    expect(parsed?.document.root.children?.[0]?.props?.title).toBe("安全卡片");
  });

  it("keeps table columns and row arrays for report canvases", () => {
    const parsed = parseCanvasSnapshotMessage(JSON.stringify({
      type: "canvas_snapshot",
      event: {
        type: "appendNode",
        parentId: "root",
        node: {
          id: "risk-table",
          type: "Table",
          props: {
            part: "risk-table",
            title: "风险会话明细",
            columns: ["会话", "问题", "状态"],
            rows: [
              ["#948302", "多次答非所问", "已转人工"],
              ["#948315", "敏感词拦截", "待复核"],
            ],
          },
        },
      },
    }));

    expect(parsed?.document.root.children?.[0]?.props).toEqual({
      part: "risk-table",
      title: "风险会话明细",
      columns: ["会话", "问题", "状态"],
      rows: [
        ["#948302", "多次答非所问", "已转人工"],
        ["#948315", "敏感词拦截", "待复核"],
      ],
    });
  });
});
