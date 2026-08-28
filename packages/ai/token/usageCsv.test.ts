import { describe, expect, test } from "bun:test";
import { buildUsageCsv } from "./usageCsv";
import type { TokenRecord } from "./types";

const RECORD = (over: Partial<TokenRecord> = {}): TokenRecord =>
  ({
    id: "r1",
    model: "deepseek-v4-flash",
    cost: 0.042,
    cybotId: "agent-1",
    input_tokens: 100,
    output_tokens: 50,
    cache_read_input_tokens: 20,
    cache_creation_input_tokens: 5,
    createdAt: Date.UTC(2026, 7, 20, 4, 5, 6), // 2026-08-20T04:05:06Z
    ...over,
  }) as TokenRecord;

describe("buildUsageCsv", () => {
  test("emits BOM + header + one row with UTC parts", () => {
    const csv = buildUsageCsv([RECORD()], { timeZone: "UTC" });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.replace("\uFEFF", "").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      "日期,时间(本地),Robot ID,模型,供应商,Input Tokens,Cache Read,Cache Creation,Output Tokens,费用"
    );
    expect(lines[1]).toContain("2026-08-20");
    expect(lines[1]).toContain("04:05:06");
    expect(lines[1]).toContain("deepseek-v4-flash");
    expect(lines[1]).toContain("0.042");
  });

  test("respects time zone for display parts", () => {
    const csv = buildUsageCsv([RECORD()], { timeZone: "Asia/Shanghai" });
    const row = csv.replace("\uFEFF", "").trim().split("\n")[1];
    expect(row).toContain("2026-08-20");
    expect(row).toContain("12:05:06"); // UTC+8
  });

  test("quotes cells containing commas or quotes", () => {
    const csv = buildUsageCsv([RECORD({ cybotId: 'a, "b"' })], {
      timeZone: "UTC",
    });
    const row = csv.replace("\uFEFF", "").trim().split("\n")[1];
    expect(row).toContain('"a, ""b"""');
  });

  test("falls back to billing_provider when provider missing and vice versa", () => {
    const csv = buildUsageCsv(
      [RECORD({ billing_provider: "deepinfra", provider: undefined })],
      { timeZone: "UTC" }
    );
    expect(csv).toContain("deepinfra");
  });

  test("empty list emits header only", () => {
    const csv = buildUsageCsv([], { timeZone: "UTC" });
    expect(csv.replace("\uFEFF", "").trim().split("\n")).toHaveLength(1);
  });
});
