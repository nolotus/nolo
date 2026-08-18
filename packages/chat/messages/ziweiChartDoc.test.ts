import { beforeAll, describe, expect, it } from "bun:test";

import { runZiweiChart } from "ai/tools/ziweiChartTool";

import {
  buildZiweiChartDocMarkdown,
  buildZiweiChartDocTitle,
  getZiweiChartResult,
} from "./ziweiChartDoc";

describe("ziweiChartDoc", () => {
  // runZiweiChart 是 async（体内 lazy-load iztro），describe 作用域不能直接 await，
  // 用 beforeAll 兜住，避免又退回「在 Promise 上取属性得 undefined」。
  let result: Awaited<ReturnType<typeof runZiweiChart>>;

  beforeAll(async () => {
    result = await runZiweiChart({
      dateStr: "2000-8-16",
      timeIndex: 2,
      gender: "女",
    });
  });

  it("reads plain ziwei results", () => {
    expect(getZiweiChartResult(result)?.summary.mingGong).toBe(result.summary.mingGong);
  });

  it("builds a stable doc title", () => {
    expect(buildZiweiChartDocTitle(result)).toBe(
      `紫微命盘 · 阳历 2000-8-16 · ${result.chart.timeRange} · 女`
    );
  });

  it("builds markdown with summary and ascii board", () => {
    const markdown = buildZiweiChartDocMarkdown(result);

    expect(markdown).toContain("# 紫微命盘");
    expect(markdown).toContain("## ASCII 盘面快照");
    expect(markdown).toContain("```text");
    expect(markdown).toContain(result.gridText);
    expect(markdown).toContain("## 十二宫详盘");
    expect(markdown).toContain(result.displayData);
  });
});
