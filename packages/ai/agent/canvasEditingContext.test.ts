import { describe, expect, it } from "bun:test";
import { buildCanvasNodeEditingContextSummary } from "./canvasEditingContext";

describe("buildCanvasNodeEditingContextSummary", () => {
  it("builds a dependency-light canvas node editing context", () => {
    const summary = buildCanvasNodeEditingContextSummary({
      editingTarget: {
        kind: "canvas_node",
        key: "metric-csat",
        title: "metric-csat",
        metadata: {
          selectedNodeId: "metric-csat",
          part: "metric-csat",
          path: ["root", "shell", "metric-grid", "metric-csat"],
          type: "MetricCard",
          props: { title: "客户满意度", value: "94.2%" },
          style: {},
        },
      },
    });

    expect(summary).toContain("当前编辑目标：Canvas Tree 中的一个选中节点");
    expect(summary).toContain("节点 ID: metric-csat");
    expect(summary).toContain("节点路径: root > shell > metric-grid > metric-csat");
    expect(summary).toContain("只输出 updateNode");
  });
});
