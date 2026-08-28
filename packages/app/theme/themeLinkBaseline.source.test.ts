import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const themeUi = readFileSync(join(import.meta.dir, "theme-ui.css"), "utf-8");
const agentBlock = readFileSync(
  join(import.meta.dir, "../../ai/agent/web/AgentBlock.css"),
  "utf-8",
);

describe("global link baseline (UI vs prose)", () => {
  it("does not force hover underline on all anchors (breaks card/nav <a>)", () => {
    // Historical bug: bare `a:hover { text-decoration: underline }` underlines
    // whole Agent plaza cards on home because .agent is a real <a>.
    expect(themeUi).toContain("text-decoration: none");
    // Isolate the element-level `a:hover { ... }` block (not `.prose a:hover`).
    const bareAHoverBlocks = [
      ...themeUi.matchAll(/(?:^|\n)\s*a:hover\s*\{[^}]*\}/g),
    ].map((m) => m[0]);
    expect(bareAHoverBlocks.length).toBeGreaterThan(0);
    for (const block of bareAHoverBlocks) {
      expect(block).not.toContain("text-decoration: underline");
    }
  });

  it("opts prose containers into hover underline instead", () => {
    expect(themeUi).toContain(".prose a:hover");
    expect(themeUi).toContain(".markdown-body a:hover");
  });

  it("hardens Agent card root against link decoration on hover", () => {
    expect(agentBlock).toContain(".agent:hover");
    expect(agentBlock).toContain("text-decoration: none");
    expect(agentBlock).toContain("color: inherit");
  });
});
