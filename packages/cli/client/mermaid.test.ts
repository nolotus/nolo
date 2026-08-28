import { describe, expect, test } from "bun:test";
import { parseMermaid, renderMermaid, renderMermaidBlock } from "./mermaid";

const DARK = "dark" as const;
const NO_COLOR = false;

describe("parseMermaid", () => {
  test("parses node declarations with labels and shapes", () => {
    const flow = parseMermaid(`
      A["开始"]
      B{是否完成?}
      C([结束])
    `);
    expect(flow.nodes.get("A")?.label).toBe("开始");
    expect(flow.nodes.get("A")?.shape).toBe("rect");
    expect(flow.nodes.get("B")?.shape).toBe("diamond");
    expect(flow.nodes.get("C")?.shape).toBe("stadium");
  });

  test("parses simple, labeled and text edges", () => {
    const flow = parseMermaid(`
      A --> B
      B -->|是| C
      C -- 处理中 --> D
    `);
    expect(flow.edges).toEqual([
      { from: "A", to: "B" },
      { from: "B", to: "C", label: "是" },
      { from: "C", to: "D", label: "处理中" },
    ]);
  });

  test("parses node-with-edge on one line", () => {
    const flow = parseMermaid(`A["开始"] --> B["下一步"]`);
    expect(flow.nodes.get("A")?.label).toBe("开始");
    expect(flow.nodes.get("B")?.label).toBe("下一步");
    expect(flow.edges).toEqual([{ from: "A", to: "B" }]);
  });

  test("ignores graph header and %% comments", () => {
    const flow = parseMermaid(`
      %% a comment
      flowchart TD
      A --> B
    `);
    expect([...flow.nodes.keys()]).toEqual(["A", "B"]);
  });

  test("keeps unparseable lines in skipped", () => {
    const flow = parseMermaid(`A --> B\nclassDef x fill:#f00;`);
    expect(flow.skipped.length).toBeGreaterThan(0);
    // nodes still include the edge endpoints
    expect(flow.nodes.has("A")).toBe(true);
    expect(flow.nodes.has("B")).toBe(true);
  });
});

describe("renderMermaid", () => {
  test("renders a straight chain with boxes and arrows", () => {
    const flow = parseMermaid(`A --> B --> C`);
    const out = renderMermaid(flow, DARK, NO_COLOR);
    expect(out).toContain("[");
    expect(out).toContain("│");
    expect(out).toContain("▼");
    // Boxes in declaration order
    expect(out.indexOf("A")).toBeLessThan(out.indexOf("B"));
    expect(out.indexOf("B")).toBeLessThan(out.indexOf("C"));
  });

  test("renders branch with diamond node", () => {
    const flow = parseMermaid(`
      A --> B
      B{是?} --> C
      B{是?} --> D
    `);
    const out = renderMermaid(flow, DARK, NO_COLOR);
    // diamond corners
    expect(out).toContain("<");
    expect(out).toContain("是?");
  });

  test("empty diagram returns placeholder", () => {
    const out = renderMermaid({ nodes: new Map(), edges: [], skipped: [] }, DARK, NO_COLOR);
    expect(out).toContain("empty mermaid diagram");
  });
});

describe("renderMermaidBlock", () => {
  test("renders a mermaid code body into a diagram", () => {
    const body = `graph TD
A["开始"] --> B["处理"]
B --> C["结束"]`;
    const out = renderMermaidBlock(body, DARK, NO_COLOR);
    expect(out).toContain("开始");
    expect(out).toContain("结束");
    expect(out).toContain("▼");
    expect(out).toContain("▼");
  });

  test("falls back to raw source when nothing parses", () => {
    const body = `sequenceDiagram\nA->>B: hi`;
    expect(renderMermaidBlock(body, DARK, NO_COLOR)).toBe(body);
  });
});

describe("regression (review findings)", () => {
  test("chain with node shapes parses every hop", () => {
    const flow = parseMermaid(`A["开始"] --> B["中间"] --> C(["结束"])`);
    expect(flow.nodes.get("A")?.label).toBe("开始");
    expect(flow.nodes.get("B")?.label).toBe("中间");
    expect(flow.nodes.get("C")?.label).toBe("结束");
    expect(flow.edges).toEqual([
      { from: "A", to: "B" },
      { from: "B", to: "C" },
    ]);
  });

  test("cyclic diagram renders without hanging or dropping", () => {
    const flow = parseMermaid(`A --> B --> C --> A`);
    const out = renderMermaid(flow, DARK, NO_COLOR);
    // Cycle: all three nodes present, render completes with boxes.
    expect(flow.nodes.size).toBe(3);
    expect(out).toContain("A");
    expect(out).toContain("B");
    expect(out).toContain("C");
  });
});

describe("regression (claude review: unspaced arrows)", () => {
  test("unspaced chained arrows A-->B-->C", () => {
    const flow = parseMermaid(`A-->B-->C`);
    expect(flow.nodes.size).toBe(3);
    expect(flow.edges).toEqual([
      { from: "A", to: "B" },
      { from: "B", to: "C" },
    ]);
  });

  test("unspaced arrows with shaped nodes A[x]-->B[y]", () => {
    const flow = parseMermaid(`A[开始]-->B[处理]`);
    expect(flow.nodes.get("A")?.label).toBe("开始");
    expect(flow.nodes.get("B")?.label).toBe("处理");
    expect(flow.edges).toEqual([{ from: "A", to: "B" }]);
  });

  test("chained shaped nodes A --> B([x]) --> C([y])", () => {
    const flow = parseMermaid(`A --> B([x]) --> C([y])`);
    expect(flow.nodes.get("B")?.label).toBe("x");
    expect(flow.nodes.get("C")?.label).toBe("y");
    expect(flow.edges).toEqual([
      { from: "A", to: "B" },
      { from: "B", to: "C" },
    ]);
  });

  test("node id with hyphen still parses", () => {
    const flow = parseMermaid(`my-node --> B`);
    expect(flow.nodes.has("my-node")).toBe(true);
    expect(flow.nodes.has("B")).toBe(true);
    expect(flow.edges).toEqual([{ from: "my-node", to: "B" }]);
  });
});

describe("regression (claude round-2: transactional + arrow normalization)", () => {
  test("failed line leaks no partial nodes (sequenceDiagram fallback)", () => {
    const flow = parseMermaid(`sequenceDiagram\nA->>B: hi`);
    expect(flow.nodes.size).toBe(0);
    expect(flow.skipped).toContain("A->>B: hi");
  });

  test("long arrows A---->B normalize to A-->B", () => {
    const f = parseMermaid(`A---->B`);
    expect(f.edges).toEqual([{ from: "A", to: "B" }]);
    expect(f.nodes.size).toBe(2);
  });

  test("text edge without surrounding spaces A--yes-->B", () => {
    const f = parseMermaid(`A--yes-->B`);
    expect(f.edges).toEqual([{ from: "A", to: "B", label: "yes" }]);
  });
});

describe("regression (claude round-3: label masking)", () => {
  test("dash inside node label is not mistaken for an edge", () => {
    const flow = parseMermaid(`A["run --force"] --> B["ok"]`);
    expect(flow.nodes.get("A")?.label).toBe("run --force");
    expect(flow.nodes.get("B")?.label).toBe("ok");
    expect(flow.edges).toEqual([{ from: "A", to: "B" }]);
  });

  test("text edge label with spaces A -- yes --> B", () => {
    const flow = parseMermaid(`A -- yes --> B`);
    expect(flow.edges).toEqual([{ from: "A", to: "B", label: "yes" }]);
  });

  test("pipe edge label A -->|label| B", () => {
    const flow = parseMermaid(`A -->|label|B`);
    expect(flow.edges).toEqual([{ from: "A", to: "B", label: "label" }]);
  });
});

describe("regression (claude round-4: optimizations)", () => {
  test("semicolon-separated statements A-->B; B-->C;", () => {
    const flow = parseMermaid(`A-->B; B-->C;`);
    expect(flow.edges).toEqual([
      { from: "A", to: "B" },
      { from: "B", to: "C" },
    ]);
    expect(flow.nodes.size).toBe(3);
  });

  test("dotted edge A-.->B", () => {
    const flow = parseMermaid(`A-.->B`);
    expect(flow.edges).toEqual([{ from: "A", to: "B" }]);
  });

  test("thick edge A==>B", () => {
    const flow = parseMermaid(`A==>B`);
    expect(flow.edges).toEqual([{ from: "A", to: "B" }]);
  });

  test("text edge label with a dash A -- non-blocking --> B", () => {
    const flow = parseMermaid(`A -- non-blocking --> B`);
    expect(flow.edges).toEqual([{ from: "A", to: "B", label: "non-blocking" }]);
  });
});

describe("regression (round-5: text-edge semicolon masking)", () => {
  test("semicolon inside text-edge label is preserved, not split", () => {
    const flow = parseMermaid(`A -- a;b --> B`);
    expect(flow.edges).toEqual([{ from: "A", to: "B", label: "a;b" }]);
    expect(flow.nodes.size).toBe(2);
    expect(flow.skipped).toEqual([]);
  });
});
