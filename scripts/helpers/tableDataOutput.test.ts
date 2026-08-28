import { describe, expect, test } from "bun:test";

import { formatTableDataOutput, parseTableDataOutputMode } from "./tableDataOutput";

const result = {
  total: 2,
  limit: 2,
  offset: 0,
  items: [
    { rowId: "row-1", title: "First" },
    { rowId: "row-2", title: "Second" },
  ],
};

describe("tableDataOutput", () => {
  test("defaults to full envelope output", () => {
    expect(parseTableDataOutputMode(undefined)).toBe("full");
    const output = formatTableDataOutput({
      envelope: { ok: true, result },
      result,
      mode: "full",
    });
    expect(output).toContain('"ok": true');
    expect(output).toContain('"result"');
  });

  test("prints raw API result without script envelope", () => {
    const output = formatTableDataOutput({
      envelope: { ok: true, result },
      result,
      mode: "raw",
    });
    expect(output).toContain('"total": 2');
    expect(output).not.toContain('"ok": true');
  });

  test("accepts json as a raw-output alias", () => {
    expect(parseTableDataOutputMode("json")).toBe("raw");
  });

  test("prints only query items", () => {
    const output = formatTableDataOutput({
      envelope: { ok: true, result },
      result,
      mode: "items",
    });
    expect(JSON.parse(output)).toEqual(result.items);
  });

  test("prints query items as jsonl", () => {
    const output = formatTableDataOutput({
      envelope: { ok: true, result },
      result,
      mode: "jsonl",
    });
    expect(output.split("\n")).toEqual([
      JSON.stringify(result.items[0]),
      JSON.stringify(result.items[1]),
    ]);
  });

  test("rejects unknown output modes", () => {
    expect(() => parseTableDataOutputMode("xml")).toThrow("--output");
  });
});
