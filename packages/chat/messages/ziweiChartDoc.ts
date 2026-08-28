import type { ZiweiChartToolResult } from "ai/tools/ziweiChartTool";

type MaybeZiweiChartResult = Partial<ZiweiChartToolResult> & {
  rawData?: ZiweiChartToolResult;
};

export function getZiweiChartResult(
  rawData: unknown
): ZiweiChartToolResult | null {
  const candidate = rawData as MaybeZiweiChartResult | null | undefined;
  const result = candidate?.chart ? candidate : candidate?.rawData;
  if (!result?.chart || !result?.summary || !result?.displayData) return null;
  return result as ZiweiChartToolResult;
}

export function buildZiweiChartDocTitle(rawData: unknown): string {
  const result = getZiweiChartResult(rawData);
  if (!result) return "紫微命盘";

  const calendarLabel = result.input.calendarType === "lunar" ? "农历" : "阳历";
  return `紫微命盘 · ${calendarLabel} ${result.input.dateStr} · ${result.chart.timeRange} · ${result.input.gender}`;
}

export function buildZiweiChartDocMarkdown(rawData: unknown): string {
  const result = getZiweiChartResult(rawData);
  if (!result) return "# 紫微命盘\n\n无法生成命盘内容。";

  const mutagenSummary =
    result.chart.mutagenByYear.length > 0
      ? result.chart.mutagenByYear
          .map((item) => `${item.name}化${item.mutagen}`)
          .join("、")
      : "无";

  const quickFacts = [
    `- 日期类型：${result.input.calendarType === "lunar" ? "农历" : "阳历"}`,
    `- 出生日期：${result.input.dateStr}`,
    `- 时辰：${result.chart.timeRange}`,
    `- 性别：${result.input.gender}`,
    `- 阳历：${result.chart.solarDate}`,
    `- 农历：${result.chart.lunarDate}`,
    `- 干支：${result.chart.chineseDate}`,
    `- 生肖 / 星座：${result.chart.zodiac} / ${result.chart.sign}`,
    `- 五行局：${result.summary.fiveElementsClass}`,
    `- 命宫：${result.summary.mingGong}`,
    `- 身宫：${result.summary.shenGong}`,
    `- 命主 / 身主：${result.summary.mingZhu} / ${result.summary.shenZhu}`,
    `- 生年四化：${mutagenSummary}`,
  ].join("\n");

  const analysisLines = [
    `- 命宫主星：${
      result.analysisContext.mingPalace.majorStars.map((item) => item.name).join("、") ||
      "无"
    }`,
    `- 身宫主星：${
      result.analysisContext.bodyPalace.majorStars.map((item) => item.name).join("、") ||
      "无"
    }`,
    `- 空宫：${
      result.analysisContext.emptyPalaces.length > 0
        ? result.analysisContext.emptyPalaces.join("、")
        : "无"
    }`,
  ].join("\n");

  return [
    `# ${buildZiweiChartDocTitle(result)}`,
    "",
    "## 命盘摘要",
    "",
    result.summaryText,
    "",
    "## 基本信息",
    "",
    quickFacts,
    "",
    "## 关键观察",
    "",
    analysisLines,
    "",
    "## ASCII 盘面快照",
    "",
    "```text",
    result.gridText,
    "```",
    "",
    "## 十二宫详盘",
    "",
    "```text",
    result.displayData,
    "```",
  ].join("\n");
}
