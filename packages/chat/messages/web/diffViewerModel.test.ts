import { describe, expect, test } from "bun:test";
import { buildDiffRows } from "./diffViewerModel";

describe("buildDiffRows", () => {
  test("assigns old and new line numbers for context, removed, and added rows", () => {
    const rows = buildDiffRows([
      { value: "same\n", added: false, removed: false },
      { value: "old\n", removed: true },
      { value: "new\n", added: true },
      { value: "tail\n", added: false, removed: false },
    ]);

    expect(rows).toEqual([
      { id: "0-0", kind: "context", content: "same", oldLine: 1, newLine: 1 },
      { id: "1-0", kind: "removed", content: "old", oldLine: 2, newLine: null },
      { id: "2-0", kind: "added", content: "new", oldLine: null, newLine: 2 },
      { id: "3-0", kind: "context", content: "tail", oldLine: 3, newLine: 3 },
    ]);
  });

  test("ignores the synthetic empty line created by a trailing newline", () => {
    const rows = buildDiffRows([{ value: "one\ntwo\n", added: true }]);

    expect(rows.map((row) => row.content)).toEqual(["one", "two"]);
  });
});
