import { describe, expect, it } from "bun:test";

import { runZiweiChart } from "./ziweiChartTool";

describe("runZiweiChart", () => {
  it("builds a complete chart from solar input", async () => {
    const result = await runZiweiChart({
      dateStr: "2000-8-16",
      timeIndex: 2,
      gender: "女",
    });

    expect(result.success).toBe(true);
    expect(result.summary.palaceCount).toBe(12);
    expect(result.chart.solarDate).toBe("2000-8-16");
    expect(result.chart.lunarDate).toContain("二〇〇〇年七月十七");
    expect(result.summary.mingZhu).toBe("破军");
    expect(result.summary.shenZhu).toBe("文昌");
    expect(result.displayData).toContain("◆ 紫微斗数命盘 ◆");
    expect(result.displayData).toContain("命主：破军");
    expect(result.displayData).toContain("生年四化");
    expect(result.summaryText).toContain("五行局 木三局");
    expect(result.gridText).toContain("巳");
    expect(result.gridText).toContain("子");
    expect(result.analysisContext.decadalPalaces).toHaveLength(12);
    expect(Array.isArray(result.chart.mutagenByYear)).toBe(true);
    expect(result.chart.heavenlyStemOfYear.length).toBe(1);
    expect(result.chart.palaces.some((palace) => palace.name === "命宫")).toBe(
      true
    );
  });

  it("displayData contains all 12 palaces full info", async () => {
    const result = await runZiweiChart({
      dateStr: "2000-8-16",
      timeIndex: 2,
      gender: "女",
    });

    const palaceNames = [
      "命宫",
      "兄弟宫",
      "夫妻宫",
      "子女宫",
      "财帛宫",
      "疾厄宫",
      "迁移宫",
      "交友宫",
      "事业宫",
      "田宅宫",
      "福德宫",
      "父母宫",
    ];
    for (const name of palaceNames) {
      expect(result.displayData).toContain(name);
    }

    expect(result.displayData).toMatch(/旺▲|庙○|陷▼|平—/);
    expect(result.displayData).toContain("大限");
    expect(result.displayData).toContain("小限");
    expect(result.displayData).toContain("长生十二神");
  });

  it("analysisContext has fourTransformations with palace locations", async () => {
    const result = await runZiweiChart({
      dateStr: "1983-11-7",
      timeIndex: 3,
      gender: "女",
    });

    const ctx = result.analysisContext;
    const transforms = [
      ctx.fourTransformations.huaLu,
      ctx.fourTransformations.huaQuan,
      ctx.fourTransformations.huaKe,
      ctx.fourTransformations.huaJi,
    ];
    expect(transforms.some((t) => t !== undefined)).toBe(true);

    const huaLu = ctx.fourTransformations.huaLu;
    if (huaLu) {
      expect(huaLu.star).toBeTruthy();
      expect(huaLu.palace).toContain("宫");
    }
  });

  it("analysisContext emptyPalaces lists palaces without major stars", async () => {
    const result = await runZiweiChart({
      dateStr: "2000-8-16",
      timeIndex: 2,
      gender: "女",
    });

    expect(Array.isArray(result.analysisContext.emptyPalaces)).toBe(true);
    for (const palace of result.analysisContext.emptyPalaces) {
      expect(palace).toContain("宫");
    }
  });

  it("analysisContext decadalPalaces is sorted by age", async () => {
    const result = await runZiweiChart({
      dateStr: "2000-8-16",
      timeIndex: 2,
      gender: "女",
    });

    const decadalPalaces = result.analysisContext.decadalPalaces;
    expect(decadalPalaces).toHaveLength(12);
    for (let i = 1; i < decadalPalaces.length; i += 1) {
      expect(decadalPalaces[i].range[0]).toBeGreaterThan(
        decadalPalaces[i - 1].range[0]
      );
    }
  });

  it("accepts lunar input", async () => {
    const result = await runZiweiChart({
      calendarType: "lunar",
      dateStr: "2000-7-17",
      timeIndex: 2,
      gender: "女",
    });

    expect(result.chart.solarDate).toBe("2000-8-16");
    expect(result.summary.palaceCount).toBe(12);
  });
});
