import { describe, expect, it } from "bun:test";

import { canRenderMermaid } from "./mermaidPreview";

describe("canRenderMermaid", () => {
  it("returns true when parse succeeds", async () => {
    const result = await canRenderMermaid(
      "graph TD\nA-->B",
      async () => true
    );

    expect(result).toBe(true);
  });

  it("returns false when parse rejects", async () => {
    const result = await canRenderMermaid(
      "graph TD\nA-->",
      async () => {
        throw new Error("parse failed");
      }
    );

    expect(result).toBe(false);
  });

  it("returns false for empty content", async () => {
    const result = await canRenderMermaid("   ", async () => true);

    expect(result).toBe(false);
  });
});
