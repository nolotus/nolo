import { describe, expect, it } from "bun:test";
import {
  formatCompactTokenCount,
  getContextWindowUsagePercent,
  getDialogTokenTotal,
} from "./dialogUsageFormat";

describe("dialogUsageFormat", () => {
  it("formats compact token counts", () => {
    expect(formatCompactTokenCount(980)).toBe("980");
    expect(formatCompactTokenCount(1340)).toBe("1.3k");
    expect(formatCompactTokenCount(1_000_000)).toBe("1M");
  });

  it("sums dialog token totals", () => {
    expect(getDialogTokenTotal(980, 360)).toBe(1340);
  });

  it("computes context window usage percent", () => {
    expect(getContextWindowUsagePercent(151_400, 1_000_000)).toBe(15);
    expect(getContextWindowUsagePercent(0, 0)).toBe(0);
  });
});