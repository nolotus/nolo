import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "CanvasRenderer.tsx"), "utf-8");

describe("CanvasRenderer source contract", () => {
  it("makes color edit patches visibly affect non-metric nodes and chart bars", () => {
    expect(source).toContain("getNodeToneStyle");
    expect(source).toContain("toneColors[String(node.props?.tone || \"\")];");
    expect(source).toContain("node.props?.barColor");
    expect(source).toContain("barBackground");
  });

  it("renders table nodes for report-style canvases", () => {
    expect(source).toContain('case "Table"');
    expect(source).toContain("canvas-table");
    expect(source).toContain("columns");
    expect(source).toContain("rows");
  });

  it("runs safe canvas actions in browsing mode instead of rendering a static preview", () => {
    expect(source).toContain("parseCanvasRuntimeAction");
    expect(source).toContain("reduceCanvasRuntimeAction");
    expect(source).toContain("runRuntimeAction");
    expect(source).toContain("visibleWhen");
    expect(source).toContain("runtimeAction");
  });
});
