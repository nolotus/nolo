import { describe, expect, it } from "bun:test";
import {
  buildCanvasNodeEditingTarget,
  consumePendingCanvasEditSelection,
  markPendingCanvasEditSelection,
  publishCanvasMessagePatch,
  subscribeCanvasMessagePatches,
  type CanvasEditSelection,
} from "./canvasEditContext";

describe("canvas edit context", () => {
  it("converts a selected canvas node into an agent editing target", () => {
    const selection: CanvasEditSelection = {
      sourceMessageId: "msg-1",
      selectedNodeId: "hero",
      part: "hero",
      path: ["root", "shell", "hero"],
      type: "Section",
      props: { part: "hero", title: "旧标题" },
      style: { color: "#111827" },
    };

    expect(buildCanvasNodeEditingTarget(selection)).toEqual({
      kind: "canvas_node",
      key: "hero",
      title: "hero",
      summary: expect.stringContaining("只输出针对选中节点的 canvas_snapshot updateNode"),
      metadata: {
        sourceMessageId: "msg-1",
        selectedNodeId: "hero",
        part: "hero",
        path: ["root", "shell", "hero"],
        type: "Section",
        props: { part: "hero", title: "旧标题" },
        style: { color: "#111827" },
      },
    });
  });

  it("keeps a pending canvas edit target after the visible selection is cleared", () => {
    const selection: CanvasEditSelection = {
      sourceMessageId: "msg-1",
      selectedNodeId: "metric-csat",
      part: "metric-csat",
      path: ["root", "shell", "metric-csat"],
      type: "MetricCard",
      props: { title: "满意度", value: "94%" },
      style: {},
    };

    markPendingCanvasEditSelection(selection);

    expect(consumePendingCanvasEditSelection()).toEqual(selection);
    expect(consumePendingCanvasEditSelection()).toBeNull();
  });

  it("publishes canvas message patches to the source message", () => {
    const received: unknown[] = [];
    const unsubscribe = subscribeCanvasMessagePatches("msg-1", (events) => {
      received.push(events);
    });

    publishCanvasMessagePatch("msg-1", [
      {
        type: "updateNode",
        id: "metric-csat",
        patch: { style: { backgroundColor: "#dc2626", color: "#ffffff" } },
      },
    ]);

    unsubscribe();

    expect(received).toEqual([
      [
        {
          type: "updateNode",
          id: "metric-csat",
          patch: { style: { backgroundColor: "#dc2626", color: "#ffffff" } },
        },
      ],
    ]);
  });
});
