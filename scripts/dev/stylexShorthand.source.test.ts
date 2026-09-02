import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { discoverStylexFiles, scanStylexShorthandSpans } from "./scanStylexShorthandSpans";

describe("StyleX shorthand guard", () => {
  it("turns red for the known silent-drop family", () => {
    expect(scanStylexShorthandSpans(`const s = stylex.create({ root: { background: "red" } });`)).toEqual([
      { property: "background", line: 1, span: 'background: "red"' },
    ]);
  });
  it("does not flag verified surviving properties", () => {
    expect(scanStylexShorthandSpans(`const s = stylex.create({ root: { backgroundColor: "red", margin: 1 } });`)).toEqual([]);
  });
  it("does not flag real border longhands (logical set pinned exactly)", () => {
    expect(scanStylexShorthandSpans(`const s = stylex.create({ root: { borderBlockStartWidth: "1px", borderInlineColor: "red", borderTopWidth: "2px" } });`)).toEqual([]);
  });
  it("keeps the repo free of silent-drop shorthands (pinned baseline: zero)", () => {
    const root = process.cwd();
    const hits = discoverStylexFiles(root).flatMap((file) =>
      scanStylexShorthandSpans(readFileSync(join(root, file), "utf8")).map((h) => ({ file, ...h })),
    );
    expect(hits).toEqual([]);
  });
});
