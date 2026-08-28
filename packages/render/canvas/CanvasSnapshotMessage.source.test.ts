import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "CanvasSnapshotMessage.tsx"),
  "utf-8"
);

describe("CanvasSnapshotMessage source contract", () => {
  it("reveals parsed canvas events progressively instead of applying the whole final tree at once", () => {
    expect(source).toContain("visibleEventCount");
    expect(source).toContain("window.setInterval");
    expect(source).toContain(".slice(0, visibleEventCount)");
    expect(source).toContain("createCanvasDocument(\"root\")");
    expect(source).toContain("正在生成画布");
  });

  it("renders message canvases as interactive output without an editing mode", () => {
    expect(source).not.toContain('useState<"preview" | "edit">("preview")');
    expect(source).not.toContain('mode === "edit"');
    expect(source).not.toContain("onSelectNode=");
    expect(source).not.toContain("getCanvasNodeSelectionPayload");
    expect(source).not.toContain("publishCanvasEditSelection");
    expect(source).not.toContain("浏览");
    expect(source).not.toContain("编辑");
    expect(source).not.toContain("canvas-message__mode");
  });

  it("renders the canvas tree directly so buttons stay interactive", () => {
    expect(source).toContain("<CanvasRenderer node={document.root} />");
  });

  it("routes update-only edit replies back to the selected source canvas", () => {
    expect(source).toContain("isPatchOnlyMessage");
    expect(source).toContain("consumePendingCanvasEditSelection");
    expect(source).toContain("publishCanvasMessagePatch");
    expect(source).toContain("subscribeCanvasMessagePatches");
    expect(source).toContain("已应用到原画布");
  });

  it("does not expose canvas paths or selected-node editing labels in message replies", () => {
    expect(source).not.toContain("正在编辑");
    expect(source).not.toContain("selectedPayload");
    expect(source).not.toContain("selectedPayload.path.join");
  });
});
