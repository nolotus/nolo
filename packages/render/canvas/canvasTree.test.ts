import { describe, expect, it } from "bun:test";

import {
  applyCanvasEvent,
  createCanvasDocument,
  findCanvasNodePath,
  getCanvasNodeSelectionPayload,
} from "./canvasTree";
import type { CanvasDocument } from "./types";

describe("canvas tree runtime", () => {
  it("appends nodes under a parent and preserves stable ids", () => {
    let doc = createCanvasDocument("demo-root");

    doc = applyCanvasEvent(doc, {
      type: "appendNode",
      parentId: "demo-root",
      node: {
        id: "shell",
        type: "Stack",
        props: { gap: 16 },
        children: [],
      },
    });

    doc = applyCanvasEvent(doc, {
      type: "appendNode",
      parentId: "shell",
      node: {
        id: "metric-csat",
        type: "MetricCard",
        props: { title: "满意度", value: "94.2%", tone: "success" },
      },
    });

    expect(doc.root.children?.[0]?.id).toBe("shell");
    expect(doc.root.children?.[0]?.children?.[0]?.id).toBe("metric-csat");
  });

  it("updates only the selected node", () => {
    const doc: CanvasDocument = {
      version: 1,
      root: {
        id: "root",
        type: "Canvas",
        children: [
          {
            id: "metric-csat",
            type: "MetricCard",
            props: { title: "满意度", value: "94.2%", tone: "success" },
          },
          {
            id: "metric-risk",
            type: "MetricCard",
            props: { title: "风险会话", value: "18", tone: "danger" },
          },
        ],
      },
      selectedNodeId: "metric-csat",
    };

    const next = applyCanvasEvent(doc, {
      type: "updateNode",
      id: "metric-csat",
      patch: {
        props: { title: "质检通过率", value: "91.8%", tone: "warning" },
      },
    });

    expect(next.root.children?.[0]?.props).toEqual({
      title: "质检通过率",
      value: "91.8%",
      tone: "warning",
    });
    expect(next.root.children?.[1]?.props).toEqual({
      title: "风险会话",
      value: "18",
      tone: "danger",
    });
  });

  it("returns a stable path for a selected node", () => {
    const doc: CanvasDocument = {
      version: 1,
      root: {
        id: "root",
        type: "Canvas",
        children: [
          {
            id: "main",
            type: "Grid",
            children: [
              {
                id: "metric-csat",
                type: "MetricCard",
                props: { title: "满意度" },
              },
            ],
          },
        ],
      },
    };

    expect(findCanvasNodePath(doc.root, "metric-csat")?.map((node) => node.id)).toEqual([
      "root",
      "main",
      "metric-csat",
    ]);
  });

  it("ignores patches for missing nodes", () => {
    const doc = createCanvasDocument("root");
    const next = applyCanvasEvent(doc, {
      type: "updateNode",
      id: "missing",
      patch: { props: { title: "Should not exist" } },
    });

    expect(next).toEqual(doc);
  });

  it("updates an existing node instead of duplicating repeated append events", () => {
    let doc = createCanvasDocument("root");

    doc = applyCanvasEvent(doc, {
      type: "appendNode",
      parentId: "root",
      node: {
        id: "metric-csat",
        type: "MetricCard",
        props: { title: "客户满意度", value: "91%" },
      },
    });

    doc = applyCanvasEvent(doc, {
      type: "appendNode",
      parentId: "root",
      node: {
        id: "metric-csat",
        type: "MetricCard",
        props: { value: "94%" },
      },
    });

    expect(doc.root.children).toHaveLength(1);
    expect(doc.root.children?.[0]?.props).toEqual({
      title: "客户满意度",
      value: "94%",
    });
  });

  it("returns a prompt-ready payload for selected node edits", () => {
    const doc: CanvasDocument = {
      version: 1,
      root: {
        id: "root",
        type: "Canvas",
        children: [
          {
            id: "hero",
            type: "Section",
            props: { part: "hero", title: "旧标题" },
          },
        ],
      },
      selectedNodeId: "hero",
    };

    expect(getCanvasNodeSelectionPayload(doc)).toEqual({
      selectedNodeId: "hero",
      part: "hero",
      path: ["root", "hero"],
      type: "Section",
      props: { part: "hero", title: "旧标题" },
      style: {},
    });
  });

  it("preserves safe button runtime actions from streamed message events", () => {
    let doc = createCanvasDocument("root");

    doc = applyCanvasEvent(doc, {
      type: "appendNode",
      parentId: "root",
      node: {
        id: "next-step",
        type: "Button",
        props: {
          label: "下一步",
          action: { type: "setState", key: "step", value: 2 },
        },
      },
    });

    expect(doc.root.children?.[0]?.props?.action).toEqual({
      type: "setState",
      key: "step",
      value: 2,
    });
  });
});
